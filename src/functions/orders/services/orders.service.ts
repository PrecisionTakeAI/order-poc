import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity, OrderItem, Address } from '../../../shared/types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ORDERS_TABLE || '';

export class OrdersService {
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
