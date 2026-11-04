/**
 * @file src/utils/format.ts
 * @description Number formatting for nutrition values. Whole numbers only:
 * "9 / 50g" reads cleaner than "9.0 /50g", and a tenth of a gram means nothing
 * to someone logging a dining hall meal.
 */

/** 1234.4 → "1,234". */
export function formatWhole(n: number): string {
  return Math.round(n).toLocaleString();
}
