const routeLabels: Record<string, string> = {
  '': 'Home',
  products: 'Products',
  cart: 'Shopping Cart',
  checkout: 'Checkout',
  orders: 'My Orders',
  admin: 'Admin Dashboard',
};

// UUID pattern detection (matches standard UUID format)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSegmentLabel(segment: string): string {
  // Check if segment is a UUID
  if (UUID_PATTERN.test(segment)) {
    return 'Product Detail';
  }

  return routeLabels[segment] || segment;
}
