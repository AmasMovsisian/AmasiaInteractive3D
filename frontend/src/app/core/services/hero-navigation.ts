/** Total number of frames in the hero animation. */
export const HERO_TOTAL_FRAMES = 192;

/** Frame indices for navigating to specific hero sections. */
export const HERO_NAVIGATION = {
  home: 0,
  about: 134,
  pricing: 180,
  flavors: 180,
  contact: 150,
} as const;

/** Available hero navigation section names. */
export type HeroNavigationSection = keyof typeof HERO_NAVIGATION;
