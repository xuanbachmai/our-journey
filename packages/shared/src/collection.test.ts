import { describe, expect, it } from 'vitest';
import { FISH, FISH_IDS, fishAvailable, pickFish } from './fish';
import { friendPoints, giftReaction, HEART_POINTS, heartsFor, knownLoves, MAX_HEARTS, VILLAGERS } from './friends';
import { ITEMS } from './items';
import { RECIPES } from './recipes';
import { newWorld } from './world';

describe('fish', () => {
  it('only offers fish that match the spot, time and weather', () => {
    for (const spot of ['farm', 'forest'] as const)
      for (const hour of [3, 12, 21])
        for (const rain of [false, true]) {
          const list = fishAvailable(spot, hour, rain);
          expect(list.length).toBeGreaterThan(0);
          for (const f of list) {
            expect(f.where).toContain(spot);
            if (f.rainOnly) expect(rain).toBe(true);
          }
        }
    expect(fishAvailable('farm', 12, false).map((f) => f.id)).not.toContain('catfish');
    expect(fishAvailable('farm', 22, false).map((f) => f.id)).toContain('catfish');
    expect(fishAvailable('forest', 22, true).map((f) => f.id)).toContain('eel');
    expect(fishAvailable('forest', 22, false).map((f) => f.id)).not.toContain('eel');
  });

  it('every species can be caught somewhere', () => {
    const seen = new Set<string>();
    for (const spot of ['farm', 'forest'] as const) for (const hour of [3, 12, 21]) for (const rain of [false, true]) fishAvailable(spot, hour, rain).forEach((f) => seen.add(f.id));
    expect([...seen].sort()).toEqual([...FISH_IDS].sort());
  });

  it('picks a size inside the species range', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const { fish, size } = pickFish('forest', 22, true, rnd);
      expect(size).toBeGreaterThanOrEqual(FISH[fish.id].minSize);
      expect(size).toBeLessThanOrEqual(FISH[fish.id].maxSize);
    }
  });
});

describe('friends', () => {
  it('turns points into capped hearts', () => {
    expect(heartsFor(0)).toBe(0);
    expect(heartsFor(HEART_POINTS - 1)).toBe(0);
    expect(heartsFor(HEART_POINTS * 2)).toBe(2);
    expect(heartsFor(99999)).toBe(MAX_HEARTS);
    expect(heartsFor(-20)).toBe(0);
  });

  it('gift keys are real items or dishes and reactions follow the lists', () => {
    for (const v of VILLAGERS) {
      for (const k of [...v.loves, ...v.likes, ...v.dislikes]) {
        const ok = k.startsWith('dish:') ? !!RECIPES[k.slice(5) as keyof typeof RECIPES] : !!ITEMS[k as keyof typeof ITEMS];
        expect(ok, `${v.id} ${k}`).toBe(true);
      }
      expect(giftReaction(v, v.loves[0])).toBe('love');
      if (v.dislikes[0]) expect(giftReaction(v, v.dislikes[0])).toBe('dislike');
      expect(giftReaction(v, 'nothing-at-all')).toBe('neutral');
    }
  });

  it('reveals loved gifts as friendship grows', () => {
    const w = newWorld(Date.now());
    const v = VILLAGERS[0];
    expect(knownLoves(w, v)).toEqual([]);
    w.stats[`friend:${v.id}`] = HEART_POINTS;
    expect(friendPoints(w, v.id)).toBe(HEART_POINTS);
    expect(knownLoves(w, v)).toEqual([v.loves[0]]);
    w.stats[`friend:${v.id}`] = HEART_POINTS * 3;
    expect(knownLoves(w, v)).toEqual(v.loves);
  });
});
