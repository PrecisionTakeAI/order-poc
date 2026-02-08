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
import { encodePaginationToken, decodePaginationToken } from '../../shared/utils/pagination.util';

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
    return (groups as string[]).includes('admin');
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
  // Parse and validate query parameters
  const queryParams = event.queryStringParameters || {};

  // Parse limit (1-100, default 50)
  const DEFAULT_LIMIT = 50;
  const MAX_LIMIT = 100;
  const MIN_LIMIT = 1;

  let limit = DEFAULT_LIMIT;
  if (queryParams.limit) {
    const parsed = parseInt(queryParams.limit, 10);
    if (isNaN(parsed) || parsed < MIN_LIMIT || parsed > MAX_LIMIT) {
      throw new ValidationError(
        `Invalid limit. Must be between ${MIN_LIMIT} and ${MAX_LIMIT}`
      );
    }
    limit = parsed;
  }

  // Parse pagination token
  let lastKey: Record<string, unknown> | undefined;
  if (queryParams.lastKey) {
    const decoded = decodePaginationToken(queryParams.lastKey);
    if (!decoded) {
      throw new ValidationError('Invalid pagination token');
    }
    lastKey = decoded;
  }

  // Validate status filter
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
  let status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | undefined;
  if (queryParams.status) {
    if (!validStatuses.includes(queryParams.status as any)) {
      throw new ValidationError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      );
    }
    status = queryParams.status as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  }

  // Validate date range
  let startDate: string | undefined;
  let endDate: string | undefined;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (queryParams.startDate) {
    if (!dateRegex.test(queryParams.startDate)) {
      throw new ValidationError('Invalid startDate format. Use YYYY-MM-DD');
    }
    startDate = queryParams.startDate;
  }

  if (queryParams.endDate) {
    if (!dateRegex.test(queryParams.endDate)) {
      throw new ValidationError('Invalid endDate format. Use YYYY-MM-DD');
    }
    endDate = queryParams.endDate;
  }

  // Validate date range logic
  if (startDate && endDate && startDate > endDate) {
    throw new ValidationError('startDate must be before or equal to endDate');
  }

  // Fetch orders with filters
  const result = await ordersService.getUserOrdersWithFilters({
    userId,
    limit,
    lastKey,
    status,
    startDate,
    endDate,
  });

  // Enrich with current product images
  const enrichedOrders = await ordersService.enrichOrdersWithProductImages(result.orders);

  // Encode pagination token
  const lastKeyEncoded = result.lastEvaluatedKey
    ? encodePaginationToken(result.lastEvaluatedKey)
    : undefined;

  const response: OrderListResponse = {
    orders: enrichedOrders.map(mapOrderToResponse),
    count: enrichedOrders.length,
    hasMore: !!result.lastEvaluatedKey,
    lastKey: lastKeyEncoded,
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

  // CRITICAL: Verify order belongs to the requesting user (prevent cross-user access)
  if (order.userId !== userId) {
    return errorResponse(
      'Forbidden: You do not have permission to view this order',
      403,
      'FORBIDDEN'
    );
  }

  // Enrich with current product images
  const enrichedOrders = await ordersService.enrichOrdersWithProductImages([order]);
  const enrichedOrder = enrichedOrders[0];

  const response: OrderResponse = mapOrderToResponse(enrichedOrder);

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
      currentImageUrl: item.currentImageUrl,
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
