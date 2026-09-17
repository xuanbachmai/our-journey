import { describe, expect, it } from 'vitest';
import { CHAPTERS, currentChapter, currentQuest, DAILY_COUNT, dailyDefs, dailyProgress, guideFor, refreshDaily } from './quests';
import { AREAS } from './areas';
import { newWorld } from './world';
import { DAY_MS } from './weather';

const T0 = 1_700_000_000_000;

describe('journey chapters', () => {
  it('have unique task ids and at most 5 tasks each (fits the journal page)', () => {
    const ids = CHAPTERS.flatMap((c) => c.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CHAPTERS) expect(c.tasks.length).toBeLessThanOrEqual(5);
  });

  it('point guides at real areas', () => {
    const w = newWorld(T0, 1);
    for (const t of CHAPTERS.flatMap((c) => c.tasks)) {
      const g = guideFor(t, w);
      if (g) expect(AREAS[g.area]).toBeDefined();
    }
  });

  it('start with reading the letter and move on as tasks are claimed', () => {
    const w = newWorld(T0, 1);
    expect(currentChapter(w)?.id).toBe('ch1');
    expect(currentQuest(w)?.id).toBe('c1_mail');
    w.stats.mail = 1;
    expect(currentQuest(w)?.id).toBe('c1_till');
    w.questsClaimed.push(...CHAPTERS[0].tasks.map((t) => t.id), 'ch:ch1');
    expect(currentChapter(w)?.id).toBe('ch2');
  });

  it('counts talking to family members as distinct people', () => {
    const w = newWorld(T0, 1);
    const hello = CHAPTERS.flatMap((c) => c.tasks).find((t) => t.id === 'c8_hello');
    w.stats['talkfam:me_mai'] = 3;
    w.stats['talkfam:em_vy'] = 1;
    w.stats['talk:mayor'] = 2;
    expect(hello?.progress(w)).toBe(2);
  });
});

describe('daily tasks', () => {
  it('picks the same tasks for the same day and only eligible ones', () => {
    const a = newWorld(T0, 42);
    const b = newWorld(T0, 42);
    refreshDaily(a, T0);
    refreshDaily(b, T0 + 3600_000);
    expect(a.daily?.ids).toEqual(b.daily?.ids);
    expect(a.daily?.ids.length).toBe(DAILY_COUNT);
    // a brand-new farm has no rod, hens, cows, pets or town visits yet
    for (const d of dailyDefs(a)) expect(['d_harvest', 'd_water', 'd_cook', 'd_sale', 'd_sell']).toContain(d.id);
  });

  it('counts only progress made today and resets tomorrow', () => {
    const w = newWorld(T0, 7);
    w.stats.harvest = 50;
    w.stats.water = 50;
    w.stats.cook = 50;
    w.stats.sale = 50;
    w.stats.sold = 50;
    refreshDaily(w, T0);
    for (const d of dailyDefs(w)) expect(dailyProgress(w, d)).toBe(0);
    const first = dailyDefs(w)[0];
    w.stats[first.stat] += 2;
    expect(dailyProgress(w, first)).toBe(2);
    expect(refreshDaily(w, T0 + 1000)).toBe(false);
    expect(refreshDaily(w, T0 + DAY_MS)).toBe(true);
    for (const d of dailyDefs(w)) expect(dailyProgress(w, d)).toBe(0);
  });
});
