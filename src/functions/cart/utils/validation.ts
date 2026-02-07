import { ProductEntity } from '../../../shared/types';
import { NotFoundError, ValidationError } from '../../../shared/utils/error.util';
import { ProductsService } from '../../products/services/products.service';

/**
 * Validates a product exists, is active, and has sufficient stock
 * @param productId - The product ID to validate
 * @param quantity - The quantity requested
 * @param productsService - Instance of ProductsService
 * @returns The validated ProductEntity
 * @throws NotFoundError if product doesn't exist
 * @throws ValidationError if product is inactive or has insufficient stock
 */
export async function validateProduct(
  productId: string,
  quantity: number,
  productsService: ProductsService
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

  if (product.stock < quantity) {
    throw new ValidationError('Insufficient stock available', {
      productId,
      requested: quantity,
      available: product.stock,
    });
  }

  return product;
}
