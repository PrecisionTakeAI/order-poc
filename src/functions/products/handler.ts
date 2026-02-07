import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '../../shared/utils/response.util';
import { ValidationError, NotFoundError } from '../../shared/utils/error.util';
import { validateRequestBody } from '../../shared/utils/validation.util';
import { encodePaginationToken, parsePaginationParams } from '../../shared/utils/pagination.util';
import { PRODUCT_CATEGORIES } from '../../shared/types/product-categories';
import { ProductEntity } from '../../shared/types';
import { ProductsService } from './services/products.service';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductListResponse,
  SearchProductsResponse,
  CategoryProductsResponse,
  SortBy,
} from './types';

const productsService = new ProductsService();

const VALID_SORT_VALUES: SortBy[] = ['price-asc', 'price-desc', 'newest'];

/**
 * Check if user has admin privileges
 * @param event - API Gateway event
 * @returns true if user is an admin, false otherwise
 */
function isAdmin(event: APIGatewayProxyEvent): boolean {
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
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Products Handler - Event:', JSON.stringify(event, null, 2));

  try {
    const path = event.path;
    const method = event.httpMethod;

    if (method === 'OPTIONS') {
      return successResponse({}, 200);
    }

    // Search route - MUST match before /products/{id} to avoid conflict
    const searchMatch = path.match(/^\/products\/search$/);
    if (searchMatch && method === 'GET') {
      return await handleSearchProducts(event);
    }

    // Category route - match /products/category/{category}
    const categoryMatch = path.match(/^\/products\/category\/([^/]+)$/);
    if (categoryMatch && method === 'GET') {
      const category = decodeURIComponent(categoryMatch[1]);
      return await handleGetProductsByCategory(category, event);
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
        return await handleDeleteProduct(productId, event);
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
  const { limit, lastKey } = parsePaginationParams(event.queryStringParameters);

  // Validate sortBy if provided
  const sortByParam = event.queryStringParameters?.sortBy;
  let sortBy: SortBy | undefined;
  if (sortByParam) {
    if (!VALID_SORT_VALUES.includes(sortByParam as SortBy)) {
      throw new ValidationError(
        `Invalid sortBy value. Must be one of: ${VALID_SORT_VALUES.join(', ')}`
      );
    }
    sortBy = sortByParam as SortBy;
  }

  const result = await productsService.listProducts({ limit, lastKey, sortBy });
  const encodedLastKey = result.lastEvaluatedKey
    ? encodePaginationToken(result.lastEvaluatedKey)
    : null;

  const response: ProductListResponse = {
    products: result.products.map(mapProductToResponse),
    count: result.products.length,
    lastKey: encodedLastKey,
    hasMore: !!result.lastEvaluatedKey,
  };

  return successResponse(response, 200);
}

async function handleSearchProducts(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const query = event.queryStringParameters?.q;

  if (!query || query.trim().length < 2) {
    throw new ValidationError(
      'Search query parameter "q" is required and must be at least 2 characters'
    );
  }

  const { limit, lastKey } = parsePaginationParams(event.queryStringParameters);

  const result = await productsService.searchProducts(query.trim(), { limit, lastKey });
  const encodedLastKey = result.lastEvaluatedKey
    ? encodePaginationToken(result.lastEvaluatedKey)
    : null;

  const response: SearchProductsResponse = {
    products: result.products.map(mapProductToResponse),
    count: result.products.length,
    lastKey: encodedLastKey,
    hasMore: !!result.lastEvaluatedKey,
    query: query.trim(),
  };

  return successResponse(response, 200);
}

async function handleGetProductsByCategory(
  category: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Validate category against known categories
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category)) {
    throw new ValidationError(
      `Invalid category "${category}". Valid categories: ${PRODUCT_CATEGORIES.join(', ')}`
    );
  }

  const { limit, lastKey } = parsePaginationParams(event.queryStringParameters);

  // Parse price range
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  if (event.queryStringParameters?.minPrice) {
    minPrice = parseFloat(event.queryStringParameters.minPrice);
    if (isNaN(minPrice) || minPrice < 0) {
      throw new ValidationError('minPrice must be a non-negative number');
    }
  }

  if (event.queryStringParameters?.maxPrice) {
    maxPrice = parseFloat(event.queryStringParameters.maxPrice);
    if (isNaN(maxPrice) || maxPrice < 0) {
      throw new ValidationError('maxPrice must be a non-negative number');
    }
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ValidationError('minPrice must be less than or equal to maxPrice');
  }

  const result = await productsService.getProductsByCategory(category, {
    minPrice,
    maxPrice,
    limit,
    lastKey,
  });

  const encodedLastKey = result.lastEvaluatedKey
    ? encodePaginationToken(result.lastEvaluatedKey)
    : null;

  const response: CategoryProductsResponse = {
    products: result.products.map(mapProductToResponse),
    count: result.products.length,
    lastKey: encodedLastKey,
    hasMore: !!result.lastEvaluatedKey,
    category,
    priceRange:
      minPrice !== undefined || maxPrice !== undefined
        ? { min: minPrice, max: maxPrice }
        : null,
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
  // Check admin authorization
  if (!isAdmin(event)) {
    return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
  }

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
  // Check admin authorization
  if (!isAdmin(event)) {
    return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
  }

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
  productId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  // Check admin authorization
  if (!isAdmin(event)) {
    return errorResponse('Forbidden: Admin access required', 403, 'FORBIDDEN');
  }

  const product = await productsService.getProductById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  await productsService.deleteProduct(productId);

  return successResponse({ message: 'Product deleted successfully' }, 200);
}

function mapProductToResponse(product: ProductEntity): ProductResponse {
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
