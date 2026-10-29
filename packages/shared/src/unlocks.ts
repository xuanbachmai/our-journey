import { ANIMALS } from './animals';
import { BOOKS, RECIPES, RECIPE_IDS, recipeUnlocked, type RecipeId } from './recipes';
import { CROPS, CROP_IDS, type CropId } from './crops';
import { FURNITURE, type FurnitureId } from './furniture';
import { HANDS, HAND_IDS } from './hands';
import { ITEMS, type ItemId } from './items';
import { MACHINES, MACHINE_IDS, type MachineId } from './machines';
import { CHAPTERS, currentChapter, type Task } from './quests';
import { UPGRADES, type UpgradeId } from './upgrades';
import { upgradeLevel, type WorldState } from './world';

export interface UnlockInfo {
  unlocked: boolean;
  /** Short badge text like "Rep 10" or "Need Coop" when locked, or "Unlocked" when open. */
  badge: string;
  /** Friendly explanation of how to unlock this item. */
  reason: string;
  /** Where to go or what to do to get it. */
  where: string;
}

export interface UnlockedEntry {
  id: string;
  name: string;
  kind: 'seed' | 'recipe' | 'machine' | 'hand' | 'tool';
  icon: string;
  desc: string;
}

export interface NextUnlockMilestone {
  rep: number;
  label: string;
  icon: string;
}

export interface TaskTutorial {
  taskId: string;
  chapterNum: number;
  chapterTitle: string;
  stepIndex: number;
  totalSteps: number;
  title: string;
  progress: number;
  target: number;
  /** Clear step-by-step instructions on what to do right now. */
  whereText: string;
  howText: string;
  /** Optional hotbar item key to quick-equip with one tap (e.g. "tool:hoe", "seed:wheat"). */
  equipKey?: string;
  equipLabel?: string;
  /** World action types that fulfill this task (used to pulse the Act button). */
  actionTypes: string[];
  /** What unlocks when this task/chapter or next rep milestone is reached. */
  unlockTeaser: string;
}

