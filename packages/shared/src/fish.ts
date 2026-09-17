export type FishId = 'minnow' | 'perch' | 'goldfish' | 'carp' | 'catfish' | 'trout' | 'koi' | 'eel' | 'moonfish' | 'golden_koi';
export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type FishingSpot = 'farm' | 'forest';

export interface FishDef {
  id: FishId;
  name: string;
  where: FishingSpot[];
  time: 'any' | 'day' | 'night';
  /** Only bites while it rains. */
  rainOnly?: boolean;
  rarity: FishRarity;
  /** Relative chance among fish that can bite right now. */
  weight: number;
  /** 0 (easy) .. 1 (very hard): fish speed and bar size in the reel mini-game. */
  difficulty: number;
  minSize: number;
  maxSize: number;
  /** Fish units added to the bag (used by recipes). */
  units: number;
  /** Coins the first time this species is caught. */
  firstBonus: number;
  color: string;
  hint: string;
}

export const FISH: Record<FishId, FishDef> = {
  minnow: { id: 'minnow', name: 'Minnow', where: ['farm', 'forest'], time: 'any', rarity: 'common', weight: 10, difficulty: 0.1, minSize: 4, maxSize: 8, units: 1, firstBonus: 20, color: '#9fc4d8', hint: 'Any pond, any time' },
  perch: { id: 'perch', name: 'Perch', where: ['farm'], time: 'any', rarity: 'common', weight: 8, difficulty: 0.25, minSize: 10, maxSize: 20, units: 1, firstBonus: 30, color: '#e0b050', hint: 'Farm pond' },
  goldfish: { id: 'goldfish', name: 'Goldfish', where: ['farm'], time: 'day', rarity: 'uncommon', weight: 4, difficulty: 0.35, minSize: 6, maxSize: 12, units: 1, firstBonus: 60, color: '#ffa94d', hint: 'Farm pond, daytime' },
  carp: { id: 'carp', name: 'Carp', where: ['farm'], time: 'any', rarity: 'uncommon', weight: 5, difficulty: 0.4, minSize: 25, maxSize: 45, units: 1, firstBonus: 50, color: '#b08a50', hint: 'Farm pond' },
  catfish: { id: 'catfish', name: 'Catfish', where: ['farm'], time: 'night', rarity: 'uncommon', weight: 4, difficulty: 0.5, minSize: 30, maxSize: 60, units: 2, firstBonus: 80, color: '#7a7f9a', hint: 'Farm pond at night' },
  trout: { id: 'trout', name: 'Rainbow Trout', where: ['forest'], time: 'day', rarity: 'uncommon', weight: 6, difficulty: 0.45, minSize: 20, maxSize: 40, units: 1, firstBonus: 70, color: '#ff8fcf', hint: 'Forest pond, daytime' },
  koi: { id: 'koi', name: 'Koi', where: ['forest'], time: 'any', rarity: 'rare', weight: 2, difficulty: 0.6, minSize: 30, maxSize: 50, units: 2, firstBonus: 150, color: '#ff6b6b', hint: 'Forest pond' },
  eel: { id: 'eel', name: 'Eel', where: ['forest'], time: 'night', rainOnly: true, rarity: 'rare', weight: 3, difficulty: 0.7, minSize: 40, maxSize: 80, units: 2, firstBonus: 120, color: '#5f8a5f', hint: 'Forest pond, rainy nights' },
  moonfish: { id: 'moonfish', name: 'Moonfish', where: ['forest'], time: 'night', rarity: 'rare', weight: 1.5, difficulty: 0.75, minSize: 15, maxSize: 25, units: 2, firstBonus: 200, color: '#c9c9ff', hint: 'Forest pond at night' },
  golden_koi: { id: 'golden_koi', name: 'Golden Koi', where: ['farm', 'forest'], time: 'any', rainOnly: true, rarity: 'legendary', weight: 0.6, difficulty: 0.9, minSize: 60, maxSize: 90, units: 3, firstBonus: 500, color: '#ffd23f', hint: 'Any pond, only in the rain' },
};

export const FISH_IDS = Object.keys(FISH) as FishId[];

export function isNight(hour: number) {
  return hour >= 19 || hour < 6;
}

/** Fish that can bite at this spot, hour and weather. */
export function fishAvailable(spot: FishingSpot, hour: number, raining: boolean): FishDef[] {
  const night = isNight(hour);
  return FISH_IDS.map((id) => FISH[id]).filter((f) => {
    if (!f.where.includes(spot)) return false;
    if (f.time === 'day' && night) return false;
    if (f.time === 'night' && !night) return false;
    if (f.rainOnly && !raining) return false;
    return true;
  });
}

/** Weighted pick; `rnd` is 0..1. */
export function pickFish(spot: FishingSpot, hour: number, raining: boolean, rnd: () => number): { fish: FishDef; size: number } {
  const pool = fishAvailable(spot, hour, raining);
  const total = pool.reduce((s, f) => s + f.weight, 0);
  let r = rnd() * total;
  let fish = pool[0];
  for (const f of pool) {
    r -= f.weight;
    if (r <= 0) {
      fish = f;
      break;
    }
  }
  const size = Math.round(fish.minSize + rnd() * (fish.maxSize - fish.minSize));
  return { fish, size };
}
