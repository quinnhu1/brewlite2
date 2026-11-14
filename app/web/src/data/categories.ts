export const MENU_CATEGORIES = [
  'Classic Coffee',
  'Cold & Brewed',
  'Tea',
  'Pastry & Dessert',
  'Best Sellers',
] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const FALLBACK_PRODUCT_IMAGE = '/images/espresso.jpg';

export function normalizeCategory(value?: string | null): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

/**
 * Only use local images or the one remote image host explicitly allowed by
 * next.config.ts. Other URLs fall back to the bundled image so a bad seed URL
 * cannot break Next/Image at runtime.
 */
export function getProductImageUrl(imageUrl?: string | null): string {
  const value = imageUrl?.trim();
  if (!value) return FALLBACK_PRODUCT_IMAGE;
  if (value.startsWith('/') && !value.startsWith('//')) return value;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === 'images.unsplash.com') {
      return value;
    }
  } catch {
    // A malformed or relative value that does not start with '/' is not usable.
  }

  return FALLBACK_PRODUCT_IMAGE;
}
