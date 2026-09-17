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

/** Sequential goals that double as a gentle tutorial through the whole game. */
export const QUESTS: Quest[] = [
  { id: 'till3', title: 'Break ground', desc: 'Till 3 plots in the field', reward: 20, target: 3, progress: stat('till') },
  { id: 'plant3', title: 'Sow seeds', desc: 'Plant 3 seeds', reward: 20, target: 3, progress: stat('plant') },
  { id: 'water3', title: 'Keep it moist', desc: 'Water 3 plots', reward: 20, target: 3, progress: stat('water') },
  { id: 'harvest3', title: 'First harvest', desc: 'Harvest 3 crops', reward: 40, target: 3, progress: stat('harvest') },
  { id: 'mail', title: 'You have mail', desc: 'Open the mailbox by the house', reward: 20, target: 1, progress: stat('mail') },
  { id: 'cook1', title: 'Kitchen time', desc: 'Cook a dish at the kitchen', reward: 50, target: 1, progress: stat('cook') },
  { id: 'list1', title: 'Open for business', desc: 'Put a dish on the counter', reward: 40, target: 1, progress: stat('listed') },
  { id: 'town', title: 'A walk to town', desc: 'Follow the road east to town', reward: 40, target: 1, progress: (w) => (w.discovered.includes('town') ? 1 : 0) },
  { id: 'sale3', title: 'Regulars', desc: 'Sell 3 dishes at the counter', reward: 60, target: 3, progress: stat('sale') },
  { id: 'serve1', title: 'Table for one', desc: 'Serve a diner in the restaurant', reward: 60, target: 1, progress: stat('served') },
  { id: 'home', title: 'Home sweet home', desc: 'Step inside the house', reward: 30, target: 1, progress: (w) => (w.discovered.includes('home') ? 1 : 0) },
  { id: 'furniture1', title: 'Make it cosy', desc: 'Place a piece of furniture', reward: 60, target: 1, progress: (w) => w.furniturePlaced.length },
  { id: 'rod', title: 'Gone fishing', desc: 'Buy the fishing rod', reward: 30, target: 1, progress: (w) => w.upgrades.rod ?? 0 },
  { id: 'fish2', title: 'Catch of the day', desc: 'Catch 2 fish', reward: 60, target: 2, progress: stat('fish') },
  { id: 'forest', title: 'Into the woods', desc: 'Visit Whisper Forest', reward: 40, target: 1, progress: (w) => (w.discovered.includes('forest') ? 1 : 0) },
  { id: 'forage5', title: 'Forager', desc: 'Gather 5 wild things', reward: 60, target: 5, progress: stat('forage') },
  { id: 'order1', title: 'Special delivery', desc: 'Complete an order at the town board', reward: 80, target: 1, progress: stat('orders') },
  { id: 'rep10', title: 'Word gets around', desc: 'Reach 10 reputation', reward: 80, target: 10, progress: (w) => Math.floor(w.reputation) },
  { id: 'hat', title: 'Dress up', desc: 'Buy something at the tailor', reward: 50, target: 1, progress: stat('clothes') },
  { id: 'pet', title: 'A new friend', desc: 'Adopt a pet', reward: 80, target: 1, progress: stat('adopt') },
  { id: 'coop', title: 'Cluck cluck', desc: 'Build the chicken coop', reward: 60, target: 1, progress: (w) => w.upgrades.coop ?? 0 },
  { id: 'eggs5', title: 'Egg hunt', desc: 'Collect 5 eggs', reward: 60, target: 5, progress: stat('collect:egg') },
  { id: 'ranch', title: 'Out west', desc: 'Visit Sunny Ranch', reward: 40, target: 1, progress: (w) => (w.discovered.includes('ranch') ? 1 : 0) },
  { id: 'cow', title: 'Moo', desc: 'Buy a cow', reward: 100, target: 1, progress: (w) => w.producers.cow?.count ?? 0 },
  { id: 'cookA', title: 'Chef skills', desc: 'Cook 3 dishes graded A or S', reward: 100, target: 3, progress: (w) => (w.stats['cook:A'] ?? 0) + (w.stats['cook:S'] ?? 0) },
  { id: 'serve10', title: 'Dinner rush', desc: 'Serve 10 diners', reward: 150, target: 10, progress: stat('served') },
  { id: 'earn500', title: 'Money in the jar', desc: 'Earn 500 coins from sales', reward: 120, target: 500, progress: stat('earned') },
  { id: 'rep25', title: 'Local favourite', desc: 'Reach 25 reputation', reward: 150, target: 25, progress: (w) => Math.floor(w.reputation) },
  { id: 'cookS', title: 'Perfection', desc: 'Cook an S grade dish', reward: 150, target: 1, progress: stat('cook:S') },
  { id: 'cozy200', title: 'Cosy corner', desc: 'Reach 200 coziness at home', reward: 150, target: 200, progress: (w) => w.furniturePlaced.reduce((s, p) => s + (p ? 1 : 0), 0) && cozyPointsOf(w) },
  { id: 'sprinkler', title: 'Rain on demand', desc: 'Buy the sprinkler', reward: 100, target: 1, progress: (w) => w.upgrades.sprinkler ?? 0 },
  { id: 'book', title: 'Bookworm', desc: 'Buy a recipe book', reward: 120, target: 1, progress: (w) => w.books.length },
  { id: 'recipes8', title: 'Menu of eight', desc: 'Cook 8 different recipes', reward: 200, target: 8, progress: (w) => Object.keys(w.stats).filter((k) => k.startsWith('cook:r:')).length },
  { id: 'orders10', title: 'Town hero', desc: 'Complete 10 orders', reward: 250, target: 10, progress: stat('orders') },
  { id: 'rep50', title: 'Famous farm', desc: 'Reach 50 reputation', reward: 300, target: 50, progress: (w) => Math.floor(w.reputation) },
  { id: 'serve50', title: 'Full house', desc: 'Serve 50 diners', reward: 400, target: 50, progress: stat('served') },
  { id: 'earn5000', title: 'Thriving', desc: 'Earn 5000 coins from sales', reward: 500, target: 5000, progress: stat('earned') },
  { id: 'crown', title: 'Royalty', desc: 'Buy the crown', reward: 300, target: 1, progress: (w) => (w.clothingOwned.includes('hat:crown') ? 1 : 0) },
];

function cozyPointsOf(w: WorldState): number {
  let s = 0;
  for (const p of w.furniturePlaced) s += FURN_COZY[p.id] ?? 0;
  return s;
}

// kept local to avoid a circular import through world.ts
const FURN_COZY: Record<string, number> = {
  chair: 10, table: 20, plant: 15, rug: 30, lamp: 15, bed: 50, painting: 20, bookshelf: 25, sofa: 45, teddy: 35, fireplace: 70, aquarium: 55, photo: 60, piano: 90,
};

export function currentQuest(w: WorldState): Quest | null {
  return QUESTS.find((q) => !w.questsClaimed.includes(q.id)) ?? null;
}

export function questDone(q: Quest, w: WorldState): boolean {
  return q.progress(w) >= q.target;
}
