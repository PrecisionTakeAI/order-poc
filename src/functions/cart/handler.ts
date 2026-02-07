import { APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError, NotFoundError, ConflictError } from '../../shared/utils/error.util';
import { validateRequestBody } from '../../shared/utils/validation.util';
import { AuthorizedAPIGatewayProxyEvent } from '../../shared/types';
import { CartService } from './services/cart.service';
import { ProductsService } from '../products/services/products.service';
import { validateProduct } from './utils/validation';
import { saveCartWithRetry } from './utils/retry';
import {
  AddItemRequest,
  UpdateItemRequest,
  CartResponse,
  CartItemResponse,
} from './types';

const cartService = new CartService();
const productsService = new ProductsService();

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

    if (path === '/cart' && method === 'POST') {
      return await handleAddItem(userId, event);
    }

    const productIdMatch = path.match(/^\/cart\/([^/]+)$/);
    if (productIdMatch) {
      const productId = decodeURIComponent(productIdMatch[1]);

      if (method === 'PUT') {
        return await handleUpdateItem(userId, productId, event);
      }

      if (method === 'DELETE') {
        return await handleRemoveItem(userId, productId);
      }
    }

    return errorResponse('Route not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('Cart Handler - Error:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
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
      itemCount: 0,
      updatedAt: new Date().toISOString(),
    };
    return successResponse(emptyCart, 200);
  }

  const enrichedCart = await cartService.enrichCartWithProducts(cart, productsService);

  return successResponse(enrichedCart, 200);
}

async function handleAddItem(
  userId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as AddItemRequest;

  validateRequestBody(body, [
    { field: 'productId', required: true, type: 'string', minLength: 1 },
    { field: 'quantity', required: true, type: 'number', min: 1, max: 99 },
  ]);

  const { productId, quantity } = body;

  // Check existing cart quantity for accurate stock validation
  const existingCart = await cartService.getCart(userId);
  const existingItem = existingCart?.items.find((item) => item.productId === productId);
  const existingQuantity = existingItem?.quantity || 0;

  // Validate product exists, is active, and has sufficient stock (including existing cart quantity)
  const product = await validateProduct(productId, quantity, productsService, existingQuantity);

  // Add item to cart (does not save yet)
  const cart = await cartService.addItem(userId, product, quantity);

  // Save cart with retry logic — re-apply operation on conflict
  const savedCart = await saveCartWithRetry(cart, cartService, async (latestCart) => {
    const latestItem = latestCart?.items.find((item) => item.productId === productId);
    const latestExistingQty = latestItem?.quantity || 0;
    await validateProduct(productId, quantity, productsService, latestExistingQty);
    return cartService.addItem(userId, product, quantity);
  });

  const response: CartResponse = mapCartToResponse(savedCart);

  return successResponse(response, 200);
}

async function handleUpdateItem(
  userId: string,
  productId: string,
  event: AuthorizedAPIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as UpdateItemRequest;

  validateRequestBody(body, [
    { field: 'quantity', required: true, type: 'number', min: 0, max: 99 },
  ]);

  const { quantity } = body;

  // If quantity > 0, validate product and stock (quantity is the new absolute value, no existing offset)
  if (quantity > 0) {
    await validateProduct(productId, quantity, productsService);
  }

  // Update item (or remove if quantity is 0)
  const cart = await cartService.updateItem(userId, productId, quantity);

  // Save cart with retry logic — re-apply operation on conflict
  const savedCart = await saveCartWithRetry(cart, cartService, async (latestCart) => {
    if (!latestCart) {
      throw new NotFoundError('Cart not found');
    }
    if (quantity > 0) {
      await validateProduct(productId, quantity, productsService);
    }
    return cartService.updateItem(userId, productId, quantity);
  });

  const response: CartResponse = mapCartToResponse(savedCart);

  return successResponse(response, 200);
}

async function handleRemoveItem(
  userId: string,
  productId: string
): Promise<APIGatewayProxyResult> {
  const cart = await cartService.removeItem(userId, productId);

  // Save cart with retry logic — re-apply operation on conflict
  const savedCart = await saveCartWithRetry(cart, cartService, async (latestCart) => {
    if (!latestCart) {
      throw new NotFoundError('Cart not found');
    }
    return cartService.removeItem(userId, productId);
  });

  const response: CartResponse = mapCartToResponse(savedCart);

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
    itemCount: cart.items.length,
    updatedAt: cart.updatedAt,
  };
}
