import { dayIndex, roll01 } from './prices';

export type TopId = 'overalls' | 'dress' | 'hoodie' | 'tee' | 'coupletee';
export type HatId = 'none' | 'straw' | 'cap' | 'beanie' | 'flowercrown' | 'chef' | 'crown' | 'bow_big' | 'ears' | 'beret' | 'sunhat' | 'catears' | 'party' | 'tiara' | 'frog' | 'heartband';
export type AccessoryId = 'none' | 'glasses' | 'scarf' | 'bag' | 'necklace' | 'bowtie' | 'apron' | 'flower' | 'rings';
export type DyeId = 'default' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange' | 'mint' | 'white' | 'black';
export type HairId = 'default' | 'blonde' | 'brown' | 'black' | 'pink' | 'blue' | 'purple' | 'red' | 'silver' | 'green';

export interface Outfit {
  top: TopId;
  hat: HatId;
  accessory: AccessoryId;
  dye: DyeId;
  hair: HairId;
}

export const DEFAULT_OUTFIT: Outfit = { top: 'overalls', hat: 'none', accessory: 'none', dye: 'default', hair: 'default' };

export interface ClothingDef {
  id: string;
  name: string;
  price: number;
  unlockRep: number;
  /** Not sold: earned from the couple bond. */
  rewardOnly?: boolean;
}

export const TOPS: Record<TopId, ClothingDef> = {
  overalls: { id: 'overalls', name: 'Overalls', price: 0, unlockRep: 0 },
  tee: { id: 'tee', name: 'Tee & shorts', price: 180, unlockRep: 0 },
  hoodie: { id: 'hoodie', name: 'Cosy hoodie', price: 260, unlockRep: 3 },
  dress: { id: 'dress', name: 'Sundress', price: 280, unlockRep: 3 },
  coupletee: { id: 'coupletee', name: 'Couple tee', price: 0, unlockRep: 0, rewardOnly: true },
};

export const HATS: Record<HatId, ClothingDef> = {
  none: { id: 'none', name: 'No hat', price: 0, unlockRep: 0 },
  straw: { id: 'straw', name: 'Straw hat', price: 150, unlockRep: 0 },
  cap: { id: 'cap', name: 'Cap', price: 120, unlockRep: 0 },
  beanie: { id: 'beanie', name: 'Beanie', price: 120, unlockRep: 0 },
  flowercrown: { id: 'flowercrown', name: 'Flower crown', price: 220, unlockRep: 5 },
  bow_big: { id: 'bow_big', name: 'Big bow', price: 180, unlockRep: 5 },
  ears: { id: 'ears', name: 'Bunny ears', price: 260, unlockRep: 10 },
  chef: { id: 'chef', name: 'Chef hat', price: 300, unlockRep: 15 },
  crown: { id: 'crown', name: 'Crown', price: 900, unlockRep: 40 },
  beret: { id: 'beret', name: 'Beret', price: 170, unlockRep: 0 },
  sunhat: { id: 'sunhat', name: 'Sun hat', price: 200, unlockRep: 3 },
  catears: { id: 'catears', name: 'Cat ears', price: 240, unlockRep: 5 },
  party: { id: 'party', name: 'Party hat', price: 150, unlockRep: 5 },
  frog: { id: 'frog', name: 'Frog hat', price: 320, unlockRep: 12 },
  tiara: { id: 'tiara', name: 'Tiara', price: 600, unlockRep: 25 },
  heartband: { id: 'heartband', name: 'Heart headband', price: 0, unlockRep: 0, rewardOnly: true },
};

export const ACCESSORIES: Record<AccessoryId, ClothingDef> = {
  none: { id: 'none', name: 'Nothing', price: 0, unlockRep: 0 },
  glasses: { id: 'glasses', name: 'Glasses', price: 140, unlockRep: 0 },
  scarf: { id: 'scarf', name: 'Scarf', price: 160, unlockRep: 5 },
  bag: { id: 'bag', name: 'Satchel', price: 200, unlockRep: 10 },
  flower: { id: 'flower', name: 'Hair flower', price: 90, unlockRep: 0 },
  bowtie: { id: 'bowtie', name: 'Bow tie', price: 120, unlockRep: 0 },
  apron: { id: 'apron', name: 'Chef apron', price: 180, unlockRep: 3 },
  necklace: { id: 'necklace', name: 'Heart necklace', price: 350, unlockRep: 8 },
  rings: { id: 'rings', name: 'Golden rings', price: 0, unlockRep: 0, rewardOnly: true },
};

