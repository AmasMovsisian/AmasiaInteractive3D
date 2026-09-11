import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Order, OrdersService } from '../../../../../core/services/backend/orders/orders.service';

/**
 * Card component displaying the user's order history.
 */
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
  visibleOrders: Order[] = [];
  isLoading = true;
  errorMessage = '';
  confirmingOrderId: number | null = null;
  isCancelling = false;
  cancelErrorMessage = '';
  showAllOrders = false;
  readonly INITIAL_ORDERS_TO_SHOW = 3;
  private readonly DELIVERY_DAYS = 3;

  /**
   * Load orders on component initialization.
   */
  ngOnInit(): void {
    this.loadOrders();
  }

  /**
   * Fetch the user's orders from the backend.
   */
  private loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ordersService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders ?? [];
        this.updateVisibleOrders();
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

  /**
   * Recompute the list of visible orders.
   */
  private updateVisibleOrders(): void {
    if (this.showAllOrders) {
      this.visibleOrders = [...this.orders];
    } else {
      this.visibleOrders = this.orders.slice(0, this.INITIAL_ORDERS_TO_SHOW);
    }
  }

  /**
   * Toggle between showing all orders and the initial set.
   */
  toggleShowAllOrders(): void {
    this.showAllOrders = !this.showAllOrders;
    this.updateVisibleOrders();
  }

  /**
   * Open the cancel confirmation for an order.
   */
  startCancelConfirmation(orderId: number): void {
    if (this.isCancelling) {
      return;
    }
    this.confirmingOrderId = orderId;
    this.cancelErrorMessage = '';
  }

  /**
   * Close the cancel confirmation dialog.
   */
  closeCancelConfirmation(): void {
    if (this.isCancelling) {
      return;
    }
    this.confirmingOrderId = null;
    this.cancelErrorMessage = '';
  }

  /**
   * Confirm and submit the cancellation of an order.
   */
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
          this.updateVisibleOrders();
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

  /**
   * Format a date string as a short en-GB date.
   */
  formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }

  /**
   * Compute the estimated delivery date from the order date.
   */
  getEstimatedDelivery(createdAt: string): string {
    const orderDate = new Date(createdAt);
    orderDate.setDate(orderDate.getDate() + this.DELIVERY_DAYS);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(orderDate);
  }

  /**
   * Compute the remaining days until delivery.
   */
  getDaysUntilDelivery(createdAt: string): number {
    const orderDate = new Date(createdAt);
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + this.DELIVERY_DAYS);
    const now = new Date();
    const difference = deliveryDate.getTime() - now.getTime();
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
    return Math.max(1, days);
  }

  /**
   * Return the display label for an order status.
   */
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

  /**
   * Return the total quantity of items in an order.
   */
  getItemCount(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Track orders by id for ngFor.
   */
  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }
}
