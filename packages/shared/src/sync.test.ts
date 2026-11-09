import { describe, expect, it } from 'vitest';
import { newWorld, type WorldState } from './world';
import { CHAPTERS } from './quests';
import { mergeMissionProgress, receiveWorld } from './sync';

/**
 * Two people share one mission list. Whatever either of them does has to count
 * towards it, and neither of them may lose progress because they happened to
 * be playing at the same moment.
 */

/** What a client does today when a copy arrives from the partner. */
function receiveAsShipped(mine: WorldState, theirs: WorldState): WorldState {
  if (theirs.changeCounter <= mine.changeCounter) return mine;
  return theirs;
}

const bump = (w: WorldState) => {
  w.changeCounter++;
  return w;
};

describe('two players on one mission list', () => {
  it('counts either players work towards the same task', () => {
    // the mission list reads world-level counters, not per-player ones
    const w = newWorld(1_700_000_000_000, 7);
    const cook = CHAPTERS.flatMap((c) => c.tasks).find((t) => t.id === 'c2_cook');
    expect(cook).toBeTruthy();
    expect(cook!.progress(w)).toBe(0);
    // xb cooks once, qd cooks once, into the one shared tally
    w.stats.cook = (w.stats.cook ?? 0) + 1;
    w.stats.cook = (w.stats.cook ?? 0) + 1;
    expect(cook!.progress(w)).toBe(2);
  });

  it('loses one players mission progress when both act at the same time', () => {
    const base = newWorld(1_700_000_000_000, 7);
    const qd = structuredClone(base);
    const xb = structuredClone(base);

    // the same moment: she waters, he cooks. Each bumps its own counter.
    qd.stats.water = 3;
    bump(qd);
    xb.stats.cook = 1;
    bump(xb);
    expect(qd.changeCounter).toBe(xb.changeCounter);

    // each receives the other's copy
    const qdAfter = receiveAsShipped(qd, xb);
    const xbAfter = receiveAsShipped(xb, qd);

    // Neither accepts the other, so the two farms disagree for good: she has
    // no record of his cooking, he has none of her watering.
    expect(xbAfter.stats.water ?? 0).toBe(0);
    expect(qdAfter.stats.cook ?? 0).toBe(0);
  });
});

describe('reconciling two copies', () => {
  it('keeps both players mission progress when they act at the same moment', () => {
    const base = newWorld(1_700_000_000_000, 7);
    const qd = structuredClone(base);
    const xb = structuredClone(base);
    qd.stats.water = 3;
    qd.questsClaimed.push('c1_water');
    bump(qd);
    xb.stats.cook = 1;
    xb.questsClaimed.push('c2_cook');
    bump(xb);

    const qdAfter = receiveWorld(structuredClone(qd), structuredClone(xb), 'qd', 'xb');
    const xbAfter = receiveWorld(structuredClone(xb), structuredClone(qd), 'xb', 'qd');

    for (const w of [qdAfter, xbAfter]) {
      expect(w.stats.water).toBe(3);
      expect(w.stats.cook).toBe(1);
      expect(w.questsClaimed).toContain('c1_water');
      expect(w.questsClaimed).toContain('c2_cook');
    }
  });

  it('leaves both machines on the same world rather than split', () => {
    const base = newWorld(1_700_000_000_000, 7);
    const qd = structuredClone(base);
    const xb = structuredClone(base);
    qd.stats.water = 3;
    bump(qd);
    xb.stats.cook = 1;
    bump(xb);

    const qdAfter = receiveWorld(structuredClone(qd), structuredClone(xb), 'qd', 'xb');
    const xbAfter = receiveWorld(structuredClone(xb), structuredClone(qd), 'xb', 'qd');
    expect(qdAfter.changeCounter).toBe(xbAfter.changeCounter);
    expect(qdAfter.stats).toEqual(xbAfter.stats);
    expect(qdAfter.coins).toBe(xbAfter.coins);
  });

  it('never lets a counter go backwards, so the next copy is still heard', () => {
    const base = newWorld(1_700_000_000_000, 7);
    const mine = structuredClone(base);
    const theirs = structuredClone(base);
    mine.changeCounter = 9;
    theirs.changeCounter = 4;
    const out = receiveWorld(mine, theirs, 'xb', 'qd');
    expect(out.changeCounter).toBe(10);
  });

  it('merges a grow-only field the same way whichever side does it', () => {
    const a = newWorld(1_700_000_000_000, 7);
    const b = newWorld(1_700_000_000_000, 7);
    a.discovered = ['farm', 'town'];
    b.discovered = ['farm', 'forest'];
    a.stats.sell = 7;
    b.stats.sell = 2;
    const m1 = mergeMissionProgress(structuredClone(a), b);
    const m2 = mergeMissionProgress(structuredClone(b), a);
    expect([...m1.discovered].sort()).toEqual([...m2.discovered].sort());
    expect(m1.stats.sell).toBe(7);
    expect(m2.stats.sell).toBe(7);
  });

  it('does not fold yesterdays daily ticks into todays list', () => {
    const a = newWorld(1_700_000_000_000, 7);
    const b = newWorld(1_700_000_000_000, 7);
    a.daily = { day: 10, ids: ['d_cook'], base: {}, claimed: ['d_cook'] };
    b.daily = { day: 9, ids: ['d_sale'], base: {}, claimed: ['d_sale'] };
    const out = mergeMissionProgress(a, b);
    expect(out.daily?.claimed).toEqual(['d_cook']);
  });
});
