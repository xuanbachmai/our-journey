import { describe, expect, it } from 'vitest';
import { shouldDeliverNote } from './net';

describe('realtime note delivery', () => {
  it('only notifies the addressed player', () => {
    const note = { to_player: 'qd' as const };

    expect(shouldDeliverNote(note, 'qd')).toBe(true);
    expect(shouldDeliverNote(note, 'xb')).toBe(false);
  });
});