/** Check whether a tool, seed, crop, produce, dish, furniture, or machine is unlocked in the current world progress. */
export function itemUnlockInfo(w: WorldState, rawKey: string): UnlockInfo {
  const rep = w.reputation;

  // 1. Tools
  if (rawKey.startsWith('tool:') || ['hoe', 'can', 'sickle', 'rod', 'seedmaker', 'camera'].includes(rawKey)) {
    const tool = rawKey.replace(/^tool:/, '');
    if (tool === 'hoe' || tool === 'can' || tool === 'sickle') {
      const lvl = upgradeLevel(w, tool as UpgradeId);
      return {
        unlocked: true,
        badge: lvl === 0 ? 'Basic' : lvl === 1 ? 'Copper' : 'Gold',
        reason: lvl < 2 ? 'Upgrade at the Farm Stall (Tools tab) for wider reach' : 'Max tier reached!',
        where: 'Farm Stall',
      };
    }
    if (tool === 'camera') {
      return {
        unlocked: true,
        badge: 'Ready',
        reason: 'Hold to snap photos anywhere or at camera spots',
        where: 'Bag -> Tools',
      };
    }
    if (tool === 'rod') {
      const open = upgradeLevel(w, 'rod') > 0;
      return {
        unlocked: open,
        badge: open ? 'Unlocked' : 'Locked',
        reason: open ? 'Face any pond and press Act to fish' : 'Buy the Fishing Rod (90c) at the Farm Stall -> Tools tab',
        where: 'Farm Stall (Tools)',
      };
    }
    if (tool === 'seedmaker') {
      const open = upgradeLevel(w, 'seedmaker') > 0;
      return {
        unlocked: open,
        badge: open ? 'Unlocked' : 'Locked',
        reason: open ? 'Turns 1 crop into 2 seeds beside the field' : 'Buy the Seed Maker (350c) at the Farm Stall -> Tools tab',
        where: 'Farm Stall (Tools)',
      };
    }
  }

  // 2. Seeds & Crops
  if (rawKey.startsWith('seed:') || rawKey.startsWith('crop:') || (CROP_IDS as string[]).includes(rawKey)) {
    const cropId = rawKey.replace(/^(seed|crop):/, '') as CropId;
    const def = CROPS[cropId];
    if (def) {
      const open = rep >= def.unlockRep || (w.inventory[`seed:${cropId}`] ?? 0) > 0 || (w.inventory[`crop:${cropId}`] ?? 0) > 0;
      return {
        unlocked: open,
        badge: open ? 'Unlocked' : `Rep ${def.unlockRep}`,
        reason: open ? `Grow in the farm field (${def.seedPrice}c per seed)` : `Reach ${def.unlockRep} Reputation to unlock ${def.name} seeds`,
        where: 'Farm Stall / General Store',
      };
    }
  }

  // 3. Dishes & Recipes
  if (rawKey.startsWith('dish:') || (RECIPE_IDS as string[]).includes(rawKey)) {
    const recipeId = rawKey.replace(/^dish:/, '').split(':')[0] as RecipeId;
    const r = RECIPES[recipeId];
    if (r) {
      const open = recipeUnlocked(r, rep, w.books);
      let reason = `Cook at the Kitchen (${r.basePrice}c base price)`;
      let badge = 'Unlocked';
      if (!open) {
        if (r.book && !w.books.includes(r.book) && rep < r.unlockRep) {
          badge = `Rep ${r.unlockRep} + Book`;
          reason = `Needs ${r.unlockRep} Reputation & ${BOOKS[r.book].name} from General Store`;
        } else if (r.book && !w.books.includes(r.book)) {
          badge = 'Need Book';
          reason = `Buy the ${BOOKS[r.book].name} (${BOOKS[r.book].price}c) at the General Store`;
        } else {
          badge = `Rep ${r.unlockRep}`;
          reason = `Reach ${r.unlockRep} Reputation to unlock this recipe`;
        }
      }
      return {
        unlocked: open,
        badge,
        reason,
        where: 'Kitchen / Restaurant',
      };
    }
  }

  // 4. Machines
  if (rawKey.startsWith('machine:')) {
    const mId = rawKey.slice(8) as MachineId;
    const m = MACHINES[mId];
    if (m) {
      const open = rep >= m.unlockRep;
      return {
        unlocked: open,
        badge: open ? 'Unlocked' : `Rep ${m.unlockRep}`,
        reason: open ? m.desc : `Reach ${m.unlockRep} Reputation to unlock at the General Store`,
        where: 'General Store (Make tab)',
      };
    }
  }

  // 5. Artisan Goods & Produce
  const item = rawKey.replace(/^(produce|item):/, '') as ItemId;
  if (item === 'egg' || item === 'duck_egg') {
    const hasCoop = upgradeLevel(w, 'coop') > 0;
    const animal = item === 'egg' ? ANIMALS.chicken : ANIMALS.duck;
    return {
      unlocked: hasCoop && (w.producers[animal.id]?.count ?? 0) > 0,
      badge: !hasCoop ? 'Need Coop' : (w.producers[animal.id]?.count ?? 0) > 0 ? 'Unlocked' : `Buy ${animal.name}`,
      reason: !hasCoop ? 'Build the Chicken Coop at Pet & Barn Shop first' : `Raise ${animal.plural} in the farm coop`,
      where: 'Pet & Barn Shop',
    };
  }
  if (item === 'honey') {
    const hasHive = upgradeLevel(w, 'beehive') > 0;
    return {
      unlocked: hasHive && (w.producers.bee?.count ?? 0) > 0,
      badge: !hasHive ? 'Need Bee Garden' : 'Unlocked',
      reason: !hasHive ? 'Build the Bee Garden at Pet & Barn Shop' : 'Collected from your bee hives on the farm',
      where: 'Pet & Barn Shop',
    };
  }
  if (item === 'milk' || item === 'wool') {
    const animal = item === 'milk' ? ANIMALS.cow : ANIMALS.sheep;
    const has = (w.producers[animal.id]?.count ?? 0) > 0;
    return {
      unlocked: has,
      badge: has ? 'Unlocked' : `Buy ${animal.name}`,
      reason: has ? `Collected at Sunny Ranch barn` : `Buy a ${animal.name} (${animal.price}c) at the Pet & Barn Shop`,
      where: 'Sunny Ranch / Pet Shop',
    };
  }
  if (item === 'goat_milk' || item === 'truffle') {
    const hasPasture = upgradeLevel(w, 'pasture') > 0;
    const animal = item === 'goat_milk' ? ANIMALS.goat : ANIMALS.pig;
    return {
      unlocked: hasPasture && (w.producers[animal.id]?.count ?? 0) > 0,
      badge: !hasPasture ? 'Need Pasture' : `Buy ${animal.name}`,
      reason: !hasPasture ? 'Build the Pasture at Pet & Barn Shop first' : `Buy a ${animal.name} at Pet & Barn Shop and collect at Sunny Ranch`,
      where: 'Pet & Barn Shop',
    };
  }
  if (item === 'fish') {
    const hasRod = upgradeLevel(w, 'rod') > 0;
    return {
      unlocked: hasRod,
      badge: hasRod ? 'Unlocked' : 'Need Rod',
      reason: hasRod ? 'Catch fish in the Farm or Forest pond' : 'Buy the Fishing Rod (90c) at the Farm Stall -> Tools tab',
      where: 'Farm Stall (Tools)',
    };
  }
  if (item === 'mushroom' || item === 'berry' || item === 'herb') {
    const inForest = w.discovered.includes('forest');
    return {
      unlocked: inForest || (w.inventory[item] ?? 0) > 0,
      badge: inForest ? 'Unlocked' : 'Explore Forest',
      reason: 'Forage wild plants in Whisper Forest (north of Maple Town)',
      where: 'Whisper Forest',
    };
  }
  for (const mId of MACHINE_IDS) {
    if (MACHINES[mId].output === item) {
      const m = MACHINES[mId];
      const hasMachine = (w.machines?.[mId]?.count ?? 0) > 0;
      const repOk = rep >= m.unlockRep;
      return {
        unlocked: hasMachine,
        badge: hasMachine ? 'Unlocked' : !repOk ? `Rep ${m.unlockRep}` : `Need ${m.name}`,
        reason: !repOk
          ? `Reach ${m.unlockRep} Reputation, then buy the ${m.name} at General Store`
          : `Buy the ${m.name} (${m.price}c) at General Store -> Make tab`,
        where: 'General Store (Make)',
      };
    }
  }

  // 6. Furniture
  if (rawKey.startsWith('furn:') || FURNITURE[rawKey as FurnitureId]) {
    const fId = rawKey.replace(/^furn:/, '') as FurnitureId;
    const f = FURNITURE[fId];
    if (f) {
      const owned = (w.furnitureOwned[fId] ?? 0) > 0 || w.furniturePlaced.some((p) => p.id === fId);
      const open = owned || (!f.rewardOnly && rep >= f.unlockRep);
      return {
        unlocked: open,
        badge: open ? 'Unlocked' : f.rewardOnly ? 'Story Reward' : `Rep ${f.unlockRep}`,
        reason: f.rewardOnly ? 'Earned as a special milestone or chapter reward' : `Unlocks at ${f.unlockRep} Reputation in Cozy Corner`,
        where: 'Cozy Corner',
      };
    }
  }

  return { unlocked: true, badge: 'Unlocked', reason: '', where: '' };
}

