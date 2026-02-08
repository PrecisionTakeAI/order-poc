import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity, OrderItem, Address, CartEntity, ProductEntity } from '../../../shared/types';
import { ValidationError, NotFoundError, ConflictError } from '../../../shared/utils/error.util';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ORDERS_TABLE || '';
const CARTS_TABLE = process.env.CARTS_TABLE || '';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || '';

export class OrdersService {
  /**
   * Create an order from the user's cart using DynamoDB transactions
   * This ensures atomicity across cart deletion, stock updates, and order creation
   */
  async createOrderFromCart(
    userId: string,
    shippingAddress: Address,
    paymentMethod: string
  ): Promise<OrderEntity> {
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

    // Validate all products exist
    for (const item of cart.items) {
      const product = products.get(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`);
      }
      if (product.status !== 'active') {
        throw new ValidationError(`Product ${product.name} is not available (status: ${product.status})`);
      }
      if (product.stock < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        );
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

    // Step 4: Execute transaction - create order, decrement stock, delete cart
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

        // Check for stock or product status issues
        for (let i = 0; i < cancellationReasons.length; i++) {
          const reason = cancellationReasons[i];
          if (reason.Code === 'ConditionalCheckFailed') {
            // Stock update failed (index 1 to N-1 are product updates)
            if (i > 0 && i < transactItems.length - 1) {
              const itemIndex = i - 1;
              const item = orderItems[itemIndex];
              throw new ConflictError(
                `Product ${item.productName} is no longer available or has insufficient stock`
              );
            }
            // Cart deletion failed
            if (i === transactItems.length - 1) {
              throw new ConflictError('Cart was modified or deleted. Please try again.');
            }
          }
        }

        throw new ConflictError('Order creation failed due to a conflict. Please try again.');
      }

      throw error;
    }

    return order;
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
