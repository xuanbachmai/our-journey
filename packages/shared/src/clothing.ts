export type HatId = 'none' | 'straw' | 'cap' | 'beanie' | 'flowercrown' | 'chef' | 'crown' | 'bow_big' | 'ears';
export type AccessoryId = 'none' | 'glasses' | 'scarf' | 'bag';
export type DyeId = 'default' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange' | 'mint' | 'white' | 'black';
export type HairId = 'default' | 'blonde' | 'brown' | 'black' | 'pink' | 'blue' | 'purple' | 'red' | 'silver' | 'green';

export interface Outfit {
  hat: HatId;
  accessory: AccessoryId;
  dye: DyeId;
  hair: HairId;
}

export const DEFAULT_OUTFIT: Outfit = { hat: 'none', accessory: 'none', dye: 'default', hair: 'default' };

export interface ClothingDef {
  id: string;
  name: string;
  price: number;
  unlockRep: number;
}

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
};

export const ACCESSORIES: Record<AccessoryId, ClothingDef> = {
  none: { id: 'none', name: 'Nothing', price: 0, unlockRep: 0 },
  glasses: { id: 'glasses', name: 'Glasses', price: 140, unlockRep: 0 },
  scarf: { id: 'scarf', name: 'Scarf', price: 160, unlockRep: 5 },
  bag: { id: 'bag', name: 'Satchel', price: 200, unlockRep: 10 },
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

export const HAT_IDS = Object.keys(HATS) as HatId[];
export const ACCESSORY_IDS = Object.keys(ACCESSORIES) as AccessoryId[];
export const DYE_IDS = Object.keys(DYES) as DyeId[];
export const HAIR_IDS = Object.keys(HAIR_COLORS) as HairId[];

/** Key used in the owned-clothing list, e.g. "hat:straw". */
export function clothingKey(kind: 'hat' | 'accessory' | 'dye' | 'hair', id: string) {
  return `${kind}:${id}`;
}
