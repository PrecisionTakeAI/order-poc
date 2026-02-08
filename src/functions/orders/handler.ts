import { APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/utils/error.util';
import { validateRequestBody } from '../../shared/utils/validation.util';
import { validateAddress } from '../../shared/utils/address-validation.util';
import { AuthorizedAPIGatewayProxyEvent } from '../../shared/types';
import { OrdersService } from './services/orders.service';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderResponse,
  OrderListResponse,
  OrderItemResponse,
} from './types';
import { validate as uuidValidate } from 'uuid';

const ordersService = new OrdersService();

/**
 * Check if user has admin privileges
 * @param event - API Gateway event
 * @returns true if user is an admin, false otherwise
 */
function isAdmin(event: AuthorizedAPIGatewayProxyEvent): boolean {
  const groups = event.requestContext.authorizer?.claims?.['cognito:groups'];
  if (!groups) return false;

  // Groups can be a string like "[admin]" or "admin" depending on Cognito config
  // Handle both string and array formats
  if (typeof groups === 'string') {
    return groups.includes('admin');
  }

  if (Array.isArray(groups)) {
    return groups.includes('admin');
  }

  return false;
}

export const handler = async (
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Orders Handler - Event:', JSON.stringify(event, null, 2));

  try {
    const path = event.path;
    const method = event.httpMethod;
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
      return errorResponse('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (method === 'OPTIONS') {
      return successResponse({}, 200);
    }

    if (path === '/orders' && method === 'GET') {
      return await handleListOrders(userId, event);
    }

    if (path === '/orders' && method === 'POST') {
      return await handleCreateOrder(userId, event);
    }

    const orderIdMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderIdMatch) {
      const orderId = orderIdMatch[1];

      if (method === 'GET') {
        return await handleGetOrder(userId, orderId);
      }
    }

    const statusMatch = path.match(/^\/orders\/([^/]+)\/status$/);
    if (statusMatch) {
      const orderId = statusMatch[1];

      if (method === 'PUT') {
        return await handleUpdateOrderStatus(userId, orderId, event);
      }
    }

    return errorResponse('Route not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('Orders Handler - Error:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }

    if (error instanceof Error) {
      return errorResponse(error.message, 500, 'INTERNAL_SERVER_ERROR');
    }

    return errorResponse('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
  }
};

async function handleListOrders(
  userId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit, 10)
    : 50;

  const orders = await ordersService.getUserOrders(userId, limit);

  const response: OrderListResponse = {
    orders: orders.map(mapOrderToResponse),
    count: orders.length,
    hasMore: orders.length === limit,
  };

  return successResponse(response, 200);
}

async function handleGetOrder(
  userId: string,
  orderId: string
): Promise<APIGatewayProxyResult> {
  const order = await ordersService.getOrderById(userId, orderId);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const response: OrderResponse = mapOrderToResponse(order);

  return successResponse(response, 200);
}

async function handleCreateOrder(
  userId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as CreateOrderRequest;

  validateRequestBody(body, [
    { field: 'shippingAddress', required: true, type: 'object' },
    { field: 'paymentMethod', required: true, type: 'string' },
  ]);

  const { shippingAddress, paymentMethod, idempotencyKey } = body;

  // Validate address fields
  const addressErrors = validateAddress(shippingAddress);
  if (addressErrors.length > 0) {
    throw new ValidationError('Validation failed', {
      errors: addressErrors,
    });
  }

  // Validate idempotency key if provided (optional for backward compatibility)
  if (idempotencyKey !== undefined && idempotencyKey !== null) {
    if (typeof idempotencyKey !== 'string' || !uuidValidate(idempotencyKey)) {
      throw new ValidationError('Validation failed', {
        errors: [
          {
            field: 'idempotencyKey',
            message: 'Idempotency key must be a valid UUID',
            code: 'INVALID_FORMAT',
          },
        ],
      });
    }
  }

  // Create order from cart using DynamoDB transaction
  const result = await ordersService.createOrderFromCart(
    userId,
    shippingAddress,
    paymentMethod,
    idempotencyKey
  );

  const response: OrderResponse = mapOrderToResponse(result.order);

  // Return 200 for idempotent requests, 201 for new orders
  return successResponse(response, result.isIdempotent ? 200 : 201);
}

async function handleUpdateOrderStatus(
  userId: string,
  orderId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as UpdateOrderStatusRequest;

  validateRequestBody(body, [{ field: 'status', required: true, type: 'string' }]);

  const { status } = body;

  const validStatuses = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  if (!validStatuses.includes(status)) {
    throw new ValidationError('Invalid status value');
  }

  // Get existing order to validate ownership
  const existingOrder = await ordersService.getOrderById(userId, orderId);
  if (!existingOrder) {
    return errorResponse('Order not found', 404, 'NOT_FOUND');
  }

  const admin = isAdmin(event);

  // Non-admin users: can only cancel their own pending orders
  if (!admin) {
    if (existingOrder.userId !== userId) {
      return errorResponse(
        'Forbidden: Cannot update other users\' orders',
        403,
        'FORBIDDEN'
      );
    }
    if (status !== 'cancelled') {
      return errorResponse(
        'Customers can only cancel orders',
        403,
        'FORBIDDEN'
      );
    }
    if (existingOrder.status !== 'pending') {
      return errorResponse(
        'Can only cancel pending orders',
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  const order = await ordersService.updateOrderStatus(userId, orderId, status);

  const response: OrderResponse = mapOrderToResponse(order);

  return successResponse(response, 200);
}

function mapOrderToResponse(order: any): OrderResponse {
  return {
    orderId: order.orderId,
    userId: order.userId,
    items: order.items.map((item: any): OrderItemResponse => ({
      itemId: item.itemId,
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    totalAmount: order.totalAmount,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