/** Find all items/recipes/machines/hands that newly unlocked when reputation moved from `beforeRep` to `afterRep`. */
export function newlyUnlockedBetween(w: WorldState, beforeRep: number, afterRep: number): UnlockedEntry[] {
  const b = Math.floor(beforeRep);
  const a = Math.floor(afterRep);
  if (a <= b) return [];
  const out: UnlockedEntry[] = [];

  for (const id of CROP_IDS) {
    const def = CROPS[id];
    if (def.unlockRep > b && def.unlockRep <= a) {
      out.push({ id: `seed:${id}`, name: `${def.name} Seeds`, kind: 'seed', icon: `seed-${id}`, desc: 'Available at the Farm Stall & Store!' });
    }
  }
  for (const id of RECIPE_IDS) {
    const r = RECIPES[id];
    if (r.unlockRep > b && r.unlockRep <= a && (!r.book || w.books.includes(r.book))) {
      out.push({ id: `dish:${id}`, name: `${r.name} Recipe`, kind: 'recipe', icon: `dish-${id}`, desc: 'New recipe unlocked in the Kitchen!' });
    }
  }
  for (const id of MACHINE_IDS) {
    const m = MACHINES[id];
    if (m.unlockRep > b && m.unlockRep <= a) {
      out.push({ id: `machine:${id}`, name: m.name, kind: 'machine', icon: m.icon, desc: `Unlocked in General Store -> Make!` });
    }
  }
  for (const id of HAND_IDS) {
    const h = HANDS[id];
    if (h.unlockRep > b && h.unlockRep <= a) {
      out.push({ id: `hand:${id}`, name: h.name, kind: 'hand', icon: h.icon, desc: 'Can now be hired at the Town Work Board!' });
    }
  }
  return out;
}

