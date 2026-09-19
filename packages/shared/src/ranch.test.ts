import { describe, expect, it } from 'vitest';
import { ANIMALS } from './animals';
import { clothingSaleToday, DEFAULT_OUTFIT, isFreeClothing } from './clothing';
import { FURNITURE, FURNITURE_IDS, furnitureSaleToday } from './furniture';
import { ITEMS } from './items';
import { RECIPES } from './recipes';
import { toolTiles } from './tools';
import { emptyPlot } from './growth';
import { dayStart, DAY_MS, weatherFor } from './weather';
import { animalMax, migrateWorld, newWorld, simulateWorld } from './world';

describe('tools', () => {
  it('basic tools reach one tile', () => {
    expect(toolTiles(0, 5, 5, 0, 1)).toEqual([{ tx: 5, ty: 5 }]);
  });
  it('copper reaches a row of 3 across the facing direction', () => {
    expect(toolTiles(1, 5, 5, 0, 1)).toEqual([{ tx: 4, ty: 5 }, { tx: 5, ty: 5 }, { tx: 6, ty: 5 }]);
    expect(toolTiles(1, 5, 5, 1, 0)).toEqual([{ tx: 5, ty: 4 }, { tx: 5, ty: 5 }, { tx: 5, ty: 6 }]);
  });
  it('gold reaches a 3x3 square in front, never the player tile', () => {
    const t = toolTiles(2, 5, 5, 0, -1);
    expect(t).toHaveLength(9);
    expect(t.some((p) => p.tx === 5 && p.ty === 6)).toBe(false);
    expect(t.some((p) => p.tx === 5 && p.ty === 3)).toBe(true);
  });
});

describe('animals', () => {
  it('every product is a real item and recipes use real items', () => {
    for (const a of Object.values(ANIMALS)) if (a.product) expect(ITEMS[a.product], a.id).toBeTruthy();
    for (const r of Object.values(RECIPES)) for (const k of Object.keys(r.ingredients)) expect(ITEMS[k as keyof typeof ITEMS], `${r.id} ${k}`).toBeTruthy();
  });

  it('upgrades add room', () => {
    const w = newWorld(Date.now());
    expect(animalMax(w, 'pig')).toBe(3);
    w.upgrades.pasture = 2;
    expect(animalMax(w, 'pig')).toBe(5);
    expect(animalMax(w, 'horse')).toBe(1);
    w.upgrades.bigcoop = 1;
    expect(animalMax(w, 'duck')).toBe(5);
  });

  it('pigs dig truffles while away, the horse makes nothing', () => {
    const t0 = Date.now();
    const w = newWorld(t0);
    w.producers.pig = { count: 2, anchor: t0, waiting: 0 };
    w.producers.horse = { count: 1, anchor: t0, waiting: 0 };
    const { world } = simulateWorld(w, t0 + 3 * ANIMALS.pig.intervalMin * 60_000 + 1000);
    expect(world.producers.pig?.waiting).toBe(6);
    expect(world.producers.horse?.waiting).toBe(0);
  });
});

describe('shops', () => {
  it('daily sales are stable within a day and never a free item', () => {
    const now = Date.now();
    const a = clothingSaleToday(42, now);
    expect(clothingSaleToday(42, now)).toEqual(a);
    expect(isFreeClothing(a.id)).toBe(false);
    expect(FURNITURE_IDS).toContain(furnitureSaleToday(42, 100));
    expect(FURNITURE[furnitureSaleToday(42, 100)].price).toBeGreaterThan(0);
  });

  it('old saves get the new outfit parts', () => {
    const now = Date.now();
    const raw = JSON.parse(JSON.stringify(newWorld(now)));
    raw.players.xb.outfit = { hat: 'straw', accessory: 'none', dye: 'red', hair: 'default' };
    const w = migrateWorld(raw, now);
    expect(w.players.xb.outfit).toEqual({ ...DEFAULT_OUTFIT, hat: 'straw', dye: 'red' });
  });
});

describe('rain', () => {
  it('counts as watering so watering tasks can finish on rainy days', () => {
    const w0 = newWorld(Date.now(), 7);
    // find a rainy day for this seed
    let t = dayStart(Date.now()) + 3_600_000;
    for (let i = 0; i < 60 && weatherFor(w0.seed, t) !== 'rain'; i++) t += DAY_MS;
    expect(weatherFor(w0.seed, t)).toBe('rain');
    const w = newWorld(t, 7);
    w.lastSimulatedAt = t;
    w.plots['1,1'] = { ...emptyPlot(), tilled: true, crop: 'pumpkin' };
    w.plots['2,1'] = { ...emptyPlot(), tilled: true, crop: 'pumpkin' };
    const { world } = simulateWorld(w, t + 60_000);
    expect(world.stats.water).toBe(2);
    expect(world.plots['1,1'].wateredUntil).toBeGreaterThan(t);
  });
});
