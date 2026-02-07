export interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
}

export const navigationItems: NavItem[] = [
  { label: 'Products', path: '/products' },
  { label: 'Orders', path: '/orders' },
  { label: 'Admin', path: '/admin', adminOnly: true },
];
