export type UpgradeId = 'sprinkler' | 'counter' | 'coop' | 'stove' | 'rod' | 'flowers' | 'tables' | 'beehive' | 'decor' | 'bigbag';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  /** Price per level. Length = max level. */
  prices: number[];
  requires?: UpgradeId;
  icon: string;
  /** Where it is sold. */
  shop: 'stall' | 'store' | 'petshop';
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  rod: { id: 'rod', name: 'Fishing rod', desc: 'Fish in ponds', prices: [90], icon: 'rod', shop: 'stall' },
  counter: { id: 'counter', name: 'Counter slot', desc: 'One more counter slot', prices: [120, 220, 380], icon: 'plate', shop: 'stall' },
  coop: { id: 'coop', name: 'Chicken coop', desc: 'Home for chickens', prices: [250], icon: 'egg', shop: 'petshop' },
  beehive: { id: 'beehive', name: 'Bee garden', desc: 'Lets you keep bee hives', prices: [300], icon: 'honey', shop: 'petshop' },
  sprinkler: { id: 'sprinkler', name: 'Sprinkler', desc: 'Waters the whole field', prices: [320], icon: 'drop', shop: 'stall' },
  stove: { id: 'stove', name: 'Better stove', desc: 'Easier cooking timing', prices: [200, 400], icon: 'flame', shop: 'stall' },
  flowers: { id: 'flowers', name: 'Flower beds', desc: 'Pretty, +5 reputation', prices: [150], icon: 'flower', shop: 'stall' },
  tables: { id: 'tables', name: 'Restaurant table', desc: 'One more table to serve', prices: [300, 500, 800], icon: 'table', shop: 'store' },
  decor: { id: 'decor', name: 'Restaurant decor', desc: 'Diners tip more', prices: [400, 700], icon: 'painting', shop: 'store' },
  bigbag: { id: 'bigbag', name: 'Big backpack', desc: 'Carry 12 dishes', prices: [250], icon: 'bag', shop: 'store' },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export const BASE_COUNTER_SLOTS = 2;
export const BASE_DISH_CAP = 6;
