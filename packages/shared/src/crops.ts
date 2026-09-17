export type CropId = 'tomato' | 'carrot' | 'wheat' | 'strawberry' | 'potato' | 'corn' | 'pumpkin' | 'blueberry';

export interface CropDef {
  id: CropId;
  name: string;
  /** Seconds of watered time needed to finish each growth stage. */
  stageSeconds: number[];
  seedPrice: number;
  sellPrice: number;
  /** Reputation needed before the seeds are sold. */
  unlockRep: number;
  color: string;
  colorLight: string;
  leaf: string;
  /** How the crop is drawn. */
  shape: 'bush' | 'stalk' | 'root' | 'vine';
  /** Units per harvest. */
  yieldCount: number;
}

const MIN = 60;
const HOUR = 3600;

/**
 * Mixed pacing: cheap crops in minutes, premium crops in hours, so a first
 * session stays busy and there is always something ripening for tomorrow.
 */
export const CROPS: Record<CropId, CropDef> = {
  wheat: { id: 'wheat', name: 'Wheat', stageSeconds: [40, 40, 40], seedPrice: 5, sellPrice: 12, unlockRep: 0, color: '#ffd84f', colorLight: '#fff0a8', leaf: '#b9d95a', shape: 'stalk', yieldCount: 2 },
  carrot: { id: 'carrot', name: 'Carrot', stageSeconds: [80, 80, 80], seedPrice: 8, sellPrice: 20, unlockRep: 0, color: '#ff9a3c', colorLight: '#ffc07a', leaf: '#5fd35f', shape: 'root', yieldCount: 1 },
  tomato: { id: 'tomato', name: 'Tomato', stageSeconds: [2.5 * MIN, 2.5 * MIN, 3 * MIN], seedPrice: 12, sellPrice: 32, unlockRep: 0, color: '#ff5f5f', colorLight: '#ff9a9a', leaf: '#4fbf4f', shape: 'bush', yieldCount: 1 },
  strawberry: { id: 'strawberry', name: 'Strawberry', stageSeconds: [5 * MIN, 5 * MIN, 5 * MIN], seedPrice: 18, sellPrice: 50, unlockRep: 0, color: '#ff5c8a', colorLight: '#ffa3c0', leaf: '#3fb36b', shape: 'bush', yieldCount: 1 },
  potato: { id: 'potato', name: 'Potato', stageSeconds: [10 * MIN, 10 * MIN, 10 * MIN], seedPrice: 15, sellPrice: 45, unlockRep: 5, color: '#c9a06a', colorLight: '#e8c89a', leaf: '#6fbf5f', shape: 'root', yieldCount: 2 },
  corn: { id: 'corn', name: 'Corn', stageSeconds: [20 * MIN, 20 * MIN, 20 * MIN], seedPrice: 22, sellPrice: 80, unlockRep: 10, color: '#ffe066', colorLight: '#fff4b0', leaf: '#7bd36a', shape: 'stalk', yieldCount: 1 },
  blueberry: { id: 'blueberry', name: 'Blueberry', stageSeconds: [1 * HOUR, 1 * HOUR, 1 * HOUR], seedPrice: 40, sellPrice: 95, unlockRep: 15, color: '#5a7cff', colorLight: '#9fb4ff', leaf: '#4fa86a', shape: 'bush', yieldCount: 2 },
  pumpkin: { id: 'pumpkin', name: 'Pumpkin', stageSeconds: [2 * HOUR, 2 * HOUR, 2 * HOUR], seedPrice: 70, sellPrice: 260, unlockRep: 25, color: '#ff9a3c', colorLight: '#ffc07a', leaf: '#5fb35f', shape: 'vine', yieldCount: 1 },
};

export const CROP_IDS: CropId[] = ['wheat', 'carrot', 'tomato', 'strawberry', 'potato', 'corn', 'blueberry', 'pumpkin'];

export function cropTotalSeconds(id: CropId) {
  return CROPS[id].stageSeconds.reduce((a, b) => a + b, 0);
}

/** "2m", "1h 20m", "3h" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}
