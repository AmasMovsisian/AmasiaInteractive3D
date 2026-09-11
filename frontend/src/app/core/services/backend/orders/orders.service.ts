import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/**
 * Product entry inside an order pack.
 */
export interface OrderPackProduct {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  subtotal: string;
}

/**
 * Item inside an order.
 */
export interface OrderItem {
  id: number;
  item_type: 'INDIVIDUAL' | 'PACK';
  product: number | null;
  product_name: string;
  category: string;
  quantity: number;
  price: string;
  subtotal: string;
  pack_size: number | null;
  pack_products: OrderPackProduct[];
}

/**
 * Possible order statuses.
 */
export type OrderStatus = 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

/**
 * Order placed by the user.
 */
export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  total: string;
  items: OrderItem[];
  created_at: string;
}

/**
 * Product available for purchase.
 */
export interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: string;
  image: string | null;
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
 * Service handling products, cart and orders.
 */
@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Build authorization headers from the stored token.
   */
  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('jwt_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Fetch all active products.
   */
  getProducts(): Observable<BackendProduct[]> {
    return this.http.get<BackendProduct[]>(`${this.apiUrl}/orders/products/`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Add an item to the cart.
   */
  addToCart(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/cart/add/`, payload, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Fetch the current user's cart.
   */
  getCart(): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/cart/`, { headers: this.getHeaders() });
  }

  /**
   * Fetch all orders of the current user.
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/`, { headers: this.getHeaders() });
  }

  /**
   * Fetch a single order by id.
   */
  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}/`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Create an order from the current cart.
   */
  createOrder(payload: any): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/checkout/`, payload, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Cancel an order by id.
   */
  cancelOrder(orderId: number): Observable<Order> {
    return this.http.post<Order>(
      `${this.apiUrl}/orders/${orderId}/cancel/`,
      {},
      { headers: this.getHeaders() },
    );
  }
}
