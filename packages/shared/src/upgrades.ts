export type UpgradeId = 'sprinkler' | 'counter' | 'coop' | 'stove' | 'rod' | 'flowers' | 'tables' | 'beehive' | 'decor' | 'bigbag' | 'pasture' | 'stable' | 'bigcoop' | 'hoe' | 'can' | 'sickle' | 'seedmaker' | 'bicycle' | 'bikeSeat' | 'car';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  /** Price per level. Length = max level. */
  prices: number[];
  requires?: UpgradeId;
  icon: string;
  /** Where it is sold. */
  shop: 'stall' | 'tools' | 'store' | 'petshop';
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  rod: { id: 'rod', name: 'Fishing rod', desc: 'Fish in ponds', prices: [90], icon: 'rod', shop: 'tools' },
  hoe: { id: 'hoe', name: 'Hoe', desc: 'Row of 3, then 3x3', prices: [250, 700], icon: 'hoe', shop: 'tools' },
  can: { id: 'can', name: 'Watering can', desc: 'Row of 3, then 3x3', prices: [250, 700], icon: 'can', shop: 'tools' },
  sickle: { id: 'sickle', name: 'Sickle', desc: 'Row of 3, then 3x3', prices: [300, 800], icon: 'sickle', shop: 'tools' },
  seedmaker: { id: 'seedmaker', name: 'Seed maker', desc: '1 crop into 2 seeds', prices: [350], icon: 'seedmaker', shop: 'tools' },
  counter: { id: 'counter', name: 'Counter slot', desc: 'One more counter slot', prices: [120, 220, 380], icon: 'plate', shop: 'stall' },
  coop: { id: 'coop', name: 'Chicken coop', desc: 'Home for chickens', prices: [250], icon: 'egg', shop: 'petshop' },
  beehive: { id: 'beehive', name: 'Bee garden', desc: 'Lets you keep bee hives', prices: [300], icon: 'honey', shop: 'petshop' },
  bigcoop: { id: 'bigcoop', name: 'Bigger coop', desc: '+2 room: hens, ducks', prices: [600], requires: 'coop', icon: 'egg', shop: 'petshop' },
  pasture: { id: 'pasture', name: 'Pasture', desc: 'Pig and goat pens', prices: [900, 1800], icon: 'fence', shop: 'petshop' },
  stable: { id: 'stable', name: 'Horse stable', desc: 'Stable and paddock', prices: [1200], icon: 'horse', shop: 'petshop' },
  sprinkler: { id: 'sprinkler', name: 'Sprinkler', desc: 'Waters the whole field', prices: [320], icon: 'drop', shop: 'stall' },
  stove: { id: 'stove', name: 'Better stove', desc: 'Easier cooking timing', prices: [200, 400], icon: 'flame', shop: 'stall' },
  flowers: { id: 'flowers', name: 'Flower beds', desc: 'Pretty, +5 reputation', prices: [150], icon: 'flower', shop: 'stall' },
  tables: { id: 'tables', name: 'Restaurant table', desc: 'One more table to serve', prices: [300, 500, 800], icon: 'table', shop: 'store' },
  decor: { id: 'decor', name: 'Restaurant decor', desc: 'Diners tip more', prices: [400, 700], icon: 'painting', shop: 'store' },
  bigbag: { id: 'bigbag', name: 'Big backpack', desc: 'Carry 12 dishes', prices: [250], icon: 'bag', shop: 'store' },
  bicycle: { id: 'bicycle', name: 'Bicycle', desc: 'A fast personal vehicle (press V)', prices: [450], icon: 'horse', shop: 'petshop' },
  bikeSeat: { id: 'bikeSeat', name: 'Bicycle passenger seat', desc: 'Ride your partner on the bicycle', prices: [700], requires: 'bicycle', icon: 'heart', shop: 'petshop' },
  car: { id: 'car', name: 'Two-person car', desc: 'A speedy vehicle for both players', prices: [1800], icon: 'horse', shop: 'petshop' },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export const BASE_COUNTER_SLOTS = 2;
export const BASE_DISH_CAP = 6;
