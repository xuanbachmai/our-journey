import { ITEMS, type ItemId } from './items';

/** Local calendar day index (days since epoch in local time). */
export function dayIndex(ms: number): number {
  const d = new Date(ms);
  return Math.floor((ms - d.getTimezoneOffset() * 60_000) / 86_400_000);
}

/** "2026-09-17" in local time. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 from any string. */
export function roll01(s: string): number {
  return hash(s) / 4294967296;
}

/** Daily sell-price multiplier, 0.8 .. 1.25. Same for both players on the same day. */
export function priceMultiplier(item: ItemId, seed: number, atMs: number): number {
  const r = roll01(`${seed}:${dayIndex(atMs)}:${item}`);
  return Math.round((0.8 + r * 0.45) * 100) / 100;
}

export function sellPriceToday(item: ItemId, seed: number, atMs: number): number {
  return Math.max(1, Math.round(ITEMS[item].sellPrice * priceMultiplier(item, seed, atMs)));
}
