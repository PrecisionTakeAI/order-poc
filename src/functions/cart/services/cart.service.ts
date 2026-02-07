import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CartEntity, CartItem } from '../../../shared/types';

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

    return (response.Item as CartEntity) || null;
  }

  async addItem(
    userId: string,
    productId: string,
    productName: string,
    price: number,
    quantity: number
  ): Promise<CartEntity> {
    const cart = await this.getCart(userId);

    const newItem: CartItem = {
      itemId: uuidv4(),
      productId,
      productName,
      price,
      quantity,
      subtotal: price * quantity,
    };

    let items: CartItem[];
    if (cart) {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId === productId
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
      createdAt: cart?.createdAt || now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedCart,
      })
    );

    return updatedCart;
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<CartEntity> {
    const cart = await this.getCart(userId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);

    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    const items = [...cart.items];
    items[itemIndex].quantity = quantity;
    items[itemIndex].subtotal = items[itemIndex].price * quantity;

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    const updatedCart: CartEntity = {
      ...cart,
      items,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedCart,
      })
    );

    return updatedCart;
  }

  async removeItem(userId: string, itemId: string): Promise<CartEntity> {
    const cart = await this.getCart(userId);

    if (!cart) {
      throw new Error('Cart not found');
    }

    const items = cart.items.filter((item) => item.itemId !== itemId);

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

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedCart,
      })
    );

    return updatedCart;
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
