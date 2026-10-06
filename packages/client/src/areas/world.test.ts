import { describe, expect, it } from 'vitest';
import { AREAS, CHAPTERS, newWorld, type AreaId } from '@hh/shared';
import { getArea } from './index';
import type { AreaDef } from './types';

/**
 * The world has to stay walkable. These checks used to be a browser sweep;
 * here they run on every test, so a misplaced building or a door that lands in
 * a wall fails the build instead of stranding a player.
 */

const ids = Object.keys(AREAS) as AreaId[];

/** Blocked tiles, including the objects that are there from the start. */
function solid(a: AreaDef): boolean[][] {
  const b = a.blocked.map((row) => row.slice());
  for (const o of a.objects) {
    if (!o.blocked || o.requiresUpgrade) continue;
    for (let y = o.ty; y < o.ty + o.h; y++) for (let x = o.tx; x < o.tx + o.w; x++) if (b[y]?.[x] !== undefined) b[y][x] = true;
  }
  return b;
}

/** Every tile you can walk to from the spawn. */
function reachable(a: AreaDef, b: boolean[][]): Set<string> {
  const seen = new Set([`${a.spawn.tx},${a.spawn.ty}`]);
  const queue = [[a.spawn.tx, a.spawn.ty]];
  while (queue.length) {
    const [x, y] = queue.shift() as number[];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= a.w || ny >= a.h || b[ny][nx]) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

const walkable = new Map<AreaId, Set<string>>();
const blocked = new Map<AreaId, boolean[][]>();
for (const id of ids) {
  const a = getArea(id);
  const b = solid(a);
  blocked.set(id, b);
  walkable.set(id, reachable(a, b));
}

const near = (set: Set<string>, tx: number, ty: number, reach = 1) => {
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (set.has(`${tx + dx},${ty + dy}`)) return true;
  return false;
};

describe.each(ids)('%s', (id) => {
  const a = getArea(id);
  const b = blocked.get(id) as boolean[][];
  const open = walkable.get(id) as Set<string>;

  it('starts you somewhere you can stand', () => {
    expect(b[a.spawn.ty][a.spawn.tx]).toBe(false);
    expect(open.size).toBeGreaterThan(20);
  });

  it('has doors you can reach that lead somewhere you can stand', () => {
    for (const p of a.portals) {
      const dest = getArea(p.to);
      const destBlocked = blocked.get(p.to) as boolean[][];
      expect(destBlocked[p.targetTy]?.[p.targetTx], `${id} -> ${p.to} lands on a wall`).toBe(false);
      expect(dest.portals.some((q) => q.to === id), `${p.to} has no way back to ${id}`).toBe(true);
      let standable = false;
      for (let y = p.ty; y < p.ty + p.h; y++) for (let x = p.tx; x < p.tx + p.w; x++) if (open.has(`${x},${y}`)) standable = true;
      expect(standable, `${id} door to ${p.to} cannot be walked to`).toBe(true);
    }
  });

  it('lets you reach everything you can use', () => {
    for (const o of a.objects) {
      if (!o.interact || o.requiresUpgrade) continue;
      let ok = false;
      for (let y = o.ty - 1; y <= o.ty + o.h; y++) for (let x = o.tx - 1; x <= o.tx + o.w; x++) if (open.has(`${x},${y}`)) ok = true;
      expect(ok, `${id}: cannot walk up to ${o.interact}`).toBe(true);
    }
  });

  it('puts every villager within talking distance', () => {
    for (const n of a.npcs) {
      // shopkeepers stand behind their counter, so two tiles of reach is fair
      expect(near(open, n.tx, n.ty, n.opens ? 2 : 1), `${id}: cannot talk to ${n.id}`).toBe(true);
    }
  });
});

describe('the journey', () => {
  it('points every task at a spot the player can get to', () => {
    const world = newWorld(Date.now(), 1);
    for (const chapter of CHAPTERS) {
      for (const task of chapter.tasks) {
        // some tasks pick their spot from the save, so ask them with a fresh world
        const target = typeof task.guide === 'function' ? task.guide(world) : task.guide;
        if (!target) continue;
        const open = walkable.get(target.area) as Set<string>;
        expect(near(open, target.tx, target.ty), `${task.id} guides to an unreachable spot`).toBe(true);
      }
    }
  });

  it('keeps every area on the map', () => {
    for (const id of ids) expect(getArea(id).id).toBe(id);
  });
});
