import { computed, Injectable, signal } from '@angular/core';

export type FlavorId = 'keylime' | 'mangosteen' | 'coconut' | 'lychee' | 'black-edition';

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
export class FlavorService {
  readonly flavors: readonly Flavor[] = [
    {
      id: 'keylime',
      name: 'KEYLIME',
      category: 'main',
      price: 7.99,
      description:
        'A vibrant burst of premium Key Lime with an irresistibly fresh and elegant finish.\nCrisp, bright, and beautifully balanced, every sip feels instantly refreshing.\nA bold AMASIA experience made to awaken your senses.',
    },
    {
      id: 'mangosteen',
      name: 'MANGOSTEEN',
      category: 'main',
      price: 7.99,
      description:
        'An exotic taste of pure sophistication.\nDelicate mangosteen sweetness meets a smooth, vibrant fruit character for a truly captivating experience.\nMANGOSTEEN brings an unforgettable touch of luxury to every sip.',
    },
    {
      id: 'coconut',
      name: 'COCONUT',
      category: 'premium',
      price: 9.99,
      description:
        'Smooth.\nCreamy.\nIrresistibly luxurious.\nCOCONUT combines velvety tropical richness with a refined, elegant finish that feels effortlessly premium.\nA sophisticated AMASIA experience made for those who expect more.',
    },
    {
      id: 'lychee',
      name: 'LYCHEE',
      category: 'premium',
      price: 9.99,
      description:
        'Delicate, exotic, and undeniably elegant.\nLYCHEE reveals a beautifully juicy sweetness with refined floral notes and a luxurious finish.\nA captivating premium experience that turns every sip into a moment of indulgence.',
    },
    {
      id: 'black-edition',
      name: 'BLACK EDITION',
      category: 'signature',
      price: 13.99,
      description:
        'A sophisticated fusion of vibrant Yuzu and refined Bergamot creates an unforgettable signature flavor.\nCitrusy, aromatic, and beautifully complex, every sip reveals a remarkable depth and elegance.\nCrafted with an uncompromising attention to detail, BLACK EDITION delivers a truly exclusive experience.\nRare in character and unmistakable in style, this is AMASIA at its most luxurious.',
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

  selectFlavor(flavorId: FlavorId): void {
    console.log('Flavor selected:', flavorId);
    this.selectedFlavorId.set(flavorId);
  }
}
