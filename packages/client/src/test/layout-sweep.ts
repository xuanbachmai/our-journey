/**
 * Dev-only layout check. Not imported by the game, so it never ships.
 *
 * Opens every panel and tab in the HUD and reports two kinds of fault, using
 * Phaser's own world bounds so a panel shrunk to fit the screen is measured
 * as drawn:
 *   COLLIDE - two pieces of text drawn on top of each other
 *   SPILL   - a label wider than the button or tab it sits in
 *
 * With the dev server running, in the browser console:
 *   const m = await import('/src/test/layout-sweep.ts'); await m.sweep();
 * Run it at a phone size and a laptop size after changing a font or a panel.
 */
import type Phaser from 'phaser';

type Box = { t: string; x: number; y: number; w: number; h: number };
type Hud = Phaser.Scene & Record<string, (...a: unknown[]) => void> & { overlay: Phaser.GameObjects.Container | null };

function glyphBox(o: Phaser.GameObjects.Text): Box {
  const b = o.getBounds();
  const pad = ((o.style as unknown as { padding?: { x?: number; left?: number } }).padding ?? {});
  const scale = o.parentContainer ? o.parentContainer.getWorldTransformMatrix().scaleX : 1;
  const px = (pad.x ?? pad.left ?? 0) * scale;
  return { t: o.text.replace(/\n/g, '/').slice(0, 24), x: b.x + px, y: b.y, w: b.width - 2 * px, h: b.height };
}

export function check(root: Phaser.GameObjects.GameObject[]): string[] {
  const texts: Box[] = [];
  const zones: Phaser.Geom.Rectangle[] = [];
  const walk = (list: Phaser.GameObjects.GameObject[]) => {
    for (const o of list) {
      if (o.type === 'Container') {
        const c = o as Phaser.GameObjects.Container;
        if (c.visible) walk(c.list);
        continue;
      }
      if (o.type === 'Text') {
        const t = o as Phaser.GameObjects.Text;
        if (t.text.trim() && t.visible && t.alpha > 0.05) texts.push(glyphBox(t));
      }
      if (o.type === 'Zone') {
        const z = o as Phaser.GameObjects.Zone;
        if (z.input?.enabled) zones.push(z.getBounds());
      }
    }
  };
  walk(root);
  const hits: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1.5 && oy > 3) hits.push(`COLLIDE "${a.t}" x "${b.t}"`);
    }
  }
  for (const t of texts) {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const z = zones.find((z) => Math.abs(z.x + z.width / 2 - cx) < 2 && cy > z.y && cy < z.y + z.height);
    if (z && t.w > z.width - 1) hits.push(`SPILL "${t.t}" ${t.w.toFixed(0)}>${z.width.toFixed(0)}`);
  }
  return hits;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Every state of the title screen, drawn directly from local data - nothing is
 * created on the server. Run while the title screen is showing:
 *   const m = await import('/src/test/layout-sweep.ts'); await m.sweepTitle();
 */
