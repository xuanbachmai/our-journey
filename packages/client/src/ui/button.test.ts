import { beforeEach, describe, expect, it, vi } from 'vitest';
import { button, saveFontKey, refreshFontConfig } from './text';

/**
 * A label that will not fit its button must step down in whole pixel sizes.
 * It must never be scaled by a fraction: a pixel face squeezed to 0.6 puts its
 * stems between pixels, and "Story" came out on screen reading "Slury".
 */

interface FakeText {
  text: string;
  width: number;
  scaleX: number;
  fontSize: number;
  setOrigin(): FakeText;
  setText(s: string): FakeText;
  setFontSize(n: number): FakeText;
  setScale(n: number): FakeText;
  setPosition(): FakeText;
  active: boolean;
  scene: object;
}

function fakeScene() {
  const texts: FakeText[] = [];
  const chain = (): Record<string, () => unknown> =>
    new Proxy({}, { get: () => () => chain() }) as Record<string, () => unknown>;
  const scene = {
    add: {
      graphics: () => chain(),
      zone: () => ({ setInteractive: () => ({ on: () => undefined }) }),
      container: (_x: number, _y: number, _c: unknown[]) => ({ setAlpha: () => undefined }),
      text(_x: number, _y: number, label: string, style: { fontSize?: string }) {
        const t: FakeText = {
          text: label,
          scaleX: 1,
          fontSize: parseInt(String(style.fontSize ?? '8'), 10),
          active: true,
          scene: {},
          get width() {
            // a monospaced pixel face: one cell per character
            return this.text.length * this.fontSize;
          },
          setOrigin: () => t,
          setText(s: string) {
            t.text = s;
            return t;
          },
          setFontSize(n: number) {
            t.fontSize = n;
            return t;
          },
          setScale(n: number) {
            t.scaleX = n;
            return t;
          },
          setPosition: () => t,
        };
        texts.push(t);
        return t;
      },
    },
    time: { delayedCall: () => undefined },
  };
  return { scene, texts };
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });
  saveFontKey('pressstart');
  refreshFontConfig();
});

describe('button labels', () => {
  it('never scales a label by a fraction', () => {
    const { scene, texts } = fakeScene();
    // "Hide" at 8px needs 32px; this button offers 20px of room
    button(scene as never, 0, 0, 26, 13, 'Hide', () => undefined);
    expect(texts[0].scaleX).toBe(1);
  });

  it('steps the size down in whole pixels until the label fits', () => {
    const { scene, texts } = fakeScene();
    // "Story" needs 40px at 8px and the button offers 39: one step down fits.
    button(scene as never, 0, 0, 45, 13, 'Story', () => undefined);
    const t = texts[0];
    expect(Number.isInteger(t.fontSize)).toBe(true);
    expect(t.fontSize).toBe(7);
    expect(t.width).toBeLessThanOrEqual(45 - 6);
  });

  it('stops shrinking before the label stops being readable', () => {
    const { scene, texts } = fakeScene();
    // far too long for the space: it bottoms out rather than vanishing
    button(scene as never, 0, 0, 20, 13, 'An extremely long label', () => undefined);
    expect(texts[0].fontSize).toBeGreaterThanOrEqual(7);
    expect(texts[0].scaleX).toBe(1);
  });

  it('re-fits when the label is changed later', () => {
    const { scene, texts } = fakeScene();
    const b = button(scene as never, 0, 0, 80, 13, 'Ok', () => undefined);
    expect(texts[0].fontSize).toBe(8);
    b.setLabel('A much longer label than before');
    expect(texts[0].fontSize).toBeLessThan(8);
    expect(texts[0].scaleX).toBe(1);
  });
});
