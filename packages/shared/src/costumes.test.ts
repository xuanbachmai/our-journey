import { describe, expect, it } from 'vitest';
import { clothingDef, clothingKey, DEFAULT_OUTFIT, isFreeClothing } from './clothing';
import { COSTUMES, costume, costumeFor, costumeFullPrice, costumeOwned, costumePieces, costumePrice, SET_RATE, wearingCostume } from './costumes';

const free = COSTUMES.filter((c) => c.free);
const sets = COSTUMES.filter((c) => !c.free);

describe('costumes', () => {
  it('starts you with exactly five free looks', () => {
    expect(free).toHaveLength(5);
    expect(sets.length).toBeGreaterThan(0);
    for (const c of free) expect(c.unlockRep, `${c.id} should be wearable straight away`).toBe(0);
  });

  it('names every piece of every look', () => {
    for (const c of COSTUMES) {
      const pieces = costumePieces(c);
      expect(pieces).toHaveLength(5);
      for (const p of pieces) expect(clothingDef(p.kind, p.id), `${c.id} wears an unknown ${p.kind}: ${p.id}`).toBeTruthy();
    }
  });

  it('gives each look its own silhouette', () => {
    const seen = new Set<string>();
    for (const c of COSTUMES) {
      const key = Object.values(c.outfit).join('|');
      expect(seen.has(key), `${c.id} is the same outfit as another look`).toBe(false);
      seen.add(key);
    }
  });

  it('covers hair, clothes and something on the head or face', () => {
    // the ask was that a look is a whole character, not just a shirt
    const withHat = COSTUMES.filter((c) => c.outfit.hat !== 'none').length;
    const withExtra = COSTUMES.filter((c) => c.outfit.accessory !== 'none').length;
    const withHair = COSTUMES.filter((c) => c.outfit.hair !== 'default').length;
    expect(withHat).toBeGreaterThanOrEqual(8);
    expect(withExtra).toBeGreaterThanOrEqual(8);
    expect(withHair).toBeGreaterThanOrEqual(8);
  });

  it('asks nothing for a free look and real coins for a set', () => {
    for (const c of free) expect(costumePrice(c)).toBe(0);
    for (const c of sets) expect(costumePrice(c), `${c.id} should cost something`).toBeGreaterThan(100);
  });

  it('prices a set under its pieces', () => {
    for (const c of sets) {
      const full = costumeFullPrice(c, []);
      expect(costumePrice(c, []), `${c.id} is no cheaper as a set`).toBeLessThan(full);
      expect(costumePrice(c, [])).toBe(Math.round(full * SET_RATE));
    }
  });

  it('never charges twice for a piece you already have', () => {
    const royal = costume('royal');
    expect(royal).toBeTruthy();
    const owned = costumePieces(royal!).filter((p) => !isFreeClothing(p.id)).map((p) => p.key);
    expect(costumePrice(royal!, owned)).toBe(0);
    // owning the necklace alone takes its price out of the set
    const necklace = [clothingKey('accessory', 'necklace')];
    expect(costumePrice(royal!, necklace)).toBeLessThan(costumePrice(royal!, []));
  });

  it('counts a look as owned once every piece is in the wardrobe', () => {
    const cat = costume('catnap') as NonNullable<ReturnType<typeof costume>>;
    expect(costumeOwned(cat, [])).toBe(false);
    const all = costumePieces(cat).map((p) => p.key);
    expect(costumeOwned(cat, all)).toBe(true);
    for (const c of free) expect(costumeOwned(c, []), `${c.id} is free, so it is always owned`).toBe(true);
  });

  it('recognises what you are wearing', () => {
    const farmday = costume('farmday') as NonNullable<ReturnType<typeof costume>>;
    expect(wearingCostume(farmday, DEFAULT_OUTFIT)).toBe(true);
    expect(costumeFor(DEFAULT_OUTFIT)?.id).toBe('farmday');
    expect(costumeFor({ ...DEFAULT_OUTFIT, hat: 'crown' })).toBeUndefined();
  });

  it('keeps the dear pieces behind reputation', () => {
    const royal = costume('royal') as NonNullable<ReturnType<typeof costume>>;
    expect(royal.unlockRep).toBeGreaterThan(30);
    for (const c of sets) expect(c.unlockRep).toBeGreaterThan(0);
  });
});