/** Returns the next reputation milestone above the player's current reputation so they know what unlocks next. */
export function nextUnlockMilestone(w: WorldState): NextUnlockMilestone | null {
  const cur = Math.floor(w.reputation);
  const thresholds = new Set<number>();
  for (const id of CROP_IDS) if (CROPS[id].unlockRep > cur) thresholds.add(CROPS[id].unlockRep);
  for (const id of RECIPE_IDS) if (RECIPES[id].unlockRep > cur) thresholds.add(RECIPES[id].unlockRep);
  for (const id of MACHINE_IDS) if (MACHINES[id].unlockRep > cur) thresholds.add(MACHINES[id].unlockRep);
  for (const id of HAND_IDS) if (HANDS[id].unlockRep > cur) thresholds.add(HANDS[id].unlockRep);

  const sorted = [...thresholds].sort((x, y) => x - y);
  if (!sorted.length) return null;
  const nextRep = sorted[0];

  const names: string[] = [];
  let icon = 'star';
  for (const id of CROP_IDS) {
    if (CROPS[id].unlockRep === nextRep) {
      names.push(`${CROPS[id].name} seeds`);
      if (icon === 'star') icon = `seed-${id}`;
    }
  }
  for (const id of MACHINE_IDS) {
    if (MACHINES[id].unlockRep === nextRep) {
      names.push(MACHINES[id].name);
      if (icon === 'star') icon = MACHINES[id].icon;
    }
  }
  for (const id of RECIPE_IDS) {
    if (RECIPES[id].unlockRep === nextRep) {
      names.push(RECIPES[id].name);
      if (icon === 'star') icon = `dish-${id}`;
    }
  }
  for (const id of HAND_IDS) {
    if (HANDS[id].unlockRep === nextRep) {
      names.push(HANDS[id].name.split(' ')[0]);
      if (icon === 'star') icon = HANDS[id].icon;
    }
  }

  const summary = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '');
  return { rep: nextRep, label: `Rep ${nextRep}: ${summary}`, icon };
}

interface TaskStepMeta {
  whereText: string;
  howText: string;
  equipKey?: string | ((w: WorldState) => string | undefined);
  equipLabel?: string | ((w: WorldState) => string | undefined);
  actionTypes: string[];
}

