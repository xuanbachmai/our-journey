import { describe, expect, it } from 'vitest';
import { contractDone, contractExpired, dueLabel, makeContract, MAX_ACTIVE_CONTRACTS } from './contracts';
import { HANDS, HAND_IDS, handDaysLeft, handWorking, hireCost, HIRE_DAYS } from './hands';
import { ITEMS } from './items';
import { MACHINES, MACHINE_IDS, machineFor, machineFree, machineMargin, machineRate, MAX_READY } from './machines';
import { isRipe } from './growth';
import { dayIndex } from './prices';
import { give, loadMachines, newWorld, simulateWorld } from './world';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe('machines', () => {
  it('always pays better than selling the raw thing', () => {
    for (const id of MACHINE_IDS) {
      for (const input of MACHINES[id].accepts) {
        expect(machineMargin(id, input), `${id} loses money on ${input}`).toBeGreaterThan(0);
      }
    }
  });

  it('sends each raw item to exactly one machine', () => {
    const seen = new Map<string, string>();
    for (const id of MACHINE_IDS) {
      for (const input of MACHINES[id].accepts) {
        expect(seen.has(input), `${input} is taken by both ${seen.get(input)} and ${id}`).toBe(false);
        seen.set(input, id);
      }
      expect(machineFor(MACHINES[id].accepts[0])).toBe(id);
    }
    expect(machineFor('seed:wheat')).toBe(null);
  });

  it('keeps the slower machines worth more per hour than nothing', () => {
    for (const id of MACHINE_IDS) expect(machineRate(id, MACHINES[id].accepts[0])).toBeGreaterThan(1);
  });

  it('turns a loaded batch into a good while nobody is playing', () => {
    const w = newWorld(Date.now(), 11);
    w.machines = { mill: { count: 1, jobs: [], ready: 0 } };
    give(w, 'crop:wheat', 3);

    expect(loadMachines(w, w.lastSimulatedAt)).toBe(2); // one mill, two slots
    expect(w.inventory['crop:wheat']).toBe(1);
    expect(machineFree(w.machines, 'mill')).toBe(0);

    const soon = simulateWorld(w, w.lastSimulatedAt + 10 * MIN);
    expect(soon.world.machines?.mill?.ready ?? 0, 'flour should not be ready yet').toBe(0);

    const later = simulateWorld(w, w.lastSimulatedAt + 60 * MIN);
    expect(later.world.machines?.mill?.ready).toBe(2);
    expect(later.world.machines?.mill?.jobs).toHaveLength(0);
    expect(later.events.some((e) => e.type === 'crafted')).toBe(true);
  });

  it('holds finished batches on the machine when the shelf is full', () => {
    const w = newWorld(Date.now(), 19);
    const at = w.lastSimulatedAt;
    w.machines = { mill: { count: 1, jobs: [], ready: MAX_READY - 1 } };
    w.machines.mill!.jobs = [
      { input: 'crop:wheat', startedAt: at, doneAt: at + 1000 },
      { input: 'crop:wheat', startedAt: at, doneAt: at + 2000 },
    ];

    const after = simulateWorld(w, at + 10 * MIN).world;
    const mill = after.machines?.mill;
    expect(mill?.ready).toBe(MAX_READY);
    // the second batch is still sitting there, not thrown away
    expect(mill?.jobs).toHaveLength(1);
    expect(mill?.jobs[0].doneAt).toBe(at + 2000);
  });

  it('does not start a batch it has no room or input for', () => {
    const w = newWorld(Date.now(), 12);
    w.machines = { press: { count: 1, jobs: [], ready: 0 } };
    expect(loadMachines(w, w.lastSimulatedAt)).toBe(0);
    give(w, 'milk', 5);
    expect(loadMachines(w, w.lastSimulatedAt)).toBe(1);
    expect(loadMachines(w, w.lastSimulatedAt)).toBe(0);
    expect(w.inventory.milk).toBe(4);
  });
});

