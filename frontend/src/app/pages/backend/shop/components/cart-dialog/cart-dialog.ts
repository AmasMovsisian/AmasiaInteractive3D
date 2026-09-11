import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartItem } from '../../models/shop.models';

/**
 * Dialog component displaying and managing the shopping cart.
 */
@Component({
  selector: 'app-cart-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-dialog.html',
  styleUrl: './cart-dialog.scss',
})
export class CartDialog {
  private readonly router = inject(Router);

  @Input() cart: CartItem[] = [];
  @Input() showCart = false;
  @Input() showConfirmClear = false;
  @Input() showCheckoutMessage = false;
  @Input() showSuccessMessage = false;
  @Input() checkoutMessage = '';
  @Input() cartItemCount = 0;
  @Input() cartCanCount = 0;
  @Input() cartTotal = 0;
  @Input() cartSavings = 0;
  @Input() individualCartBlocked = false;
  @Input() remainingIndividualCans = 0;
  @Input() canCheckout = false;
  @Input() maxTotalCans = 900;
  @Input() isAtMaxLimit = false;
  @Input() isPlacingOrder = false;

  @Output() cartClosed = new EventEmitter<void>();
  @Output() clearRequested = new EventEmitter<void>();
  @Output() clearConfirmed = new EventEmitter<void>();
  @Output() clearCancelled = new EventEmitter<void>();
  @Output() checkoutRequested = new EventEmitter<void>();
  @Output() checkoutMessageClosed = new EventEmitter<void>();
  @Output() cartItemChanged = new EventEmitter<CartItem>();
  @Output() cartItemRemoved = new EventEmitter<CartItem>();
  @Output() individualQuantityReset = new EventEmitter<string>();
  @Output() placeOrder = new EventEmitter<void>();

  /**
   * Format a number as a fixed two-decimal price string.
   */
  formatPrice(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Build a readable label describing a pack's composition.
   */
  getPackCompositionLabel(item: CartItem): string {
    if (!item.firstFlavor) return '';
    if (!item.secondFlavor) {
      return `${item.packSize} × ${item.firstFlavor}`;
    }
    const half = (item.packSize ?? 0) / 2;
    return `${half} × ${item.firstFlavor} + ${half} × ${item.secondFlavor}`;
  }

  /**
   * Increase the quantity of a cart item.
   */
  increaseCartItem(item: CartItem): void {
    if (this.isAtMaxLimit) return;

    if (item.type === 'PACK') {
      if (item.quantity >= 25) return;
      if (this.cartCanCount + (item.packSize ?? 0) > this.maxTotalCans) return;
    } else {
      if (this.cartCanCount >= this.maxTotalCans) return;
    }

    const updatedItem = { ...item, quantity: item.quantity + 1 };
    this.cartItemChanged.emit(updatedItem);
  }

  /**
   * Decrease the quantity of a cart item or remove it.
   */
  decreaseCartItem(item: CartItem): void {
    if (item.quantity <= 1) {
      this.removeCartItem(item);
      return;
    }

    const updatedItem = { ...item, quantity: item.quantity - 1 };
    this.cartItemChanged.emit(updatedItem);
  }

  /**
   * Sanitize numeric input for the quantity field.
   */
  onQuantityInput(item: CartItem, input: HTMLInputElement): void {
    const value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 3) {
      input.value = value.slice(0, 3);
      return;
    }
    input.value = value;
  }

  /**
   * Validate and apply the quantity when the input loses focus.
   */
  onQuantityBlur(item: CartItem, input: HTMLInputElement): void {
    const value = input.value.replace(/[^0-9]/g, '');
    let quantity = value === '' ? 0 : parseInt(value, 10);

    if (quantity === 0) {
      this.removeCartItem(item);
      return;
    }

    if (quantity > 999) {
      quantity = 999;
    }

    if (item.type === 'PACK') {
      if (quantity > 25) quantity = 25;
      const newCanCount = (item.packSize ?? 0) * quantity;
      const oldCanCount = (item.packSize ?? 0) * item.quantity;
      const diff = newCanCount - oldCanCount;
      if (diff > 0 && this.cartCanCount + diff > this.maxTotalCans) {
        const maxPossible =
          item.quantity +
          Math.floor((this.maxTotalCans - this.cartCanCount) / (item.packSize ?? 1));
        quantity = Math.min(quantity, maxPossible);
      }
    } else {
      const diff = quantity - item.quantity;
      if (diff > 0 && this.cartCanCount + diff > this.maxTotalCans) {
        quantity = item.quantity + (this.maxTotalCans - this.cartCanCount);
      }
    }

    if (quantity === item.quantity) {
      input.value = String(item.quantity);
      return;
    }

    const updatedItem = { ...item, quantity };
    this.cartItemChanged.emit(updatedItem);
  }

  /**
   * Reset the quantity input to the current item quantity.
   */
  resetQuantityInput(item: CartItem, input: HTMLInputElement): void {
    input.value = String(item.quantity);
  }

  /**
   * Remove an item from the cart.
   */
  removeCartItem(item: CartItem): void {
    this.cartItemRemoved.emit(item);
    if (item.type === 'INDIVIDUAL' && item.flavor) {
      this.individualQuantityReset.emit(item.flavor);
    }
  }

  /**
   * Close the cart and navigate to the contact page.
   */
  navigateToContact(): void {
    this.cartClosed.emit();
    this.router.navigate(['/contact']);
  }
}
