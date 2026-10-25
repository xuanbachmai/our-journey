import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newWorld } from '@hh/shared';
import { isWorldFullForDevice, MAX_WORLD_PLAYERS, Net, seatCount, shouldDeliverNote } from './net';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

describe('realtime note delivery', () => {
  it('only notifies the addressed player', () => {
    const note = { to_player: 'qd' as const };

    expect(shouldDeliverNote(note, 'qd')).toBe(true);
    expect(shouldDeliverNote(note, 'xb')).toBe(false);
  });
});

describe('world creation, max 2 players, and 1-world-per-device lock', () => {
  it('creates a world with a 6-character code and locks the device to that 1 world until deleted', async () => {
    const dev1 = new Net();
    const code1 = await dev1.createWorld(newWorld(1000, 1));
    expect(code1).toMatch(/^[A-Z0-9]{6}$/);
    expect(dev1.boundWorldCode).toBe(code1);

    // Cannot create a second world on the same device without deleting the first
    const secondAttempt = await dev1.createWorld(newWorld(2000, 2));
    expect(secondAttempt).toBeNull();

    // Claiming seat locks pairing to code1
    expect(await dev1.claimSeat(code1!, 'xb')).toBe('ok');
    expect(dev1.pairing).toEqual({ code: code1, player: 'xb' });

    // Still cannot create or join another world while bound
    expect(await dev1.createWorld(newWorld(3000, 3))).toBeNull();
    expect(await dev1.claimSeat('OTHER1', 'qd')).toBe('locked');

    // Deleting the world unlocks the device to create a new world with a new code
    expect(await dev1.deleteWorld()).toBe(true);
    expect(dev1.boundWorldCode).toBeNull();
    const code2 = await dev1.createWorld(newWorld(4000, 4));
    expect(code2).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('allows max 2 people to join a world and rejects a 3rd device', async () => {
    expect(MAX_WORLD_PLAYERS).toBe(2);
    const dev1 = new Net();
    const code = (await dev1.createWorld(newWorld(1000, 1)))!;
    expect(await dev1.claimSeat(code, 'xb')).toBe('ok');

    // Simulate 2nd device on the same shared world store
    localStorage.setItem('oj-device', 'device-2');
    localStorage.removeItem('oj-pairing');
    localStorage.removeItem('oj-pending-world');
    const dev2 = new Net();
    expect(await dev2.claimSeat(code, 'xb')).toBe('taken');
    expect(await dev2.claimSeat(code, 'qd')).toBe('ok');

    const w = await dev2.fetchWorld(code);
    expect(seatCount(w?.seats)).toBe(2);
    expect(isWorldFullForDevice(w?.seats, 'device-3')).toBe(true);
    expect(isWorldFullForDevice(w?.seats, dev1.deviceId)).toBe(false);

    // Simulate 3rd device trying to join the full world
    localStorage.setItem('oj-device', 'device-3');
    localStorage.removeItem('oj-pairing');
    localStorage.removeItem('oj-pending-world');
    const dev3 = new Net();
    expect(await dev3.claimSeat(code, 'xb')).toBe('full');
    expect(await dev3.claimSeat(code, 'qd')).toBe('full');
  });
});
