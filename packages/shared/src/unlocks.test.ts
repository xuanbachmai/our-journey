import { describe, expect, it } from 'vitest';
import { currentQuest } from './quests';
import { itemUnlockInfo, newlyUnlockedBetween, nextUnlockMilestone, tutorialForTask } from './unlocks';
import { newWorld } from './world';

const T0 = 1_700_000_000_000;

describe('lock and unlock item system', () => {
  it('starts with basic tools and starter seeds unlocked, and advanced items locked', () => {
    const w = newWorld(T0, 1);
    expect(itemUnlockInfo(w, 'tool:hoe').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'tool:can').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'tool:sickle').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'tool:rod').unlocked).toBe(false);
    expect(itemUnlockInfo(w, 'tool:seedmaker').unlocked).toBe(false);

    expect(itemUnlockInfo(w, 'seed:wheat').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'seed:potato').unlocked).toBe(false);
    expect(itemUnlockInfo(w, 'seed:potato').badge).toBe('Rep 5');
    expect(itemUnlockInfo(w, 'seed:pumpkin').unlocked).toBe(false);
    expect(itemUnlockInfo(w, 'seed:pumpkin').badge).toBe('Rep 25');

    expect(itemUnlockInfo(w, 'dish:tomato_soup').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'dish:omelette').unlocked).toBe(false);
    expect(itemUnlockInfo(w, 'dish:honey_toast').unlocked).toBe(false);
  });

  it('unlocks tools, seeds, recipes, and machines as the game progresses', () => {
    const w = newWorld(T0, 1);
    w.upgrades.rod = 1;
    expect(itemUnlockInfo(w, 'tool:rod').unlocked).toBe(true);

    const unlockedAt5 = newlyUnlockedBetween(w, 0, 5);
    expect(unlockedAt5.some((u) => u.id === 'seed:potato')).toBe(true);

    const unlockedAt8 = newlyUnlockedBetween(w, 5, 8);
    expect(unlockedAt8.some((u) => u.id === 'dish:omelette')).toBe(true);
    expect(unlockedAt8.some((u) => u.id === 'machine:kettle')).toBe(true);
    expect(unlockedAt8.some((u) => u.id === 'hand:barn')).toBe(true);

    w.reputation = 10;
    expect(itemUnlockInfo(w, 'seed:potato').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'seed:corn').unlocked).toBe(true);
    expect(itemUnlockInfo(w, 'dish:omelette').unlocked).toBe(true);
  });

  it('reports the next reputation unlock milestone and step-by-step tutorial', () => {
    const w = newWorld(T0, 1);
    const next = nextUnlockMilestone(w);
    expect(next).not.toBeNull();
    expect(next?.rep).toBe(5);
    expect(next?.label).toContain('Potato');

    const q = currentQuest(w);
    const tut = tutorialForTask(q, w);
    expect(tut).not.toBeNull();
    expect(tut?.taskId).toBe('c1_mail');
    expect(tut?.chapterNum).toBe(1);
    expect(tut?.actionTypes).toContain('mailbox');
  });
});
