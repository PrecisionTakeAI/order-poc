const routeLabels: Record<string, string> = {
  '': 'Home',
  products: 'Products',
  cart: 'Shopping Cart',
  checkout: 'Checkout',
  orders: 'My Orders',
  admin: 'Admin Dashboard',
};

export function getSegmentLabel(segment: string): string {
  return routeLabels[segment] || segment;
}