const TASK_META: Record<string, TaskStepMeta> = {
  // Chapter 1
  c1_mail: {
    whereText: 'Walk to the red mailbox right beside your farmhouse.',
    howText: 'Face the mailbox and press SPACE / Act to read your welcome letter.',
    actionTypes: ['mailbox'],
  },
  c1_till: {
    whereText: 'Step onto the brown farm field east of your house.',
    howText: 'Hold the Hoe, face an empty dirt plot, and press SPACE / Act.',
    equipKey: 'tool:hoe',
    equipLabel: 'Equip Hoe',
    actionTypes: ['till'],
  },
  c1_plant: {
    whereText: 'Stand on your tilled soil plots in the farm field.',
    howText: 'Select Wheat seeds in your hotbar, face tilled soil, and press Act.',
    equipKey: (w) => {
      const owned = CROP_IDS.find((c) => (w.inventory[`seed:${c}`] ?? 0) > 0);
      return owned ? `seed:${owned}` : 'seed:wheat';
    },
    equipLabel: (w) => {
      const owned = CROP_IDS.find((c) => (w.inventory[`seed:${c}`] ?? 0) > 0);
      return owned ? `Hold ${CROPS[owned].name} Seeds` : 'Hold Seeds';
    },
    actionTypes: ['plant'],
  },
  c1_water: {
    whereText: 'Stay in the farm field next to your planted seeds.',
    howText: 'Equip the Watering Can, face a dry planted plot, and press Act.',
    equipKey: 'tool:can',
    equipLabel: 'Equip Can',
    actionTypes: ['water'],
  },
  c1_harvest: {
    whereText: 'Wait ~2m for Wheat to sparkle in the field when ripe.',
    howText: 'Equip the Sickle, face the sparkling ripe crop, and press Act!',
    equipKey: 'tool:sickle',
    equipLabel: 'Equip Sickle',
    actionTypes: ['harvest'],
  },
  // Chapter 2
  c2_cook: {
    whereText: 'Walk to the outdoor Kitchen counter right next to your house.',
    howText: 'Press Act to open Recipes, pick Bread or Tomato Soup, and play the mini-game!',
    actionTypes: ['kitchen'],
  },
  c2_list: {
    whereText: 'Head south to the Display Counter by the farm road.',
    howText: 'Press Act on the counter and tap "Put out" on your cooked dish.',
    actionTypes: ['counter'],
  },
  c2_sale: {
    whereText: 'Keep a dish on the roadside Display Counter.',
    howText: 'Passers-by will walk up and buy your dish automatically (even offline!).',
    actionTypes: ['counter'],
  },
  c2_sell: {
    whereText: 'Walk east to the striped Farm Stall on your farm.',
    howText: 'Press Act, switch to the "Sell" tab, and sell 3 harvested crops.',
    actionTypes: ['stall'],
  },
  // Chapter 3
  c3_town: {
    whereText: 'Follow the dirt road east off the right edge of your farm.',
    howText: 'Walk through the east path to enter Maple Town.',
    actionTypes: [],
  },
  c3_mayor: {
    whereText: 'Find Mayor Bea strolling near the town fountain.',
    howText: 'Walk up to Mayor Bea, face her, and press Act to say hello.',
    actionTypes: ['talk'],
  },
  c3_seeds: {
    whereText: 'Enter the General Store (blue roof in Maple Town).',
    howText: 'Talk to the shopkeeper or counter and buy any seed packet.',
    actionTypes: ['store', 'talk'],
  },
  c3_order: {
    whereText: 'Check the Town Orders Board beside the fountain.',
    howText: 'Gather what a villager asks for, then press "Deliver" on the board.',
    actionTypes: ['board'],
  },
  // Chapter 4
  c4_enter: {
    whereText: 'Walk to Our Restaurant (orange roof north of the farm field).',
    howText: 'Step into the doorway to enter your restaurant.',
    actionTypes: [],
  },
  c4_serve: {
    whereText: 'Inside the restaurant, wait for diners to sit and order.',
    howText: 'Cook their dish in the kitchen, then walk to their table and press Act!',
    actionTypes: ['serve', 'kitchen'],
  },
  c4_gradeA: {
    whereText: 'Go to the Kitchen (on the farm or inside the restaurant).',
    howText: 'Hit the green zones in each cooking step to score Grade A or S.',
    actionTypes: ['kitchen'],
  },
  c4_rep: {
    whereText: 'Serve diners in the restaurant, sell on the counter, or fill orders.',
    howText: 'Each sale and happy diner increases your Reputation toward 5.',
    actionTypes: ['serve', 'counter', 'board'],
  },
  // Chapter 5
  c5_home: {
    whereText: 'Walk to the front door of your Farmhouse.',
    howText: 'Step into the doorway to enter your cozy home.',
    actionTypes: [],
  },
  c5_buy: {
    whereText: 'Visit Cozy Corner (yellow roof in Maple Town).',
    howText: 'Browse Living, Bedroom, Decor or Wall items and buy a piece of furniture.',
    actionTypes: ['furnshop', 'talk'],
  },
  c5_place: {
    whereText: 'Go inside your Farmhouse.',
    howText: 'Tap the yellow "Decorate" button on the left, pick your furniture, and place it!',
    actionTypes: ['place'],
  },
  c5_dress: {
    whereText: "Visit Rosa's Tailor (pink roof in Maple Town).",
    howText: 'Try on a new outfit, hat, or look on the mannequin and buy it.',
    actionTypes: ['tailor', 'talk'],
  },
  // Chapter 6
  c6_adopt: {
    whereText: 'Visit the Pet & Barn Shop (green roof in Maple Town).',
    howText: 'Pick a puppy, kitten, or bunny on the Pets tab and give it a name!',
    actionTypes: ['petshop', 'talk'],
  },
  c6_pet: {
    whereText: 'Your new pet follows right behind you!',
    howText: 'Turn to face your pet and press SPACE / Act to pet it.',
    actionTypes: ['pet'],
  },
  c6_coop: {
    whereText: 'Go to the Pet & Barn Shop in Maple Town.',
    howText: 'Open the "Build" tab and buy the Chicken Coop (250c).',
    actionTypes: ['petshop', 'talk'],
  },
  c6_eggs: {
    whereText: 'Buy hens in Pet Shop -> Animals, then check your farm Coop.',
    howText: 'When the "!" appears on the coop (every 20m), press Act to collect eggs.',
    actionTypes: ['coop'],
  },
  // Chapter 7
  c7_forest: {
    whereText: 'Walk north out of Maple Town.',
    howText: 'Follow the northern forest trail into Whisper Forest.',
    actionTypes: [],
  },
  c7_forage: {
    whereText: 'Explore the clearings of Whisper Forest.',
    howText: 'Walk up to wild mushrooms, berries, and herbs and press Act to gather 5.',
    actionTypes: ['forage'],
  },
  c7_rod: {
    whereText: 'Walk to the striped Farm Stall on your farm.',
    howText: 'Open the "Tools" tab and buy the Fishing Rod (90c) to unlock fishing!',
    actionTypes: ['stall'],
  },
  c7_fish: {
    whereText: 'Walk to the pond on your farm or in Whisper Forest.',
    howText: 'Equip your Fishing Rod, face the water, press Act, and reel the fish in!',
    equipKey: (w) => (upgradeLevel(w, 'rod') > 0 ? 'tool:rod' : undefined),
    equipLabel: 'Equip Rod',
    actionTypes: ['fish'],
  },
  c7_ranch: {
    whereText: 'Follow the dirt road west off the left side of your farm.',
    howText: 'Walk west into Sunny Ranch where cows, sheep, and horses live.',
    actionTypes: [],
  },
};

