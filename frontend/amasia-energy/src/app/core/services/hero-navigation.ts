export const HERO_TOTAL_FRAMES = 192;

export const HERO_NAVIGATION = {
  about: 134,
  pricing: 192,
  flavors: 192,
  contact: 150,
} as const;

export type HeroNavigationSection =
  keyof typeof HERO_NAVIGATION;
