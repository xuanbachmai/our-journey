export type UpgradeId = 'sprinkler' | 'counter' | 'coop' | 'chicken' | 'stove' | 'rod' | 'flowers';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  /** Price per level. Length = max level. */
  prices: number[];
  requires?: UpgradeId;
  icon: string;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  rod: { id: 'rod', name: 'Fishing rod', desc: 'Fish in the pond', prices: [90], icon: 'rod' },
  counter: { id: 'counter', name: 'Counter slot', desc: 'One more counter slot', prices: [120, 220, 380], icon: 'plate' },
  coop: { id: 'coop', name: 'Chicken coop', desc: 'Home for chickens', prices: [250], icon: 'egg' },
  chicken: { id: 'chicken', name: 'Chicken', desc: 'Lays eggs over time', prices: [80, 100, 120, 150], requires: 'coop', icon: 'chicken' },
  sprinkler: { id: 'sprinkler', name: 'Sprinkler', desc: 'Waters the whole field', prices: [320], icon: 'drop' },
  stove: { id: 'stove', name: 'Better stove', desc: 'Easier cooking timing', prices: [200, 400], icon: 'flame' },
  flowers: { id: 'flowers', name: 'Flower beds', desc: 'Pretty, +5 reputation', prices: [150], icon: 'flower' },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export const BASE_COUNTER_SLOTS = 2;
export const MAX_CHICKENS = 4;