/** Build the complete tutorial guidance object for the active task. */
export function tutorialForTask(t: Task | null, w: WorldState): TaskTutorial | null {
  if (!t) return null;
  const ch = currentChapter(w) ?? CHAPTERS.find((c) => c.tasks.some((x) => x.id === t.id)) ?? CHAPTERS[0];
  const chIdx = Math.max(0, CHAPTERS.indexOf(ch));
  const stepIdx = Math.max(0, ch.tasks.indexOf(t));
  const meta = TASK_META[t.id];

  const equipKey = typeof meta?.equipKey === 'function' ? meta.equipKey(w) : meta?.equipKey;
  const equipLabel = typeof meta?.equipLabel === 'function' ? meta.equipLabel(w) : meta?.equipLabel;

  const nextMilestone = nextUnlockMilestone(w);
  const unlockTeaser = nextMilestone
    ? `Next unlock: ${nextMilestone.label} • Ch.${chIdx + 1}: ${ch.reward.text}`
    : `Chapter reward: ${ch.reward.text}`;

  return {
    taskId: t.id,
    chapterNum: chIdx + 1,
    chapterTitle: ch.title,
    stepIndex: stepIdx + 1,
    totalSteps: ch.tasks.length,
    title: t.title,
    progress: Math.min(t.target, t.progress(w)),
    target: t.target,
    whereText: meta?.whereText ?? t.hint,
    howText: meta?.howText ?? `Complete "${t.title}" (+${t.reward} coins). Follow the yellow arrow!`,
    equipKey,
    equipLabel,
    actionTypes: meta?.actionTypes ?? [],
    unlockTeaser,
  };
}
