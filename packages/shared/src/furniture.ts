export type FurnitureId =
  | 'bed'
  | 'table'
  | 'chair'
  | 'rug'
  | 'plant'
  | 'bookshelf'
  | 'lamp'
  | 'painting'
  | 'fireplace'
  | 'piano'
  | 'aquarium'
  | 'sofa'
  | 'teddy'
  | 'photo'
  | 'armchair'
  | 'beanbag'
  | 'vase'
  | 'cactus'
  | 'clock'
  | 'lights'
  | 'tv'
  | 'records'
  | 'petbed'
  | 'heartrug'
  | 'dresser'
  | 'loveseat';

export type FurnitureCat = 'living' | 'bedroom' | 'deco' | 'wall';

export interface FurnitureDef {
  id: FurnitureId;
  name: string;
  price: number;
  /** Footprint in tiles. */
  w: number;
  h: number;
  /** Coziness points. 100 points = +5% dish prices, capped at +25%. */
  cozy: number;
  /** Wall pieces sit on the top wall row and do not block walking. */
  wall?: boolean;
  /** Flat on the floor: drawn under everything and can be walked over. */
  floor?: boolean;
  cat: FurnitureCat;
  unlockRep: number;
}

export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  chair: { id: 'chair', name: 'Chair', price: 60, w: 1, h: 1, cozy: 10, cat: 'living', unlockRep: 0 },
  table: { id: 'table', name: 'Table', price: 120, w: 2, h: 1, cozy: 20, cat: 'living', unlockRep: 0 },
  plant: { id: 'plant', name: 'Potted plant', price: 80, w: 1, h: 1, cozy: 15, cat: 'deco', unlockRep: 0 },
  rug: { id: 'rug', name: 'Round rug', price: 150, w: 3, h: 2, cozy: 30, cat: 'deco', floor: true, unlockRep: 0 },
  lamp: { id: 'lamp', name: 'Lamp', price: 90, w: 1, h: 1, cozy: 15, cat: 'deco', unlockRep: 0 },
  bed: { id: 'bed', name: 'Double bed', price: 260, w: 2, h: 2, cozy: 50, cat: 'bedroom', unlockRep: 5 },
  painting: { id: 'painting', name: 'Painting', price: 140, w: 1, h: 1, cozy: 20, wall: true, cat: 'wall', unlockRep: 5 },
  bookshelf: { id: 'bookshelf', name: 'Bookshelf', price: 180, w: 1, h: 1, cozy: 25, wall: true, cat: 'wall', unlockRep: 5 },
  sofa: { id: 'sofa', name: 'Sofa', price: 320, w: 2, h: 1, cozy: 45, cat: 'living', unlockRep: 10 },
  teddy: { id: 'teddy', name: 'Giant teddy', price: 220, w: 1, h: 1, cozy: 35, cat: 'bedroom', unlockRep: 10 },
  fireplace: { id: 'fireplace', name: 'Fireplace', price: 450, w: 2, h: 1, cozy: 70, wall: true, cat: 'wall', unlockRep: 15 },
  aquarium: { id: 'aquarium', name: 'Aquarium', price: 380, w: 2, h: 1, cozy: 55, cat: 'deco', unlockRep: 20 },
  photo: { id: 'photo', name: 'Our photo', price: 300, w: 1, h: 1, cozy: 60, wall: true, cat: 'wall', unlockRep: 20 },
  armchair: { id: 'armchair', name: 'Armchair', price: 200, w: 1, h: 1, cozy: 30, cat: 'living', unlockRep: 0 },
  vase: { id: 'vase', name: 'Flower vase', price: 70, w: 1, h: 1, cozy: 12, cat: 'deco', unlockRep: 0 },
  cactus: { id: 'cactus', name: 'Tiny cactus', price: 50, w: 1, h: 1, cozy: 8, cat: 'deco', unlockRep: 0 },
  clock: { id: 'clock', name: 'Wall clock', price: 110, w: 1, h: 1, cozy: 15, wall: true, cat: 'wall', unlockRep: 0 },
  beanbag: { id: 'beanbag', name: 'Beanbag', price: 160, w: 1, h: 1, cozy: 25, cat: 'living', unlockRep: 3 },
  petbed: { id: 'petbed', name: 'Pet bed', price: 140, w: 1, h: 1, cozy: 25, floor: true, cat: 'bedroom', unlockRep: 3 },
  lights: { id: 'lights', name: 'Fairy lights', price: 180, w: 2, h: 1, cozy: 35, wall: true, cat: 'wall', unlockRep: 5 },
  dresser: { id: 'dresser', name: 'Dresser', price: 240, w: 2, h: 1, cozy: 35, cat: 'bedroom', unlockRep: 8 },
  heartrug: { id: 'heartrug', name: 'Heart rug', price: 280, w: 3, h: 2, cozy: 45, floor: true, cat: 'deco', unlockRep: 8 },
  records: { id: 'records', name: 'Record player', price: 360, w: 1, h: 1, cozy: 50, cat: 'living', unlockRep: 12 },
  tv: { id: 'tv', name: 'Retro TV', price: 420, w: 2, h: 1, cozy: 55, cat: 'living', unlockRep: 15 },
  loveseat: { id: 'loveseat', name: 'Love seat', price: 520, w: 2, h: 1, cozy: 80, cat: 'living', unlockRep: 20 },
  piano: { id: 'piano', name: 'Piano', price: 700, w: 2, h: 1, cozy: 90, cat: 'living', unlockRep: 30 },
};

export const FURNITURE_IDS = Object.keys(FURNITURE) as FurnitureId[];

export interface PlacedFurniture {
  id: FurnitureId;
  tx: number;
  ty: number;
}

export function cozyPoints(placed: PlacedFurniture[]): number {
  return placed.reduce((s, p) => s + FURNITURE[p.id].cozy, 0);
}

/** 0..0.25 */
export function cozyBonus(placed: PlacedFurniture[]): number {
  return Math.min(0.25, Math.floor(cozyPoints(placed) / 100) * 0.05);
}

export const FURNITURE_CATS: { id: FurnitureCat; name: string }[] = [
  { id: 'living', name: 'Living' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'deco', name: 'Decor' },
  { id: 'wall', name: 'Wall' },
];

/** One furniture piece per day is 30% off. Same for both players. */
export function furnitureSaleToday(seed: number, dayIdx: number): FurnitureId {
  let h = 2166136261;
  const s = `${seed}:${dayIdx}:furniture`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return FURNITURE_IDS[(h >>> 0) % FURNITURE_IDS.length];
}
