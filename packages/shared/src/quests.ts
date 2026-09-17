import type { AreaId } from './areas';
import { daysTogether } from './couple';
import type { FurnitureId } from './furniture';
import type { ItemId } from './items';
import { dayIndex, roll01 } from './prices';
import type { WorldState } from './world';

/** Where the guide arrow should point for a task. */
export interface GuideTarget {
  area: AreaId;
  tx: number;
  ty: number;
}

export interface Task {
  id: string;
  title: string;
  /** One short sentence telling the player how to do it. */
  hint: string;
  target: number;
  reward: number;
  progress: (w: WorldState) => number;
  guide?: GuideTarget | ((w: WorldState) => GuideTarget | null);
}

export interface ChapterReward {
  coins: number;
  rep?: number;
  items?: Partial<Record<ItemId, number>>;
  furniture?: Partial<Record<FurnitureId, number>>;
  /** Clothing keys such as "hat:crown". */
  clothing?: string[];
  text: string;
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  tasks: Task[];
  reward: ChapterReward;
}

const stat = (key: string) => (w: WorldState) => w.stats[key] ?? 0;
const visited = (area: AreaId) => (w: WorldState) => (w.discovered.includes(area) ? 1 : 0);
const g = (area: AreaId, tx: number, ty: number): GuideTarget => ({ area, tx, ty });

// frequently used spots
const FIELD = g('farm', 20, 11);
const KITCHEN = g('farm', 13, 6);
const MAILBOX = g('farm', 11, 8);
const COUNTER = g('farm', 13, 17);
const STALL = g('farm', 34, 21);
const STORE = g('store', 7, 5);

const FURN_COZY: Record<string, number> = {
  chair: 10, table: 20, plant: 15, rug: 30, lamp: 15, bed: 50, painting: 20, bookshelf: 25, sofa: 45, teddy: 35, fireplace: 70, aquarium: 55, photo: 60, piano: 90,
};

