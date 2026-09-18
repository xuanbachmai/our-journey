import type { AreaId } from '@hh/shared';
import { buildFarm } from './farm';
import { buildForest } from './forest';
import { buildHome, buildFurnshop, buildPetshop, buildQdHome, buildRestaurant, buildStore, buildTailor, buildXbHome } from './interiors';
import { buildLane } from './lane';
import { buildRanch } from './ranch';
import { buildTown } from './town';
import type { AreaDef } from './types';

const cache = new Map<AreaId, AreaDef>();

const builders: Record<AreaId, () => AreaDef> = {
  farm: buildFarm,
  town: buildTown,
  forest: buildForest,
  ranch: buildRanch,
  lane: buildLane,
  qdhome: buildQdHome,
  xbhome: buildXbHome,
  home: buildHome,
  restaurant: buildRestaurant,
  store: buildStore,
  tailor: buildTailor,
  petshop: buildPetshop,
  furnshop: buildFurnshop,
};

/** Areas are deterministic, so each is generated once and reused. */
export function getArea(id: AreaId): AreaDef {
  let a = cache.get(id);
  if (!a) {
    a = builders[id]();
    cache.set(id, a);
  }
  return a;
}

export type { AreaDef } from './types';
