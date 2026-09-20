import { describe, expect, it } from 'vitest';
import { addBond, BOND_LEVELS, BOND_REWARDS, BOND_SOURCES, bondLevel, bondPriceBonus, bondProgress, MAX_BOND, outfitsMatch } from './bond';
import { DEFAULT_OUTFIT, clothingDef, type ClothingKind } from './clothing';
import { FURNITURE } from './furniture';
import { DAY_MS } from './weather';
import { newWorld } from './world';

describe('bond levels', () => {
  it('starts at level 1 and climbs with points', () => {
    expect(bondLevel(0)).toBe(1);
    expect(bondLevel(BOND_LEVELS[1] - 1)).toBe(1);
    expect(bondLevel(BOND_LEVELS[1])).toBe(2);
    expect(bondLevel(999_999)).toBe(MAX_BOND);
  });

  it('reports progress inside the level, and nothing at the top', () => {
    const [have, need] = bondProgress(BOND_LEVELS[1] + 5) as [number, number];
    expect(have).toBe(5);
    expect(need).toBe(BOND_LEVELS[2] - BOND_LEVELS[1]);
    expect(bondProgress(BOND_LEVELS[MAX_BOND - 1])).toBeNull();
  });

  it('adds up the price bonus from the levels reached', () => {
    expect(bondPriceBonus(0)).toBe(0);
    expect(bondPriceBonus(BOND_LEVELS[2])).toBeCloseTo(0.03);
    expect(bondPriceBonus(999_999)).toBeCloseTo(0.1);
  });

  it('every reward names real furniture and clothing', () => {
    for (const r of BOND_REWARDS) {
      for (const id of Object.keys(r.furniture ?? {})) expect(FURNITURE[id as keyof typeof FURNITURE], id).toBeTruthy();
      for (const key of r.clothing ?? []) {
        const [kind, id] = key.split(':');
        expect(clothingDef(kind as ClothingKind, id), key).toBeTruthy();
      }
    }
  });
});

describe('bond points', () => {
  it('respects the daily cap and resets the next day', () => {
    const now = Date.now();
    const w = newWorld(now);
    for (let i = 0; i < 20; i++) addBond(w, 'hug', now);
    expect(w.bond?.points).toBe(BOND_SOURCES.hug.cap);
    expect(addBond(w, 'hug', now)).toBe(0);

    // a new day clears today's counters but keeps the total
    expect(addBond(w, 'hug', now + DAY_MS)).toBe(BOND_SOURCES.hug.points);
    expect(w.bond?.points).toBe(BOND_SOURCES.hug.cap + BOND_SOURCES.hug.points);
    expect(w.bond?.got.hug).toBe(BOND_SOURCES.hug.points);
  });

  it('a whole good day cannot reach level 10 on its own', () => {
    const now = Date.now();
    const w = newWorld(now);
    for (const source of Object.keys(BOND_SOURCES) as (keyof typeof BOND_SOURCES)[]) addBond(w, source, now, 99);
    expect(bondLevel(w.bond?.points ?? 0)).toBeLessThan(MAX_BOND);
  });
});

describe('matching outfits', () => {
  const o = (p: Partial<typeof DEFAULT_OUTFIT>) => ({ ...DEFAULT_OUTFIT, ...p });

  it('matches on the same hat or the same dyed outfit', () => {
    expect(outfitsMatch(o({ hat: 'straw' }), o({ hat: 'straw' }))).toBe(true);
    expect(outfitsMatch(o({ top: 'tee', dye: 'pink' }), o({ top: 'tee', dye: 'pink' }))).toBe(true);
  });

  it('does not match plain defaults, so nobody matches by accident', () => {
    expect(outfitsMatch(o({}), o({}))).toBe(false);
    expect(outfitsMatch(o({ top: 'tee' }), o({ top: 'tee' }))).toBe(false);
    expect(outfitsMatch(o({ hat: 'straw' }), o({ hat: 'cap' }))).toBe(false);
  });
});