export const CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    title: 'A new start',
    blurb: 'Welcome home! Grow your very first crops.',
    tasks: [
      { id: 'c1_mail', title: 'Read the letter', hint: 'The red mailbox beside the house', target: 1, reward: 20, progress: stat('mail'), guide: MAILBOX },
      { id: 'c1_till', title: 'Till 3 plots', hint: 'Face the brown field, press act', target: 3, reward: 15, progress: stat('till'), guide: FIELD },
      { id: 'c1_plant', title: 'Plant 3 seeds', hint: 'Pick a seed, face tilled soil', target: 3, reward: 15, progress: stat('plant'), guide: FIELD },
      { id: 'c1_water', title: 'Water 3 plots', hint: 'Face a planted plot, press act', target: 3, reward: 15, progress: stat('water'), guide: FIELD },
      { id: 'c1_harvest', title: 'Harvest 3 crops', hint: 'Ripe crops sparkle. Wheat: 2 min', target: 3, reward: 30, progress: stat('harvest'), guide: FIELD },
    ],
    reward: { coins: 60, items: { 'seed:strawberry': 2 }, text: '+60 coins, 2 strawberry seeds' },
  },
  {
    id: 'ch2',
    title: 'Our first meal',
    blurb: 'Turn the harvest into food and make some coins.',
    tasks: [
      { id: 'c2_cook', title: 'Cook a dish', hint: 'The kitchen next to the house', target: 1, reward: 30, progress: stat('cook'), guide: KITCHEN },
      { id: 'c2_list', title: 'Put a dish on the counter', hint: 'The counter by the road', target: 1, reward: 20, progress: stat('listed'), guide: COUNTER },
      { id: 'c2_sale', title: 'Sell a dish at the counter', hint: 'Villagers buy it, even offline', target: 1, reward: 30, progress: stat('sale'), guide: COUNTER },
      { id: 'c2_sell', title: 'Sell 3 items at the stall', hint: 'Striped stall, Sell tab', target: 3, reward: 20, progress: stat('sold'), guide: STALL },
    ],
    reward: { coins: 80, items: { 'seed:tomato': 4 }, text: '+80 coins, 4 tomato seeds' },
  },
  {
    id: 'ch3',
    title: 'Maple Town',
    blurb: 'Meet the neighbours down the road.',
    tasks: [
      { id: 'c3_town', title: 'Walk to Maple Town', hint: 'Follow the road east', target: 1, reward: 20, progress: visited('town'), guide: g('farm', 42, 18) },
      { id: 'c3_mayor', title: 'Say hello to Mayor Bea', hint: 'She strolls by the fountain', target: 1, reward: 20, progress: stat('talk:mayor'), guide: g('town', 24, 17) },
      { id: 'c3_seeds', title: 'Buy some seeds', hint: 'General Store, the blue roof', target: 1, reward: 20, progress: stat('buyseed'), guide: STORE },
      { id: 'c3_order', title: 'Deliver an order', hint: 'The board by the fountain', target: 1, reward: 50, progress: stat('orders'), guide: g('town', 15, 12) },
    ],
    reward: { coins: 100, rep: 2, text: '+100 coins, +2 reputation' },
  },
  {
    id: 'ch4',
    title: 'Open for dinner',
    blurb: 'Your little restaurant is waiting for guests.',
    tasks: [
      { id: 'c4_enter', title: 'Step into the restaurant', hint: 'Orange roof north of the field', target: 1, reward: 20, progress: visited('restaurant'), guide: g('farm', 22, 5) },
      { id: 'c4_serve', title: 'Serve 3 diners', hint: 'Carry dishes to seated guests', target: 3, reward: 60, progress: stat('served'), guide: g('restaurant', 10, 9) },
      { id: 'c4_gradeA', title: 'Cook an A or S dish', hint: 'Hit the green zones', target: 1, reward: 40, progress: (w) => (w.stats['cook:A'] ?? 0) + (w.stats['cook:S'] ?? 0), guide: KITCHEN },
      { id: 'c4_rep', title: 'Reach 5 reputation', hint: 'Serving and selling raise it', target: 5, reward: 40, progress: (w) => Math.floor(w.reputation) },
    ],
    reward: { coins: 150, furniture: { chair: 1 }, text: '+150 coins, a chair' },
  },
  {
    id: 'ch5',
    title: 'Home sweet home',
    blurb: 'Make the house feel like ours.',
    tasks: [
      { id: 'c5_home', title: 'Step inside your home', hint: 'The door of the farmhouse', target: 1, reward: 20, progress: visited('home'), guide: g('farm', 7, 8) },
      { id: 'c5_buy', title: 'Buy a piece of furniture', hint: 'General Store, Decor tab', target: 1, reward: 30, progress: stat('buyfurn'), guide: STORE },
      { id: 'c5_place', title: 'Place furniture at home', hint: 'Decorate button inside', target: 1, reward: 30, progress: (w) => w.furniturePlaced.length, guide: g('home', 8, 6) },
      { id: 'c5_dress', title: 'Buy something to wear', hint: "Rosa's Tailor, the pink roof", target: 1, reward: 40, progress: stat('clothes'), guide: g('tailor', 7, 5) },
    ],
    reward: { coins: 150, furniture: { plant: 1 }, text: '+150 coins, a potted plant' },
  },
  {
    id: 'ch6',
    title: 'Little friends',
    blurb: 'A farm is happier with animals around.',
    tasks: [
      { id: 'c6_adopt', title: 'Adopt a pet', hint: 'Pet & Barn Shop, green roof', target: 1, reward: 50, progress: stat('adopt'), guide: g('petshop', 7, 5) },
      { id: 'c6_pet', title: 'Pet your pet', hint: 'Face it and press act', target: 1, reward: 20, progress: stat('petted') },
      { id: 'c6_coop', title: 'Build the chicken coop', hint: 'Pet shop, Farm animals tab', target: 1, reward: 40, progress: (w) => w.upgrades.coop ?? 0, guide: g('petshop', 7, 5) },
      { id: 'c6_eggs', title: 'Collect 3 eggs', hint: 'Buy hens, check the coop', target: 3, reward: 40, progress: stat('collect:egg'), guide: g('farm', 5, 12) },
    ],
    reward: { coins: 200, items: { 'seed:potato': 4 }, text: '+200 coins, 4 potato seeds' },
  },
  {
    id: 'ch7',
    title: 'Wild places',
    blurb: 'There is a whole world past the fences.',
    tasks: [
      { id: 'c7_forest', title: 'Visit Whisper Forest', hint: 'North out of Maple Town', target: 1, reward: 20, progress: visited('forest'), guide: g('town', 22, 1) },
      { id: 'c7_forage', title: 'Gather 5 wild things', hint: 'Mushrooms, berries, herbs', target: 5, reward: 40, progress: stat('forage'), guide: g('forest', 14, 21) },
      { id: 'c7_rod', title: 'Buy a fishing rod', hint: 'Farm stall, Tools tab', target: 1, reward: 30, progress: (w) => w.upgrades.rod ?? 0, guide: STALL },
      { id: 'c7_fish', title: 'Catch 2 fish', hint: 'Face water, wait for the "!"', target: 2, reward: 40, progress: stat('fish'), guide: g('farm', 35, 14) },
      { id: 'c7_ranch', title: 'Visit Sunny Ranch', hint: 'West along the farm path', target: 1, reward: 20, progress: visited('ranch'), guide: g('farm', 1, 21) },
    ],
    reward: { coins: 250, rep: 3, text: '+250 coins, +3 reputation' },
  },
  {
    id: 'ch8',
    title: 'Family',
    blurb: 'Visit the people who love you both.',
    tasks: [
      { id: 'c8_lane', title: 'Walk to Family Lane', hint: 'East out of Maple Town', target: 1, reward: 20, progress: visited('lane'), guide: g('town', 42, 12) },
      { id: 'c8_qd', title: 'Visit Nha ba Hanh', hint: "qd's family, lavender roof", target: 1, reward: 30, progress: visited('qdhome'), guide: g('lane', 8, 7) },
      { id: 'c8_xb', title: 'Visit Nha ba Thai', hint: "xb's family, teal roof", target: 1, reward: 30, progress: visited('xbhome'), guide: g('lane', 25, 7) },
      { id: 'c8_hello', title: 'Talk to all 7 family', hint: 'Everyone has something to say', target: 7, reward: 60, progress: (w) => Object.keys(w.stats).filter((k) => k.startsWith('talkfam:')).length },
    ],
    reward: { coins: 200, items: { honey: 2, berry: 3 }, text: '+200 coins, treats from home' },
  },
  {
    id: 'ch9',
    title: 'Together',
    blurb: 'The little things that make it ours.',
    tasks: [
      { id: 'c9_days', title: 'Play 3 days together', hint: 'Both play on the same day', target: 3, reward: 60, progress: (w) => daysTogether({ xb: w.players.xb.daysPlayed, qd: w.players.qd.daysPlayed }), guide: g('farm', 29, 5) },
      { id: 'c9_note', title: 'Leave a note', hint: 'Mailbox, Notes tab', target: 1, reward: 30, progress: stat('note'), guide: MAILBOX },
      { id: 'c9_answer', title: 'Answer the daily question', hint: 'Mailbox, Question tab', target: 1, reward: 30, progress: stat('answer'), guide: MAILBOX },
      { id: 'c9_special', title: 'Add a special day', hint: 'Journal, Setup, Special days', target: 1, reward: 30, progress: (w) => w.specialDays.length },
    ],
    reward: { coins: 300, furniture: { photo: 1 }, text: '+300 coins, our photo' },
  },
  {
    id: 'ch10',
    title: 'Famous farm',
    blurb: 'Word of your cooking spreads.',
    tasks: [
      { id: 'c10_rep', title: 'Reach 25 reputation', hint: 'Serve, sell, deliver orders', target: 25, reward: 100, progress: (w) => Math.floor(w.reputation) },
      { id: 'c10_serve', title: 'Serve 25 diners', hint: 'More tables = more guests', target: 25, reward: 100, progress: stat('served'), guide: g('restaurant', 10, 9) },
      { id: 'c10_cookS', title: 'Cook an S grade dish', hint: 'Perfect timing on every step', target: 1, reward: 80, progress: stat('cook:S'), guide: KITCHEN },
      { id: 'c10_earn', title: 'Earn 2000 from sales', hint: 'Counter, diners and orders', target: 2000, reward: 150, progress: stat('earned') },
      { id: 'c10_menu', title: 'Cook 8 different recipes', hint: 'Unlock more with reputation', target: 8, reward: 150, progress: (w) => Object.keys(w.stats).filter((k) => k.startsWith('cook:r:')).length, guide: KITCHEN },
    ],
    reward: { coins: 500, clothing: ['hat:chef'], text: '+500 coins, a chef hat' },
  },
  {
    id: 'ch11',
    title: 'Our journey',
    blurb: 'Building a life together, one day at a time.',
    tasks: [
      { id: 'c11_rep', title: 'Reach 50 reputation', hint: 'Keep the restaurant busy', target: 50, reward: 200, progress: (w) => Math.floor(w.reputation) },
      { id: 'c11_cozy', title: 'Reach 200 coziness', hint: 'Decorate your home', target: 200, reward: 150, progress: (w) => w.furniturePlaced.reduce((s, p) => s + (FURN_COZY[p.id] ?? 0), 0), guide: g('home', 8, 6) },
      { id: 'c11_cow', title: 'Raise a cow', hint: 'Pet shop, lives at the ranch', target: 1, reward: 150, progress: (w) => w.producers.cow?.count ?? 0, guide: g('petshop', 7, 5) },
      { id: 'c11_book', title: 'Buy a recipe book', hint: 'General Store, Books tab', target: 1, reward: 150, progress: (w) => w.books.length, guide: STORE },
      { id: 'c11_days', title: 'Play 30 days together', hint: 'Watch the Love Tree bloom', target: 30, reward: 500, progress: (w) => daysTogether({ xb: w.players.xb.daysPlayed, qd: w.players.qd.daysPlayed }), guide: g('farm', 29, 5) },
    ],
    reward: { coins: 1000, clothing: ['hat:crown'], text: '+1000 coins, a crown' },
  },
];

