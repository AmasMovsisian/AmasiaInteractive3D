export const HERO_TOTAL_FRAMES = 192;

export const HERO_NAVIGATION = {
  home: 0,
  about: 134,
  pricing: 180,
  flavors: 180,
  contact: 150,
} as const;

export type HeroNavigationSection =
  keyof typeof HERO_NAVIGATION;
