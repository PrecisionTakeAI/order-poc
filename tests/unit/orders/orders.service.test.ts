import { OrdersService } from '../../../src/functions/orders/services/orders.service';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ValidationError, NotFoundError, ConflictError } from '../../../src/shared/utils/error.util';

// Create mock for DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Set environment variables
process.env.ORDERS_TABLE = 'OrderPOC-Orders-test';
process.env.CARTS_TABLE = 'OrderPOC-Carts-test';
process.env.PRODUCTS_TABLE = 'OrderPOC-Products-test';

describe('OrdersService - createOrderFromCart', () => {
  let ordersService: OrdersService;

  const mockUserId = 'user-123';
  const mockProductId1 = 'product-1';
  const mockProductId2 = 'product-2';

  const mockCart = {
    PK: `USER#${mockUserId}`,
    SK: 'CART',
    userId: mockUserId,
    items: [
      {
        itemId: 'cart-item-1',
        productId: mockProductId1,
        productName: 'Cricket Bat',
        price: 150.0,
        quantity: 2,
        subtotal: 300.0,
      },
      {
        itemId: 'cart-item-2',
        productId: mockProductId2,
        productName: 'Cricket Ball',
        price: 25.0,
        quantity: 5,
        subtotal: 125.0,
      },
    ],
    totalAmount: 425.0,
    currency: 'USD',
    version: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockProduct1 = {
    PK: `PRODUCT#${mockProductId1}`,
    SK: 'DETAILS',
    productId: mockProductId1,
    name: 'Cricket Bat',
    description: 'Professional cricket bat',
    price: 150.0,
    currency: 'USD',
    stock: 10,
    category: 'bats',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockProduct2 = {
    PK: `PRODUCT#${mockProductId2}`,
    SK: 'DETAILS',
    productId: mockProductId2,
    name: 'Cricket Ball',
    description: 'Leather cricket ball',
    price: 25.0,
    currency: 'USD',
    stock: 20,
    category: 'balls',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockShippingAddress = {
    street: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  };

  const mockPaymentMethod = 'credit_card';

  beforeEach(() => {
    ordersService = new OrdersService();
    ddbMock.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful order creation', () => {
    it('should successfully create order from cart with valid data', async () => {
      // Mock cart retrieval, then product retrievals
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart }) // Cart retrieval
        .resolvesOnce({ Item: mockProduct1 }) // Product 1 retrieval
        .resolvesOnce({ Item: mockProduct2 }); // Product 2 retrieval

      // Mock transaction success
      ddbMock.on(TransactWriteCommand).resolves({});

      const result = await ordersService.createOrderFromCart(
        mockUserId,
        mockShippingAddress,
        mockPaymentMethod
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(425.0);
      expect(result.status).toBe('pending');
      expect(result.paymentStatus).toBe('pending');
      expect(result.shippingAddress).toEqual(mockShippingAddress);
      expect(result.paymentMethod).toBe(mockPaymentMethod);

      // Verify order items use current product prices
      expect(result.items[0].price).toBe(mockProduct1.price);
      expect(result.items[1].price).toBe(mockProduct2.price);
    });

    it('should use current product prices instead of cart prices', async () => {
      const updatedProduct1 = { ...mockProduct1, price: 175.0 }; // Price increased

      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: updatedProduct1 })
        .resolvesOnce({ Item: mockProduct2 });

      ddbMock.on(TransactWriteCommand).resolves({});

      const result = await ordersService.createOrderFromCart(
        mockUserId,
        mockShippingAddress,
        mockPaymentMethod
      );

      // Should use updated price (175) instead of cart price (150)
      expect(result.items[0].price).toBe(175.0);
      expect(result.items[0].subtotal).toBe(175.0 * 2); // 350.0
      expect(result.totalAmount).toBe(350.0 + 125.0); // 475.0
    });
  });

  describe('Empty cart validation', () => {
    it('should throw ValidationError when cart is empty', async () => {
      const emptyCart = { ...mockCart, items: [] };

      ddbMock.on(GetCommand).resolves({ Item: emptyCart });

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when cart does not exist', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Product validation', () => {
    it('should throw NotFoundError when product does not exist', async () => {
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: undefined }) // Product 1 not found
        .resolvesOnce({ Item: mockProduct2 });

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when product is inactive', async () => {
      const inactiveProduct = { ...mockProduct1, status: 'inactive' };

      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: inactiveProduct })
        .resolvesOnce({ Item: mockProduct2 });

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when product has insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct1, stock: 1 }; // Cart needs 2

      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: lowStockProduct })
        .resolvesOnce({ Item: mockProduct2 });

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Transaction handling', () => {
    it('should throw ConflictError when transaction fails due to stock condition', async () => {
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: mockProduct1 })
        .resolvesOnce({ Item: mockProduct2 });

      // Mock transaction failure
      const transactionError = new Error('Transaction cancelled');
      transactionError.name = 'TransactionCanceledException';
      (transactionError as any).CancellationReasons = [
        { Code: 'None' }, // Order creation
        { Code: 'ConditionalCheckFailed' }, // Product 1 stock update failed
        { Code: 'None' }, // Product 2
        { Code: 'None' }, // Cart deletion
      ];

      ddbMock.on(TransactWriteCommand).rejects(transactionError);

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when cart is modified during transaction', async () => {
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: mockProduct1 })
        .resolvesOnce({ Item: mockProduct2 });

      const transactionError = new Error('Transaction cancelled');
      transactionError.name = 'TransactionCanceledException';
      (transactionError as any).CancellationReasons = [
        { Code: 'None' },
        { Code: 'None' },
        { Code: 'None' },
        { Code: 'ConditionalCheckFailed' }, // Cart deletion failed
      ];

      ddbMock.on(TransactWriteCommand).rejects(transactionError);

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError for generic transaction cancellation', async () => {
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: mockProduct1 })
        .resolvesOnce({ Item: mockProduct2 });

      const transactionError = new Error('Transaction cancelled');
      transactionError.name = 'TransactionCanceledException';
      (transactionError as any).CancellationReasons = [];

      ddbMock.on(TransactWriteCommand).rejects(transactionError);

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow(ConflictError);
    });

    it('should propagate other errors as-is', async () => {
      ddbMock
        .on(GetCommand)
        .resolvesOnce({ Item: mockCart })
        .resolvesOnce({ Item: mockProduct1 })
        .resolvesOnce({ Item: mockProduct2 });

      const genericError = new Error('Network error');
      ddbMock.on(TransactWriteCommand).rejects(genericError);

      await expect(
        ordersService.createOrderFromCart(mockUserId, mockShippingAddress, mockPaymentMethod)
      ).rejects.toThrow('Network error');
    });
  });
});
