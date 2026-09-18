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
  | 'mushroom_soup'
  | 'pancakes'
  | 'veggie_stir_fry'
  | 'carrot_cake'
  | 'strawberry_jam'
  | 'berry_pie'
  | 'corn_chowder'
  | 'fish_stew'
  | 'shortcake'
  | 'pumpkin_pie'
  | 'honey_toast'
  | 'cream_pudding'
  | 'fish_tacos'
  | 'goat_cheese_salad'
  | 'egg_tart'
  | 'truffle_pasta';

export type BookId = 'bakery_book' | 'seafood_book';

export interface Recipe {
  id: RecipeId;
  name: string;
  ingredients: Partial<Record<ItemId, number>>;
  steps: StepId[];
  basePrice: number;
  /** Reputation needed to unlock. */
  unlockRep: number;
  /** Recipe book that must be owned (bought at the town store). */
  book?: BookId;
  color: string;
  colorLight: string;
}

export const RECIPES: Record<RecipeId, Recipe> = {
  tomato_soup: { id: 'tomato_soup', name: 'Tomato Soup', ingredients: { 'crop:tomato': 2 }, steps: ['chop', 'stir', 'season'], basePrice: 75, unlockRep: 0, color: '#ff5f5f', colorLight: '#ff9a9a' },
  bread: { id: 'bread', name: 'Bread', ingredients: { 'crop:wheat': 3 }, steps: ['stir', 'heat', 'plate'], basePrice: 60, unlockRep: 0, color: '#e2a35c', colorLight: '#f5d2a0' },
  omelette: { id: 'omelette', name: 'Omelette', ingredients: { egg: 2, 'crop:tomato': 1 }, steps: ['chop', 'flip', 'season'], basePrice: 95, unlockRep: 8, color: '#ffd84f', colorLight: '#fff0a8' },
  grilled_fish: { id: 'grilled_fish', name: 'Grilled Fish', ingredients: { fish: 1, 'crop:carrot': 1 }, steps: ['season', 'flip', 'heat'], basePrice: 120, unlockRep: 8, color: '#7fb8e6', colorLight: '#bfe0f7' },
  mushroom_soup: { id: 'mushroom_soup', name: 'Mushroom Soup', ingredients: { mushroom: 2, herb: 1 }, steps: ['chop', 'stir', 'heat'], basePrice: 130, unlockRep: 8, color: '#c9a06a', colorLight: '#e8c89a' },
  pancakes: { id: 'pancakes', name: 'Pancakes', ingredients: { 'crop:wheat': 2, egg: 1, milk: 1 }, steps: ['stir', 'flip', 'plate'], basePrice: 150, unlockRep: 15, color: '#f2b16b', colorLight: '#ffd9a0' },
  veggie_stir_fry: { id: 'veggie_stir_fry', name: 'Veggie Stir-fry', ingredients: { 'crop:corn': 1, 'crop:carrot': 1, mushroom: 1 }, steps: ['chop', 'heat', 'stir', 'season'], basePrice: 165, unlockRep: 15, color: '#7bd36a', colorLight: '#b9f0a8' },
  carrot_cake: { id: 'carrot_cake', name: 'Carrot Cake', ingredients: { 'crop:carrot': 2, 'crop:wheat': 2, egg: 1 }, steps: ['chop', 'stir', 'heat', 'plate'], basePrice: 160, unlockRep: 20, color: '#ff9a3c', colorLight: '#ffc07a' },
  strawberry_jam: { id: 'strawberry_jam', name: 'Strawberry Jam', ingredients: { 'crop:strawberry': 3 }, steps: ['chop', 'stir', 'season'], basePrice: 170, unlockRep: 20, color: '#ff5c8a', colorLight: '#ffa3c0' },
  berry_pie: { id: 'berry_pie', name: 'Berry Pie', ingredients: { berry: 3, 'crop:wheat': 2 }, steps: ['stir', 'heat', 'plate'], basePrice: 180, unlockRep: 20, color: '#8a5cff', colorLight: '#c8b0ff' },
  corn_chowder: { id: 'corn_chowder', name: 'Corn Chowder', ingredients: { 'crop:corn': 2, 'crop:potato': 1, milk: 1 }, steps: ['chop', 'stir', 'heat', 'season'], basePrice: 220, unlockRep: 30, color: '#ffe066', colorLight: '#fff4b0' },
  fish_stew: { id: 'fish_stew', name: 'Fish Stew', ingredients: { fish: 1, 'crop:tomato': 1, 'crop:carrot': 1 }, steps: ['chop', 'stir', 'heat', 'season'], basePrice: 210, unlockRep: 30, color: '#f08a5d', colorLight: '#ffc2a3' },
  shortcake: { id: 'shortcake', name: 'Shortcake', ingredients: { 'crop:strawberry': 2, 'crop:wheat': 2, egg: 1 }, steps: ['stir', 'heat', 'plate', 'season'], basePrice: 260, unlockRep: 40, color: '#ffb3d9', colorLight: '#ffe1f0' },
  pumpkin_pie: { id: 'pumpkin_pie', name: 'Pumpkin Pie', ingredients: { 'crop:pumpkin': 1, 'crop:wheat': 2, egg: 1, milk: 1 }, steps: ['chop', 'stir', 'heat', 'plate'], basePrice: 320, unlockRep: 45, color: '#ff8c3c', colorLight: '#ffbf8a' },
  honey_toast: { id: 'honey_toast', name: 'Honey Toast', ingredients: { 'crop:wheat': 2, honey: 1, berry: 1 }, steps: ['heat', 'plate', 'season'], basePrice: 240, unlockRep: 25, book: 'bakery_book', color: '#f2c14e', colorLight: '#ffe8a0' },
  cream_pudding: { id: 'cream_pudding', name: 'Cream Pudding', ingredients: { milk: 2, egg: 2, honey: 1 }, steps: ['stir', 'heat', 'plate', 'season'], basePrice: 340, unlockRep: 35, book: 'bakery_book', color: '#fff0c0', colorLight: '#ffffff' },
  goat_cheese_salad: { id: 'goat_cheese_salad', name: 'Goat Cheese Salad', ingredients: { goat_milk: 1, 'crop:tomato': 1, herb: 1 }, steps: ['chop', 'stir', 'season'], basePrice: 200, unlockRep: 10, color: '#fff4d6', colorLight: '#9be07a' },
  egg_tart: { id: 'egg_tart', name: 'Duck Egg Tart', ingredients: { duck_egg: 1, 'crop:wheat': 1, milk: 1 }, steps: ['stir', 'heat', 'plate'], basePrice: 210, unlockRep: 12, color: '#ffcf4f', colorLight: '#fff0b0' },
  truffle_pasta: { id: 'truffle_pasta', name: 'Truffle Pasta', ingredients: { 'crop:wheat': 2, truffle: 1, milk: 1 }, steps: ['stir', 'heat', 'season', 'plate'], basePrice: 420, unlockRep: 25, color: '#f2dca0', colorLight: '#6b4a3a' },
  fish_tacos: { id: 'fish_tacos', name: 'Fish Tacos', ingredients: { fish: 2, 'crop:corn': 1, 'crop:tomato': 1 }, steps: ['chop', 'flip', 'season', 'plate'], basePrice: 300, unlockRep: 30, book: 'seafood_book', color: '#7fb8e6', colorLight: '#d8f0ff' },
};

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

