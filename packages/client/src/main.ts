import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { HudScene } from './scenes/HudScene';
import { MiniGameScene } from './scenes/MiniGameScene';
import { TitleScene } from './scenes/TitleScene';

const BASE_W = 320;
const BASE_H = 180;

let game: Phaser.Game | null = null;
let fellBack = false;
let useTimer = false;
const fitAfterOrientation = () => window.setTimeout(fit, 100);

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
  });
  return g;
}

/** Integer zoom, and the internal resolution grows to fill the screen so there is no letterbox. */
function fit() {
  if (!game) return;
  // keep the HUD clear of phone notches and the home indicator
  const s = getComputedStyle(document.documentElement);
  const inset = (name: string) => parseFloat(s.getPropertyValue(name)) || 0;
  const w = window.innerWidth - inset("--sal") - inset("--sar");
  const h = window.innerHeight - inset("--sat") - inset("--sab");
  // hidden or collapsed views report 0; keep the last good size instead of shrinking to nothing
  if (w < 50 || h < 50) return;
  const zoom = Math.max(1, Math.floor(Math.min(w / BASE_W, h / BASE_H)));
  const gw = Math.ceil(w / zoom);
  const gh = Math.ceil(h / zoom);
  game.scale.setZoom(zoom);
  game.scale.resize(gw, gh);
}

/**
 * Some embedded browsers fail to create Phaser's WebGL render targets at boot.
 * If that happens, rebuild the game on the Canvas renderer, which is fine for a
 * 320x180 pixel-art game.
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
