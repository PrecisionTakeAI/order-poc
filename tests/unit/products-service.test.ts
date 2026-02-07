/**
 * ProductsService unit tests
 *
 * Uses jest.mock with standard module specifiers. The moduleNameMapper in
 * jest.config.js ensures @aws-sdk/* resolves to src/node_modules versions.
 */

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: mockSend,
    }),
  },
  PutCommand: jest.fn().mockImplementation((params: unknown) => params),
  GetCommand: jest.fn().mockImplementation((params: unknown) => params),
  UpdateCommand: jest.fn().mockImplementation((params: unknown) => params),
  DeleteCommand: jest.fn().mockImplementation((params: unknown) => params),
  ScanCommand: jest.fn().mockImplementation((params: unknown) => params),
  QueryCommand: jest.fn().mockImplementation((params: unknown) => params),
}));

// Set env vars before importing the service
process.env.PRODUCTS_TABLE = 'OrderPOC-Products-test';
process.env.PRODUCTS_CATEGORY_INDEX = 'category-price-index';

import { ProductsService } from '../../src/functions/products/services/products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProduct = {
    PK: 'PRODUCT#prod-1' as const,
    SK: 'DETAILS' as const,
    productId: 'prod-1',
    name: 'Cricket Bat Pro',
    description: 'A professional cricket bat',
    price: 150,
    currency: 'USD',
    stock: 10,
    category: 'Bats',
    status: 'active' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockSend.mockReset();
    service = new ProductsService();
  });

  describe('listProducts', () => {
    it('should return products with pagination info', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: undefined,
      });

      const result = await service.listProducts({ limit: 50 });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].productId).toBe('prod-1');
      expect(result.lastEvaluatedKey).toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return LastEvaluatedKey when more items exist', async () => {
      const lastKey = { PK: 'PRODUCT#prod-2', SK: 'DETAILS' };
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: lastKey,
      });

      const result = await service.listProducts({ limit: 1 });

      expect(result.lastEvaluatedKey).toEqual(lastKey);
    });

    it('should sort products by price ascending', async () => {
      const products = [
        { ...mockProduct, productId: 'p1', price: 200, PK: 'PRODUCT#p1' as const },
        { ...mockProduct, productId: 'p2', price: 50, PK: 'PRODUCT#p2' as const },
        { ...mockProduct, productId: 'p3', price: 150, PK: 'PRODUCT#p3' as const },
      ];
      mockSend.mockResolvedValueOnce({
        Items: products,
        LastEvaluatedKey: undefined,
      });

      const result = await service.listProducts({ limit: 50, sortBy: 'price-asc' });

      expect(result.products[0].price).toBe(50);
      expect(result.products[1].price).toBe(150);
      expect(result.products[2].price).toBe(200);
    });

    it('should sort products by price descending', async () => {
      const products = [
        { ...mockProduct, productId: 'p1', price: 50, PK: 'PRODUCT#p1' as const },
        { ...mockProduct, productId: 'p2', price: 200, PK: 'PRODUCT#p2' as const },
        { ...mockProduct, productId: 'p3', price: 150, PK: 'PRODUCT#p3' as const },
      ];
      mockSend.mockResolvedValueOnce({
        Items: products,
        LastEvaluatedKey: undefined,
      });

      const result = await service.listProducts({ limit: 50, sortBy: 'price-desc' });

      expect(result.products[0].price).toBe(200);
      expect(result.products[1].price).toBe(150);
      expect(result.products[2].price).toBe(50);
    });

    it('should sort products by newest first', async () => {
      const products = [
        { ...mockProduct, productId: 'p1', createdAt: '2025-01-01T00:00:00.000Z', PK: 'PRODUCT#p1' as const },
        { ...mockProduct, productId: 'p2', createdAt: '2025-03-01T00:00:00.000Z', PK: 'PRODUCT#p2' as const },
        { ...mockProduct, productId: 'p3', createdAt: '2025-02-01T00:00:00.000Z', PK: 'PRODUCT#p3' as const },
      ];
      mockSend.mockResolvedValueOnce({
        Items: products,
        LastEvaluatedKey: undefined,
      });

      const result = await service.listProducts({ limit: 50, sortBy: 'newest' });

      expect(result.products[0].createdAt).toBe('2025-03-01T00:00:00.000Z');
      expect(result.products[1].createdAt).toBe('2025-02-01T00:00:00.000Z');
      expect(result.products[2].createdAt).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle empty results', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const result = await service.listProducts({ limit: 50 });
      expect(result.products).toHaveLength(0);
    });

    it('should pass ExclusiveStartKey when lastKey is provided', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const key = { PK: 'PRODUCT#prod-1', SK: 'DETAILS' };
      const token = Buffer.from(JSON.stringify(key)).toString('base64');

      await service.listProducts({ limit: 10, lastKey: token });

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchProducts', () => {
    it('should search products by keyword', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: undefined,
      });

      const result = await service.searchProducts('cricket', { limit: 50 });

      expect(result.products).toHaveLength(1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return empty results when no matches found', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const result = await service.searchProducts('nonexistent', { limit: 50 });

      expect(result.products).toHaveLength(0);
    });

    it('should support pagination for search', async () => {
      const lastKey = { PK: 'PRODUCT#prod-5', SK: 'DETAILS' };
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: lastKey,
      });

      const result = await service.searchProducts('cricket', { limit: 1 });

      expect(result.lastEvaluatedKey).toEqual(lastKey);
    });
  });

  describe('getProductsByCategory', () => {
    it('should query products by category using GSI', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: undefined,
      });

      const result = await service.getProductsByCategory('Bats', { limit: 50 });

      expect(result.products).toHaveLength(1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should support price range filtering with both min and max', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: undefined,
      });

      const result = await service.getProductsByCategory('Bats', {
        minPrice: 100,
        maxPrice: 500,
        limit: 50,
      });

      expect(result.products).toHaveLength(1);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should support minPrice only', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: undefined,
      });

      const result = await service.getProductsByCategory('Bats', {
        minPrice: 100,
        limit: 50,
      });

      expect(result.products).toHaveLength(1);
    });

    it('should support maxPrice only', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: undefined,
      });

      const result = await service.getProductsByCategory('Bats', {
        maxPrice: 200,
        limit: 50,
      });

      expect(result.products).toHaveLength(1);
    });

    it('should support pagination for category queries', async () => {
      const lastKey = { category: 'Bats', price: 200, PK: 'PRODUCT#prod-3', SK: 'DETAILS' };
      mockSend.mockResolvedValueOnce({
        Items: [mockProduct],
        LastEvaluatedKey: lastKey,
      });

      const result = await service.getProductsByCategory('Bats', { limit: 1 });

      expect(result.lastEvaluatedKey).toEqual(lastKey);
    });

    it('should return empty results for category with no products', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const result = await service.getProductsByCategory('Helmets', { limit: 50 });

      expect(result.products).toHaveLength(0);
    });
  });

  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      mockSend.mockResolvedValueOnce({
        Item: mockProduct,
      });

      const result = await service.getProductById('prod-1');
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      mockSend.mockResolvedValueOnce({
        Item: undefined,
      });

      const result = await service.getProductById('nonexistent');
      expect(result).toBeNull();
    });
  });
});
