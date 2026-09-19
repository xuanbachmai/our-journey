import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newWorld, type WorldState } from '@hh/shared';
import { GameState } from './state';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

describe('GameState mutation guards', () => {
  it('rejects invalid seed quantities without changing coins or inventory', () => {
    const state = new GameState(newWorld(Date.now(), 1));
    const coins = state.coins;
    const seeds = state.count('seed:wheat');

    expect(state.buySeed('wheat', -1)).toBe(false);
    expect(state.buySeed('wheat', 0.5)).toBe(false);
    expect(state.coins).toBe(coins);
    expect(state.count('seed:wheat')).toBe(seeds);
  });

  it('does not treat a negative dish index as the last dish', () => {
    const world = newWorld(Date.now(), 1);
    world.dishes.push({ recipe: 'bread', grade: 1 });
    const state = new GameState(world);

    expect(state.removeDish(-1)).toBeNull();
    expect(state.world.dishes).toEqual([{ recipe: 'bread', grade: 1 }]);
  });

  it('does not treat a negative furniture index as the last placement', () => {
    const world = newWorld(Date.now(), 1);
    world.furniturePlaced.push({ id: 'chair', tx: 2, ty: 3 });
    const state = new GameState(world);

    expect(state.pickUpFurniture(-1)).toBeNull();
    expect(state.world.furniturePlaced).toEqual([{ id: 'chair', tx: 2, ty: 3 }]);
  });
});

describe('hosted world loading', () => {
  it('migrates an older hosted world before simulation', () => {
    const now = Date.now();
    const old = { version: 2, coins: 123, inventory: {}, plots: {}, counter: [], upgrades: {}, lastSimulatedAt: now };

    const state = new GameState(old as unknown as WorldState);

    expect(state.world.version).toBe(3);
    expect(state.world.coins).toBe(123);
    expect(state.world.players.xb.outfit.hat).toBe('none');
  });
});
