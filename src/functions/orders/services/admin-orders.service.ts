import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { OrderEntity, UserEntity } from '../../../shared/types';
import { ValidationError, NotFoundError } from '../../../shared/utils/error.util';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const ORDERS_TABLE = process.env.ORDERS_TABLE || '';
const USERS_TABLE = process.env.USERS_TABLE || '';

export interface GetAllOrdersParams {
  limit?: number;
  lastKey?: Record<string, unknown>;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

export interface GetAllOrdersResult {
  orders: OrderEntity[];
  lastEvaluatedKey?: Record<string, unknown>;
}

export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
}

export interface EnrichedOrder extends OrderEntity {
  customerName?: string;
  customerEmail?: string;
}

/**
 * Admin Orders Service - Handles admin-specific order operations
 * Includes order management, status updates, and statistics
 */
export class AdminOrdersService {
  /**
   * Get all orders with filtering and pagination
   * Uses DynamoDB Scan to retrieve orders across all users
   */
  async getAllOrders(params: GetAllOrdersParams): Promise<GetAllOrdersResult> {
    const { limit = 50, lastKey, status, startDate, endDate } = params;

    // Build FilterExpression
    const filterExpressions: string[] = ['begins_with(SK, :orderPrefix)'];
    const expressionAttributeValues: Record<string, any> = {
      ':orderPrefix': 'ORDER#',
    };

    // Add status filter
    if (status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = status;
    }

    // Add date range filters
    if (startDate && endDate) {
      filterExpressions.push('orderDate BETWEEN :startDate AND :endDate');
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      filterExpressions.push('orderDate >= :startDate');
      expressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      filterExpressions.push('orderDate <= :endDate');
      expressionAttributeValues[':endDate'] = endDate;
    }

    const scanParams: any = {
      TableName: ORDERS_TABLE,
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
    };

    // Add ExpressionAttributeNames only if status filter is present
    if (status) {
      scanParams.ExpressionAttributeNames = {
        '#status': 'status',
      };
    }

    if (lastKey) {
      scanParams.ExclusiveStartKey = lastKey;
    }

    const response = await docClient.send(new ScanCommand(scanParams));

    const orders = (response.Items as OrderEntity[]) || [];

    // Sort by orderDate descending (newest first)
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return {
      orders,
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  /**
   * Get order by ID (scan-based for admin access across all users)
   * Used to find an order when we only have the orderId but not the userId
   */
  async getOrderById(orderId: string): Promise<OrderEntity | null> {
    const scanParams = {
      TableName: ORDERS_TABLE,
      FilterExpression: 'begins_with(SK, :sk) AND orderId = :orderId',
      ExpressionAttributeValues: {
        ':sk': 'ORDER#',
        ':orderId': orderId,
      },
      Limit: 1,
    };

    const response = await docClient.send(new ScanCommand(scanParams));

    if (!response.Items || response.Items.length === 0) {
      return null;
    }

    return response.Items[0] as OrderEntity;
  }

  /**
   * Update order status with state machine validation
   * Admin can update to any valid next state
   */
  async updateOrderStatusAdmin(
    orderId: string,
    newStatus: OrderEntity['status']
  ): Promise<OrderEntity> {
    // First, find the order to get the userId
    const order = await this.getOrderById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Validate status transition
    this.validateStatusTransition(order.status, newStatus);

    // Update the order status
    const now = new Date().toISOString();

    const response = await docClient.send(
      new UpdateCommand({
        TableName: ORDERS_TABLE,
        Key: {
          PK: order.PK,
          SK: order.SK,
        },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':updatedAt': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    return response.Attributes as OrderEntity;
  }

  /**
   * Validate status transitions using state machine rules
   *
   * State machine:
   * - pending → [confirmed, cancelled]
   * - confirmed → [processing, cancelled]
   * - processing → [shipped, cancelled]
   * - shipped → [delivered]
   * - delivered → [] (terminal)
   * - cancelled → [] (terminal)
   */
  validateStatusTransition(
    currentStatus: OrderEntity['status'],
    newStatus: OrderEntity['status']
  ): void {
    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    // Check if transition is valid
    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from "${currentStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowedStatuses.length > 0 ? allowedStatuses.join(', ') : 'none (terminal state)'}`
      );
    }
  }

  /**
   * Calculate order statistics
   */
  calculateStatistics(orders: OrderEntity[]): OrderStatistics {
    const stats: OrderStatistics = {
      totalOrders: orders.length,
      totalRevenue: 0,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      },
    };

    orders.forEach((order) => {
      // Count revenue (exclude cancelled orders)
      if (order.status !== 'cancelled') {
        stats.totalRevenue += order.totalAmount;
      }

      // Count by status
      if (stats.ordersByStatus[order.status] !== undefined) {
        stats.ordersByStatus[order.status]++;
      }
    });

    return stats;
  }

  /**
   * Enrich orders with customer information
   * Batch-fetches user details and adds customerName and customerEmail
   */
  async enrichOrdersWithCustomerInfo(orders: OrderEntity[]): Promise<EnrichedOrder[]> {
    if (!orders || orders.length === 0) {
      return orders;
    }

    // Extract unique user IDs
    const userIds = new Set<string>();
    orders.forEach((order) => {
      userIds.add(order.userId);
    });

    if (userIds.size === 0) {
      return orders;
    }

    // Batch fetch users (DynamoDB BatchGet limit is 100 items)
    const userIdArray = Array.from(userIds);
    const userMap = new Map<string, { name?: string; email: string }>();

    // Process in batches of 100
    for (let i = 0; i < userIdArray.length; i += 100) {
      const batch = userIdArray.slice(i, i + 100);

      const response = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [USERS_TABLE]: {
              Keys: batch.map((userId) => ({
                PK: `USER#${userId}`,
                SK: 'PROFILE',
              })),
              ProjectionExpression: 'userId, email, fullName',
            },
          },
        })
      );

      const users = (response.Responses?.[USERS_TABLE] as UserEntity[]) || [];
      users.forEach((user) => {
        userMap.set(user.userId, {
          name: user.fullName,
          email: user.email,
        });
      });
    }

    // Enrich orders with customer info
    return orders.map((order) => {
      const customer = userMap.get(order.userId);
      return {
        ...order,
        customerName: customer?.name,
        customerEmail: customer?.email || 'Unknown',
      };
    });
  }
}
