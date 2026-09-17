import { dayKey } from './prices';

export type PlayerId = 'xb' | 'qd';
export const PLAYER_IDS: PlayerId[] = ['xb', 'qd'];

export function otherPlayer(p: PlayerId): PlayerId {
  return p === 'xb' ? 'qd' : 'xb';
}

// ---------- Love Tree ----------

/** Days both of you played. */
export function daysTogether(daysPlayed: Record<PlayerId, string[]>): number {
  const a = new Set(daysPlayed.xb ?? []);
  return (daysPlayed.qd ?? []).filter((d) => a.has(d)).length;
}

export const LOVE_TREE_STAGES = [0, 1, 3, 7, 14, 30, 60, 100];

/** 0 = sapling ... 7 = fully blossomed. */
export function loveTreeStage(days: number): number {
  let s = 0;
  for (let i = 0; i < LOVE_TREE_STAGES.length; i++) if (days >= LOVE_TREE_STAGES[i]) s = i;
  return s;
}

export function nextLoveTreeMilestone(days: number): number | null {
  return LOVE_TREE_STAGES.find((d) => d > days) ?? null;
}

// ---------- Special days ----------

export interface SpecialDay {
  label: string;
  month: number;
  day: number;
}

export function isSpecialDay(days: SpecialDay[], ms: number): SpecialDay | null {
  const d = new Date(ms);
  return days.find((s) => s.month === d.getMonth() + 1 && s.day === d.getDate()) ?? null;
}

// ---------- Daily question ----------

export const DAILY_QUESTIONS = [
  'What made you smile today?',
  'What is one thing you love about us?',
  'What was the best meal we ever had together?',
  'Where should we travel next?',
  'What song reminds you of me?',
  'What is your favourite memory of this year?',
  'What do you want to do this weekend?',
  'If our farm were real, what would you grow first?',
  'What is something small I do that you like?',
  'What are you grateful for today?',
  'What is a dream you have not told me yet?',
  'What is your comfort food?',
  'Which movie should we watch again?',
  'What did you daydream about today?',
  'What is the cutest thing I have done lately?',
  'What would our pet be called in real life?',
  'One word to describe today?',
  'What are you looking forward to?',
  'What is a place that feels like home?',
  'What should we cook together next?',
  'What made you laugh recently?',
  'What is one thing you want to learn?',
  'Sunrise or sunset?',
  'What is your favourite season, and why?',
  'What do you like most about our farm?',
  'What would you do with a free day?',
  'What is a promise you want to make?',
  'What is your favourite thing we own?',
  'Tea, coffee, or hot chocolate tonight?',
  'What are you proud of this week?',
];

export function questionForDay(ms: number): string {
  const key = dayKey(ms);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return DAILY_QUESTIONS[h % DAILY_QUESTIONS.length];
}

// ---------- Postcards ----------

export interface Postcard {
  id: string;
  title: string;
  day: string;
  /** Which little scene to draw. */
  scene: 'first_dish' | 'first_sale' | 's_dish' | 'tree' | 'rich' | 'pet' | 'together' | 'special' | 'restaurant' | 'orders';
}

export interface PostcardMilestone {
  id: string;
  title: string;
  scene: Postcard['scene'];
  check: (s: { stats: Record<string, number>; daysTogether: number; coins: number; pets: number; specialToday: boolean }) => boolean;
}

export const POSTCARD_MILESTONES: PostcardMilestone[] = [
  { id: 'first_dish', title: 'Our first dish', scene: 'first_dish', check: (s) => (s.stats.cook ?? 0) >= 1 },
  { id: 'first_sale', title: 'First customer', scene: 'first_sale', check: (s) => (s.stats.sale ?? 0) >= 1 },
  { id: 's_dish', title: 'Perfection', scene: 's_dish', check: (s) => (s.stats['cook:S'] ?? 0) >= 1 },
  { id: 'together7', title: 'A week together', scene: 'tree', check: (s) => s.daysTogether >= 7 },
  { id: 'together30', title: 'A month together', scene: 'tree', check: (s) => s.daysTogether >= 30 },
  { id: 'rich', title: 'Our first thousand', scene: 'rich', check: (s) => s.coins >= 1000 },
  { id: 'pet', title: 'A new friend', scene: 'pet', check: (s) => s.pets >= 1 },
  { id: 'served50', title: 'Full house', scene: 'restaurant', check: (s) => (s.stats.served ?? 0) >= 50 },
  { id: 'orders10', title: 'Town favourites', scene: 'orders', check: (s) => (s.stats.orders ?? 0) >= 10 },
  { id: 'coop', title: 'Cooked together', scene: 'together', check: (s) => (s.stats.coop ?? 0) >= 1 },
];
