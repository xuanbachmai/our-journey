import { describe, expect, it } from 'vitest';
import { clothingKey } from './clothing';
import { costume, costumePieces } from './costumes';
import { MAX_MACHINES } from './machines';
import { applyReward, normaliseGiftCode } from './rewards';
import { newWorld } from './world';

const w = () => newWorld(1_700_000_000_000, 5);

describe('gift codes', () => {
  it('reads a code however it was typed', () => {
    expect(normaliseGiftCode(' happy-birthday ')).toBe('HAPPYBIRTHDAY');
    expect(normaliseGiftCode('xb 2026!')).toBe('XB2026');
    expect(normaliseGiftCode('   ')).toBe('');
  });

  it('hands over coins, items and a whole look', () => {
    const world = w();
    const coins = world.coins;
    const lines = applyReward(world, {
      coins: 500,
      items: { 'seed:tomato': 10, egg: 3 },
      costume: 'starlight',
      bond: 200,
    });

    expect(world.coins).toBe(coins + 500);
    expect(world.inventory['seed:tomato']).toBe((newWorld(1, 5).inventory['seed:tomato'] ?? 0) + 10);
    expect(world.inventory.egg).toBe(3);
    const star = costume('starlight');
    for (const piece of costumePieces(star!)) expect(world.clothingOwned).toContain(piece.key);
    expect(world.bond?.points).toBe(200);
    expect(lines.length).toBeGreaterThan(3);
  });

  it('does not throw on anything it does not recognise', () => {
    const world = w();
    const lines = applyReward(world, {
      items: { 'crop:unobtainium': 5 } as never,
      clothing: ['hat:nonesuch'],
      costume: 'not-a-look',
      furniture: { spaceship: 1 } as never,
      machines: { reactor: 1 } as never,
    });
    expect(lines).toEqual([]);
    expect(world.coins).toBe(w().coins);
  });

  it('refuses to make a second crown out of thin air', () => {
    const world = w();
    world.clothingOwned.push(clothingKey('hat', 'crown'));
    applyReward(world, { clothing: ['hat:crown'] });
    expect(world.clothingOwned.filter((k) => k === 'hat:crown')).toHaveLength(1);
  });

  it('keeps the machine yard to its limit', () => {
    const world = w();
    applyReward(world, { machines: { mill: 99 } });
    expect(world.machines?.mill?.count).toBe(MAX_MACHINES);
  });

  it('caps reputation and ignores negatives', () => {
    const world = w();
    world.reputation = 98;
    applyReward(world, { reputation: 50 });
    expect(world.reputation).toBe(100);

    const other = w();
    const coins = other.coins;
    applyReward(other, { coins: -500, reputation: -10 });
    expect(other.coins).toBe(coins);
  });

  it('bumps the change counter so the partner copy loses', () => {
    const world = w();
    const before = world.changeCounter;
    applyReward(world, { coins: 1 });
    expect(world.changeCounter).toBe(before + 1);
  });
});
