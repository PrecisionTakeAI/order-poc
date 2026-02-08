// Set environment variables FIRST before any imports
process.env.ORDERS_TABLE = 'OrderPOC-Orders-test';
process.env.PRODUCTS_TABLE = 'OrderPOC-Products-test';
process.env.ORDERS_USER_DATE_INDEX = 'userId-orderDate-index';
process.env.CARTS_TABLE = 'OrderPOC-Carts-test';

import { OrdersService } from '../../../src/functions/orders/services/orders.service';
import { handler } from '../../../src/functions/orders/handler';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { AuthorizedAPIGatewayProxyEvent } from '../../../src/shared/types';

// Create mock for DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('OrdersService - getUserOrdersWithFilters', () => {
  let ordersService: OrdersService;

  const mockUserId = 'user-123';
  const mockOrder1 = {
    PK: `USER#${mockUserId}`,
    SK: 'ORDER#order-1',
    orderId: 'order-1',
    userId: mockUserId,
    orderDate: '2024-02-08',
    items: [
      {
        itemId: 'item-1',
        productId: 'product-1',
        productName: 'Cricket Bat',
        price: 150.0,
        quantity: 1,
        subtotal: 150.0,
      },
    ],
    totalAmount: 150.0,
    currency: 'USD',
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: '2024-02-08T10:00:00.000Z',
    updatedAt: '2024-02-08T10:00:00.000Z',
  };

  const mockOrder2 = {
    PK: `USER#${mockUserId}`,
    SK: 'ORDER#order-2',
    orderId: 'order-2',
    userId: mockUserId,
    orderDate: '2024-02-07',
    items: [
      {
        itemId: 'item-2',
        productId: 'product-2',
        productName: 'Cricket Ball',
        price: 25.0,
        quantity: 2,
        subtotal: 50.0,
      },
    ],
    totalAmount: 50.0,
    currency: 'USD',
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: '2024-02-07T10:00:00.000Z',
    updatedAt: '2024-02-07T10:00:00.000Z',
  };

  beforeEach(() => {
    ordersService = new OrdersService();
    ddbMock.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic filtering and pagination', () => {
    it('should fetch orders with default parameters', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder1, mockOrder2],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
      });

      expect(result.orders).toHaveLength(2);
      expect(result.lastEvaluatedKey).toBeUndefined();
      expect(ddbMock.calls()).toHaveLength(1);

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input).toMatchObject({
        TableName: 'OrderPOC-Orders-test',
        IndexName: 'userId-orderDate-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': mockUserId },
        ScanIndexForward: false,
        Limit: 50,
      });
    });

    it('should return pagination token when more results available', async () => {
      const lastKey = { userId: mockUserId, orderDate: '2024-02-01', SK: 'ORDER#order-3' };

      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder1],
        LastEvaluatedKey: lastKey,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 1,
      });

      expect(result.orders).toHaveLength(1);
      expect(result.lastEvaluatedKey).toEqual(lastKey);
    });

    it('should use pagination token for subsequent requests', async () => {
      const lastKey = { userId: mockUserId, orderDate: '2024-02-07', SK: 'ORDER#order-2' };

      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder2],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
        lastKey,
      });

      expect(result.orders).toHaveLength(1);

      const queryCall = ddbMock.call(0);
      expect((queryCall.args[0].input as any).ExclusiveStartKey).toEqual(lastKey);
    });
  });

  describe('Status filtering', () => {
    it('should filter orders by status', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder1],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
        status: 'pending',
      });

      expect(result.orders).toHaveLength(1);

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input).toMatchObject({
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':userId': mockUserId,
          ':status': 'pending',
        },
      });
    });
  });

  describe('Date range filtering', () => {
    it('should filter orders with start and end date', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder1, mockOrder2],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
      });

      expect(result.orders).toHaveLength(2);

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input).toMatchObject({
        KeyConditionExpression: 'userId = :userId AND orderDate BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: {
          ':userId': mockUserId,
          ':startDate': '2024-02-01',
          ':endDate': '2024-02-28',
        },
      });
    });

    it('should filter orders with only start date', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder1],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
        startDate: '2024-02-08',
      });

      expect(result.orders).toHaveLength(1);

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input).toMatchObject({
        KeyConditionExpression: 'userId = :userId AND orderDate >= :startDate',
        ExpressionAttributeValues: {
          ':userId': mockUserId,
          ':startDate': '2024-02-08',
        },
      });
    });

    it('should filter orders with only end date', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder2],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
        endDate: '2024-02-07',
      });

      expect(result.orders).toHaveLength(1);

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input).toMatchObject({
        KeyConditionExpression: 'userId = :userId AND orderDate <= :endDate',
        ExpressionAttributeValues: {
          ':userId': mockUserId,
          ':endDate': '2024-02-07',
        },
      });
    });
  });

  describe('Combined filtering', () => {
    it('should apply status and date range filters together', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockOrder1],
        LastEvaluatedKey: undefined,
      });

      const result = await ordersService.getUserOrdersWithFilters({
        userId: mockUserId,
        limit: 50,
        status: 'pending',
        startDate: '2024-02-01',
        endDate: '2024-02-28',
      });

      expect(result.orders).toHaveLength(1);

      const queryCall = ddbMock.call(0);
      expect(queryCall.args[0].input).toMatchObject({
        KeyConditionExpression: 'userId = :userId AND orderDate BETWEEN :startDate AND :endDate',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':userId': mockUserId,
          ':startDate': '2024-02-01',
          ':endDate': '2024-02-28',
          ':status': 'pending',
        },
      });
    });
  });
});

