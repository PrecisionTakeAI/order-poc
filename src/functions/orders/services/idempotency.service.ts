import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { OrderEntity } from '../../../shared/types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.ORDERS_TABLE || '';

// TTL duration: 5 minutes (300 seconds)
const IDEMPOTENCY_TTL_SECONDS = 300;

export class IdempotencyService {
  /**
   * Check if an idempotency key has already been used
   * @param userId - The user ID
   * @param idempotencyKey - The idempotency key (UUID)
   * @returns Existing order if found, null otherwise
   */
  async checkIdempotency(
    userId: string,
    idempotencyKey: string
  ): Promise<OrderEntity | null> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `IDEMPOTENCY#${idempotencyKey}`,
          SK: 'ORDER',
        },
      })
    );

    if (!response.Item) {
      return null;
    }

    // Verify that the idempotency key belongs to the requesting user
    if (response.Item.userId !== userId) {
      console.warn(`Idempotency key ${idempotencyKey} belongs to different user. Access denied.`);
      return null;
    }

    // Extract the actual order ID from the idempotency record
    const orderId = response.Item.orderId as string;

    // Fetch and return the actual order
    const orderResponse = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `ORDER#${orderId}`,
        },
      })
    );

    return (orderResponse.Item as OrderEntity) || null;
  }

  /**
   * Create an idempotency record as part of a transaction
   * @param userId - The user ID
   * @param idempotencyKey - The idempotency key (UUID)
   * @param orderId - The order ID to associate with this key
   * @returns TransactWriteItem for the idempotency record
   */
  createIdempotencyRecord(
    userId: string,
    idempotencyKey: string,
    orderId: string
  ): any {
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + IDEMPOTENCY_TTL_SECONDS;

    return {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `IDEMPOTENCY#${idempotencyKey}`,
          SK: 'ORDER',
          userId,
          orderId,
          createdAt: now,
          ttl,
        },
        // Prevent race conditions - fail if key already exists
        ConditionExpression: 'attribute_not_exists(PK)',
      },
    };
  }
}
