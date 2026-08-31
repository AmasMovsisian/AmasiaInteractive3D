import { computed, Injectable, signal } from '@angular/core';

export type FlavorId = 'keylime' | 'akebi' | 'coconut' | 'lychee' | 'pandan' | 'black-edition';

export type FlavorCategory = 'main' | 'premium' | 'signature';

export interface Flavor {
  id: FlavorId;
  name: string;
  category: FlavorCategory;
  price: number;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
/** Manages flavor data and selected flavor state. */
export class FlavorService {
  readonly flavors: readonly Flavor[] = [
    {
      id: 'keylime',
      name: 'KEYLIME',
      category: 'main',
      price: 7.99,
      description:
        'Bright, crisp and unmistakably refreshing.\n' +
        'KEYLIME combines vibrant citrus character with a clean, elegant finish.\n' +
        'Fresh enough to energize the moment, refined enough to leave a lasting impression.',
    },
    {
      id: 'akebi',
      name: 'AKEBI',
      category: 'main',
      price: 7.99,
      description:
        'Exotic fruit character meets effortless sophistication.\n' +
        'AKEBI unfolds with a delicate sweetness and a smooth, subtly complex finish.\n' +
        'Distinctive yet effortlessly balanced, it brings an unexpected touch of energy to the experience.',
    },
    {
      id: 'coconut',
      name: 'COCONUT',
      category: 'premium',
      price: 9.99,
      description:
        'Soft, smooth and naturally indulgent.\n' +
        'COCONUT balances creamy tropical notes with a clean and sophisticated finish.\n' +
        'A relaxed expression of luxury, created for moments that deserve something beyond the ordinary.',
    },
    {
      id: 'lychee',
      name: 'LYCHEE',
      category: 'premium',
      price: 9.99,
      description:
        'Delicate sweetness with an unmistakably exotic character.\n' +
        'LYCHEE brings together juicy fruit notes and subtle floral elegance in a beautifully balanced profile.\n' +
        'Light, refined and quietly expressive, it turns every sip into something memorable.',
    },
    {
      id: 'pandan',
      name: 'PANDAN',
      category: 'premium',
      price: 9.99,
      description:
        'Distinctive, aromatic and effortlessly intriguing.\n' +
        'PANDAN introduces a smooth tropical character with delicate herbal and vanilla-like nuances.\n' +
        'Unexpected yet beautifully balanced, it creates a sophisticated flavor experience unlike anything ordinary.',
    },
    {
      id: 'black-edition',
      name: 'BLACK EDITION',
      category: 'signature',
      price: 13.99,
      description:
        'Bold citrus meets refined aromatic depth.\n' +
        'BLACK EDITION combines vibrant Yuzu with elegant Bergamot for a complex and sophisticated profile.\n' +
        'Intense yet controlled, distinctive yet balanced, it represents AMASIA at its most exclusive.',
    },
  ];

  private readonly flavorsById: Record<FlavorId, Flavor> = this.flavors.reduce(
    (result, flavor) => {
      result[flavor.id] = flavor;
      return result;
    },
    {} as Record<FlavorId, Flavor>,
  );

  readonly selectedFlavorId = signal<FlavorId>('black-edition');

  readonly selectedFlavor = computed(() => {
    return this.flavorsById[this.selectedFlavorId()];
  });

  /** Sets the selected flavor by ID. */
  selectFlavor(flavorId: FlavorId): void {
    this.selectedFlavorId.set(flavorId);
  }
}
