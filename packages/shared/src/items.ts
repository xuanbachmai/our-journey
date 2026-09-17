import { CROPS, CROP_IDS, type CropId } from './crops';

export type ItemId = `seed:${CropId}` | `crop:${CropId}` | 'egg' | 'fish';

export interface ItemDef {
  id: ItemId;
  name: string;
  sellPrice: number;
  icon: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  ...(Object.fromEntries(CROP_IDS.map((c) => [`seed:${c}`, { id: `seed:${c}`, name: `${CROPS[c].name} seeds`, sellPrice: Math.floor(CROPS[c].seedPrice / 2), icon: `seed-${c}` }])) as Record<`seed:${CropId}`, ItemDef>),
  ...(Object.fromEntries(CROP_IDS.map((c) => [`crop:${c}`, { id: `crop:${c}`, name: CROPS[c].name, sellPrice: CROPS[c].sellPrice, icon: `crop-${c}` }])) as Record<`crop:${CropId}`, ItemDef>),
  egg: { id: 'egg', name: 'Egg', sellPrice: 20, icon: 'egg' },
  fish: { id: 'fish', name: 'Fish', sellPrice: 35, icon: 'fish' },
};

export const SELLABLE: ItemId[] = [...CROP_IDS.map((c) => `crop:${c}` as ItemId), 'egg', 'fish'];
