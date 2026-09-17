import { describe, expect, it } from 'vitest';
import { EGG_INTERVAL_MS, newWorld, simulateWorld, type WorldState } from './world';

const T0 = 1_700_000_000_000;

function stocked(): WorldState {
  const w = newWorld(T0, 1234);
  w.counter[0].dish = { recipe: 'tomato_soup', grade: 2 };
  w.counter[1].dish = { recipe: 'bread', grade: 1 };
  return w;
}

describe('simulateWorld', () => {
  it('sells dishes to customers over time and raises reputation', () => {
    const { world, events } = simulateWorld(stocked(), T0 + 60 * 60_000);
    const sales = events.filter((e) => e.type === 'sale');
    expect(sales.length).toBe(2);
    expect(world.coins).toBeGreaterThan(40);
    expect(world.reputation).toBeGreaterThan(0);
    expect(world.counter.every((s) => s.dish === null)).toBe(true);
  });

  it('records customers who found an empty counter', () => {
    const { events } = simulateWorld(newWorld(T0, 5), T0 + 30 * 60_000);
    expect(events.some((e) => e.type === 'customer_left')).toBe(true);
    expect(events.some((e) => e.type === 'sale')).toBe(false);
  });

  it('is step-size independent', () => {
    const end = T0 + 45 * 60_000;
    const one = simulateWorld(stocked(), end).world;
    let stepped = stocked();
    for (let t = T0 + 7_000; t < end; t += 7_000) stepped = simulateWorld(stepped, t).world;
    stepped = simulateWorld(stepped, end).world;
    expect(stepped.coins).toBe(one.coins);
    expect(stepped.reputation).toBeCloseTo(one.reputation, 6);
    expect(stepped.counter).toEqual(one.counter);
  });

  it('lays eggs per chicken per interval, capped', () => {
    const w = newWorld(T0, 9);
    w.upgrades.coop = 1;
    w.upgrades.chicken = 2;
    const { world } = simulateWorld(w, T0 + EGG_INTERVAL_MS * 2 + 1000);
    expect(world.eggsWaiting).toBe(4);
    const later = simulateWorld(world, T0 + EGG_INTERVAL_MS * 50).world;
    expect(later.eggsWaiting).toBe(8);
  });

  it('does not mutate its input', () => {
    const w = stocked();
    const snapshot = JSON.stringify(w);
    simulateWorld(w, T0 + 60 * 60_000);
    expect(JSON.stringify(w)).toBe(snapshot);
  });
});
