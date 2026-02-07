import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError, NotFoundError } from '../../shared/utils/error.util';
import { validateRequestBody } from '../../shared/utils/validation.util';
import { ProductsService } from './services/products.service';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductListResponse,
} from './types';

const productsService = new ProductsService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Products Handler - Event:', JSON.stringify(event, null, 2));

  try {
    const path = event.path;
    const method = event.httpMethod;

    if (method === 'OPTIONS') {
      return successResponse({}, 200);
    }

    if (path === '/products' && method === 'GET') {
      return await handleListProducts(event);
    }

    if (path === '/products' && method === 'POST') {
      return await handleCreateProduct(event);
    }

    const productIdMatch = path.match(/^\/products\/([^/]+)$/);
    if (productIdMatch) {
      const productId = productIdMatch[1];

      if (method === 'GET') {
        return await handleGetProduct(productId);
      }

      if (method === 'PUT') {
        return await handleUpdateProduct(productId, event);
      }

      if (method === 'DELETE') {
        return await handleDeleteProduct(productId);
      }
    }

    return errorResponse('Route not found', 404, 'NOT_FOUND');
  } catch (error) {
    console.error('Products Handler - Error:', error);

    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }

    if (error instanceof Error) {
      return errorResponse(error.message, 500, 'INTERNAL_SERVER_ERROR');
    }

    return errorResponse('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR');
  }
};

async function handleListProducts(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const limit = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters.limit, 10)
    : 50;

  const products = await productsService.listProducts(limit);

  const response: ProductListResponse = {
    products: products.map(mapProductToResponse),
    count: products.length,
    hasMore: products.length === limit,
  };

  return successResponse(response, 200);
}

async function handleGetProduct(
  productId: string
): Promise<APIGatewayProxyResult> {
  const product = await productsService.getProductById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const response: ProductResponse = mapProductToResponse(product);

  return successResponse(response, 200);
}

async function handleCreateProduct(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as CreateProductRequest;

  validateRequestBody(body, [
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 200 },
    { field: 'description', required: true, type: 'string', minLength: 1 },
    { field: 'price', required: true, type: 'number', min: 0 },
    { field: 'currency', required: true, type: 'string' },
    { field: 'stock', required: true, type: 'number', min: 0 },
    { field: 'category', required: true, type: 'string' },
  ]);

  const { name, description, price, currency, stock, category, imageUrl } = body;

  const productId = uuidv4();
  const product = await productsService.createProduct(
    productId,
    name,
    description,
    price,
    currency,
    stock,
    category,
    imageUrl
  );

  const response: ProductResponse = mapProductToResponse(product);

  return successResponse(response, 201);
}

async function handleUpdateProduct(
  productId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}') as UpdateProductRequest;

  const product = await productsService.getProductById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const updates: Partial<UpdateProductRequest> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.price !== undefined) updates.price = body.price;
  if (body.stock !== undefined) updates.stock = body.stock;
  if (body.category !== undefined) updates.category = body.category;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
  if (body.status !== undefined) updates.status = body.status;

  const updatedProduct = await productsService.updateProduct(productId, updates);

  const response: ProductResponse = mapProductToResponse(updatedProduct);

  return successResponse(response, 200);
}

async function handleDeleteProduct(
  productId: string
): Promise<APIGatewayProxyResult> {
  const product = await productsService.getProductById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  await productsService.deleteProduct(productId);

  return successResponse({ message: 'Product deleted successfully' }, 200);
}

function mapProductToResponse(product: any): ProductResponse {
  return {
    productId: product.productId,
    name: product.name,
    description: product.description,
    price: product.price,
    currency: product.currency,
    stock: product.stock,
    category: product.category,
    imageUrl: product.imageUrl,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