export const BOOKS: Record<BookId, { id: BookId; name: string; price: number; desc: string }> = {
  bakery_book: { id: 'bakery_book', name: 'Bakery Book', price: 450, desc: 'Honey Toast, Cream Pudding' },
  seafood_book: { id: 'seafood_book', name: 'Seafood Book', price: 600, desc: 'Fish Tacos' },
};

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

/** Price of a dish given reputation and the home coziness bonus (0..0.25). */
export function dishPrice(d: Dish, reputation: number, cozyBonus = 0): number {
  const base = RECIPES[d.recipe].basePrice * GRADE_MULT[d.grade];
  return Math.round(base * (1 + (reputation / 100) * 0.5 + cozyBonus));
}

export function recipeUnlocked(r: Recipe, reputation: number, books: BookId[]): boolean {
  if (r.unlockRep > reputation) return false;
  if (r.book && !books.includes(r.book)) return false;
  return true;
}

export function unlockedRecipes(reputation: number, books: BookId[] = []): RecipeId[] {
  return RECIPE_IDS.filter((r) => recipeUnlocked(RECIPES[r], reputation, books));
}

export function canCook(recipe: Recipe, inventory: Partial<Record<ItemId, number>>): boolean {
  for (const k in recipe.ingredients) {
    const need = recipe.ingredients[k as ItemId] ?? 0;
    if ((inventory[k as ItemId] ?? 0) < need) return false;
  }
  return true;
}
