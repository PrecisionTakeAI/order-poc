import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity, OrderItem, Address, CartEntity, ProductEntity } from '../../../shared/types';
import { ValidationError, NotFoundError, ConflictError, ErrorDetail } from '../../../shared/utils/error.util';
import { IdempotencyService } from './idempotency.service';
import { GetUserOrdersParams, GetUserOrdersResult } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ORDERS_TABLE || '';
const CARTS_TABLE = process.env.CARTS_TABLE || '';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || '';
const ORDERS_USER_DATE_INDEX = process.env.ORDERS_USER_DATE_INDEX || '';

export interface CreateOrderResult {
  order: OrderEntity;
  isIdempotent: boolean;
}

export class OrdersService {
  private idempotencyService: IdempotencyService;

  constructor() {
    this.idempotencyService = new IdempotencyService();
  }
  /**
   * Create an order from the user's cart using DynamoDB transactions
   * This ensures atomicity across cart deletion, stock updates, and order creation
   */
  async createOrderFromCart(
    userId: string,
    shippingAddress: Address,
    paymentMethod: string,
    idempotencyKey?: string
  ): Promise<CreateOrderResult> {
    // Check idempotency if key is provided
    if (idempotencyKey) {
      const existingOrder = await this.idempotencyService.checkIdempotency(
        userId,
        idempotencyKey
      );

      if (existingOrder) {
        console.log(`Idempotent request detected. Returning existing order: ${existingOrder.orderId}`);
        return {
          order: existingOrder,
          isIdempotent: true,
        };
      }
    }
    // Step 1: Retrieve the cart
    const cartResponse = await docClient.send(
      new GetCommand({
        TableName: CARTS_TABLE,
        Key: {
          PK: `USER#${userId}`,
          SK: 'CART',
        },
      })
    );

    const cart = cartResponse.Item as CartEntity | undefined;

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new ValidationError('Cart is empty. Add items to cart before creating an order.');
    }

    // Step 2: Fetch current product information and validate
    const productIds = cart.items.map((item) => item.productId);
    const products = await this.fetchProducts(productIds);

    // Validate all products exist and collect all errors
    const validationErrors: ErrorDetail[] = [];

    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const product = products.get(item.productId);

      if (!product) {
        validationErrors.push({
          field: `items[${i}]`,
          productId: item.productId,
          message: `Product not found`,
          code: 'NOT_FOUND',
        });
        continue;
      }

      if (product.status !== 'active') {
        validationErrors.push({
          field: `items[${i}]`,
          productId: product.productId,
          productName: product.name,
          message: `Product is not available (status: ${product.status})`,
          code: 'PRODUCT_UNAVAILABLE',
        });
      }

