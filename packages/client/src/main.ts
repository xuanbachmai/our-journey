import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { HudScene } from './scenes/HudScene';
import { MiniGameScene } from './scenes/MiniGameScene';
import { TitleScene } from './scenes/TitleScene';

const BASE_W = 420;
const BASE_H = 240;
/** The narrowest view we will scale up to: menus are drawn about this wide. */
const MIN_W = 360;

let game: Phaser.Game | null = null;
let fellBack = false;
let useTimer = false;
const fitAfterOrientation = () => window.setTimeout(fit, 100);
let refitTries = 0;

function createGame(type: number) {
  const g = new Phaser.Game({
    type,
    parent: 'game',
    width: BASE_W,
    height: BASE_H,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: '#7ecbff',
    scale: { mode: Phaser.Scale.NONE, autoRound: true },
    input: { activePointers: 3 },
    fps: { forceSetTimeOut: useTimer, target: 60 },
    scene: [BootScene, TitleScene, WorldScene, HudScene, MiniGameScene],
  });
  g.events.once('ready', () => {
    if (game !== g) return;
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fitAfterOrientation);
    // coming back from the background or the bfcache gives no resize event
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) fit();
    });
    window.addEventListener('pageshow', fit);
  });
  return g;
}

/**
 * Keep the logical game grid spacious (~420x240) while upscaling the physical canvas
 * backing buffer to native screen pixels. Sprites and tiles keep gl.NEAREST
 * pixel-art edges, while 4x supersampled Text renders at full native resolution.
 */
function applyHiRes(g: Phaser.Game, gw: number, gh: number, zoom: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const hiRes = Math.max(2, Math.min(6, Math.ceil(zoom * dpr)));
  const pw = gw * hiRes;
  const ph = gh * hiRes;
  const renderer = g.renderer as Phaser.Renderer.WebGL.WebGLRenderer | Phaser.Renderer.Canvas.CanvasRenderer | undefined;
  if (!renderer || !g.canvas) return;

  if (renderer.type === Phaser.WEBGL) {
    const r = renderer as Omit<Phaser.Renderer.WebGL.WebGLRenderer, 'drawingBufferHeight'> & {
      __hiRes?: number;
      __hiResPatched?: boolean;
      drawingBufferHeight: number;
      defaultScissor: number[];
    };
    r.__hiRes = hiRes;
    if (g.canvas.width !== pw || g.canvas.height !== ph) {
      g.canvas.width = pw;
      g.canvas.height = ph;
    }
    if (!r.__hiResPatched) {
      r.__hiResPatched = true;
      r.resetViewport = function (this: typeof r) {
        const gl = this.gl;
        if (!gl) return;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.drawingBufferHeight = gl.drawingBufferHeight;
      };
      r.setScissor = function (
        this: typeof r,
        x: number,
        y: number,
        width: number,
        height: number,
      ) {
        const gl = this.gl;
        if (!gl) return;
        const s = this.__hiRes || 1;
        const current = this.currentScissor;
        let shouldSet = width > 0 && height > 0;
        if (current && shouldSet) {
          shouldSet = current[0] !== x || current[1] !== y || current[2] !== width || current[3] !== height;
        }
        if (shouldSet) {
          this.flush();
          const dbh = gl.drawingBufferHeight;
          gl.scissor(
            Math.round(x * s),
            Math.round(dbh - (y + height) * s),
            Math.round(width * s),
            Math.round(height * s),
          );
        }
      };
      r.on(Phaser.Renderer.Events.PRE_RENDER_CLEAR, () => {
        const gl = r.gl;
        if (!gl) return;
        gl.viewport(0, 0, r.canvas.width, r.canvas.height);
        gl.scissor(0, 0, r.canvas.width, r.canvas.height);
        r.drawingBufferHeight = gl.drawingBufferHeight;
      });
    }
    r.width = gw;
    r.height = gh;
    r.setProjectionMatrix(gw, gh);
    r.resetViewport();
    r.defaultScissor[0] = 0;
    r.defaultScissor[1] = 0;
    r.defaultScissor[2] = gw;
    r.defaultScissor[3] = gh;
    r.gl?.scissor(0, 0, pw, ph);
  }
}

/** Integer zoom, and the internal resolution grows to fill the screen so there is no letterbox. */
function fit() {
  if (!game) return;
  // keep the HUD clear of phone notches and the home indicator
  const s = getComputedStyle(document.documentElement);
  const inset = (name: string) => parseFloat(s.getPropertyValue(name)) || 0;
  const w = window.innerWidth - inset("--sal") - inset("--sar");
  const h = window.innerHeight - inset("--sat") - inset("--sab");
  // A page restored from the background reports a window of nothing. Keep the
  // last good size rather than shrinking to a dot, and ask again shortly: no
  // resize event follows when such a tab is simply brought to the front, and
  // without this it would sit at the boot size with the scenery half drawn.
  if (w < 50 || h < 50) {
    if (refitTries < 25) {
      refitTries++;
      window.setTimeout(fit, 200);
    }
    return;
  }
  refitTries = 0;
  // Pick the zoom from the height, so the world is always about a screenful
  // tall and menus always have generous vertical & horizontal breathing room.
  const zoom = Math.max(1, Math.min(Math.floor(h / BASE_H), Math.floor(w / MIN_W)));
  const gw = Math.ceil(w / zoom);
  const gh = Math.ceil(h / zoom);
  game.scale.setZoom(zoom);
  game.scale.resize(gw, gh);
  applyHiRes(game, gw, gh, zoom);
}

/**
 * Some embedded browsers fail to create Phaser's WebGL render targets at boot.
 * If that happens, rebuild the game on the Canvas renderer, which is fine for a
 * pixel-art game.
 */
window.addEventListener('error', (e) => {
  const msg = String(e.error?.message ?? e.message ?? '');
  if (!/Framebuffer status|WebGL/i.test(msg)) return;
  e.preventDefault();
  if (fellBack || !game) return;
  fellBack = true;
  console.warn('WebGL renderer failed to boot, falling back to Canvas:', msg);
  window.removeEventListener('resize', fit);
  window.removeEventListener('orientationchange', fitAfterOrientation);
  const old = game;
  game = null;
  try {
    old.destroy(true);
  } catch {
    /* ignore */
  }
  document.getElementById('game')!.innerHTML = '';
  game = createGame(Phaser.CANVAS);
});

/** Some webviews never fire requestAnimationFrame; Phaser can drive its loop with timers instead. */
function probeAnimationFrame(): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    requestAnimationFrame(() => {
      done = true;
      resolve(true);
    });
    setTimeout(() => !done && resolve(false), 400);
  });
}

document.addEventListener('contextmenu', (e) => e.preventDefault());
Object.defineProperty(window, '__game', { get: () => game });

void probeAnimationFrame().then((ok) => {
  // ?timer=1 forces the timer loop (useful for automated tests in hidden panes)
  useTimer = !ok || new URLSearchParams(window.location.search).get('timer') === '1';
  if (useTimer) console.warn('requestAnimationFrame is not firing; using a timer-driven game loop');
  game = createGame(Phaser.AUTO);
});

// dev-only hooks for automated play tests
if (import.meta.env.DEV) {
  void Promise.all([import('./areas'), import('@hh/shared')]).then(([areas, shared]) => {
    Object.assign(window, { __getArea: areas.getArea, __shared: shared });
  });
}

// Offline play once installed. Development always runs live code, never a cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => reg.update())
      .catch(() => undefined);
  });
}
