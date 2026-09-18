export type ToolId = 'hoe' | 'can' | 'sickle';

export const TOOLS: Record<ToolId, { id: ToolId; name: string; verb: string; icon: string }> = {
  hoe: { id: 'hoe', name: 'Hoe', verb: 'Till', icon: 'hoe' },
  can: { id: 'can', name: 'Watering can', verb: 'Water', icon: 'can' },
  sickle: { id: 'sickle', name: 'Sickle', verb: 'Harvest', icon: 'sickle' },
};

export const TOOL_IDS = Object.keys(TOOLS) as ToolId[];
export const TOOL_TIERS = ['Basic', 'Copper', 'Gold'] as const;
export const TOOL_REACH = ['1 tile', 'a row of 3', '3x3 tiles'] as const;

/** Seeds made from one crop at the seed maker. */
export const SEEDS_PER_CROP = 2;

/**
 * Tiles a tool works on, given the tile the player faces and the facing direction.
 * Basic: that tile. Copper: a row of 3 across it. Gold: a 3x3 square starting at it.
 */
export function toolTiles(level: number, tx: number, ty: number, dx: number, dy: number): { tx: number; ty: number }[] {
  if (level <= 0) return [{ tx, ty }];
  const side = dx !== 0 ? { x: 0, y: 1 } : { x: 1, y: 0 };
  const rows = level >= 2 ? 3 : 1;
  const out: { tx: number; ty: number }[] = [];
  for (let r = 0; r < rows; r++) for (let s = -1; s <= 1; s++) out.push({ tx: tx + dx * r + side.x * s, ty: ty + dy * r + side.y * s });
  return out;
}
