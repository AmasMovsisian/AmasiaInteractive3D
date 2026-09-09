import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  OrdersService,
  BackendProduct,
} from '../../../../../../app/core/services/backend/orders/orders.service';
import { CartItem, PackCategory, PackConfig, Product } from '../../models/shop.models';

@Component({
  selector: 'app-pack-builder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pack-builder.html',
  styleUrl: './pack-builder.scss',
})
export class PackBuilder implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ordersService = inject(OrdersService);

  @Input() cart: CartItem[] = [];
  @Input() cartCanCount = 0;
  @Input() remainingCartCans = 0;
  @Input() maxTotalCans = 900;
  @Output() packAdded = new EventEmitter<CartItem>();

  readonly PACK_DISCOUNT = 0.1;
  readonly MAX_PACK_QUANTITY = 25;
  readonly CONTACT_EMAIL = 'contact@amasmovsisian.com';

  flavors: Product[] = [];
  private backendProducts: BackendProduct[] = [];
  isLoading = true;
  errorMessage = '';

  readonly flavorAccents: Record<string, string> = {
    akebi: '#58469e',
    keylime: '#39d92a',
    coconut: '#4ec0fa',
    lychee: '#a31229',
    pandan: '#6f9274',
    'black-edition': '#d8b85a',
  };

  readonly packs: PackConfig[] = [
    { size: 6, label: '06', title: 'SIX PACK', description: 'Choose one flavour', pricePerCan: 0 },
    {
      size: 12,
      label: '12',
      title: 'TWELVE PACK',
      description: 'Choose one flavour or split your pack 50 / 50',
      pricePerCan: 0,
    },
    {
      size: 36,
      label: '36',
      title: 'THIRTY SIX',
      description: 'Choose one flavour or split your pack 50 / 50',
      pricePerCan: 0,
    },
  ];

  readonly packCategories: PackCategory[] = [
    { id: 'MAIN', name: 'STANDARD', description: 'Akebi & Keylime' },
    { id: 'PREMIUM', name: 'PREMIUM', description: 'Coconut, Pandan & Lychee' },
    { id: 'SIGNATURE', name: 'SIGNATURE', description: 'Black Edition' },
  ];

  selectedPack: 6 | 12 | 36 = 6;
  selectedPackCategory: 'MAIN' | 'PREMIUM' | 'SIGNATURE' = 'MAIN';
  packFirstFlavor: string = '';
  packSecondFlavor: string | null = null;
  packIsSplit = false;

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ordersService.getProducts().subscribe({
      next: (products) => {
        console.log('Pack Builder - Products loaded from backend:', products);
        this.backendProducts = products;
        this.flavors = products.map((p) => ({
          id: p.slug,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category as 'MAIN' | 'PREMIUM' | 'SIGNATURE',
          accent: this.flavorAccents[p.slug] || '#58469e',
        }));
        this.isLoading = false;

        const mainProducts = this.flavors.filter((p) => p.category === 'MAIN');
        if (mainProducts.length > 0) {
          this.packFirstFlavor = mainProducts[0].id;
          this.packSecondFlavor = null;
          this.packIsSplit = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load products:', error);
        this.isLoading = false;
        this.errorMessage = 'Unable to load products.';
      },
    });
  }

  get selectedPackConfig(): PackConfig {
    return this.packs.find((pack) => pack.size === this.selectedPack)!;
  }

  get selectedPackFlavors(): Product[] {
    return this.flavors.filter((flavor) => flavor.category === this.selectedPackCategory);
  }

  get selectedPackUnitPrice(): number {
    const categoryProducts = this.selectedPackFlavors;
    if (categoryProducts.length === 0) return 0;
    return categoryProducts[0].price;
  }

  get selectedPackBasePrice(): number {
    return this.selectedPackUnitPrice * this.selectedPack;
  }

  get selectedPackPrice(): number {
    return this.selectedPackBasePrice * (1 - this.PACK_DISCOUNT);
  }

  get selectedPackSavings(): number {
    return this.selectedPackBasePrice - this.selectedPackPrice;
  }

  get canSplitPack(): boolean {
    return this.selectedPack !== 6;
  }

  get canAddSelectedPack(): boolean {
    if (this.cartCanCount + this.selectedPack > this.maxTotalCans) {
      return false;
    }

    const existing = this.cart.find(
      (item) =>
        item.type === 'PACK' &&
        item.packSize === this.selectedPack &&
        item.firstFlavor === this.packFirstFlavor &&
        item.secondFlavor === (this.packIsSplit ? this.packSecondFlavor : null),
    );

    if (existing && existing.quantity >= this.MAX_PACK_QUANTITY) {
      return false;
    }

    return true;
  }

  get isAtMaxLimit(): boolean {
    return this.cartCanCount >= this.maxTotalCans;
  }

  selectPack(size: 6 | 12 | 36): void {
    this.selectedPack = size;
    if (size === 6) {
      this.packIsSplit = false;
      this.packSecondFlavor = null;
    }
    this.cdr.detectChanges();
  }

  selectPackCategory(category: 'MAIN' | 'PREMIUM' | 'SIGNATURE'): void {
    this.selectedPackCategory = category;
    const available = this.flavors.filter((flavor) => flavor.category === category);
    this.packFirstFlavor = available[0]?.id ?? '';
    this.packSecondFlavor = null;
    this.packIsSplit = false;
    this.cdr.detectChanges();
  }

  selectFirstFlavor(flavorId: string): void {
    const flavor = this.getFlavor(flavorId);
    if (!flavor || flavor.category !== this.selectedPackCategory) return;

    this.packFirstFlavor = flavorId;

    if (this.packSecondFlavor === flavorId) {
      const alternative = this.selectedPackFlavors.find((item) => item.id !== flavorId);
      this.packSecondFlavor = alternative?.id ?? null;
      if (!alternative) {
        this.packIsSplit = false;
      }
    }

    this.cdr.detectChanges();
  }

  selectSecondFlavor(flavorId: string): void {
    if (!this.canSplitPack) return;

    const flavor = this.getFlavor(flavorId);
    if (!flavor || flavor.category !== this.selectedPackCategory) return;
    if (flavorId === this.packFirstFlavor) return;

    this.packSecondFlavor = flavorId;
    this.packIsSplit = true;
    this.cdr.detectChanges();
  }

  getPackSplitDescription(): string {
    if (!this.packIsSplit || !this.packSecondFlavor) {
      return 'ALL CANS SAME FLAVOUR';
    }
    const half = this.selectedPack / 2;
    return `${half} ${this.getFlavorName(this.packFirstFlavor)} + ${half} ${this.getFlavorName(this.packSecondFlavor)}`;
  }

  getPackCompositionLabel(): string {
    if (!this.packIsSplit || !this.packSecondFlavor) {
      return `${this.selectedPack} × ${this.getFlavorName(this.packFirstFlavor)}`;
    }
    const half = this.selectedPack / 2;
    return `${half} × ${this.getFlavorName(this.packFirstFlavor)} + ${half} × ${this.getFlavorName(this.packSecondFlavor)}`;
  }

  addPackToCart(): void {
    if (!this.canAddSelectedPack) return;
    if (!this.packFirstFlavor) return;
    if (this.packIsSplit && !this.packSecondFlavor) return;

    const first = this.getFlavor(this.packFirstFlavor);
    const second = this.packSecondFlavor ? this.getFlavor(this.packSecondFlavor) : null;

    if (!first) return;
    if (first.category !== this.selectedPackCategory) return;
    if (second && second.category !== this.selectedPackCategory) return;
    if (second && second.id === first.id) return;

    const firstBackend = this.backendProducts.find((p) => p.slug === first.id);
    const secondBackend = second ? this.backendProducts.find((p) => p.slug === second.id) : null;

    const packBasePrice = this.selectedPackBasePrice;
    const packPrice = this.selectedPackPrice;

    const id = `pack-${this.selectedPack}-${first.id}-${this.packIsSplit && second ? second.id : 'single'}`;

    const existing = this.cart.find((item) => item.id === id);

    if (existing) {
      if (existing.quantity >= this.MAX_PACK_QUANTITY) return;
      existing.quantity += 1;
      this.cdr.detectChanges();
    } else {
      const flavorLabel =
        this.packIsSplit && second ? `${first.name} + ${second.name}` : first.name;

      const cartItem: CartItem = {
        id,
        type: 'PACK',
        name: `${this.selectedPackConfig.title} / ${flavorLabel}`,
        quantity: 1,
        price: packPrice,
        originalPrice: packBasePrice,
        firstFlavor: first.id,
        secondFlavor: this.packIsSplit && second ? second.id : null,
        packSize: this.selectedPack,
        category: this.selectedPackCategory,
        packProducts: this.getPackProducts(),
      };

      this.packAdded.emit(cartItem);
    }
  }

  private getPackProducts() {
    const first = this.getFlavor(this.packFirstFlavor);
    const second = this.packSecondFlavor ? this.getFlavor(this.packSecondFlavor) : null;

    const firstBackend = first ? this.backendProducts.find((p) => p.slug === first.id) : null;
    const secondBackend = second ? this.backendProducts.find((p) => p.slug === second.id) : null;

    if (this.packIsSplit && second && secondBackend) {
      const half = this.selectedPack / 2;
      return [
        { flavor: first?.name ?? '', quantity: half, productId: firstBackend?.id },
        { flavor: second.name, quantity: half, productId: secondBackend.id },
      ];
    }
    return [
      { flavor: first?.name ?? '', quantity: this.selectedPack, productId: firstBackend?.id },
    ];
  }

  getFlavorName(flavorId: string): string {
    return this.getFlavor(flavorId)?.name ?? flavorId;
  }

  formatPrice(value: number): string {
    return value.toFixed(2);
  }

  private getFlavor(flavorId: string): Product | undefined {
    return this.flavors.find((flavor) => flavor.id === flavorId);
  }
}
