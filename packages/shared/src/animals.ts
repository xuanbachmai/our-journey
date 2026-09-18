import type { ItemId } from './items';

export type AnimalId = 'chicken' | 'duck' | 'bee' | 'cow' | 'sheep' | 'goat' | 'pig' | 'horse';

export interface AnimalDef {
  id: AnimalId;
  name: string;
  plural: string;
  /** What it makes. The horse makes nothing: you ride it. */
  product?: ItemId;
  /** One line for the shop. */
  blurb: string;
  /** Minutes between products, per animal. */
  intervalMin: number;
  price: number;
  max: number;
  /** Where the animals live and where you collect. */
  home: 'farm' | 'ranch';
  /** Upgrade that must be owned first. */
  requires?: 'coop' | 'beehive' | 'pasture' | 'stable';
  icon: string;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  chicken: { id: 'chicken', name: 'Chicken', plural: 'chickens', product: 'egg', intervalMin: 20, price: 120, max: 4, home: 'farm', requires: 'coop', icon: 'chicken', blurb: 'Lays eggs in the coop' },
  duck: { id: 'duck', name: 'Duck', plural: 'ducks', product: 'duck_egg', intervalMin: 30, price: 220, max: 3, home: 'farm', requires: 'coop', icon: 'duck', blurb: 'Big duck eggs, shares the coop' },
  bee: { id: 'bee', name: 'Bee hive', plural: 'hives', product: 'honey', intervalMin: 45, price: 400, max: 2, home: 'farm', requires: 'beehive', icon: 'honey', blurb: 'Honey from the bee garden' },
  cow: { id: 'cow', name: 'Cow', plural: 'cows', product: 'milk', intervalMin: 40, price: 650, max: 3, home: 'ranch', icon: 'cow', blurb: 'Milk at the ranch barn' },
  sheep: { id: 'sheep', name: 'Sheep', plural: 'sheep', product: 'wool', intervalMin: 60, price: 550, max: 3, home: 'ranch', icon: 'sheep', blurb: 'Soft wool, sells dear' },
  goat: { id: 'goat', name: 'Goat', plural: 'goats', product: 'goat_milk', intervalMin: 45, price: 600, max: 3, home: 'ranch', requires: 'pasture', icon: 'goat', blurb: 'Goat milk for cheese dishes' },
  pig: { id: 'pig', name: 'Pig', plural: 'pigs', product: 'truffle', intervalMin: 70, price: 800, max: 3, home: 'ranch', requires: 'pasture', icon: 'pig', blurb: 'Digs up rare truffles' },
  horse: { id: 'horse', name: 'Horse', plural: 'horses', intervalMin: 0, price: 1500, max: 1, home: 'ranch', requires: 'stable', icon: 'horse', blurb: 'Ride it outdoors, much faster' },
};

export const ANIMAL_IDS: AnimalId[] = ['chicken', 'duck', 'bee', 'cow', 'sheep', 'goat', 'pig', 'horse'];
export const MAX_WAITING_PER_TYPE = 12;

export interface ProducerState {
  count: number;
  /** Epoch ms of the last product round. */
  anchor: number;
  waiting: number;
}