describe('hired help', () => {
  it('charges a week up front', () => {
    for (const id of HAND_IDS) expect(hireCost(id)).toBe(HANDS[id].wage * HIRE_DAYS);
  });

  it('knows who is still on the books', () => {
    const today = 100;
    const hands = { water: today + 2 };
    expect(handWorking(hands, 'water', today)).toBe(true);
    expect(handWorking(hands, 'water', today + 3)).toBe(false);
    expect(handWorking(hands, 'barn', today)).toBe(false);
    expect(handDaysLeft(hands, 'water', today)).toBe(3);
    expect(handDaysLeft(hands, 'barn', today)).toBe(0);
  });

  it('waters the field on a morning nobody logs in', () => {
    const now = Date.now();
    const w = newWorld(now, 13);
    const key = '0,0';
    w.plots[key] = { tilled: true, crop: 'pumpkin', stage: 0, progress: 0, wateredUntil: now };
    w.hands = { water: dayIndex(now) + 5 };

    const dry = simulateWorld({ ...w, hands: {} }, now + 2 * DAY);
    const wet = simulateWorld(w, now + 2 * DAY);
    expect(isRipe(wet.world.plots[key]), 'the waterer should have brought it in').toBe(true);
    expect(isRipe(dry.world.plots[key]), 'a dry field should not grow itself').toBe(false);
    expect(wet.events.some((e) => e.type === 'hand' && e.hand === 'water')).toBe(true);
  });

  it('empties the barn into the bag', () => {
    const now = Date.now();
    const w = newWorld(now, 14);
    w.producers.chicken = { count: 2, anchor: now, waiting: 0 };
    w.hands = { barn: dayIndex(now) + 5 };

    const after = simulateWorld(w, now + 2 * DAY);
    expect(after.world.inventory.egg ?? 0).toBeGreaterThan(0);
    expect(after.events.some((e) => e.type === 'hand' && e.hand === 'barn')).toBe(true);
  });

  it('reloads the machines from what the barn hand brought in', () => {
    const now = Date.now();
    const w = newWorld(now, 15);
    w.machines = { mill: { count: 1, jobs: [], ready: 0 } };
    give(w, 'crop:wheat', 6);
    w.hands = { tend: dayIndex(now) + 5 };

    const after = simulateWorld(w, now + 2 * DAY);
    expect(after.world.machines?.mill?.ready ?? 0).toBeGreaterThan(0);
    expect((after.world.inventory['crop:wheat'] ?? 0)).toBeLessThan(6);
  });

  it('stops working the day the wages run out', () => {
    const now = Date.now();
    const w = newWorld(now, 16);
    w.producers.chicken = { count: 2, anchor: now, waiting: 0 };
    w.hands = { barn: dayIndex(now) - 1 };

    const after = simulateWorld(w, now + 2 * DAY);
    expect(after.world.inventory.egg ?? 0).toBe(0);
    expect(after.world.producers.chicken?.waiting ?? 0).toBeGreaterThan(0);
  });
});

describe('shipping contracts', () => {
  it('offers the same board to both players', () => {
    const a = makeContract(42, 3, 10, 100);
    const b = makeContract(42, 3, 10, 100);
    expect(a).toEqual(b);
  });

  it('pays well over the counter price', () => {
    for (let i = 0; i < 40; i++) {
      const c = makeContract(7, i, 20, 100);
      expect(c.qty).toBeGreaterThan(0);
      expect(c.reward).toBeGreaterThan(ITEMS[c.item].sellPrice * c.qty);
      expect(c.dueDay).toBeGreaterThan(100);
    }
  });

  it('keeps the dear things off the board until the farm can make them', () => {
    for (let i = 0; i < 40; i++) {
      const c = makeContract(5, i, 0, 100);
      expect(ITEMS[c.item].sellPrice, `${c.item} is too rich for a new farm`).toBeLessThanOrEqual(60);
    }
  });

  it('knows when one is finished and when it has run out of time', () => {
    const c = makeContract(1, 1, 10, 100);
    expect(contractDone(c)).toBe(false);
    expect(contractExpired(c, 100)).toBe(false);
    expect(contractExpired(c, c.dueDay + 1)).toBe(true);
    expect(contractExpired({ ...c, done: c.qty }, c.dueDay + 1)).toBe(false);
    expect(dueLabel(c, c.dueDay)).toBe('today');
    expect(dueLabel(c, c.dueDay - 1)).toBe('tomorrow');
  });

  it('clears one that ran out of time, and says so', () => {
    const now = Date.now();
    const w = newWorld(now, 17);
    const c = makeContract(w.seed, 1, 5, dayIndex(now) - 5);
    w.activeContracts = [c];

    const after = simulateWorld(w, now + MIN);
    expect(after.world.activeContracts).toHaveLength(0);
    expect(after.events.some((e) => e.type === 'contract_expired')).toBe(true);
  });

  it('fills the board and keeps it to a sensible size', () => {
    const w = newWorld(Date.now(), 18);
    expect(w.contracts?.length).toBe(3);
    expect(MAX_ACTIVE_CONTRACTS).toBeLessThan(3);
  });
});
