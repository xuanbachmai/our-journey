import { CROPS, type CropId } from './crops';
import { ITEMS, type GoodId, type ItemId } from './items';

/**
 * Machines are the part of the farm you plan rather than tap. You load one
 * with something you grew, walk away, and it hands back something worth two or
 * three times as much. They keep working while nobody is playing, which is the
 * whole point: an evening of farming pays out over the next day.
 */

export type MachineId = 'mill' | 'press' | 'kettle' | 'juicer' | 'loom';

export interface MachineDef {
  id: MachineId;
  name: string;
  /** One line for the shop and the panel. */
  desc: string;
  price: number;
  /** What it makes. */
  output: GoodId;
  /** What it will take, in the order the panel lists them. */
  accepts: ItemId[];
  /** How long one batch takes. */
  minutes: number;
  /** How many batches it can have running at once, per machine owned. */
  slots: number;
  icon: string;
  /** Reputation before the store will sell it. */
  unlockRep: number;
}

export const MACHINES: Record<MachineId, MachineDef> = {
  mill: {
    id: 'mill',
    name: 'Little mill',
    desc: 'Wheat into flour, quickly',
    price: 700,
    output: 'flour',
    accepts: ['crop:wheat'],
    minutes: 45,
    slots: 2,
    icon: 'mill',
    unlockRep: 0,
  },
  kettle: {
    id: 'kettle',
    name: 'Jam kettle',
    desc: 'Berries into jam',
    price: 1100,
    output: 'jam',
    accepts: ['crop:strawberry', 'crop:blueberry', 'berry'],
    minutes: 150,
    slots: 1,
    icon: 'kettle',
    unlockRep: 8,
  },
  juicer: {
    id: 'juicer',
    name: 'Juice press',
    desc: 'Vegetables into bottled juice',
    price: 950,
    output: 'juice',
    accepts: ['crop:tomato', 'crop:carrot', 'crop:potato'],
    minutes: 120,
    slots: 2,
    icon: 'juicer',
    unlockRep: 6,
  },
  press: {
    id: 'press',
    name: 'Cheese press',
    desc: 'Milk into a wheel of cheese',
    price: 1400,
    output: 'cheese',
    accepts: ['milk', 'goat_milk'],
    minutes: 210,
    slots: 1,
    icon: 'press',
    unlockRep: 12,
  },
  loom: {
    id: 'loom',
    name: 'Loom',
    desc: 'Wool into warm cloth',
    price: 1700,
    output: 'cloth',
    accepts: ['wool'],
    minutes: 300,
    slots: 1,
    icon: 'loom',
    unlockRep: 16,
  },
};

export const MACHINE_IDS: MachineId[] = ['mill', 'juicer', 'kettle', 'press', 'loom'];

/** The most of any one machine the farm has room for. */
export const MAX_MACHINES = 3;
/** Finished goods pile up at the machine; past this it waits to be emptied. */
export const MAX_READY = 24;

export interface MachineJob {
  input: ItemId;
  startedAt: number;
  doneAt: number;
}

export interface MachineState {
  /** How many of this machine stand on the farm. */
  count: number;
  jobs: MachineJob[];
  /** Finished goods waiting to be collected. */
  ready: number;
}

export type MachineBook = Partial<Record<MachineId, MachineState>>;

export function machineCount(m: MachineBook | undefined, id: MachineId): number {
  return m?.[id]?.count ?? 0;
}

/** Batches this farm can run at once for a machine. */
export function machineSlots(m: MachineBook | undefined, id: MachineId): number {
  return machineCount(m, id) * MACHINES[id].slots;
}

export function machineFree(m: MachineBook | undefined, id: MachineId): number {
  return Math.max(0, machineSlots(m, id) - (m?.[id]?.jobs.length ?? 0));
}

/** The machine that will take this item, if any. Used by the barn hand and the panel. */
export function machineFor(item: ItemId): MachineId | null {
  for (const id of MACHINE_IDS) if (MACHINES[id].accepts.includes(item)) return id;
  return null;
}

/**
 * What one batch is worth over simply selling the input. Shown in the panel so
 * the choice between selling now and waiting is an honest one.
 */
export function machineMargin(id: MachineId, input: ItemId): number {
  return ITEMS[MACHINES[id].output].sellPrice - ITEMS[input].sellPrice;
}

/** Coins per hour a machine earns on top of selling the raw item. */
export function machineRate(id: MachineId, input: ItemId): number {
  return (machineMargin(id, input) * 60) / MACHINES[id].minutes;
}

/** Crops this machine can take, for the shop blurb. */
export function machineCrops(id: MachineId): CropId[] {
  return MACHINES[id].accepts.filter((i) => i.startsWith('crop:')).map((i) => i.slice(5) as CropId).filter((c) => CROPS[c]);
}
