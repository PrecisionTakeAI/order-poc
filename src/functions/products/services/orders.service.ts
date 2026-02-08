import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { OrderEntity } from '../../../shared/types/dynamodb.types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const ORDERS_TABLE = process.env.ORDERS_TABLE || '';

export class OrdersService {
  /**
   * Check if a product exists in any pending or processing orders
   * @param productId - The product ID to check
   * @returns true if product is in pending/processing orders, false otherwise
   */
  async isProductInPendingOrders(productId: string): Promise<boolean> {
    const scanParams = {
      TableName: ORDERS_TABLE,
      FilterExpression:
        'begins_with(PK, :pk) AND (#status = :pending OR #status = :processing)',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': 'USER#',
        ':pending': 'pending',
        ':processing': 'processing',
      },
    };

    const response = await docClient.send(new ScanCommand(scanParams as any));
    const orders = (response.Items as OrderEntity[]) || [];

    // Check if any order contains the product
    for (const order of orders) {
      if (order.items && order.items.some((item) => item.productId === productId)) {
        return true;
      }
    }

    return false;
  }
}