describe('OrdersService - enrichOrdersWithProductImages', () => {
  let ordersService: OrdersService;

  const mockUserId = 'user-123';
  const mockOrder: any = {
    PK: `USER#${mockUserId}`,
    SK: 'ORDER#order-1',
    orderId: 'order-1',
    userId: mockUserId,
    orderDate: '2024-02-08',
    items: [
      {
        itemId: 'item-1',
        productId: 'product-1',
        productName: 'Cricket Bat',
        price: 150.0,
        quantity: 1,
        subtotal: 150.0,
      },
      {
        itemId: 'item-2',
        productId: 'product-2',
        productName: 'Cricket Ball',
        price: 25.0,
        quantity: 2,
        subtotal: 50.0,
      },
    ],
    totalAmount: 200.0,
    currency: 'USD',
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: '2024-02-08T10:00:00.000Z',
    updatedAt: '2024-02-08T10:00:00.000Z',
  };

  const mockProduct1 = {
    PK: 'PRODUCT#product-1',
    SK: 'DETAILS',
    productId: 'product-1',
    imageUrl: 'https://example.com/bat.jpg',
  };

  const mockProduct2 = {
    PK: 'PRODUCT#product-2',
    SK: 'DETAILS',
    productId: 'product-2',
    imageUrl: 'https://example.com/ball.jpg',
  };

  beforeEach(() => {
    ordersService = new OrdersService();
    ddbMock.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich orders with product images', async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        'OrderPOC-Products-test': [mockProduct1, mockProduct2],
      },
    });

    const result = await ordersService.enrichOrdersWithProductImages([mockOrder]);

    expect(result).toHaveLength(1);
    expect(result[0].items[0].currentImageUrl).toBe('https://example.com/bat.jpg');
    expect(result[0].items[1].currentImageUrl).toBe('https://example.com/ball.jpg');

    const batchCall = ddbMock.call(0);
    expect((batchCall.args[0].input as any).RequestItems['OrderPOC-Products-test'].Keys).toEqual(
      expect.arrayContaining([
        { PK: 'PRODUCT#product-1', SK: 'DETAILS' },
        { PK: 'PRODUCT#product-2', SK: 'DETAILS' },
      ])
    );
  });

  it('should handle missing products gracefully', async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        'OrderPOC-Products-test': [mockProduct1], // product-2 missing
      },
    });

    const result = await ordersService.enrichOrdersWithProductImages([mockOrder]);

    expect(result).toHaveLength(1);
    expect(result[0].items[0].currentImageUrl).toBe('https://example.com/bat.jpg');
    expect(result[0].items[1].currentImageUrl).toBeUndefined();
  });

  it('should return empty array for empty input', async () => {
    const result = await ordersService.enrichOrdersWithProductImages([]);

    expect(result).toHaveLength(0);
    expect(ddbMock.calls()).toHaveLength(0);
  });

  it('should deduplicate product IDs across multiple orders', async () => {
    const mockOrder2 = {
      ...mockOrder,
      orderId: 'order-2',
      SK: 'ORDER#order-2',
    };

    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        'OrderPOC-Products-test': [mockProduct1, mockProduct2],
      },
    });

    const result = await ordersService.enrichOrdersWithProductImages([mockOrder, mockOrder2]);

    expect(result).toHaveLength(2);
    expect(ddbMock.calls()).toHaveLength(1); // Only one batch call

    const batchCall = ddbMock.call(0);
    const keys = (batchCall.args[0].input as any).RequestItems['OrderPOC-Products-test'].Keys;
    expect(keys).toHaveLength(2); // Deduplicated
  });
});