export async function sweepTitle(): Promise<string> {
  const game = (window as unknown as { __game: Phaser.Game }).__game;
  const shared = (window as unknown as { __shared: { newWorld: (n: number) => unknown } }).__shared;
  const t = game.scene.getScene('Title') as unknown as Record<string, (...a: unknown[]) => void> & Phaser.Scene;
  const w = shared.newWorld(Date.now());
  const W = game.scale.width;
  const H = game.scale.height;
  const states: [string, () => void][] = [
    ['menu', () => t.showMenu(false)],
    ['menu, retry', () => t.showMenu(true)],
    ['pick, new world', () => t.showPick('ABC123', { xb: null, qd: null }, w)],
    ['pick, xb taken', () => t.showPick('ABC123', { xb: { device: 'other' }, qd: null }, w)],
    ['paired world', () => t.showBoundWorld('ABC123', 'qd', { xb: null, qd: { device: 'me' } }, w)],
    ['paired world, both in', () => t.showBoundWorld('ABC123', 'qd', { xb: { device: 'a' }, qd: { device: 'b' } }, w, true)],
  ];
  const out: string[] = [];
  for (const [name, show] of states) {
    show();
    await wait(150);
    const hits = check(t.children.list);
    // and nothing may leave the screen
    const walk = (list: Phaser.GameObjects.GameObject[]) => {
      for (const o of list) {
        if (o.type === 'Container') walk((o as Phaser.GameObjects.Container).list);
        else if (o.type === 'Text') {
          const b = (o as Phaser.GameObjects.Text).getBounds();
          if ((o as Phaser.GameObjects.Text).visible && (b.left < -1 || b.right > W + 1 || b.top < -1 || b.bottom > H + 1))
            hits.push(`OFFSCREEN "${(o as Phaser.GameObjects.Text).text.slice(0, 24)}"`);
        }
      }
    };
    walk(t.children.list);
    if (hits.length) out.push(`${name}: ${hits.join(' ; ')}`);
  }
  return out.length ? `${W}x${H}:\n${out.join('\n')}` : `${W}x${H}: title clean - ${states.length} states`;
}

export async function sweep(): Promise<string> {
  const game = (window as unknown as { __game: Phaser.Game }).__game;
  const shared = (window as unknown as { __shared: { newWorld: (n: number) => unknown } }).__shared;
  // a local world with no pairing: nothing here is ever saved to the server
  if (!game.scene.isActive('Hud')) {
    (game.scene.getScene('Title') as unknown as { start: (p: string, w: unknown) => void }).start('qd', shared.newWorld(Date.now()));
    for (let i = 0; i < 30 && !game.scene.isActive('Hud'); i++) await wait(400);
    await wait(1200);
  }
  const h = game.scene.getScene('Hud') as Hud;
  const out: string[] = [];
  const go = async (name: string, open: () => void) => {
    try {
      h.closeOverlay();
      await wait(80);
      open();
      await wait(350);
      const hits = check(h.overlay ? h.overlay.list : h.children.list);
      if (hits.length) out.push(`${name}: ${hits.slice(0, 4).join(' ; ')}${hits.length > 4 ? ` (+${hits.length - 4})` : ''}`);
    } catch (e) {
      out.push(`${name}: threw ${String((e as Error).message).slice(0, 50)}`);
    }
  };
  for (const tab of ['journey', 'today', 'farm', 'us', 'album', 'stats', 'settings']) await go(`journal/${tab}`, () => h.openJournal(tab));
  for (const p of ['openBag', 'openMap', 'openRecipes', 'openCounter', 'openBoard', 'openLoveTree', 'openSeedMaker', 'openStore', 'openStall']) await go(p, () => h[p]());
  for (const t of ['seeds', 'tools', 'upgrades', 'sell']) await go(`stall/${t}`, () => h.openStall(t));
  for (const k of ['looks', 'top', 'hat', 'accessory', 'dye', 'hair']) await go(`clothes/${k}`, () => h.openClothes('buy', k));
  for (const k of ['animals', 'build']) await go(`petshop/${k}`, () => h.openPetshop(k));
  await go('furnshop', () => h.openFurnshop('living'));
  for (let p = 0; p < 8; p++) await go(`help ${p}`, () => h.openHelp(p));
  h.closeOverlay();
  // The opening controls hint sits over the next-step card for its nine
  // seconds by design (drawn on top, taps pass through). Check the HUD it
  // leaves behind, not that.
  const hint = /^(WASD|left side)/;
  for (let i = 0; i < 25; i++) {
    const showing = h.children.list.some((o) => o.type === 'Text' && hint.test((o as Phaser.GameObjects.Text).text) && (o as Phaser.GameObjects.Text).alpha > 0.05);
    if (!showing) break;
    await wait(500);
  }
  await go('HUD', () => undefined);
  const size = `${game.scale.width}x${game.scale.height}`;
  return out.length ? `${size}:\n${out.join('\n')}` : `${size}: clean - no collisions, no spills`;
}
