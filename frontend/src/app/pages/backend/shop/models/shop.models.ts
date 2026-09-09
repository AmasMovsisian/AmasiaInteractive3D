export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'MAIN' | 'PREMIUM' | 'SIGNATURE';
  accent: string;
}

export interface BackendProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: string;
  image: string | null;
}

export interface PackCategory {
  id: 'MAIN' | 'PREMIUM' | 'SIGNATURE';
  name: string;
  description: string;
}

export interface CartPackProduct {
  flavor: string;
  quantity: number;
  productId?: number;
}

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

export interface PackConfig {
  size: 6 | 12 | 36;
  label: string;
  title: string;
  description: string;
  pricePerCan: number;
}