describe('Orders Handler - handleListOrders', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (queryParams: Record<string, string> = {}): AuthorizedAPIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/orders',
    queryStringParameters: Object.keys(queryParams).length > 0 ? queryParams : null,
    body: null,
    headers: {},
    requestContext: {
      authorizer: {
        claims: {
          sub: 'user-123',
        },
      },
    } as any,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    resource: '',
  });

  it('should return orders with default pagination', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
      LastEvaluatedKey: undefined,
    });

    const event = createMockEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.count).toBe(0);
    expect(body.data.hasMore).toBe(false);
  });

  it('should validate limit parameter', async () => {
    const event = createMockEvent({ limit: '200' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Invalid limit');
  });

  it('should validate status parameter', async () => {
    const event = createMockEvent({ status: 'invalid-status' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Invalid status');
  });

  it('should validate date format', async () => {
    const event = createMockEvent({ startDate: 'invalid-date' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Invalid startDate format');
  });

  it('should validate date range logic', async () => {
    const event = createMockEvent({ startDate: '2024-02-28', endDate: '2024-02-01' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('startDate must be before or equal to endDate');
  });

  it('should validate pagination token', async () => {
    const event = createMockEvent({ lastKey: 'invalid-token' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Invalid pagination token');
  });
});

describe('Orders Handler - handleGetOrder', () => {
  const mockOrder = {
    PK: 'USER#user-123',
    SK: 'ORDER#order-1',
    orderId: 'order-1',
    userId: 'user-123',
    orderDate: '2024-02-08',
    items: [
      {
        itemId: 'item-1',
        productId: 'product-1',
        productName: 'Cricket Bat',
        price: 150.0,
        quantity: 1,
        subtotal: 150.0,
      },
    ],
    totalAmount: 150.0,
    currency: 'USD',
    status: 'pending',
    paymentStatus: 'pending',
    shippingAddress: {
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
    paymentMethod: 'credit_card',
    createdAt: '2024-02-08T10:00:00.000Z',
    updatedAt: '2024-02-08T10:00:00.000Z',
  };

  const mockProduct = {
    PK: 'PRODUCT#product-1',
    SK: 'DETAILS',
    productId: 'product-1',
    imageUrl: 'https://example.com/bat.jpg',
  };

  beforeEach(() => {
    ddbMock.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (orderId: string, userId: string = 'user-123'): AuthorizedAPIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: `/orders/${orderId}`,
    queryStringParameters: null,
    body: null,
    headers: {},
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    } as any,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    pathParameters: { orderId },
    stageVariables: null,
    resource: '',
  });

  it('should return order with product images', async () => {
    ddbMock
      .on(GetCommand)
      .resolves({ Item: mockOrder });

    ddbMock
      .on(BatchGetCommand)
      .resolves({
        Responses: {
          'OrderPOC-Products-test': [mockProduct],
        },
      });

    const event = createMockEvent('order-1');
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.orderId).toBe('order-1');
    expect(body.data.items[0].currentImageUrl).toBe('https://example.com/bat.jpg');
  });

  it('should return 404 when order not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const event = createMockEvent('non-existent-order');
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Order not found');
  });

  it('should return 403 when accessing another user order', async () => {
    const otherUserOrder = {
      ...mockOrder,
      PK: 'USER#other-user',
      userId: 'other-user',
    };

    ddbMock.on(GetCommand).resolves({ Item: otherUserOrder });

    const event = createMockEvent('order-1', 'user-123');
    const response = await handler(event);

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('Forbidden');
  });
});
