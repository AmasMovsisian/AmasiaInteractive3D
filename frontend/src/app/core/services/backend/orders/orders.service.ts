import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface OrderPackProduct {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  subtotal: string;
}

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

export type OrderStatus = 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  total: string;
  items: OrderItem[];
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: string;
  image: string | null;
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

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getProducts(): Observable<BackendProduct[]> {
    return this.http.get<BackendProduct[]>(`${this.apiUrl}/orders/products/`, { headers: this.getHeaders() });
  }

  addToCart(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/cart/add/`, payload, { headers: this.getHeaders() });
  }

  getCart(): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/cart/`, { headers: this.getHeaders() });
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/`, { headers: this.getHeaders() });
  }

  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}/`, { headers: this.getHeaders() });
  }

  createOrder(payload: any): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/checkout/`, payload, { headers: this.getHeaders() });
  }

  cancelOrder(orderId: number): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders/${orderId}/cancel/`, {}, { headers: this.getHeaders() });
  }
}