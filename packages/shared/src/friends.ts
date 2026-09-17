import type { BookId } from './recipes';
import type { FurnitureId } from './furniture';
import type { ItemId } from './items';
import { dayIndex } from './prices';
import type { WorldState } from './world';

/**
 * Gift keys are either an item id ("honey", "crop:strawberry") or a dish
 * ("dish:berry_pie"; any grade counts).
 */
export type GiftKey = string;

export interface FriendReward {
  hearts: number;
  text: string;
  coins?: number;
  items?: Partial<Record<ItemId, number>>;
  furniture?: Partial<Record<FurnitureId, number>>;
  clothing?: string[];
  book?: BookId;
}

export interface VillagerDef {
  id: string;
  name: string;
  where: string;
  loves: GiftKey[];
  likes: GiftKey[];
  dislikes: GiftKey[];
  rewards: FriendReward[];
}

export const HEART_POINTS = 50;
export const MAX_HEARTS = 5;
export const TALK_POINTS = 10;
export const GIFT_POINTS = { love: 45, like: 20, neutral: 8, dislike: -10 } as const;
export type GiftReaction = keyof typeof GIFT_POINTS;

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'mayor',
    name: 'Mayor Bea',
    where: 'Maple Town, by the fountain',
    loves: ['dish:pumpkin_pie', 'dish:corn_chowder', 'honey'],
    likes: ['crop:pumpkin', 'milk', 'dish:bread', 'dish:tomato_soup'],
    dislikes: ['mushroom'],
    rewards: [
      { hearts: 2, text: 'A thank-you from the town: 200 coins', coins: 200 },
      { hearts: 4, text: 'A painting from the town hall', furniture: { painting: 1 } },
    ],
  },
  {
    id: 'lily',
    name: 'Lily',
    where: 'Maple Town plaza',
    loves: ['crop:strawberry', 'dish:strawberry_jam', 'dish:shortcake'],
    likes: ['berry', 'egg', 'dish:pancakes'],
    dislikes: ['fish'],
    rewards: [
      { hearts: 2, text: 'Lily made you a flower crown', clothing: ['hat:flowercrown'] },
      { hearts: 4, text: 'Lily gave you a giant teddy', furniture: { teddy: 1 } },
    ],
  },
  {
    id: 'tom',
    name: 'Old Tom',
    where: 'Maple Town, south side',
    loves: ['fish', 'dish:grilled_fish', 'dish:fish_stew'],
    likes: ['crop:potato', 'dish:mushroom_soup', 'dish:fish_tacos'],
    dislikes: ['crop:strawberry'],
    rewards: [
      { hearts: 2, text: 'Old Tom shared his bait: 3 fish', items: { fish: 3 } },
      { hearts: 4, text: 'Old Tom lent you his lucky glasses', clothing: ['accessory:glasses'] },
    ],
  },
  {
    id: 'pip',
    name: 'Pip',
    where: 'Maple Town plaza',
    loves: ['dish:honey_toast', 'dish:pancakes', 'honey'],
    likes: ['crop:corn', 'berry', 'crop:carrot'],
    dislikes: ['herb'],
    rewards: [
      { hearts: 2, text: 'Pip found you 3 blueberry seeds', items: { 'seed:blueberry': 3 } },
      { hearts: 4, text: 'Pip handed down a satchel', clothing: ['accessory:bag'] },
    ],
  },
  {
    id: 'hana',
    name: 'Hana',
    where: 'Maple Town, near the store',
    loves: ['dish:berry_pie', 'crop:blueberry', 'dish:cream_pudding'],
    likes: ['crop:tomato', 'herb', 'dish:omelette'],
    dislikes: ['wool'],
    rewards: [
      { hearts: 2, text: 'Hana tied a big bow for you', clothing: ['hat:bow_big'] },
      { hearts: 4, text: 'Hana gave you an aquarium', furniture: { aquarium: 1 } },
    ],
  },
  {
    id: 'june',
    name: 'Grandma June',
    where: 'Whisper Forest clearing',
    loves: ['dish:strawberry_jam', 'mushroom', 'dish:mushroom_soup'],
    likes: ['herb', 'crop:carrot', 'dish:carrot_cake'],
    dislikes: ['crop:corn'],
    rewards: [
      { hearts: 2, text: 'Grandma June sent a jar of honey', items: { honey: 2 } },
      { hearts: 4, text: 'Grandma June gave you her Bakery Book', book: 'bakery_book' },
    ],
  },
  {
    id: 'bo',
    name: 'Bo',
    where: 'Sunny Ranch, by the barn',
    loves: ['milk', 'wool', 'dish:veggie_stir_fry'],
    likes: ['crop:wheat', 'crop:corn', 'dish:bread'],
    dislikes: ['crop:pumpkin'],
    rewards: [
      { hearts: 2, text: 'Bo paid you for helping: 150 coins', coins: 150 },
      { hearts: 4, text: 'Bo knitted you a scarf', clothing: ['accessory:scarf'] },
    ],
  },
];

export function villager(id: string): VillagerDef | null {
  return VILLAGERS.find((v) => v.id === id) ?? null;
}

export function friendPoints(w: WorldState, id: string): number {
  return w.stats[`friend:${id}`] ?? 0;
}

export function heartsFor(points: number): number {
  return Math.max(0, Math.min(MAX_HEARTS, Math.floor(points / HEART_POINTS)));
}

export function giftReaction(v: VillagerDef, key: GiftKey): GiftReaction {
  if (v.loves.includes(key)) return 'love';
  if (v.likes.includes(key)) return 'like';
  if (v.dislikes.includes(key)) return 'dislike';
  return 'neutral';
}

export function talkedToday(w: WorldState, id: string, now: number) {
  return (w.stats[`talkday:${id}`] ?? -1) === dayIndex(now);
}

export function giftedToday(w: WorldState, id: string, now: number) {
  return (w.stats[`giftday:${id}`] ?? -1) === dayIndex(now);
}

/** Loved gifts you have already discovered (shown in the book). */
export function knownLoves(w: WorldState, v: VillagerDef): GiftKey[] {
  const hearts = heartsFor(friendPoints(w, v.id));
  return v.loves.filter((k, i) => w.stats[`loveknown:${v.id}:${k}`] || (hearts >= 1 && i === 0) || hearts >= 3);
}

export const GIFT_LINES: Record<GiftReaction, string[]> = {
  love: ['I love this! How did you know?', 'This is my favourite! Thank you!', 'Oh my, you remembered! Thank you!'],
  like: ['Oh, how nice. Thank you!', 'I like this a lot, thanks!', 'What a lovely gift.'],
  neutral: ['Thank you, that is kind.', 'Oh, for me? Thanks.', 'That is thoughtful of you.'],
  dislike: ['Oh... thank you, I suppose.', 'Hmm, not really my thing.', 'I will find a use for it...'],
};
