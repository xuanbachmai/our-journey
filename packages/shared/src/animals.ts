import type { ItemId } from './items';

export type AnimalId = 'chicken' | 'cow' | 'sheep' | 'bee';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  plural: string;
  product: ItemId;
  /** Minutes between products, per animal. */
  intervalMin: number;
  price: number;
  max: number;
  /** Where the animals live and where you collect. */
  home: 'farm' | 'ranch';
  /** Upgrade that must be owned first. */
  requires?: 'coop' | 'beehive';
  icon: string;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: { id: 'chicken', name: 'Chicken', plural: 'chickens', product: 'egg', intervalMin: 20, price: 120, max: 4, home: 'farm', requires: 'coop', icon: 'chicken' },
  cow: { id: 'cow', name: 'Cow', plural: 'cows', product: 'milk', intervalMin: 40, price: 650, max: 3, home: 'ranch', icon: 'cow' },
  sheep: { id: 'sheep', name: 'Sheep', plural: 'sheep', product: 'wool', intervalMin: 60, price: 550, max: 3, home: 'ranch', icon: 'sheep' },
  bee: { id: 'bee', name: 'Bee hive', plural: 'hives', product: 'honey', intervalMin: 45, price: 400, max: 2, home: 'farm', icon: 'honey' },
};

export const ANIMAL_IDS: AnimalId[] = ['chicken', 'cow', 'sheep', 'bee'];
export const MAX_WAITING_PER_TYPE = 12;

export interface ProducerState {
  count: number;
  /** Epoch ms of the last product round. */
  anchor: number;
  waiting: number;
}
