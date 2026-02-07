import { APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError, NotFoundError } from '../../shared/utils/error.util';
import { validateRequestBody } from '../../shared/utils/validation.util';
import { AuthorizedAPIGatewayProxyEvent, OrderItem } from '../../shared/types';
import { OrdersService } from './services/orders.service';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderResponse,
  OrderListResponse,
  OrderItemResponse,
} from './types';

const ordersService = new OrdersService();

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

    if (error instanceof ValidationError || error instanceof NotFoundError) {
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
    { field: 'items', required: true, type: 'object' },
    { field: 'shippingAddress', required: true, type: 'object' },
    { field: 'paymentMethod', required: true, type: 'string' },
  ]);

  const { items, shippingAddress, paymentMethod } = body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Items must be a non-empty array');
  }

  const orderItems: OrderItem[] = items.map((item) => ({
    itemId: uuidv4(),
    productId: item.productId,
    productName: item.productName,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  const order = await ordersService.createOrder(
    userId,
    orderItems,
    shippingAddress,
    paymentMethod
  );

  const response: OrderResponse = mapOrderToResponse(order);

  return successResponse(response, 201);
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
