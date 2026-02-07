import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { ProductEntity } from '../../../shared/types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PRODUCTS_TABLE || '';

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

  async listProducts(limit: number = 50): Promise<ProductEntity[]> {
    const response = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': 'PRODUCT#',
        },
      })
    );

    return (response.Items as ProductEntity[]) || [];
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
}
