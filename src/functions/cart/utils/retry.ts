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
 * Callback that re-applies the intended cart operation on top of the latest cart state.
 * Called on each retry to avoid overwriting concurrent changes.
 */
export type BuildCartFn = (latestCart: CartEntity | null) => Promise<CartEntity>;

/**
 * Saves cart with retry logic for handling optimistic locking conflicts.
 * On conflict, refetches the latest cart and re-applies the operation via buildCart
 * to preserve concurrent changes from other requests.
 *
 * @param cart - The cart entity from the first attempt
 * @param cartService - Instance of CartService
 * @param buildCart - Callback to re-build the cart from latest state on retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns The saved CartEntity
 * @throws ConflictError if max retries exceeded
 */
export async function saveCartWithRetry(
  cart: CartEntity,
  cartService: CartService,
  buildCart?: BuildCartFn,
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
          version: currentCart.version,
        });

        if (attempt >= maxRetries) {
          throw new ConflictError(
            'Cart was modified by another request. Please retry.',
            { userId: cart.userId, attempts: attempt }
          );
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        await sleep(100 * Math.pow(2, attempt - 1));

        // Refetch latest cart and re-apply the operation
        const latestCart = await cartService.getCart(cart.userId);
        if (buildCart) {
          currentCart = await buildCart(latestCart);
        } else {
          // Fallback: just update the version (legacy behavior)
          currentCart = {
            ...currentCart,
            version: latestCart?.version || 0,
          };
        }

        continue;
      }

      // Non-conflict error, rethrow
      throw error;
    }
  }

  throw new ConflictError('Max retry attempts reached');
}
