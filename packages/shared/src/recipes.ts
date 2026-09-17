import type { ItemId } from './items';

export type StepId = 'chop' | 'stir' | 'flip' | 'season' | 'heat' | 'plate';

export const STEP_INFO: Record<StepId, { name: string; hint: string; hintTouch: string }> = {
  chop: { name: 'Chop', hint: 'Press SPACE when the knife is in the green zone', hintTouch: 'Tap when the knife is in the green zone' },
  stir: { name: 'Stir', hint: 'Hold the mouse and stir in circles at a steady pace', hintTouch: 'Drag in circles at a steady pace' },
  flip: { name: 'Flip', hint: 'Press SPACE when the sizzle meter hits green', hintTouch: 'Tap when the sizzle meter hits green' },
  season: { name: 'Season', hint: 'SPACE to shake, ENTER when the meter is in the zone', hintTouch: 'Tap to shake, then tap Done in the zone' },
  heat: { name: 'Heat', hint: 'Hold SPACE to raise the flame, keep the needle in the band', hintTouch: 'Hold to raise the flame, keep the needle in the band' },
  plate: { name: 'Plate', hint: 'Drag every ingredient onto the plate', hintTouch: 'Drag every ingredient onto the plate' },
};

export type RecipeId =
  | 'tomato_soup'
  | 'bread'
  | 'omelette'
  | 'grilled_fish'
  | 'carrot_cake'
  | 'strawberry_jam'
  | 'fish_stew'
  | 'shortcake';

export interface Recipe {
  id: RecipeId;
  name: string;
  ingredients: Partial<Record<ItemId, number>>;
  steps: StepId[];
  basePrice: number;
  /** Reputation needed to unlock. */
  unlockRep: number;
  color: string;
  colorLight: string;
}

export const RECIPES: Record<RecipeId, Recipe> = {
  tomato_soup: { id: 'tomato_soup', name: 'Tomato Soup', ingredients: { 'crop:tomato': 2 }, steps: ['chop', 'stir', 'season'], basePrice: 75, unlockRep: 0, color: '#ff5f5f', colorLight: '#ff9a9a' },
  bread: { id: 'bread', name: 'Bread', ingredients: { 'crop:wheat': 3 }, steps: ['stir', 'heat', 'plate'], basePrice: 60, unlockRep: 0, color: '#e2a35c', colorLight: '#f5d2a0' },
  omelette: { id: 'omelette', name: 'Omelette', ingredients: { egg: 2, 'crop:tomato': 1 }, steps: ['chop', 'flip', 'season'], basePrice: 95, unlockRep: 8, color: '#ffd84f', colorLight: '#fff0a8' },
  grilled_fish: { id: 'grilled_fish', name: 'Grilled Fish', ingredients: { fish: 1, 'crop:carrot': 1 }, steps: ['season', 'flip', 'heat'], basePrice: 120, unlockRep: 8, color: '#7fb8e6', colorLight: '#bfe0f7' },
  carrot_cake: { id: 'carrot_cake', name: 'Carrot Cake', ingredients: { 'crop:carrot': 2, 'crop:wheat': 2, egg: 1 }, steps: ['chop', 'stir', 'heat', 'plate'], basePrice: 160, unlockRep: 20, color: '#ff9a3c', colorLight: '#ffc07a' },
  strawberry_jam: { id: 'strawberry_jam', name: 'Strawberry Jam', ingredients: { 'crop:strawberry': 3 }, steps: ['chop', 'stir', 'season'], basePrice: 170, unlockRep: 20, color: '#ff5c8a', colorLight: '#ffa3c0' },
  fish_stew: { id: 'fish_stew', name: 'Fish Stew', ingredients: { fish: 1, 'crop:tomato': 1, 'crop:carrot': 1 }, steps: ['chop', 'stir', 'heat', 'season'], basePrice: 210, unlockRep: 40, color: '#f08a5d', colorLight: '#ffc2a3' },
  shortcake: { id: 'shortcake', name: 'Shortcake', ingredients: { 'crop:strawberry': 2, 'crop:wheat': 2, egg: 1 }, steps: ['stir', 'heat', 'plate', 'season'], basePrice: 260, unlockRep: 40, color: '#ffb3d9', colorLight: '#ffe1f0' },
};

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

/** 0 = C, 1 = B, 2 = A, 3 = S */
export type Grade = 0 | 1 | 2 | 3;
export const GRADE_NAMES = ['C', 'B', 'A', 'S'] as const;
export const GRADE_MULT = [0.8, 1, 1.3, 1.7] as const;
export const GRADE_REP = [0.2, 0.5, 1, 1.5] as const;

export function gradeFor(score: number): Grade {
  if (score >= 0.9) return 3;
  if (score >= 0.72) return 2;
  if (score >= 0.5) return 1;
  return 0;
}

export interface Dish {
  recipe: RecipeId;
  grade: Grade;
}

export function dishPrice(d: Dish, reputation: number): number {
  const base = RECIPES[d.recipe].basePrice * GRADE_MULT[d.grade];
  return Math.round(base * (1 + (reputation / 100) * 0.5));
}

export function unlockedRecipes(reputation: number): RecipeId[] {
  return RECIPE_IDS.filter((r) => RECIPES[r].unlockRep <= reputation);
}

export function canCook(recipe: Recipe, inventory: Partial<Record<ItemId, number>>): boolean {
  for (const k in recipe.ingredients) {
    const need = recipe.ingredients[k as ItemId] ?? 0;
    if ((inventory[k as ItemId] ?? 0) < need) return false;
  }
  return true;
}
