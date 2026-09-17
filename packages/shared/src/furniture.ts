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
  | 'photo';

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
  unlockRep: number;
}

export const FURNITURE: Record<FurnitureId, FurnitureDef> = {
  chair: { id: 'chair', name: 'Chair', price: 60, w: 1, h: 1, cozy: 10, unlockRep: 0 },
  table: { id: 'table', name: 'Table', price: 120, w: 2, h: 1, cozy: 20, unlockRep: 0 },
  plant: { id: 'plant', name: 'Potted plant', price: 80, w: 1, h: 1, cozy: 15, unlockRep: 0 },
  rug: { id: 'rug', name: 'Round rug', price: 150, w: 3, h: 2, cozy: 30, unlockRep: 0 },
  lamp: { id: 'lamp', name: 'Lamp', price: 90, w: 1, h: 1, cozy: 15, unlockRep: 0 },
  bed: { id: 'bed', name: 'Double bed', price: 260, w: 2, h: 2, cozy: 50, unlockRep: 5 },
  painting: { id: 'painting', name: 'Painting', price: 140, w: 1, h: 1, cozy: 20, wall: true, unlockRep: 5 },
  bookshelf: { id: 'bookshelf', name: 'Bookshelf', price: 180, w: 1, h: 1, cozy: 25, wall: true, unlockRep: 5 },
  sofa: { id: 'sofa', name: 'Sofa', price: 320, w: 2, h: 1, cozy: 45, unlockRep: 10 },
  teddy: { id: 'teddy', name: 'Giant teddy', price: 220, w: 1, h: 1, cozy: 35, unlockRep: 10 },
  fireplace: { id: 'fireplace', name: 'Fireplace', price: 450, w: 2, h: 1, cozy: 70, wall: true, unlockRep: 15 },
  aquarium: { id: 'aquarium', name: 'Aquarium', price: 380, w: 2, h: 1, cozy: 55, unlockRep: 20 },
  photo: { id: 'photo', name: 'Our photo', price: 300, w: 1, h: 1, cozy: 60, wall: true, unlockRep: 20 },
  piano: { id: 'piano', name: 'Piano', price: 700, w: 2, h: 1, cozy: 90, unlockRep: 30 },
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