      if (product.stock < item.quantity) {
        validationErrors.push({
          field: `items[${i}]`,
          productId: product.productId,
          productName: product.name,
          message: `Insufficient stock. Available: ${product.stock}, Requested: ${item.quantity}`,
          code: 'INSUFFICIENT_STOCK',
          available: product.stock,
          requested: item.quantity,
        });
      }
    }

    // Throw if any validation errors exist
    if (validationErrors.length > 0) {
      // Determine the most appropriate error type
      const hasStockErrors = validationErrors.some(e => e.code === 'INSUFFICIENT_STOCK');
      const hasNotFoundErrors = validationErrors.some(e => e.code === 'NOT_FOUND');

      if (hasStockErrors) {
        throw new ConflictError('Insufficient stock for one or more items', {
          errors: validationErrors,
        });
      } else if (hasNotFoundErrors) {
        throw new NotFoundError('One or more products not found', {
          errors: validationErrors,
        });
      } else {
        throw new ValidationError('Product validation failed', {
          errors: validationErrors,
        });
      }
    }

    // Step 3: Build order items with current price snapshots
    const orderId = uuidv4();
    const now = new Date().toISOString();
    const orderDate = now.split('T')[0];

    const orderItems: OrderItem[] = cart.items.map((cartItem) => {
      const product = products.get(cartItem.productId)!;
      return {
        itemId: uuidv4(),
        productId: cartItem.productId,
        productName: product.name,
        price: product.price, // Use current price from product
        quantity: cartItem.quantity,
        subtotal: product.price * cartItem.quantity,
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order: OrderEntity = {
      PK: `USER#${userId}`,
      SK: `ORDER#${orderId}`,
      orderId,
      userId,
      orderDate,
      items: orderItems,
      totalAmount,
      currency: 'USD',
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress,
      paymentMethod,
      createdAt: now,
      updatedAt: now,
    };

    // Step 4: Execute transaction - create order, decrement stock, delete cart, add idempotency record
    const transactItems = [
      // Create order
      {
        Put: {
          TableName: TABLE_NAME,
          Item: order,
        },
      },
      // Decrement stock for each product
      ...orderItems.map((item) => ({
        Update: {
          TableName: PRODUCTS_TABLE,
          Key: {
            PK: `PRODUCT#${item.productId}`,
            SK: 'DETAILS',
          },
          UpdateExpression: 'SET stock = stock - :qty, updatedAt = :now',
          ConditionExpression: 'stock >= :qty AND #status = :active',
          ExpressionAttributeNames: {
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':qty': item.quantity,
            ':active': 'active',
            ':now': now,
          },
        },
      })),
      // Delete cart
      {
        Delete: {
          TableName: CARTS_TABLE,
          Key: {
            PK: `USER#${userId}`,
            SK: 'CART',
          },
          ConditionExpression: 'attribute_exists(PK)',
        },
      },
    ];

    // Add idempotency record if key is provided
    if (idempotencyKey) {
      transactItems.push(
        this.idempotencyService.createIdempotencyRecord(userId, idempotencyKey, orderId)
      );
    }

    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: transactItems,
        })
      );
    } catch (error: any) {
      console.error('Transaction failed:', error);

      // Handle transaction cancellation
      if (error.name === 'TransactionCanceledException') {
        const cancellationReasons = error.CancellationReasons || [];
        console.error('Transaction cancellation reasons:', cancellationReasons);

        // Determine the expected position of cart deletion
        const cartDeleteIndex = orderItems.length + 1; // Order Put + N product updates + Cart Delete
        const idempotencyIndex = idempotencyKey ? transactItems.length - 1 : -1;

        // Check for stock or product status issues
        for (let i = 0; i < cancellationReasons.length; i++) {
          const reason = cancellationReasons[i];
          if (reason.Code === 'ConditionalCheckFailed') {
            // Idempotency key already exists - this is a race condition, retry the check
            if (idempotencyKey && i === idempotencyIndex) {
              const existingOrder = await this.idempotencyService.checkIdempotency(
                userId,
                idempotencyKey
              );
              if (existingOrder) {
                console.log(`Race condition detected. Returning existing order: ${existingOrder.orderId}`);
                return {
                  order: existingOrder,
                  isIdempotent: true,
                };
              }
              throw new ConflictError('Idempotency key conflict. Please try again.');
            }
            // Stock update failed (index 1 to N are product updates)
            if (i > 0 && i <= orderItems.length) {
              const itemIndex = i - 1;
              const item = orderItems[itemIndex];
              const stockErrors: ErrorDetail[] = [{
                field: `items[${itemIndex}]`,
                productId: item.productId,
                productName: item.productName,
                message: `Product is no longer available or has insufficient stock`,
                code: 'INSUFFICIENT_STOCK',
              }];
              throw new ConflictError(
                'Insufficient stock for one or more items',
                { errors: stockErrors }
              );
            }
            // Cart deletion failed
            if (i === cartDeleteIndex) {
              throw new ConflictError('Cart was modified or deleted. Please try again.');
            }
          }
        }

        throw new ConflictError('Order creation failed due to a conflict. Please try again.');
      }

      throw error;
    }

    return {
      order,
      isIdempotent: false,
    };
  }

  /**
   * Fetch multiple products by their IDs
   */
  private async fetchProducts(productIds: string[]): Promise<Map<string, ProductEntity>> {
    const products = new Map<string, ProductEntity>();

    // Fetch all products in parallel
    const productPromises = productIds.map((productId) =>
      docClient.send(
        new GetCommand({
          TableName: PRODUCTS_TABLE,
          Key: {
            PK: `PRODUCT#${productId}`,
            SK: 'DETAILS',
          },
        })
      )
    );

    const results = await Promise.all(productPromises);

    results.forEach((result, index) => {
      if (result.Item) {
        const product = result.Item as ProductEntity;
        products.set(productIds[index], product);
      }
    });

    return products;
  }

  async createOrder(
    userId: string,
    items: OrderItem[],
    shippingAddress: Address,
    paymentMethod: string
  ): Promise<OrderEntity> {
    const orderId = uuidv4();
    const now = new Date().toISOString();
    const orderDate = now.split('T')[0];

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const order: OrderEntity = {
      PK: `USER#${userId}`,
      SK: `ORDER#${orderId}`,
      orderId,
      userId,
      orderDate,
      items,
      totalAmount,
      currency: 'USD',
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress,
      paymentMethod,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: order,
      })
    );

    return order;
  }

  async getOrderById(
    userId: string,
    orderId: string
  ): Promise<OrderEntity | null> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `ORDER#${orderId}`,
        },
      })
    );

    return (response.Item as OrderEntity) || null;
  }

  async getUserOrders(
    userId: string,
    limit: number = 50
  ): Promise<OrderEntity[]> {
    const response = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'ORDER#',
        },
        Limit: limit,
        ScanIndexForward: false,
      })
    );

    return (response.Items as OrderEntity[]) || [];
  }

  /**
   * Get user orders with filtering, date range, and pagination support
   * Uses the userId-orderDate-index GSI for efficient querying
   */
  async getUserOrdersWithFilters(params: GetUserOrdersParams): Promise<GetUserOrdersResult> {
    const { userId, limit = 50, lastKey, status, startDate, endDate } = params;

    // Build KeyConditionExpression dynamically
    let keyConditionExpression = 'userId = :userId';
    const expressionAttributeValues: Record<string, any> = {
      ':userId': userId,
    };

    // Add date range to KeyConditionExpression if provided
    if (startDate && endDate) {
      keyConditionExpression += ' AND orderDate BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      keyConditionExpression += ' AND orderDate >= :startDate';
      expressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      keyConditionExpression += ' AND orderDate <= :endDate';
      expressionAttributeValues[':endDate'] = endDate;
    }

    // Build FilterExpression for status if provided
    let filterExpression: string | undefined;
    const expressionAttributeNames: Record<string, string> = {};

    if (status) {
      filterExpression = '#status = :status';
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }

    const queryParams: any = {
      TableName: TABLE_NAME,
      IndexName: ORDERS_USER_DATE_INDEX,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // Newest first
      Limit: limit,
    };

    if (filterExpression) {
      queryParams.FilterExpression = filterExpression;
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (lastKey) {
      queryParams.ExclusiveStartKey = lastKey;
    }

    const response = await docClient.send(new QueryCommand(queryParams));

    return {
      orders: (response.Items as OrderEntity[]) || [],
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  /**
   * Enrich orders with current product images
   * Batch-fetches product details and adds currentImageUrl to order items
   */
  async enrichOrdersWithProductImages(orders: OrderEntity[]): Promise<OrderEntity[]> {
    if (!orders || orders.length === 0) {
      return orders;
    }

    // Extract unique product IDs from all orders
    const productIds = new Set<string>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        productIds.add(item.productId);
      });
    });

    if (productIds.size === 0) {
      return orders;
    }

    // Batch fetch products (DynamoDB BatchGet limit is 100 items)
    const productIdArray = Array.from(productIds);
    const productMap = new Map<string, string | undefined>();

    // Process in batches of 100
    for (let i = 0; i < productIdArray.length; i += 100) {
      const batch = productIdArray.slice(i, i + 100);

      const response = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [PRODUCTS_TABLE]: {
              Keys: batch.map((id) => ({
                PK: `PRODUCT#${id}`,
                SK: 'DETAILS',
              })),
              ProjectionExpression: 'productId, imageUrl',
            },
          },
        })
      );

      const products = (response.Responses?.[PRODUCTS_TABLE] as ProductEntity[]) || [];
      products.forEach((product) => {
        productMap.set(product.productId, product.imageUrl);
      });
    }

    // Enrich orders with current image URLs
    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        currentImageUrl: productMap.get(item.productId),
      })),
    }));
  }

  async updateOrderStatus(
    userId: string,
    orderId: string,
    status: OrderEntity['status']
  ): Promise<OrderEntity> {
    const response = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `ORDER#${orderId}`,
        },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return response.Attributes as OrderEntity;
  }
}
