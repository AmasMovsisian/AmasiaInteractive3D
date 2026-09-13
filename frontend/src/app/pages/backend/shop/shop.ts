import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { Nav } from '../../../sections/shared/nav/nav';
import { Footer } from '../../../sections/shared/footer/footer';
import { PackBuilder } from './components/pack-builder/pack-builder';
import { IndividualCans } from './components/individual-cans/individual-cans';
import { CartDialog } from './components/cart-dialog/cart-dialog';
import { CartItem } from './models/shop.models';
import {
  OrdersService,
  Product,
} from '../../../../app/core/services/backend/orders/orders.service';

/**
 * Shop page component managing products, cart and checkout.
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterLink, Nav, Footer, PackBuilder, IndividualCans, CartDialog],
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
})
export class Shop implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly viewportScroller = inject(ViewportScroller);
  private readonly ordersService = inject(OrdersService);
  private readonly http = inject(HttpClient);

  private readonly STORAGE_KEY = 'amasia_cart';
  private readonly QUANTITIES_KEY = 'amasia_individual_quantities';

  readonly deliveryText = 'FREE DELIVERY';
  readonly MAX_TOTAL_CANS = 900;
  readonly MIN_INDIVIDUAL_CANS = 4;
  readonly CONTACT_EMAIL = 'contact@amasmovsisian.com';

  cart: CartItem[] = [];
  individualQuantities: Record<string, number> = {};
  products: Product[] = [];

  showCart = false;
  showConfirmClear = false;
  showCheckoutMessage = false;
  showOrderSuccess = false;
  checkoutMessage = '';
  showFloatingCart = false;
  isPlacingOrder = false;

  private hasIndividualItemsCache = false;
  private individualCanCountCache = 0;
  private remainingIndividualCansCache = 0;
  private individualCartBlockedCache = false;
  private hasPackInCartCache = false;

  private scrollHandler = this.onScroll.bind(this);

  /**
   * Initialize cart, products and floating cart.
   */
  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);

    this.loadCartFromStorage();
    this.loadProducts();

    setTimeout(() => {
      this.showFloatingCart = true;
      this.cdr.detectChanges();
    }, 500);

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.recalculateCartState();
  }

  /**
   * Clean up listeners and persist the cart.
   */
  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    this.saveCartToStorage();
  }

  /**
   * Keep the floating cart visible when items exist.
   */
  onScroll(): void {
    if (this.cartItemCount > 0) {
      this.showFloatingCart = true;
    }
  }

  /**
   * Return the total quantity of cart items.
   */
  get cartItemCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Return the total number of cans in the cart.
   */
  get cartCanCount(): number {
    return this.cart.reduce((total, item) => {
      if (item.type === 'INDIVIDUAL') {
        return total + item.quantity;
      }

      return total + (item.packSize ?? 0) * item.quantity;
    }, 0);
  }

  /**
   * Return the remaining cans allowed in the cart.
   */
  get remainingCartCans(): number {
    return Math.max(0, this.MAX_TOTAL_CANS - this.cartCanCount);
  }

  /**
   * Return the current cart total.
   */
  get cartTotal(): number {
    return this.cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  /**
   * Return the original cart total before discounts.
   */
  get cartOriginalTotal(): number {
    return this.cart.reduce((total, item) => total + item.originalPrice * item.quantity, 0);
  }

  /**
   * Return the total savings in the cart.
   */
  get cartSavings(): number {
    return Math.max(0, this.cartOriginalTotal - this.cartTotal);
  }

  /**
   * Return the cached count of individual cans.
   */
  get individualCanCount(): number {
    return this.individualCanCountCache;
  }

  /**
   * Check if the cart contains individual items.
   */
  get hasIndividualItems(): boolean {
    return this.hasIndividualItemsCache;
  }

  /**
   * Check if the individual minimum order is reached.
   */
  get individualMinimumReached(): boolean {
    return this.individualCanCountCache >= this.MIN_INDIVIDUAL_CANS || this.hasPackInCartCache;
  }

  /**
   * Return the cached remaining individual cans.
   */
  get remainingIndividualCans(): number {
    return this.remainingIndividualCansCache;
  }

  /**
   * Check if checkout is allowed for the current cart.
   */
  get canCheckout(): boolean {
    if (this.cart.length === 0) {
      return false;
    }

    if (this.individualCartBlockedCache) {
      return false;
    }

    return this.cartCanCount <= this.MAX_TOTAL_CANS;
  }

  /**
   * Check if the individual cart is blocked by minimum rules.
   */
  get individualCartBlocked(): boolean {
    return this.individualCartBlockedCache;
  }

  /**
   * Check if individual cans can still be added.
   */
  get canAddIndividual(): boolean {
    return this.cartCanCount < this.MAX_TOTAL_CANS;
  }

  /**
   * Check if the cart reached the maximum limit.
   */
  get isAtMaxLimit(): boolean {
    return this.cartCanCount >= this.MAX_TOTAL_CANS;
  }

  /**
   * Toggle the cart dialog.
   */
  toggleCart(): void {
    this.showCart = !this.showCart;
    this.cdr.detectChanges();
  }

  /**
   * Close the cart dialog.
   */
  closeCart(): void {
    this.showCart = false;
    this.cdr.detectChanges();
  }

  /**
   * Add a pack to the cart.
   */
  addPackToCart(packData: CartItem): void {
    if (this.cartCanCount + (packData.packSize ?? 0) > this.MAX_TOTAL_CANS) {
      this.checkoutMessage =
        `Maximum order limit of ${this.MAX_TOTAL_CANS} cans reached. ` +
        `For larger orders please contact us at ${this.CONTACT_EMAIL}.`;

      this.showCheckoutMessage = true;
      return;
    }

    this.cart.push(packData);

    this.showCart = true;
    this.showFloatingCart = true;

    this.recalculateCartState();
    this.saveCartToStorage();
    this.cdr.detectChanges();
  }

  /**
   * Update or remove an individual item in the cart.
   */
  updateIndividualCart(cartItem: CartItem | null, flavorId: string, quantity: number): void {
    const productId = cartItem?.productId;

    const existingIndex = this.cart.findIndex((item) => {
      if (item.type !== 'INDIVIDUAL') {
        return false;
      }

      if (
        productId !== undefined &&
        productId !== null &&
        item.productId !== undefined &&
        item.productId !== null
      ) {
        return Number(item.productId) === Number(productId);
      }

      return item.flavor === flavorId;
    });

    if (quantity <= 0) {
      if (existingIndex >= 0) {
        this.cart.splice(existingIndex, 1);
      }

      this.individualQuantities[flavorId] = 0;
    } else if (existingIndex >= 0) {
      const existingItem = this.cart[existingIndex];
      const oldQuantity = existingItem.quantity;
      const quantityDiff = quantity - oldQuantity;

      if (quantityDiff > 0 && this.cartCanCount + quantityDiff > this.MAX_TOTAL_CANS) {
        this.checkoutMessage =
          `Maximum order limit of ${this.MAX_TOTAL_CANS} cans reached. ` +
          `For larger orders please contact us at ${this.CONTACT_EMAIL}.`;

        this.showCheckoutMessage = true;
        return;
      }

      this.cart[existingIndex] = {
        ...existingItem,
        ...(cartItem ?? {}),
        id: existingItem.id,
        quantity,
      };

      this.individualQuantities[flavorId] = quantity;
    } else {
      if (this.cartCanCount + quantity > this.MAX_TOTAL_CANS) {
        this.checkoutMessage =
          `Maximum order limit of ${this.MAX_TOTAL_CANS} cans reached. ` +
          `For larger orders please contact us at ${this.CONTACT_EMAIL}.`;

        this.showCheckoutMessage = true;
        return;
      }

      if (!cartItem) {
        return;
      }

      this.cart.push({
        ...cartItem,
        id: `individual-${productId ?? flavorId}`,
        quantity,
      });

      this.individualQuantities[flavorId] = quantity;
    }

    this.mergeDuplicateIndividualItems();

    if (this.cartItemCount > 0) {
      this.showFloatingCart = true;
    }

    this.recalculateCartState();
    this.saveCartToStorage();
    this.cdr.detectChanges();
  }

  /**
   * Update a cart item quantity.
   */
  updateCartItem(item: CartItem): void {
    const index = this.cart.findIndex((cartItem) => cartItem.id === item.id);

    if (index >= 0) {
      const oldItem = this.cart[index];

      const oldCanCount =
        oldItem.type === 'PACK' ? (oldItem.packSize ?? 0) * oldItem.quantity : oldItem.quantity;

      const newCanCount =
        item.type === 'PACK' ? (item.packSize ?? 0) * item.quantity : item.quantity;

      const diff = newCanCount - oldCanCount;

      if (diff > 0 && this.cartCanCount + diff > this.MAX_TOTAL_CANS) {
        this.checkoutMessage =
          `Maximum order limit of ${this.MAX_TOTAL_CANS} cans reached. ` +
          `For larger orders please contact us at ${this.CONTACT_EMAIL}.`;

        this.showCheckoutMessage = true;
        return;
      }

      this.cart[index] = { ...item };

      if (item.type === 'INDIVIDUAL' && item.flavor) {
        this.individualQuantities[item.flavor] = item.quantity;
      }
    }

    this.mergeDuplicateIndividualItems();

    this.recalculateCartState();
    this.saveCartToStorage();
    this.cdr.detectChanges();
  }

  /**
   * Remove an item from the cart.
   */
  removeCartItem(item: CartItem): void {
    const index = this.cart.findIndex((cartItem) => cartItem.id === item.id);

    if (index >= 0) {
      this.cart.splice(index, 1);

      if (item.type === 'INDIVIDUAL' && item.flavor) {
        this.individualQuantities[item.flavor] = 0;
      }
    }

    this.recalculateCartState();
    this.saveCartToStorage();
    this.cdr.detectChanges();
  }

  /**
   * Request clearing the entire cart.
   */
  requestClearCart(): void {
    if (this.cart.length === 0) {
      return;
    }

    this.showConfirmClear = true;
  }

  /**
   * Confirm clearing the entire cart.
   */
  confirmClearCart(): void {
    this.cart = [];
    this.individualQuantities = {};
    this.showConfirmClear = false;

    this.recalculateCartState();
    this.saveCartToStorage();
    this.cdr.detectChanges();
  }

  /**
   * Close the clear cart confirmation dialog.
   */
  closeClearDialog(): void {
    this.showConfirmClear = false;
  }

  /**
   * Validate the cart and show the checkout message.
   */
  proceedToCheckout(): void {
    if (this.cart.length === 0) {
      return;
    }

    if (this.individualCartBlocked) {
      this.checkoutMessage = `Please add ${this.remainingIndividualCans} more individual can${
        this.remainingIndividualCans === 1 ? '' : 's'
      } before checkout.`;

      this.showCheckoutMessage = true;
      return;
    }

    if (this.cartCanCount > this.MAX_TOTAL_CANS) {
      this.checkoutMessage = `Your cart cannot contain more than ${this.MAX_TOTAL_CANS} cans.`;

      this.showCheckoutMessage = true;
      return;
    }

    this.showCheckoutMessage = true;
  }

  /**
   * Close the checkout message dialog.
   */
  closeCheckoutMessage(): void {
    this.showCheckoutMessage = false;
  }

  /**
   * Sync the cart to the backend and place the order.
   */
  placeOrder(): void {
    if (this.isPlacingOrder || this.showOrderSuccess) {
      return;
    }

    if (this.cart.length === 0) {
      return;
    }

    this.isPlacingOrder = true;
    this.checkoutMessage = 'Placing your order...';
    this.cdr.detectChanges();

    this.syncCartToBackend().subscribe({
      next: () => {
        this.ordersService.createOrder({}).subscribe({
          next: (order) => {
            this.isPlacingOrder = false;
            this.showCheckoutMessage = false;
            this.showOrderSuccess = true;
            this.cdr.detectChanges();

            setTimeout(() => {
              this.cart = [];
              this.individualQuantities = {};
              this.saveCartToStorage();
              this.recalculateCartState();
              this.router.navigate(['/dashboard']);
            }, 1800);
          },
          error: (error) => {
            console.error('Failed to create order:', error);

            this.isPlacingOrder = false;
            this.checkoutMessage = 'Failed to place order. Please try again.';
            this.showCheckoutMessage = true;
            this.cdr.detectChanges();
          },
        });
      },
      error: (error) => {
        console.error('Failed to sync cart to backend:', error);

        this.isPlacingOrder = false;
        this.checkoutMessage = 'Failed to sync cart. Please try again.';
        this.showCheckoutMessage = true;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Load all products from the backend.
   */
  private loadProducts(): void {
    this.ordersService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load products:', error);
      },
    });
  }

  /**
   * Sync all cart items to the backend.
   */
  private syncCartToBackend(): Observable<any> {
    const syncOperations: Observable<any>[] = [];

    const normalizedCart = this.getNormalizedCart();

    for (const item of normalizedCart) {
      if (item.type === 'PACK') {
        const packProducts =
          item.packProducts
            ?.map((p) => {
              const product = this.products.find(
                (prod) =>
                  prod.name.toLowerCase() === p.flavor.toLowerCase() ||
                  prod.slug === p.flavor.toLowerCase().replace(/\s+/g, '-'),
              );

              if (!product) {
                return null;
              }

              return {
                product_id: product.id,
                quantity: p.quantity,
              };
            })
            .filter(
              (
                p,
              ): p is {
                product_id: number;
                quantity: number;
              } => p !== null,
            ) || [];

        if (packProducts.length > 0) {
          syncOperations.push(
            this.ordersService.addToCart({
              item_type: 'PACK',
              pack_size: item.packSize,
              products: packProducts,
            }),
          );
        }
      } else {
        const product = this.products.find(
          (prod) =>
            prod.id === Number(item.productId) ||
            prod.slug === item.flavor ||
            prod.name.toLowerCase() === item.name.toLowerCase(),
        );

        if (!product) {
          console.error('Product not found for item:', item);
          continue;
        }

        syncOperations.push(
          this.ordersService.addToCart({
            item_type: 'INDIVIDUAL',
            product_id: product.id,
            quantity: item.quantity,
          }),
        );
      }
    }

    return syncOperations.length > 0 ? forkJoin(syncOperations) : of(null);
  }

  /**
   * Merge duplicate individual items into a single entry per product.
   */
  private getNormalizedCart(): CartItem[] {
    const normalizedItems: CartItem[] = [];
    const individualMap = new Map<string, CartItem>();

    for (const item of this.cart) {
      if (item.type !== 'INDIVIDUAL') {
        normalizedItems.push({
          ...item,
        });
        continue;
      }

      const key = this.getIndividualItemKey(item);

      if (!key) {
        normalizedItems.push({
          ...item,
        });
        continue;
      }

      const existing = individualMap.get(key);

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        individualMap.set(key, {
          ...item,
        });
      }
    }

    normalizedItems.push(...individualMap.values());

    return normalizedItems;
  }

  /**
   * Merge duplicate individual items and sync quantities.
   */
  private mergeDuplicateIndividualItems(): void {
    const normalizedCart = this.getNormalizedCart();

    const normalizedIndividualFlavors = new Set<string>();

    for (const item of normalizedCart) {
      if (item.type === 'INDIVIDUAL' && item.flavor) {
        normalizedIndividualFlavors.add(item.flavor);
        this.individualQuantities[item.flavor] = item.quantity;
      }
    }

    for (const flavor of Object.keys(this.individualQuantities)) {
      if (!normalizedIndividualFlavors.has(flavor)) {
        this.individualQuantities[flavor] = 0;
      }
    }

    this.cart = normalizedCart;
  }

  /**
   * Build a unique key for an individual cart item.
   */
  private getIndividualItemKey(item: CartItem): string | null {
    if (item.productId !== undefined && item.productId !== null) {
      return `product-${item.productId}`;
    }

    if (item.flavor) {
      return `flavor-${item.flavor}`;
    }

    if (item.id) {
      return item.id;
    }

    return null;
  }

  /**
   * Format a number as a fixed two-decimal price string.
   */
  formatPrice(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Track cart items by id for ngFor.
   */
  trackCartItem(index: number, item: CartItem): string {
    return item.id;
  }

  /**
   * Load the cart and individual quantities from localStorage.
   */
  private loadCartFromStorage(): void {
    try {
      const savedCart = localStorage.getItem(this.STORAGE_KEY);
      const savedQuantities = localStorage.getItem(this.QUANTITIES_KEY);

      if (savedCart) {
        this.cart = JSON.parse(savedCart);
        this.mergeDuplicateIndividualItems();
      }

      if (savedQuantities) {
        this.individualQuantities = JSON.parse(savedQuantities);
      }

      this.mergeDuplicateIndividualItems();
      this.recalculateCartState();
      this.saveCartToStorage();
    } catch (error) {
      console.error('Failed to load cart from storage:', error);

      this.cart = [];
      this.individualQuantities = {};
    }
  }

  /**
   * Persist the cart and individual quantities to localStorage.
   */
  private saveCartToStorage(): void {
    try {
      this.mergeDuplicateIndividualItems();

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cart));
      localStorage.setItem(this.QUANTITIES_KEY, JSON.stringify(this.individualQuantities));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  }

  /**
   * Recompute cached cart state values.
   */
  private recalculateCartState(): void {
    const individualItems = this.cart.filter((item) => item.type === 'INDIVIDUAL');
    const packItems = this.cart.filter((item) => item.type === 'PACK');
    const individualCanCount = individualItems.reduce((total, item) => total + item.quantity, 0);
    const hasIndividualItems = individualItems.length > 0;
    const hasPackInCart = packItems.length > 0;

    const remainingIndividualCans = hasPackInCart
      ? 0
      : Math.max(0, this.MIN_INDIVIDUAL_CANS - individualCanCount);

    this.hasIndividualItemsCache = hasIndividualItems;
    this.individualCanCountCache = individualCanCount;
    this.remainingIndividualCansCache = remainingIndividualCans;
    this.hasPackInCartCache = hasPackInCart;
    this.individualCartBlockedCache =
      hasIndividualItems && !hasPackInCart && individualCanCount < this.MIN_INDIVIDUAL_CANS;
  }
}
