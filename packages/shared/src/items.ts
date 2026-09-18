import { CROPS, CROP_IDS, type CropId } from './crops';

export type ProduceId = 'egg' | 'fish' | 'milk' | 'wool' | 'mushroom' | 'berry' | 'herb' | 'honey' | 'duck_egg' | 'goat_milk' | 'truffle';
export type ItemId = `seed:${CropId}` | `crop:${CropId}` | ProduceId;

export interface ItemDef {
  id: ItemId;
  name: string;
  sellPrice: number;
  icon: string;
}

const seeds = Object.fromEntries(
  CROP_IDS.map((c) => [`seed:${c}`, { id: `seed:${c}`, name: `${CROPS[c].name} seeds`, sellPrice: Math.floor(CROPS[c].seedPrice / 2), icon: `seed-${c}` }]),
) as Record<`seed:${CropId}`, ItemDef>;
const crops = Object.fromEntries(
  CROP_IDS.map((c) => [`crop:${c}`, { id: `crop:${c}`, name: CROPS[c].name, sellPrice: CROPS[c].sellPrice, icon: `crop-${c}` }]),
) as Record<`crop:${CropId}`, ItemDef>;

export const ITEMS: Record<ItemId, ItemDef> = {
  ...seeds,
  ...crops,
  egg: { id: 'egg', name: 'Egg', sellPrice: 20, icon: 'egg' },
  fish: { id: 'fish', name: 'Fish', sellPrice: 35, icon: 'fish' },
  milk: { id: 'milk', name: 'Milk', sellPrice: 40, icon: 'milk' },
  wool: { id: 'wool', name: 'Wool', sellPrice: 55, icon: 'wool' },
  mushroom: { id: 'mushroom', name: 'Mushroom', sellPrice: 22, icon: 'mushroom' },
  berry: { id: 'berry', name: 'Wild berry', sellPrice: 16, icon: 'berry' },
  herb: { id: 'herb', name: 'Herb', sellPrice: 14, icon: 'herb' },
  honey: { id: 'honey', name: 'Honey', sellPrice: 60, icon: 'honey' },
  duck_egg: { id: 'duck_egg', name: 'Duck egg', sellPrice: 38, icon: 'duck_egg' },
  goat_milk: { id: 'goat_milk', name: 'Goat milk', sellPrice: 55, icon: 'goat_milk' },
  truffle: { id: 'truffle', name: 'Truffle', sellPrice: 120, icon: 'truffle' },
};

export const PRODUCE_IDS: ProduceId[] = ['egg', 'duck_egg', 'milk', 'goat_milk', 'wool', 'honey', 'truffle', 'fish', 'mushroom', 'berry', 'herb'];
export const SELLABLE: ItemId[] = [...CROP_IDS.map((c) => `crop:${c}` as ItemId), ...PRODUCE_IDS];

export function itemIcon(id: ItemId) {
  return ITEMS[id].icon;
}
