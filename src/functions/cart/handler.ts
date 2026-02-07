import { APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError, NotFoundError } from '../../shared/utils/error.util';
import { validateRequestBody } from '../../shared/utils/validation.util';
import { AuthorizedAPIGatewayProxyEvent } from '../../shared/types';
import { CartService } from './services/cart.service';
import {
  AddItemRequest,
  UpdateItemRequest,
  CartResponse,
  CartItemResponse,
} from './types';

const cartService = new CartService();

export const handler = async (
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Cart Handler - Event:', JSON.stringify(event, null, 2));

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

    if (path === '/cart' && method === 'GET') {
      return await handleGetCart(userId);
    }

    if (path === '/cart' && method === 'DELETE') {
      return await handleClearCart(userId);
    }

    if (path === '/cart/items' && method === 'POST') {
      return await handleAddItem(userId, event);
    }

    const itemIdMatch = path.match(/^\/cart\/items\/([^/]+)$/);
    if (itemIdMatch) {
      const itemId = itemIdMatch[1];

      if (method === 'PUT') {
        return await handleUpdateItem(userId, itemId, event);
      }

      if (method === 'DELETE') {
        return await handleRemoveItem(userId, itemId);
      }
    }

    return errorResponse('Route not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('Cart Handler - Error:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }

    if (error instanceof Error) {
      return errorResponse(error.message, 500, 'INTERNAL_SERVER_ERROR');
    }

    return errorResponse('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
  }
};

async function handleGetCart(userId: string): Promise<APIGatewayProxyResult> {
  const cart = await cartService.getCart(userId);

  if (!cart) {
    const emptyCart: CartResponse = {
      userId,
      items: [],
      totalAmount: 0,
      currency: 'USD',
      updatedAt: new Date().toISOString(),
    };
    return successResponse(emptyCart, 200);
  }

  const response: CartResponse = mapCartToResponse(cart);

  return successResponse(response, 200);
}

async function handleAddItem(
  userId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as AddItemRequest;

  validateRequestBody(body, [
    { field: 'productId', required: true, type: 'string' },
    { field: 'productName', required: true, type: 'string' },
    { field: 'price', required: true, type: 'number', min: 0 },
    { field: 'quantity', required: true, type: 'number', min: 1 },
  ]);

  const { productId, productName, price, quantity } = body;

  const cart = await cartService.addItem(
    userId,
    productId,
    productName,
    price,
    quantity
  );

  const response: CartResponse = mapCartToResponse(cart);

  return successResponse(response, 200);
}

async function handleUpdateItem(
  userId: string,
  itemId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as UpdateItemRequest;

  validateRequestBody(body, [
    { field: 'quantity', required: true, type: 'number', min: 1 },
  ]);

  const { quantity } = body;

  const cart = await cartService.updateItem(userId, itemId, quantity);

  const response: CartResponse = mapCartToResponse(cart);

  return successResponse(response, 200);
}

async function handleRemoveItem(
  userId: string,
  itemId: string
): Promise<APIGatewayProxyResult> {
  const cart = await cartService.removeItem(userId, itemId);

  const response: CartResponse = mapCartToResponse(cart);

  return successResponse(response, 200);
}

async function handleClearCart(userId: string): Promise<APIGatewayProxyResult> {
  await cartService.clearCart(userId);

  return successResponse({ message: 'Cart cleared successfully' }, 200);
}

function mapCartToResponse(cart: any): CartResponse {
  return {
    userId: cart.userId,
    items: cart.items.map((item: any): CartItemResponse => ({
      itemId: item.itemId,
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    totalAmount: cart.totalAmount,
    currency: cart.currency,
    updatedAt: cart.updatedAt,
  };
}
