export type CropId = 'tomato' | 'carrot' | 'wheat' | 'strawberry';

export interface CropDef {
  id: CropId;
  name: string;
  /** Seconds of watered time needed to finish each growth stage. */
  stageSeconds: number[];
  seedPrice: number;
  sellPrice: number;
  /** Main colour of the harvested produce (used by generated art and UI). */
  color: string;
  colorLight: string;
  leaf: string;
}

/**
 * Demo timings: minutes, not hours, so the loop can be felt in one sitting.
 * Production timings live in the server config and will be much longer.
 */
export const CROPS: Record<CropId, CropDef> = {
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    stageSeconds: [20, 25, 30],
    seedPrice: 10,
    sellPrice: 26,
    color: '#ff5f5f',
    colorLight: '#ff9a9a',
    leaf: '#4fbf4f',
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    stageSeconds: [15, 15, 20],
    seedPrice: 8,
    sellPrice: 18,
    color: '#ff9a3c',
    colorLight: '#ffc07a',
    leaf: '#5fd35f',
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    stageSeconds: [10, 12, 14],
    seedPrice: 5,
    sellPrice: 12,
    color: '#ffd84f',
    colorLight: '#fff0a8',
    leaf: '#b9d95a',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    stageSeconds: [25, 30, 35],
    seedPrice: 16,
    sellPrice: 42,
    color: '#ff5c8a',
    colorLight: '#ffa3c0',
    leaf: '#3fb36b',
  },
};

export const CROP_IDS: CropId[] = ['tomato', 'carrot', 'wheat', 'strawberry'];
