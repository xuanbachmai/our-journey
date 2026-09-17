import { dayIndex, roll01 } from './prices';

export type Weather = 'sunny' | 'cloudy' | 'rain';

/** One weather per local day, shared by both players. */
export function weatherFor(seed: number, ms: number): Weather {
  const r = roll01(`${seed}:weather:${dayIndex(ms)}`);
  if (r < 0.22) return 'rain';
  if (r < 0.45) return 'cloudy';
  return 'sunny';
}

/** Start of the local day containing ms. */
export function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const DAY_MS = 86_400_000;
