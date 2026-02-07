import { ProductEntity } from '../../../shared/types';
import { NotFoundError, ValidationError } from '../../../shared/utils/error.util';
import { ProductsService } from '../../products/services/products.service';

/**
 * Validates a product exists, is active, and has sufficient stock.
 * When existingCartQuantity is provided, the total (existing + requested)
 * is checked against stock to prevent exceeding availability via incremental adds.
 *
 * @param productId - The product ID to validate
 * @param quantity - The quantity requested
 * @param productsService - Instance of ProductsService
 * @param existingCartQuantity - Quantity already in the user's cart for this product (default: 0)
 * @returns The validated ProductEntity
 * @throws NotFoundError if product doesn't exist
 * @throws ValidationError if product is inactive or has insufficient stock
 */
export async function validateProduct(
  productId: string,
  quantity: number,
  productsService: ProductsService,
  existingCartQuantity: number = 0
): Promise<ProductEntity> {
  const product = await productsService.getProductById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.status !== 'active') {
    throw new ValidationError(`Product is ${product.status}`, {
      productId,
      status: product.status,
    });
  }

  const totalQuantity = existingCartQuantity + quantity;

  if (product.stock < totalQuantity) {
    throw new ValidationError('Insufficient stock available', {
      productId,
      requested: totalQuantity,
      available: product.stock,
      existingInCart: existingCartQuantity,
    });
  }

  return product;
}
