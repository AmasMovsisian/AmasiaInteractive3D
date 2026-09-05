import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly ordersUrl = `${environment.apiUrl}/orders`;

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.ordersUrl}/`);
  }

  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.ordersUrl}/${orderId}/`);
  }

  cancelOrder(orderId: number): Observable<Order> {
    return this.http.post<Order>(`${this.ordersUrl}/${orderId}/cancel/`, {});
  }
}