/** Every task in story order (kept under the old name for the quest ticker). */
export const QUESTS: Task[] = CHAPTERS.flatMap((c) => c.tasks);
export type Quest = Task;

export function chapterClaimed(w: WorldState, c: Chapter) {
  return w.questsClaimed.includes(`ch:${c.id}`);
}

export function currentChapter(w: WorldState): Chapter | null {
  return CHAPTERS.find((c) => !chapterClaimed(w, c)) ?? null;
}

export function taskDone(t: Task, w: WorldState) {
  return w.questsClaimed.includes(t.id) || t.progress(w) >= t.target;
}

/** The next unfinished task of the current chapter. */
export function currentQuest(w: WorldState): Task | null {
  const c = currentChapter(w);
  if (!c) return null;
  return c.tasks.find((t) => !w.questsClaimed.includes(t.id) && t.progress(w) < t.target) ?? null;
}

export function questDone(q: Task, w: WorldState): boolean {
  return q.progress(w) >= q.target;
}

export function guideFor(t: Task | null, w: WorldState): GuideTarget | null {
  if (!t?.guide) return null;
  return typeof t.guide === 'function' ? t.guide(w) : t.guide;
}

// ------------------------------------------------------------------ daily tasks

export interface DailyDef {
  id: string;
  title: string;
  stat: string;
  target: number;
  reward: number;
  needs?: (w: WorldState) => boolean;
}

