import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Order, OrdersService } from '../../../../../core/services/backend/orders/orders.service';

@Component({
  selector: 'app-orders-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './orders-card.html',
  styleUrl: './orders-card.scss',
})
export class OrdersCardComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  orders: Order[] = [];
  isLoading = true;
  errorMessage = '';
  confirmingOrderId: number | null = null;
  isCancelling = false;
  cancelErrorMessage = '';
  private readonly DELIVERY_DAYS = 3;

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ordersService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders ?? [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[OrdersCard] Failed to load orders:', error);
        this.isLoading = false;
        if (error?.status === 401) {
          this.errorMessage = 'Your session has expired. Please log in again.';
        } else {
          this.errorMessage = 'Unable to load your order history.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  startCancelConfirmation(orderId: number): void {
    if (this.isCancelling) {
      return;
    }
    this.confirmingOrderId = orderId;
    this.cancelErrorMessage = '';
  }

  closeCancelConfirmation(): void {
    if (this.isCancelling) {
      return;
    }
    this.confirmingOrderId = null;
    this.cancelErrorMessage = '';
  }

  confirmCancelOrder(order: Order): void {
    if (this.isCancelling || order.status !== 'CONFIRMED') {
      return;
    }
    this.isCancelling = true;
    this.cancelErrorMessage = '';
    this.ordersService.cancelOrder(order.id).subscribe({
      next: (updatedOrder) => {
        const index = this.orders.findIndex((currentOrder) => currentOrder.id === order.id);
        if (index !== -1) {
          this.orders[index] = updatedOrder ?? {
            ...this.orders[index],
            status: 'CANCELLED',
          };
        }
        this.confirmingOrderId = null;
        this.isCancelling = false;
        this.cancelErrorMessage = '';
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[OrdersCard] Failed to cancel order:', error);
        this.isCancelling = false;
        if (error?.status === 401) {
          this.cancelErrorMessage = 'Your session has expired. Please log in again.';
        } else if (error?.status === 400) {
          this.cancelErrorMessage = 'This order can no longer be cancelled.';
        } else {
          this.cancelErrorMessage = 'Unable to cancel this order. Please try again.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }

  getEstimatedDelivery(createdAt: string): string {
    const orderDate = new Date(createdAt);
    orderDate.setDate(orderDate.getDate() + this.DELIVERY_DAYS);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(orderDate);
  }

  getDaysUntilDelivery(createdAt: string): number {
    const orderDate = new Date(createdAt);
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + this.DELIVERY_DAYS);
    const now = new Date();
    const difference = deliveryDate.getTime() - now.getTime();
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
    return Math.max(1, days);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'DELIVERED':
        return 'DELIVERED';
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return status;
    }
  }

  getItemCount(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }
}