export const DYES: Record<DyeId, ClothingDef & { color: string; dark: string }> = {
  default: { id: 'default', name: 'Original', price: 0, unlockRep: 0, color: '', dark: '' },
  red: { id: 'red', name: 'Red', price: 100, unlockRep: 0, color: '#ff6b6b', dark: '#d94a4a' },
  blue: { id: 'blue', name: 'Blue', price: 100, unlockRep: 0, color: '#6fb8ff', dark: '#3f8fe0' },
  green: { id: 'green', name: 'Green', price: 100, unlockRep: 0, color: '#6fd98a', dark: '#3fb35f' },
  yellow: { id: 'yellow', name: 'Yellow', price: 100, unlockRep: 0, color: '#ffd23f', dark: '#e6a800' },
  purple: { id: 'purple', name: 'Purple', price: 100, unlockRep: 0, color: '#c58cff', dark: '#9a5fe0' },
  pink: { id: 'pink', name: 'Pink', price: 100, unlockRep: 0, color: '#ff8fcf', dark: '#e05fa8' },
  orange: { id: 'orange', name: 'Orange', price: 100, unlockRep: 0, color: '#ffa94d', dark: '#e07f20' },
  mint: { id: 'mint', name: 'Mint', price: 120, unlockRep: 5, color: '#7de8c8', dark: '#4fbf9f' },
  white: { id: 'white', name: 'White', price: 120, unlockRep: 5, color: '#fafafa', dark: '#cfcfd9' },
  black: { id: 'black', name: 'Black', price: 150, unlockRep: 10, color: '#4a4a5a', dark: '#2e2e3a' },
};

export const HAIR_COLORS: Record<HairId, ClothingDef & { color: string; dark: string }> = {
  default: { id: 'default', name: 'Original', price: 0, unlockRep: 0, color: '', dark: '' },
  blonde: { id: 'blonde', name: 'Blonde', price: 80, unlockRep: 0, color: '#f2c14e', dark: '#d19a2a' },
  brown: { id: 'brown', name: 'Brown', price: 80, unlockRep: 0, color: '#8a5a33', dark: '#5e3a1f' },
  black: { id: 'black', name: 'Black', price: 80, unlockRep: 0, color: '#3b2a3a', dark: '#241825' },
  pink: { id: 'pink', name: 'Pink', price: 80, unlockRep: 0, color: '#ff7bac', dark: '#e2569a' },
  blue: { id: 'blue', name: 'Blue', price: 80, unlockRep: 0, color: '#5ab0ff', dark: '#3a8ae6' },
  purple: { id: 'purple', name: 'Purple', price: 80, unlockRep: 0, color: '#a56cff', dark: '#7d45e0' },
  red: { id: 'red', name: 'Red', price: 80, unlockRep: 0, color: '#ff6b6b', dark: '#d94a4a' },
  silver: { id: 'silver', name: 'Silver', price: 100, unlockRep: 5, color: '#d9d9e6', dark: '#b0b0c0' },
  green: { id: 'green', name: 'Green', price: 100, unlockRep: 5, color: '#7bd36a', dark: '#4fa84a' },
};

export const TOP_IDS = Object.keys(TOPS) as TopId[];
export const HAT_IDS = Object.keys(HATS) as HatId[];
export const ACCESSORY_IDS = Object.keys(ACCESSORIES) as AccessoryId[];
export const DYE_IDS = Object.keys(DYES) as DyeId[];
export const HAIR_IDS = Object.keys(HAIR_COLORS) as HairId[];

export type ClothingKind = 'top' | 'hat' | 'accessory' | 'dye' | 'hair';
export const CLOTHING_KINDS: ClothingKind[] = ['top', 'hat', 'accessory', 'dye', 'hair'];

/** Key used in the owned-clothing list, e.g. "hat:straw". */
export function clothingKey(kind: ClothingKind, id: string) {
  return `${kind}:${id}`;
}

export function clothingDef(kind: ClothingKind, id: string): ClothingDef & { color?: string; dark?: string } {
  const table: Record<string, ClothingDef> = kind === 'top' ? TOPS : kind === 'hat' ? HATS : kind === 'accessory' ? ACCESSORIES : kind === 'dye' ? DYES : HAIR_COLORS;
  return table[id];
}

export function clothingIds(kind: ClothingKind): string[] {
  return kind === 'top' ? TOP_IDS : kind === 'hat' ? HAT_IDS : kind === 'accessory' ? ACCESSORY_IDS : kind === 'dye' ? DYE_IDS : HAIR_IDS;
}

/** Items that start free (the "nothing" choices and the original overalls). */
export function isFreeClothing(id: string) {
  return id === 'none' || id === 'default' || id === 'overalls';
}

export const SALE_OFF = 0.3;

/** One clothing item per day is 30% off at the tailor. Same for both players. */
export function clothingSaleToday(seed: number, now: number): { kind: ClothingKind; id: string } {
  const all = CLOTHING_KINDS.flatMap((kind) => clothingIds(kind).filter((id) => !isFreeClothing(id) && !clothingDef(kind, id).rewardOnly).map((id) => ({ kind, id })));
  return all[Math.floor(roll01(`${seed}:${dayIndex(now)}:tailor`) * all.length)];
}

export function salePrice(price: number) {
  return Math.round(price * (1 - SALE_OFF));
}
