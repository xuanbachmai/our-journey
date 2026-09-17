export type PetId = 'dog' | 'cat' | 'bunny';

export interface PetDef {
  id: PetId;
  name: string;
  price: number;
  icon: string;
  /** Minutes between little gifts while the owner is playing. */
  giftMin: number;
}

export const PETS: Record<PetId, PetDef> = {
  dog: { id: 'dog', name: 'Puppy', price: 350, icon: 'dog', giftMin: 12 },
  cat: { id: 'cat', name: 'Kitten', price: 350, icon: 'cat', giftMin: 15 },
  bunny: { id: 'bunny', name: 'Bunny', price: 300, icon: 'bunny', giftMin: 18 },
};

export const PET_IDS: PetId[] = ['dog', 'cat', 'bunny'];

export interface PetState {
  type: PetId;
  name: string;
  /** 0..100, grows with petting. */
  affection: number;
  lastPetAt: number;
  lastGiftAt: number;
}

export const PET_AFFECTION_PER_PET = 4;
export const PET_COOLDOWN_MS = 60_000;

/** Things a pet can dig up: item id and weight. */
export const PET_GIFTS: [string, number][] = [
  ['crop:wheat', 4],
  ['crop:carrot', 3],
  ['berry', 3],
  ['mushroom', 2],
  ['herb', 2],
  ['egg', 2],
  ['seed:tomato', 2],
  ['seed:strawberry', 1],
  ['honey', 1],
];
