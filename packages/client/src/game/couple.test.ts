import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newWorld } from '@hh/shared';
import { GameState, MAX_PENDING_GIFTS } from './state';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

const fresh = () => new GameState(newWorld(Date.now(), 1));

describe('gifts for your partner', () => {
  it('moves an item out of the bag and back into the other player\'s', () => {
    const st = fresh();
    st.add('crop:tomato', 2);

    expect(st.wrapGift('crop:tomato', 'for you')).toBe(true);
    expect(st.count('crop:tomato')).toBe(1);
    expect(st.giftsWaiting).toHaveLength(1);
    expect(st.giftsForMe).toHaveLength(0);

    // the partner opens it
    st.me = 'qd';
    const waiting = st.giftsForMe;
    expect(waiting).toHaveLength(1);
    const got = st.openGift(waiting[0].id);
    expect(got?.msg).toBe('for you');
    expect(st.count('crop:tomato')).toBe(2);
    expect(st.world.giftBox).toHaveLength(0);
  });

  it('wraps dishes and furniture too, and refuses what you do not have', () => {
    const st = fresh();
    st.world.dishes.push({ recipe: 'bread', grade: 2 });
    st.world.furnitureOwned.chair = 1;

    expect(st.wrapGift('dish:bread:2', '')).toBe(true);
    expect(st.world.dishes).toHaveLength(0);
    expect(st.wrapGift('furn:chair', '')).toBe(true);
    expect(st.furnitureOwned('chair')).toBe(0);
    expect(st.wrapGift('crop:pumpkin', '')).toBe(false);
    expect(st.wrapGift('dish:bread:2', '')).toBe(false);

    st.me = 'qd';
    for (const g of [...st.giftsForMe]) st.openGift(g.id);
    expect(st.world.dishes).toEqual([{ recipe: 'bread', grade: 2 }]);
    expect(st.furnitureOwned('chair')).toBe(1);
  });

  it('stops after a pile of unopened gifts', () => {
    const st = fresh();
    st.add('crop:tomato', 50);
    for (let i = 0; i < MAX_PENDING_GIFTS; i++) expect(st.wrapGift('crop:tomato', '')).toBe(true);
    expect(st.wrapGift('crop:tomato', '')).toBe(false);
  });

  it('only the addressee can open a gift', () => {
    const st = fresh();
    st.add('crop:tomato', 1);
    st.wrapGift('crop:tomato', '');
    expect(st.openGift(st.giftsWaiting[0].id)).toBeNull();
  });
});

describe('photos', () => {
  it('remembers who was there and what they wore', () => {
    const st = fresh();
    st.setOutfit({ hat: 'straw' });
    const alone = st.takePhoto('fountain', false);
    expect(alone.outfits.xb?.hat).toBe('straw');
    expect(alone.outfits.qd).toBeUndefined();

    const both = st.takePhoto('lovetree', true);
    expect(both.together).toBe(true);
    expect(both.outfits.qd).toBeTruthy();
    expect(st.world.photos).toHaveLength(2);
    expect(st.world.stats.photos_together).toBe(1);
  });

  it('keeps the album from growing forever', () => {
    const st = fresh();
    for (let i = 0; i < 70; i++) st.takePhoto('ranch', false);
    expect(st.world.photos?.length).toBe(60);
  });
});

describe('partner news', () => {
  it('reports what the other player did since you last looked, once', () => {
    const st = fresh();
    st.me = 'qd';
    st.stat('harvest', 4);
    st.stat('cook');

    st.me = 'xb';
    expect(st.partnerNews()).toEqual([
      { key: 'harvest', n: 4 },
      { key: 'cook', n: 1 },
    ]);
    expect(st.partnerNews()).toEqual([]);

    st.me = 'qd';
    st.stat('harvest', 2);
    st.me = 'xb';
    expect(st.partnerNews()).toEqual([{ key: 'harvest', n: 2 }]);
  });

  it('does not report your own work back to you', () => {
    const st = fresh();
    st.stat('harvest', 3);
    expect(st.partnerNews()).toEqual([]);
  });
});
