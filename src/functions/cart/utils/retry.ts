import { CartEntity } from '../../../shared/types';
import { ConflictError } from '../../../shared/utils/error.util';
import { CartService } from '../services/cart.service';

/**
 * Sleep helper for exponential backoff
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Saves cart with retry logic for handling optimistic locking conflicts
 * @param cart - The cart entity to save
 * @param cartService - Instance of CartService
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns The saved CartEntity
 * @throws ConflictError if max retries exceeded
 */
export async function saveCartWithRetry(
  cart: CartEntity,
  cartService: CartService,
  maxRetries: number = 3
): Promise<CartEntity> {
  let attempt = 0;
  let currentCart = cart;

  while (attempt < maxRetries) {
    try {
      return await cartService.saveCart(currentCart, currentCart.version);
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        attempt++;
        console.warn(`Cart save conflict (attempt ${attempt}/${maxRetries})`, {
          userId: cart.userId,
          version: cart.version,
        });

        if (attempt >= maxRetries) {
          throw new ConflictError(
            'Cart was modified by another request. Please retry.',
            { userId: cart.userId, attempts: attempt }
          );
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        await sleep(100 * Math.pow(2, attempt - 1));

        // Refetch latest cart to get new version
        const latestCart = await cartService.getCart(cart.userId);
        if (latestCart) {
          // Use the latest version for next retry
          currentCart = { ...currentCart, version: latestCart.version };
        } else {
          // Cart was deleted, start fresh with version 0
          currentCart = { ...currentCart, version: 0 };
        }

        continue;
      }

      // Non-conflict error, rethrow
      throw error;
    }
  }

  throw new ConflictError('Max retry attempts reached');
}
