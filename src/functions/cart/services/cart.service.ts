import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  PutCommandInput,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CartEntity, CartItem, ProductEntity } from '../../../shared/types';
import { ProductsService } from '../../products/services/products.service';
import { CurrentProductInfo } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.CARTS_TABLE || '';

export class CartService {
  async getCart(userId: string): Promise<CartEntity | null> {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'CART',
        },
      })
    );

    const cart = response.Item as CartEntity;

    // Initialize version to 0 if not present (backward compatibility)
    if (cart && cart.version === undefined) {
      cart.version = 0;
    }

    return cart || null;
  }

  async addItem(
    userId: string,
    product: ProductEntity,
    quantity: number
  ): Promise<CartEntity> {
    const cart = await this.getCart(userId);

    const newItem: CartItem = {
      itemId: uuidv4(),
      productId: product.productId,
      productName: product.name,
      price: product.price,
      quantity,
      subtotal: product.price * quantity,
    };

    let items: CartItem[];
    if (cart) {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId === product.productId
      );

      if (existingItemIndex >= 0) {
        items = [...cart.items];
        items[existingItemIndex].quantity += quantity;
        items[existingItemIndex].subtotal =
          items[existingItemIndex].price * items[existingItemIndex].quantity;
      } else {
        items = [...cart.items, newItem];
      }
    } else {
      items = [newItem];
    }

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const now = new Date().toISOString();
    const updatedCart: CartEntity = {
      PK: `USER#${userId}`,
      SK: 'CART',
      userId,
      items,
      totalAmount,
      currency: 'USD',
      version: cart?.version || 0,
      createdAt: cart?.createdAt || now,
      updatedAt: now,
    };

    return updatedCart;
  }

  async updateItem(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartEntity> {
    const cart = await this.getCart(userId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.productId === productId);

    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    const items = [...cart.items];

    if (quantity === 0) {
      // Remove item if quantity is 0
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantity = quantity;
      items[itemIndex].subtotal = items[itemIndex].price * quantity;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const updatedCart: CartEntity = {
      ...cart,
      items,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };

    return updatedCart;
  }

  async removeItem(userId: string, productId: string): Promise<CartEntity> {
    const cart = await this.getCart(userId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    const items = cart.items.filter((item) => item.productId !== productId);

    if (items.length === cart.items.length) {
      throw new Error('Item not found in cart');
    }

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const updatedCart: CartEntity = {
      ...cart,
      items,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };

    return updatedCart;
  }

  async saveCart(cart: CartEntity, expectedVersion?: number): Promise<CartEntity> {
    const newVersion = (cart.version || 0) + 1;
    const updatedCart: CartEntity = {
      ...cart,
      version: newVersion,
      updatedAt: new Date().toISOString(),
    };

    const params: PutCommandInput = {
      TableName: TABLE_NAME,
      Item: updatedCart,
    };

    // Add conditional expression for optimistic locking
    if (expectedVersion !== undefined) {
      params.ConditionExpression = 'attribute_not_exists(version) OR version = :expectedVersion';
      params.ExpressionAttributeValues = {
        ':expectedVersion': expectedVersion,
      };
    }

    await docClient.send(new PutCommand(params));

    return updatedCart;
  }

  async enrichCartWithProducts(
    cart: CartEntity,
    productsService: ProductsService
  ): Promise<{
    userId: string;
    items: any[];
    totalAmount: number;
    currency: string;
    itemCount: number;
    updatedAt: string;
  }> {
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        try {
          const product = await productsService.getProductById(item.productId);
          const currentProduct: CurrentProductInfo | null = product
            ? {
                name: product.name,
                price: product.price,
                stock: product.stock,
                status: product.status,
                imageUrl: product.imageUrl,
              }
            : null;

          return {
            ...item,
            currentProduct,
          };
        } catch (error) {
          console.warn(`Failed to fetch product ${item.productId}:`, error);
          return {
            ...item,
            currentProduct: null,
          };
        }
      })
    );

    return {
      userId: cart.userId,
      items: enrichedItems,
      totalAmount: cart.totalAmount,
      currency: cart.currency,
      itemCount: cart.items.length,
      updatedAt: cart.updatedAt,
    };
  }

  async clearCart(userId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'CART',
        },
      })
    );
  }
}
