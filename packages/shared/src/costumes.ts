import { clothingDef, clothingKey, type AccessoryId, type DyeId, type HairId, type HatId, type Outfit, type TopId } from './clothing';

/**
 * A costume is a whole look in one tap: top, hat, extra, dye and hair colour
 * together. Five are free from the first morning and hand over the pieces they
 * use, so a new farm has something to mix with instead of one pair of
 * overalls. The rest are sold as a set, about a third under the pieces.
 */

export interface Costume {
  id: string;
  name: string;
  /** One line of flavour for the card. */
  blurb: string;
  outfit: Outfit;
  /** Free looks are wearable from the start and grant their pieces. */
  free?: boolean;
  unlockRep: number;
}

const look = (top: TopId, hat: HatId, accessory: AccessoryId, dye: DyeId, hair: HairId): Outfit => ({ top, hat, accessory, dye, hair });

export const COSTUMES: Costume[] = [
  { id: 'farmday', name: 'Farm Day', blurb: 'How you woke up.', outfit: look('overalls', 'none', 'none', 'default', 'default'), free: true, unlockRep: 0 },
  { id: 'sunrise', name: 'Sunrise', blurb: 'For long mornings.', outfit: look('tee', 'straw', 'none', 'yellow', 'blonde'), free: true, unlockRep: 0 },
  { id: 'cocoa', name: 'Cocoa', blurb: 'Rain and kitchens.', outfit: look('hoodie', 'beanie', 'scarf', 'orange', 'brown'), free: true, unlockRep: 0 },
  { id: 'studyhall', name: 'Study Hall', blurb: 'For reading up.', outfit: look('tee', 'beret', 'glasses', 'blue', 'black'), free: true, unlockRep: 0 },
  { id: 'blossom', name: 'Blossom', blurb: 'Spring by the tree.', outfit: look('dress', 'none', 'flower', 'pink', 'pink'), free: true, unlockRep: 0 },
  { id: 'catnap', name: 'Catnap', blurb: 'Ears up, no plans.', outfit: look('hoodie', 'catears', 'bowtie', 'purple', 'purple'), unlockRep: 5 },
  { id: 'gardenfairy', name: 'Garden Fairy', blurb: 'Whole flower beds.', outfit: look('dress', 'flowercrown', 'flower', 'mint', 'green'), unlockRep: 5 },
  { id: 'pondside', name: 'Pondside', blurb: 'Wear it fishing.', outfit: look('hoodie', 'frog', 'glasses', 'green', 'green'), unlockRep: 12 },
  { id: 'headchef', name: 'Head Chef', blurb: 'Earned at the stove.', outfit: look('tee', 'chef', 'apron', 'white', 'default'), unlockRep: 15 },
  { id: 'starlight', name: 'Starlight', blurb: 'For lantern nights.', outfit: look('dress', 'tiara', 'necklace', 'black', 'silver'), unlockRep: 25 },
  { id: 'royal', name: 'Royal', blurb: 'The town knows you.', outfit: look('dress', 'crown', 'necklace', 'red', 'silver'), unlockRep: 40 },
];

export const COSTUME_IDS = COSTUMES.map((c) => c.id);
/** A set costs this much of what its pieces would cost one at a time. */
export const SET_RATE = 0.67;

export function costume(id: string): Costume | undefined {
  return COSTUMES.find((c) => c.id === id);
}

/** The five pieces of a look, as owned-list keys. */
export function costumePieces(c: Costume): { kind: 'top' | 'hat' | 'accessory' | 'dye' | 'hair'; id: string; key: string }[] {
  return [
    { kind: 'top' as const, id: c.outfit.top },
    { kind: 'hat' as const, id: c.outfit.hat },
    { kind: 'accessory' as const, id: c.outfit.accessory },
    { kind: 'dye' as const, id: c.outfit.dye },
    { kind: 'hair' as const, id: c.outfit.hair },
  ].map((p) => ({ ...p, key: clothingKey(p.kind, p.id) }));
}

/** What the pieces would cost bought one at a time. */
export function costumeFullPrice(c: Costume, owned: string[] = []): number {
  return costumePieces(c)
    .filter((p) => !owned.includes(p.key))
    .reduce((sum, p) => sum + (clothingDef(p.kind, p.id)?.price ?? 0), 0);
}

/**
 * The set price: a third off, and only for the pieces you do not already own,
 * so buying one look never makes you pay twice for the same necklace.
 */
export function costumePrice(c: Costume, owned: string[] = []): number {
  if (c.free) return 0;
  return Math.round(costumeFullPrice(c, owned) * SET_RATE);
}

/** True once every piece of the look is in the wardrobe. */
export function costumeOwned(c: Costume, owned: string[]): boolean {
  return c.free || costumePieces(c).every((p) => owned.includes(p.key));
}

export function wearingCostume(c: Costume, outfit: Outfit): boolean {
  return (['top', 'hat', 'accessory', 'dye', 'hair'] as const).every((k) => outfit[k] === c.outfit[k]);
}

/** The look the current outfit matches, if it matches one exactly. */
export function costumeFor(outfit: Outfit): Costume | undefined {
  return COSTUMES.find((c) => wearingCostume(c, outfit));
}
