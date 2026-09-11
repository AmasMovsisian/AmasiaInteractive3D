/**
 * Product available in the shop.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'MAIN' | 'PREMIUM' | 'SIGNATURE';
  accent: string;
}

/**
 * Product as returned by the backend.
 */
export interface BackendProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: string;
  image: string | null;
}

/**
 * Pack category definition.
 */
export interface PackCategory {
  id: 'MAIN' | 'PREMIUM' | 'SIGNATURE';
  name: string;
  description: string;
}

/**
 * Product entry inside a pack cart item.
 */
export interface CartPackProduct {
  flavor: string;
  quantity: number;
  productId?: number;
}

/**
 * Item inside the shopping cart.
 */
export interface CartItem {
  id: string;
  type: 'PACK' | 'INDIVIDUAL';
  name: string;
  quantity: number;
  price: number;
  originalPrice: number;
  flavor?: string;
  firstFlavor?: string;
  secondFlavor?: string | null;
  packSize?: number;
  packProducts?: CartPackProduct[];
  category?: 'MAIN' | 'PREMIUM' | 'SIGNATURE';
  productId?: number;
}

/**
 * Pack configuration options.
 */
export interface PackConfig {
  size: 6 | 12 | 36;
  label: string;
  title: string;
  description: string;
  pricePerCan: number;
}
