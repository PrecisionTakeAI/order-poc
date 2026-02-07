import { handler } from '../../src/functions/products/handler';
import { ProductsService } from '../../src/functions/products/services/products.service';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the ProductsService
jest.mock('../../src/functions/products/services/products.service');

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('Products Handler', () => {
  let mockListProducts: jest.SpyInstance;
  let mockSearchProducts: jest.SpyInstance;
  let mockGetProductsByCategory: jest.SpyInstance;
  let mockGetProductById: jest.SpyInstance;

  const mockProduct = {
    PK: 'PRODUCT#prod-1',
    SK: 'DETAILS',
    productId: 'prod-1',
    name: 'Cricket Bat Pro',
    description: 'A professional cricket bat',
    price: 150,
    currency: 'USD',
    stock: 10,
    category: 'Bats',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockListProducts = jest.spyOn(ProductsService.prototype, 'listProducts').mockResolvedValue({
      products: [mockProduct as any],
      lastEvaluatedKey: undefined,
    });
    mockSearchProducts = jest.spyOn(ProductsService.prototype, 'searchProducts').mockResolvedValue({
      products: [mockProduct as any],
      lastEvaluatedKey: undefined,
    });
    mockGetProductsByCategory = jest.spyOn(ProductsService.prototype, 'getProductsByCategory').mockResolvedValue({
      products: [mockProduct as any],
      lastEvaluatedKey: undefined,
    });
    mockGetProductById = jest.spyOn(ProductsService.prototype, 'getProductById').mockResolvedValue(mockProduct as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    path: '/products',
    httpMethod: 'GET',
    headers: {},
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
  });

  // ---- List Products ----

  describe('GET /products (list)', () => {
    it('should list products with default pagination', async () => {
      const event = createMockEvent({ path: '/products', httpMethod: 'GET' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.products).toHaveLength(1);
      expect(body.data.count).toBe(1);
      expect(body.data.hasMore).toBe(false);
      expect(body.data.lastKey).toBeNull();
      expect(mockListProducts).toHaveBeenCalledWith({
        limit: 50,
        lastKey: undefined,
        sortBy: undefined,
      });
    });

    it('should pass custom limit and sortBy', async () => {
      const event = createMockEvent({
        path: '/products',
        httpMethod: 'GET',
        queryStringParameters: { limit: '10', sortBy: 'price-asc' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      expect(mockListProducts).toHaveBeenCalledWith({
        limit: 10,
        lastKey: undefined,
        sortBy: 'price-asc',
      });
    });

    it('should return pagination token when more results exist', async () => {
      const lastKey = { PK: 'PRODUCT#abc', SK: 'DETAILS' };
      mockListProducts.mockResolvedValueOnce({
        products: [mockProduct],
        lastEvaluatedKey: lastKey,
      });

      const event = createMockEvent({ path: '/products', httpMethod: 'GET' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.hasMore).toBe(true);
      expect(body.data.lastKey).toBeTruthy();
      expect(typeof body.data.lastKey).toBe('string');
    });

    it('should reject invalid sortBy value', async () => {
      const event = createMockEvent({
        path: '/products',
        httpMethod: 'GET',
        queryStringParameters: { sortBy: 'invalid' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ---- Search Products ----

  describe('GET /products/search', () => {
    it('should search products with valid query', async () => {
      const event = createMockEvent({
        path: '/products/search',
        httpMethod: 'GET',
        queryStringParameters: { q: 'cricket' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.query).toBe('cricket');
      expect(body.data.products).toHaveLength(1);
      expect(mockSearchProducts).toHaveBeenCalledWith('cricket', {
        limit: 50,
        lastKey: undefined,
      });
    });

    it('should reject search with query shorter than 2 chars', async () => {
      const event = createMockEvent({
        path: '/products/search',
        httpMethod: 'GET',
        queryStringParameters: { q: 'a' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject search with missing query', async () => {
      const event = createMockEvent({
        path: '/products/search',
        httpMethod: 'GET',
        queryStringParameters: null,
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should trim whitespace from search query', async () => {
      const event = createMockEvent({
        path: '/products/search',
        httpMethod: 'GET',
        queryStringParameters: { q: '  cricket bat  ' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.query).toBe('cricket bat');
    });

    it('should pass pagination params to search', async () => {
      const event = createMockEvent({
        path: '/products/search',
        httpMethod: 'GET',
        queryStringParameters: { q: 'bat', limit: '5', lastKey: 'sometoken' },
      });

      await handler(event);
      expect(mockSearchProducts).toHaveBeenCalledWith('bat', {
        limit: 5,
        lastKey: 'sometoken',
      });
    });
  });

  // ---- Category Products ----

  describe('GET /products/category/{category}', () => {
    it('should get products by valid category', async () => {
      const event = createMockEvent({
        path: '/products/category/Bats',
        httpMethod: 'GET',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.category).toBe('Bats');
      expect(body.data.priceRange).toBeNull();
      expect(body.data.products).toHaveLength(1);
    });

    it('should reject invalid category', async () => {
      const event = createMockEvent({
        path: '/products/category/InvalidCategory',
        httpMethod: 'GET',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should pass price range filters', async () => {
      const event = createMockEvent({
        path: '/products/category/Bats',
        httpMethod: 'GET',
        queryStringParameters: { minPrice: '50', maxPrice: '200' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.priceRange).toEqual({ min: 50, max: 200 });
      expect(mockGetProductsByCategory).toHaveBeenCalledWith('Bats', {
        minPrice: 50,
        maxPrice: 200,
        limit: 50,
        lastKey: undefined,
      });
    });

    it('should reject when minPrice > maxPrice', async () => {
      const event = createMockEvent({
        path: '/products/category/Bats',
        httpMethod: 'GET',
        queryStringParameters: { minPrice: '200', maxPrice: '50' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject negative minPrice', async () => {
      const event = createMockEvent({
        path: '/products/category/Bats',
        httpMethod: 'GET',
        queryStringParameters: { minPrice: '-10' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should reject non-numeric maxPrice', async () => {
      const event = createMockEvent({
        path: '/products/category/Bats',
        httpMethod: 'GET',
        queryStringParameters: { maxPrice: 'abc' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should handle URL-encoded category names', async () => {
      // URL-encoded "Protection"
      const event = createMockEvent({
        path: '/products/category/Protection',
        httpMethod: 'GET',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.category).toBe('Protection');
    });
  });

  // ---- Get Single Product ----

  describe('GET /products/{id}', () => {
    it('should get a product by ID', async () => {
      const event = createMockEvent({
        path: '/products/prod-1',
        httpMethod: 'GET',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.productId).toBe('prod-1');
    });

    it('should return 404 for non-existent product', async () => {
      mockGetProductById.mockResolvedValueOnce(null);
      const event = createMockEvent({
        path: '/products/nonexistent',
        httpMethod: 'GET',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });
  });

  // ---- Route Not Found ----

  describe('Route not found', () => {
    it('should return 404 for unknown route', async () => {
      const event = createMockEvent({
        path: '/products/unknown/route/extra',
        httpMethod: 'GET',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });
  });

  // ---- OPTIONS ----

  describe('OPTIONS', () => {
    it('should handle OPTIONS requests', async () => {
      const event = createMockEvent({
        path: '/products',
        httpMethod: 'OPTIONS',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
    });
  });
});