export const DAILY_POOL: DailyDef[] = [
  { id: 'd_harvest', title: 'Harvest 8 crops', stat: 'harvest', target: 8, reward: 60 },
  { id: 'd_water', title: 'Water 6 plots', stat: 'water', target: 6, reward: 40 },
  { id: 'd_cook', title: 'Cook 2 dishes', stat: 'cook', target: 2, reward: 60 },
  { id: 'd_serve', title: 'Serve 3 diners', stat: 'served', target: 3, reward: 80, needs: (w) => w.discovered.includes('restaurant') },
  { id: 'd_sale', title: 'Sell 2 counter dishes', stat: 'sale', target: 2, reward: 60 },
  { id: 'd_sell', title: 'Sell 5 items', stat: 'sold', target: 5, reward: 50 },
  { id: 'd_talk', title: 'Chat with 3 villagers', stat: 'talk', target: 3, reward: 40, needs: (w) => w.discovered.includes('town') },
  { id: 'd_forage', title: 'Gather 4 wild things', stat: 'forage', target: 4, reward: 60, needs: (w) => w.discovered.includes('forest') },
  { id: 'd_fish', title: 'Catch 2 fish', stat: 'fish', target: 2, reward: 70, needs: (w) => (w.upgrades.rod ?? 0) > 0 },
  { id: 'd_order', title: 'Deliver an order', stat: 'orders', target: 1, reward: 80, needs: (w) => w.discovered.includes('town') },
  { id: 'd_eggs', title: 'Collect 3 eggs', stat: 'collect:egg', target: 3, reward: 60, needs: (w) => (w.producers.chicken?.count ?? 0) > 0 },
  { id: 'd_milk', title: 'Collect 2 milk', stat: 'collect:milk', target: 2, reward: 70, needs: (w) => (w.producers.cow?.count ?? 0) > 0 },
  { id: 'd_pet', title: 'Pet your pet', stat: 'petted', target: 1, reward: 30, needs: (w) => !!(w.players.xb.pet || w.players.qd.pet) },
];

export const DAILY_COUNT = 3;
export const DAILY_BONUS = 50;

export function dailyDefs(w: WorldState): DailyDef[] {
  const ids = w.daily?.ids ?? [];
  return ids.map((id) => DAILY_POOL.find((d) => d.id === id)).filter((d): d is DailyDef => !!d);
}

export function dailyProgress(w: WorldState, d: DailyDef): number {
  return Math.max(0, (w.stats[d.stat] ?? 0) - (w.daily?.base[d.stat] ?? 0));
}

/** Pick today's three tasks (same for both players) and snapshot the stats they count from. */
export function refreshDaily(w: WorldState, now: number): boolean {
  const day = dayIndex(now);
  if (w.daily && w.daily.day === day) return false;
  const eligible = DAILY_POOL.filter((d) => !d.needs || d.needs(w));
  const picked = eligible
    .map((d) => ({ d, r: roll01(`${w.seed}:daily:${day}:${d.id}`) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, DAILY_COUNT)
    .map((x) => x.d);
  const base: Record<string, number> = {};
  for (const d of picked) base[d.stat] = w.stats[d.stat] ?? 0;
  w.daily = { day, ids: picked.map((d) => d.id), base, claimed: [] };
  return true;
}
