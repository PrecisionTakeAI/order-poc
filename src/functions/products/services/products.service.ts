import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { ProductEntity } from '../../../shared/types';
import { ProductListResult, SortBy } from '../types';
import { decodePaginationToken } from '../../../shared/utils/pagination.util';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PRODUCTS_TABLE || '';
const CATEGORY_INDEX = process.env.PRODUCTS_CATEGORY_INDEX || 'category-price-index';

export class ProductsService {
  async createProduct(
    productId: string,
    name: string,
    description: string,
    price: number,
    currency: string,
    stock: number,
    category: string,
    imageUrl?: string
  ): Promise<ProductEntity> {
    const now = new Date().toISOString();
    const product: ProductEntity = {
      PK: `PRODUCT#${productId}`,
      SK: 'DETAILS',
      productId,
      name,
      description,
      price,
      currency,
      stock,
      category,
      imageUrl,
      status: stock > 0 ? 'active' : 'out_of_stock',
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: product,
      })
    );

    return product;
  }

  async getProductById(productId: string): Promise<ProductEntity | null> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PRODUCT#${productId}`,
          SK: 'DETAILS',
        },
      })
    );

    return (response.Item as ProductEntity) || null;
  }

  async listProducts(options: {
    limit: number;
    lastKey?: string;
    sortBy?: SortBy;
  }): Promise<ProductListResult> {
    const { limit, lastKey, sortBy } = options;

    const scanParams: Record<string, unknown> = {
      TableName: TABLE_NAME,
      Limit: limit,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'PRODUCT#',
      },
    };

    if (lastKey) {
      const decodedKey = decodePaginationToken(lastKey);
      if (decodedKey) {
        scanParams.ExclusiveStartKey = decodedKey;
      }
    }

    const response = await docClient.send(new ScanCommand(scanParams as any));
    let products = (response.Items as ProductEntity[]) || [];

    // In-memory sorting of the returned page
    if (sortBy) {
      products = this.sortProducts(products, sortBy);
    }

    return {
      products,
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  async searchProducts(
    query: string,
    options: { limit: number; lastKey?: string }
  ): Promise<ProductListResult> {
    const { limit, lastKey } = options;
    const lowerQuery = query.toLowerCase();

    const scanParams: Record<string, unknown> = {
      TableName: TABLE_NAME,
      Limit: limit,
      FilterExpression:
        'begins_with(PK, :pk) AND (contains(#productName, :query) OR contains(#description, :query) OR contains(#productName, :queryOriginal) OR contains(#description, :queryOriginal))',
      ExpressionAttributeNames: {
        '#productName': 'name',
        '#description': 'description',
      },
      ExpressionAttributeValues: {
        ':pk': 'PRODUCT#',
        ':query': lowerQuery,
        ':queryOriginal': query,
      },
    };

    if (lastKey) {
      const decodedKey = decodePaginationToken(lastKey);
      if (decodedKey) {
        scanParams.ExclusiveStartKey = decodedKey;
      }
    }

    const response = await docClient.send(new ScanCommand(scanParams as any));
    const products = (response.Items as ProductEntity[]) || [];

    return {
      products,
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  async getProductsByCategory(
    category: string,
    options: { minPrice?: number; maxPrice?: number; limit: number; lastKey?: string }
  ): Promise<ProductListResult> {
    const { minPrice, maxPrice, limit, lastKey } = options;

    let keyConditionExpression = 'category = :category';
    const expressionAttributeValues: Record<string, unknown> = {
      ':category': category,
    };

    // Add price range to key condition if provided (price is the sort key on the GSI)
    if (minPrice !== undefined && maxPrice !== undefined) {
      keyConditionExpression += ' AND price BETWEEN :minPrice AND :maxPrice';
      expressionAttributeValues[':minPrice'] = minPrice;
      expressionAttributeValues[':maxPrice'] = maxPrice;
    } else if (minPrice !== undefined) {
      keyConditionExpression += ' AND price >= :minPrice';
      expressionAttributeValues[':minPrice'] = minPrice;
    } else if (maxPrice !== undefined) {
      keyConditionExpression += ' AND price <= :maxPrice';
      expressionAttributeValues[':maxPrice'] = maxPrice;
    }

    const queryParams: Record<string, unknown> = {
      TableName: TABLE_NAME,
      IndexName: CATEGORY_INDEX,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
    };

    if (lastKey) {
      const decodedKey = decodePaginationToken(lastKey);
      if (decodedKey) {
        queryParams.ExclusiveStartKey = decodedKey;
      }
    }

    const response = await docClient.send(new QueryCommand(queryParams as any));
    const products = (response.Items as ProductEntity[]) || [];

    return {
      products,
      lastEvaluatedKey: response.LastEvaluatedKey,
    };
  }

  async updateProduct(
    productId: string,
    updates: Partial<Omit<ProductEntity, 'PK' | 'SK' | 'productId'>>
  ): Promise<ProductEntity> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const response = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PRODUCT#${productId}`,
          SK: 'DETAILS',
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return response.Attributes as ProductEntity;
  }

  async deleteProduct(productId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PRODUCT#${productId}`,
          SK: 'DETAILS',
        },
      })
    );
  }

  private sortProducts(products: ProductEntity[], sortBy: SortBy): ProductEntity[] {
    const sorted = [...products];
    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }
    return sorted;
  }
}
