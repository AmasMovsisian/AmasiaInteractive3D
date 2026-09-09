import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  OrdersService,
  BackendProduct,
} from '../../../../../../app/core/services/backend/orders/orders.service';
import { CartItem, Product } from '../../models/shop.models';

@Component({
  selector: 'app-individual-cans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './individual-cans.html',
  styleUrl: './individual-cans.scss',
})
export class IndividualCans implements OnInit {
  private readonly ordersService = inject(OrdersService);

  @Input() individualQuantities: Record<string, number> = {};
  @Input() cartCanCount = 0;
  @Input() maxTotalCans = 900;
  @Input() canAddIndividual = true;

  @Output() quantityChanged = new EventEmitter<{
    cartItem: CartItem | null;
    flavorId: string;
    quantity: number;
  }>();

  @Output() cartOpened = new EventEmitter<void>();

  readonly MIN_INDIVIDUAL_CANS = 4;

  flavors: Product[] = [];
  private backendProducts: BackendProduct[] = [];
  isLoading = true;
  errorMessage = '';

  readonly flavorImages: Record<string, string> = {
    akebi: 'Akebi.png',
    keylime: 'Keylime.png',
    coconut: 'Coconut.png',
    lychee: 'Lychee.png',
    pandan: 'Pandan.png',
    'black-edition': 'BlackEdition.png',
  };

  readonly flavorAccents: Record<string, string> = {
    akebi: '#9b7b5c',
    keylime: '#b8c98b',
    coconut: '#d8c9a4',
    lychee: '#e6a9bb',
    pandan: '#91a67a',
    'black-edition': '#8c8c8c',
  };

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ordersService.getProducts().subscribe({
      next: (products) => {
        console.log('Individual Cans - Products loaded from backend:', products);
        this.backendProducts = products;
        this.flavors = products.map((p) => ({
          id: p.slug,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category as 'MAIN' | 'PREMIUM' | 'SIGNATURE',
          accent: this.flavorAccents[p.slug] || '#9b7b5c',
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load products:', error);
        this.isLoading = false;
        this.errorMessage = 'Unable to load products.';
      },
    });
  }

  get individualCanCount(): number {
    return Object.values(this.individualQuantities).reduce(
      (total, quantity) => total + quantity,
      0,
    );
  }

  maxQuantityForFlavor(flavorId: string): number {
    return Math.max(
      0,
      this.maxTotalCans - (this.individualCanCount - (this.individualQuantities[flavorId] ?? 0)),
    );
  }

  increaseIndividual(flavorId: string): void {
    if (!this.canAddIndividual) return;

    const current = this.individualQuantities[flavorId] ?? 0;
    const maxQuantity = this.maxQuantityForFlavor(flavorId);

    if (current >= maxQuantity) return;

    this.setIndividualQuantity(flavorId, current + 1);
  }

  decreaseIndividual(flavorId: string): void {
    const current = this.individualQuantities[flavorId] ?? 0;

    if (current <= 0) return;

    this.setIndividualQuantity(flavorId, current - 1);
  }

  setIndividualQuantity(flavorId: string, value: string | number): void {
    const parsedValue = typeof value === 'number' ? value : Number(value);
    const current = this.individualQuantities[flavorId] ?? 0;

    if (!Number.isFinite(parsedValue)) {
      this.emitQuantity(flavorId, current);
      return;
    }

    const quantity = Math.min(
      Math.max(0, Math.floor(parsedValue)),
      this.maxQuantityForFlavor(flavorId),
    );

    this.individualQuantities[flavorId] = quantity;
    this.emitQuantity(flavorId, quantity);
  }

  formatPrice(value: number): string {
    return value.toFixed(2);
  }

  private emitQuantity(flavorId: string, quantity: number): void {
    const backendProduct = this.backendProducts.find((p) => p.slug === flavorId);

    if (!backendProduct) {
      console.error('Product not found for flavorId:', flavorId);
      return;
    }

    if (quantity > 0) {
      const cartItem: CartItem = {
        id: `individual-${backendProduct.id}`,
        type: 'INDIVIDUAL',
        name: backendProduct.name,
        quantity,
        price: Number(backendProduct.price),
        originalPrice: Number(backendProduct.price),
        flavor: backendProduct.slug,
        category: backendProduct.category as 'MAIN' | 'PREMIUM' | 'SIGNATURE',
        productId: backendProduct.id,
      };

      this.quantityChanged.emit({
        cartItem,
        flavorId: backendProduct.slug,
        quantity,
      });
    } else {
      this.quantityChanged.emit({
        cartItem: null,
        flavorId: backendProduct.slug,
        quantity: 0,
      });
    }
  }

  limitQuantityInput(flavorId: string, input: HTMLInputElement): void {
    const max = this.maxQuantityForFlavor(flavorId);
    let value = input.value.replace(/\D/g, '');

    if (value === '') {
      input.value = '0';
      return;
    }

    const quantity = Math.min(Number(value), max, 900);
    input.value = String(quantity);
  }
}
