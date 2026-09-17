import type { WorldState } from './world';

export interface Quest {
  id: string;
  title: string;
  desc: string;
  reward: number;
  target: number;
  progress: (w: WorldState) => number;
}

const stat = (key: string) => (w: WorldState) => w.stats[key] ?? 0;

/** Sequential goals that double as a gentle tutorial. */
export const QUESTS: Quest[] = [
  { id: 'till3', title: 'Break ground', desc: 'Till 3 plots in the field', reward: 20, target: 3, progress: stat('till') },
  { id: 'plant3', title: 'Sow seeds', desc: 'Plant 3 seeds', reward: 20, target: 3, progress: stat('plant') },
  { id: 'water3', title: 'Keep it moist', desc: 'Water 3 plots', reward: 20, target: 3, progress: stat('water') },
  { id: 'harvest3', title: 'First harvest', desc: 'Harvest 3 crops', reward: 40, target: 3, progress: stat('harvest') },
  { id: 'cook1', title: 'Kitchen time', desc: 'Cook a dish at the kitchen', reward: 50, target: 1, progress: stat('cook') },
  { id: 'list1', title: 'Open for business', desc: 'Put a dish on the counter', reward: 40, target: 1, progress: stat('listed') },
  { id: 'sale3', title: 'Regulars', desc: 'Sell 3 dishes to customers', reward: 60, target: 3, progress: stat('sale') },
  { id: 'rod', title: 'Gone fishing', desc: 'Buy the fishing rod at the market', reward: 30, target: 1, progress: (w) => w.upgrades.rod ?? 0 },
  { id: 'fish2', title: 'Catch of the day', desc: 'Catch 2 fish in the pond', reward: 60, target: 2, progress: stat('fish') },
  { id: 'rep10', title: 'Word gets around', desc: 'Reach 10 reputation', reward: 80, target: 10, progress: (w) => Math.floor(w.reputation) },
  { id: 'coop', title: 'Cluck cluck', desc: 'Build the chicken coop', reward: 60, target: 1, progress: (w) => w.upgrades.coop ?? 0 },
  { id: 'eggs5', title: 'Egg hunt', desc: 'Collect 5 eggs', reward: 60, target: 5, progress: stat('egg') },
  { id: 'cookA', title: 'Chef skills', desc: 'Cook 3 dishes graded A or S', reward: 100, target: 3, progress: (w) => (w.stats['cook:A'] ?? 0) + (w.stats['cook:S'] ?? 0) },
  { id: 'earn500', title: 'Money in the jar', desc: 'Earn 500 coins from sales', reward: 120, target: 500, progress: stat('earned') },
  { id: 'rep25', title: 'Local favourite', desc: 'Reach 25 reputation', reward: 150, target: 25, progress: (w) => Math.floor(w.reputation) },
  { id: 'cookS', title: 'Perfection', desc: 'Cook an S grade dish', reward: 150, target: 1, progress: stat('cook:S') },
  { id: 'sprinkler', title: 'Rain on demand', desc: 'Buy the sprinkler', reward: 100, target: 1, progress: (w) => w.upgrades.sprinkler ?? 0 },
  { id: 'recipes6', title: 'Menu of six', desc: 'Cook 6 different recipes', reward: 200, target: 6, progress: (w) => Object.keys(w.stats).filter((k) => k.startsWith('cook:r:')).length },
  { id: 'rep50', title: 'Famous farm', desc: 'Reach 50 reputation', reward: 300, target: 50, progress: (w) => Math.floor(w.reputation) },
  { id: 'earn5000', title: 'Thriving', desc: 'Earn 5000 coins from sales', reward: 500, target: 5000, progress: stat('earned') },
];

export function currentQuest(w: WorldState): Quest | null {
  return QUESTS.find((q) => !w.questsClaimed.includes(q.id)) ?? null;
}

export function questDone(q: Quest, w: WorldState): boolean {
  return q.progress(w) >= q.target;
}
