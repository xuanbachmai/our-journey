import Phaser from 'phaser';
import {
  chickens,
  currentQuest,
  emptyPlot,
  GRADE_NAMES,
  gradeFor,
  growthFraction,
  isRipe,
  isWatered,
  RECIPES,
  WATER_DURATION_MS,
  type CropId,
  type Dish,
  type ItemId,
  type PlayerId,
  type Quest,
  type RecipeId,
  type UpgradeId,
  type WorldEvent,
} from '@hh/shared';
import { CUSTOMER_LOOKS, LOOKS } from '../art/characters';
import { P } from '../art/palette';
import { T, TILE, TILESET_KEY } from '../art/tiles';
import { Character } from '../entities/Character';
import { Chicken } from '../entities/Chicken';
import { Customer } from '../entities/Customer';
import { audio } from '../game/audio';
import { GameState, plotKey } from '../game/state';
import { generateWorld, type WorldDef } from '../game/worldgen';
import { style } from '../ui/text';
import type { MiniGameData } from './MiniGameScene';

export type ActionType = 'till' | 'plant' | 'water' | 'harvest' | 'shop' | 'mail' | 'cook' | 'counter' | 'coop' | 'fish' | 'none';

export interface Action {
  type: ActionType;
  label: string;
  enabled: boolean;
}

export interface HudData {
  coins: number;
  reputation: number;
  inventory: Partial<Record<ItemId, number>>;
  dishes: number;
  selectedSeed: CropId;
  action: Action | null;
  quest: { title: string; progress: number; target: number } | null;
}

export interface CookResult {
  recipe: RecipeId;
  grade: number;
  price: number;
  scores: number[];
}

interface CropView {
  sprite: Phaser.GameObjects.Image;
  spark?: Phaser.GameObjects.Sprite;
}

export class FarmScene extends Phaser.Scene {
  state!: GameState;
  world!: WorldDef;
  playerId: PlayerId = 'xb';
  player!: Character;
  companion!: Character;
  private farmLayer!: Phaser.Tilemaps.TilemapLayer;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private cropViews = new Map<string, CropView>();
  private cursor!: Phaser.GameObjects.Graphics;
  private joy = { x: 0, y: 0 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastTick = 0;
  private lastSave = 0;
  private lastHud = '';
  private companionTarget: { x: number; y: number } | null = null;
  private companionNext = 0;
  private companionManualUntil = 0;
  private mailBang?: Phaser.GameObjects.Text;
  private uiOpen = false;
  private customers: Customer[] = [];
  private customerQueue: boolean[] = [];
  private customerTex = 0;
  private hens: Chicken[] = [];
  private coopObjs: Phaser.GameObjects.GameObject[] = [];
  private sprinklerObjs: Phaser.GameObjects.GameObject[] = [];
  private flowerObjs: Phaser.GameObjects.GameObject[] = [];
  private counterDishes: Phaser.GameObjects.Image[] = [];
  private night!: Phaser.GameObjects.Rectangle;
  private fireflies: Phaser.GameObjects.Image[] = [];
  private eggBang?: Phaser.GameObjects.Text;
  private lastSprinkle = 0;
  private lastCustomerSpawn = 0;

  constructor() {
    super('Farm');
  }

  init(data: { player?: PlayerId }) {
    this.playerId = data.player ?? 'xb';
  }

  create() {
    this.state = new GameState();
    this.state.data.lastPlayer = this.playerId;
    this.state.save();
    audio.sfxOn = this.state.data.soundOn;
    audio.setMusic(this.state.data.musicOn);
    this.world = generateWorld();
    const { w, h } = this.world;

    this.cameras.main.setBackgroundColor(P.grassDark);
    this.cameras.main.fadeIn(300, 255, 244, 220);

    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: w, height: h });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE, TILE, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const ground = map.createBlankLayer('ground', tileset);
    if (!ground) throw new Error('layer missing');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ground.putTileAt(this.world.tiles[y][x], x, y);
    ground.setDepth(-20);
    this.ground = ground;
    const farmLayer = map.createBlankLayer('farm', tileset);
    if (!farmLayer) throw new Error('layer missing');
    farmLayer.setDepth(-10);
    this.farmLayer = farmLayer;

    for (const o of this.world.objects) {
      const px = o.tx * TILE;
      switch (o.type) {
        case 'tree': {
          const by = (o.ty + 2) * TILE;
          this.add.image(px, by, 'trees', o.variant).setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'house': {
          const by = (o.ty + 5) * TILE;
          this.add.image(px, by + 2, 'house').setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'stall': {
          const by = (o.ty + 2) * TILE;
          this.add.image(px, by, 'stall').setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'kitchen': {
          const by = (o.ty + 2) * TILE;
          this.add.image(px, by, 'kitchen').setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'counter': {
          const by = (o.ty + 1) * TILE;
          this.add.image(px, by + 2, 'counter').setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'fence': {
          const by = (o.ty + 1) * TILE;
          this.add.image(px, by, 'fence', o.variant).setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'bush': {
          const by = (o.ty + 1) * TILE;
          this.add.image(px, by, 'bushes', o.variant).setOrigin(0, 1).setDepth(by - 2);
          break;
        }
        case 'mailbox': {
          const by = (o.ty + 1) * TILE;
          this.add.image(px, by, 'mailbox').setOrigin(0, 1).setDepth(by - 2);
          if (!this.state.data.seenLetter) {
            this.mailBang = this.add.text(px + 8, by - 26, '!', style({ color: P.yellow })).setOrigin(0.5, 1).setDepth(9999);
            this.tweens.add({ targets: this.mailBang, y: by - 30, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
          break;
        }
      }
    }

    const other: PlayerId = this.playerId === 'xb' ? 'qd' : 'xb';
    const collision = { isBlocked: (tx: number, ty: number) => this.isBlocked(tx, ty) };
    this.player = new Character(this, `char-${this.playerId}`, LOOKS[this.playerId].name, this.world.spawn.tx * TILE + 8, this.world.spawn.ty * TILE + 14, collision);
    this.companion = new Character(this, `char-${other}`, LOOKS[other].name, this.world.companionAnchor.tx * TILE + 8, this.world.companionAnchor.ty * TILE + 14, collision);

    this.cameras.main.setBounds(0, 0, w * TILE, h * TILE);
    this.cameras.main.startFollow(this.player.sprite, true, 1, 1);
    this.cameras.main.setRoundPixels(true);

    this.cursor = this.add.graphics().setDepth(-5);
    this.tweens.add({ targets: this.cursor, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

    this.night = this.add.rectangle(0, 0, 10, 10, 0x1a2a6a, 0).setOrigin(0).setScrollFactor(0).setDepth(20000);
    this.scale.on('resize', () => this.layoutNight());
    this.layoutNight();

    const kb = this.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.keys = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on('keydown-SPACE', () => this.doAction());
      kb.on('keydown-E', () => this.doAction());
      kb.on('keydown-ENTER', () => this.companionAction());
      const seeds: CropId[] = ['tomato', 'carrot', 'wheat', 'strawberry'];
      ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.selectSeed(seeds[i])));
      kb.on('keydown', () => audio.unlock());
    }
    this.input.on('pointerdown', () => audio.unlock());

    this.syncCrops();
    this.applyUpgrades();
    this.syncCounter();
    this.spawnButterflies();

    if (this.state.away) {
      const a = this.state.away;
      this.time.delayedCall(700, () => this.events.emit('away', a));
    }

    const saveNow = () => this.state.save();
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveNow());
    this.events.once('shutdown', () => window.removeEventListener('pagehide', saveNow));
  }

  // ---------- world queries ----------

  isBlocked(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) return true;
    return this.world.blocked[ty][tx];
  }

  isUiOpen() {
    return this.uiOpen;
  }

  setJoystick(x: number, y: number) {
    this.joy.x = x;
    this.joy.y = y;
  }

  setUiOpen(v: boolean) {
    this.uiOpen = v;
    if (v) this.joy = { x: 0, y: 0 };
  }

  selectSeed(id: CropId) {
    this.state.selectedSeed = id;
    audio.play('blip');
    this.pushHud(true);
  }

  private near(tx: number, ty: number, tw: number, th: number, ch: Character) {
    const px = ch.tileX;
    const py = ch.tileY;
    return px >= tx - 1 && px <= tx + tw && py >= ty - 1 && py <= ty + th;
  }

  currentAction(ch: Character = this.player): Action | null {
    const w = this.world;
    if (this.near(w.stall.tx, w.stall.ty, 3, 2, ch)) return { type: 'shop', label: 'Shop', enabled: true };
    if (this.near(w.mailbox.tx, w.mailbox.ty, 1, 1, ch)) return { type: 'mail', label: 'Mail', enabled: true };
    if (this.near(w.kitchen.tx, w.kitchen.ty, 3, 2, ch)) return { type: 'cook', label: 'Cook', enabled: true };
    if (this.near(w.counter.tx, w.counter.ty, 2, 2, ch)) return { type: 'counter', label: 'Counter', enabled: true };
    if (this.state.upgradeLevel('coop') > 0 && this.near(w.coop.tx, w.coop.ty, 3, 2, ch)) {
      const eggs = this.state.world.eggsWaiting;
      return eggs > 0 ? { type: 'coop', label: `Eggs ${eggs}`, enabled: true } : { type: 'none', label: chickens(this.state.world) ? 'No eggs' : 'No hens', enabled: false };
    }

    const { tx, ty } = ch.facingTile;
    const d = ch.dir();
    // the rod reaches one tile past the shore, so you can fish from the sand rim
    if (this.world.tiles[ty]?.[tx] === T.WATER || this.world.tiles[ty + d.y]?.[tx + d.x] === T.WATER) {
      return this.state.upgradeLevel('rod') > 0 ? { type: 'fish', label: 'Fish', enabled: true } : { type: 'none', label: 'Need rod', enabled: false };
    }
    if (!this.world.farm.has(plotKey(tx, ty))) return null;
    const p = this.state.plot(tx, ty);
    const now = Date.now();
    const sprinkler = this.state.upgradeLevel('sprinkler') > 0;
    if (p.crop) {
      if (isRipe(p)) return { type: 'harvest', label: 'Harvest', enabled: true };
      if (!isWatered(p, now) && !sprinkler) return { type: 'water', label: 'Water', enabled: true };
      return { type: 'none', label: `${Math.round(growthFraction(p) * 100)}%`, enabled: false };
    }
    if (p.tilled) {
      const seeds = this.state.count(`seed:${this.state.selectedSeed}`);
      if (seeds > 0) return { type: 'plant', label: 'Plant', enabled: true };
      return { type: 'none', label: 'No seeds', enabled: false };
    }
    return { type: 'till', label: 'Till', enabled: true };
  }

  doAction() {
    if (this.uiOpen) return;
    this.performAction(this.player);
  }

  companionAction() {
    if (this.uiOpen) return;
    this.companionManualUntil = this.time.now + 6000;
    this.performAction(this.companion);
  }

  private performAction(ch: Character) {
    if (ch.busy) return;
    const a = this.currentAction(ch);
    if (!a || !a.enabled) {
      if (a) audio.play('bad');
      return;
    }
    const { tx, ty } = ch.facingTile;
    const p = this.state.plot(tx, ty);
    const now = Date.now();
    const cx = tx * TILE + 8;
    const cy = ty * TILE + 8;
    switch (a.type) {
      case 'till':
        this.state.setPlot(tx, ty, { ...emptyPlot(), tilled: true });
        this.state.stat('till');
        this.puff(cx, cy, 'dust');
        audio.play('till');
        break;
      case 'plant': {
        const id = this.state.selectedSeed;
        this.state.add(`seed:${id}`, -1);
        this.state.setPlot(tx, ty, { ...p, crop: id, stage: 0, progress: 0 });
        this.state.stat('plant');
        this.pop(cx, cy, `seed-${id}`);
        audio.play('plant');
        break;
      }
      case 'water':
        this.state.setPlot(tx, ty, { ...p, wateredUntil: now + WATER_DURATION_MS });
        this.state.stat('water');
        this.puff(cx, cy, 'drop');
        audio.play('water');
        break;
      case 'harvest': {
        const id = p.crop as CropId;
        const qty = id === 'wheat' ? 2 : 1;
        this.state.add(`crop:${id}`, qty);
        this.state.setPlot(tx, ty, { ...emptyPlot(), tilled: true });
        this.state.stat('harvest', qty);
        this.state.stat(`harvest:${id}`, qty);
        this.pop(cx, cy, `crop-${id}`, `+${qty}`);
        audio.play('harvest');
        break;
      }
      case 'coop': {
        const n = this.state.collectEggs();
        this.pop(this.world.coop.tx * TILE + 24, this.world.coop.ty * TILE + 16, 'egg', `+${n}`);
        audio.play('harvest');
        this.eggBang?.destroy();
        this.eggBang = undefined;
        break;
      }
      case 'shop':
        audio.play('open');
        this.events.emit('openShop');
        return;
      case 'counter':
        audio.play('open');
        this.events.emit('openCounter');
        return;
      case 'cook':
        audio.play('open');
        this.events.emit('openRecipes');
        return;
      case 'fish':
        this.startFishing();
        return;
      case 'mail':
        this.state.data.seenLetter = true;
        this.state.touch();
        this.mailBang?.destroy();
        this.mailBang = undefined;
        audio.play('open');
        this.events.emit('openMail');
        return;
      default:
        return;
    }
    ch.bounce();
    ch.setBusy(220);
    this.syncCrops();
    this.afterChange();
  }

  /** Call after anything that changes the world: refresh HUD and check quests. */
  afterChange() {
    const q = this.state.checkQuest();
    if (q) this.questDone(q);
    this.pushHud(true);
  }

  private questDone(q: Quest) {
    audio.play('quest');
    this.events.emit('quest', q);
    // a quest reward may complete nothing further, but stats might chain
    const next = this.state.checkQuest();
    if (next) this.time.delayedCall(2500, () => this.questDone(next));
  }

  // ---------- cooking & fishing ----------

  cookLeniency() {
    return 1 + this.state.upgradeLevel('stove') * 0.3;
  }

  startCooking(id: RecipeId) {
    const r = RECIPES[id];
    for (const k in r.ingredients) if (this.state.count(k as ItemId) < (r.ingredients[k as ItemId] ?? 0)) return false;
    for (const k in r.ingredients) this.state.add(k as ItemId, -(r.ingredients[k as ItemId] ?? 0));
    // one icon per ingredient unit (max 5), so the plate step has something to do
    const icons: string[] = [];
    for (const k in r.ingredients) {
      const icon = k.startsWith('crop:') ? `crop-${k.slice(5)}` : k;
      for (let i = 0; i < (r.ingredients[k as ItemId] ?? 0) && icons.length < 5; i++) icons.push(icon);
    }
    this.setUiOpen(true);
    const data: MiniGameData = {
      title: r.name,
      steps: r.steps,
      leniency: this.cookLeniency(),
      ingredientIcons: icons,
      onDone: (scores) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const grade = gradeFor(avg);
        const dish: Dish = { recipe: id, grade };
        this.state.addDish(dish);
        this.state.stat('cook');
        this.state.stat(`cook:${GRADE_NAMES[grade]}`);
        this.state.stat(`cook:r:${id}`);
        audio.play(grade >= 2 ? 'great' : grade === 1 ? 'good' : 'bad');
        const result: CookResult = { recipe: id, grade, price: this.state.priceOf(dish), scores };
        this.events.emit('cookResult', result);
        this.afterChange();
      },
    };
    this.scene.launch('MiniGame', data);
    return true;
  }

  private startFishing() {
    this.setUiOpen(true);
    this.player.facing = this.player.facing;
    const data: MiniGameData = {
      title: 'Fishing',
      steps: ['reel'],
      leniency: 1 + this.state.upgradeLevel('stove') * 0.1,
      ingredientIcons: [],
      onDone: (scores) => {
        this.setUiOpen(false);
        if (scores[0] > 0) {
          this.state.add('fish', 1);
          this.state.stat('fish');
          this.pop(this.player.x, this.player.y - 10, 'fish', '+1');
          this.events.emit('toast', 'You caught a fish!');
        } else {
          this.events.emit('toast', 'The fish got away...');
        }
        this.afterChange();
      },
    };
    this.scene.launch('MiniGame', data);
  }

  purchaseUpgrade(id: UpgradeId): boolean {
    const ok = this.state.buyUpgrade(id);
    if (!ok) return false;
    audio.play('coin');
    this.applyUpgrades();
    this.afterChange();
    return true;
  }

  // ---------- upgrades rendering ----------

  private applyUpgrades() {
    const w = this.world;
    // coop
    if (this.state.upgradeLevel('coop') > 0 && this.coopObjs.length === 0) {
      const by = (w.coop.ty + 2) * TILE;
      this.coopObjs.push(this.add.image(w.coop.tx * TILE, by, 'coop').setOrigin(0, 1).setDepth(by - 2));
      for (const f of w.coop.fences) {
        const fy = (f.ty + 1) * TILE;
        this.coopObjs.push(this.add.image(f.tx * TILE, fy, 'fence', f.variant).setOrigin(0, 1).setDepth(fy - 2));
      }
      for (const b of w.coop.blocked) this.world.blocked[b.ty][b.tx] = true;
      for (let x = w.coop.pen.x; x < w.coop.pen.x + w.coop.pen.w; x++) for (let y = w.coop.pen.y; y < w.coop.pen.y + w.coop.pen.h; y++) this.ground.putTileAt(T.PATH, x, y);
    }
    const hens = chickens(this.state.world);
    while (this.hens.length < hens) this.hens.push(new Chicken(this, w.coop.pen));
    // sprinklers
    if (this.state.upgradeLevel('sprinkler') > 0 && this.sprinklerObjs.length === 0) {
      for (const s of w.sprinklers) {
        const sy = (s.ty + 1) * TILE;
        this.sprinklerObjs.push(this.add.image(s.tx * TILE, sy - 2, 'decor', 'sprinkler').setOrigin(0, 1).setDepth(sy + 1));
      }
    }
    // flower beds
    if (this.state.upgradeLevel('flowers') > 0 && this.flowerObjs.length === 0) {
      for (const f of w.flowerBeds) {
        const fy = (f.ty + 1) * TILE;
        this.flowerObjs.push(this.add.image(f.tx * TILE, fy, 'decor', 'flowerbed').setOrigin(0, 1).setDepth(fy - 3));
      }
    }
  }

  syncCounter() {
    this.counterDishes.forEach((d) => d.destroy());
    this.counterDishes = [];
    const w = this.world;
    const slots = this.state.world.counter;
    const bx = w.counter.tx * TILE;
    const by = w.counter.ty * TILE;
    slots.forEach((s, i) => {
      if (!s.dish) return;
      const img = this.add.image(bx + 5 + (i % 3) * 10, by + 4 - Math.floor(i / 3) * 3, 'icons', `dish-${s.dish.recipe}`).setDepth(by + TILE - 1);
      this.counterDishes.push(img);
    });
  }

  // ---------- effects ----------

  private puff(x: number, y: number, kind: 'dust' | 'drop') {
    for (let i = 0; i < 5; i++) {
      const s = kind === 'dust' ? this.add.image(x, y, 'fx', i % 2 ? 'dust0' : 'dust1') : this.add.image(x + (i - 2) * 3, y - 10, 'icons', 'drop').setScale(0.6);
      s.setDepth(y + 20);
      const ang = (i / 5) * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(ang) * 8,
        y: kind === 'dust' ? y + Math.sin(ang) * 5 - 4 : y + 2,
        alpha: 0,
        duration: kind === 'dust' ? 320 : 420,
        delay: i * 30,
        ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  pop(x: number, y: number, icon: string, text?: string) {
    const img = this.add.image(x, y - 4, 'icons', icon).setDepth(y + 30);
    this.tweens.add({ targets: img, y: y - 22, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, duration: 250, delay: 450, onComplete: () => img.destroy() });
    if (text) {
      const t = this.add.text(x + 9, y - 10, text, style({ color: P.yellow })).setOrigin(0, 1).setDepth(y + 31);
      this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    }
  }

  private spawnButterflies() {
    const { w, h } = this.world;
    for (let i = 0; i < 5; i++) {
      const b = this.add.sprite(Phaser.Math.Between(48, w * TILE - 48), Phaser.Math.Between(48, h * TILE - 48), 'fx', 'bf0-0').setDepth(5000);
      b.play(`bf${i % 3}`);
      const wander = () => {
        const nx = Phaser.Math.Clamp(b.x + Phaser.Math.Between(-60, 60), 40, w * TILE - 40);
        const ny = Phaser.Math.Clamp(b.y + Phaser.Math.Between(-40, 40), 40, h * TILE - 40);
        b.setFlipX(nx < b.x);
        this.tweens.add({ targets: b, x: nx, y: ny, duration: Phaser.Math.Between(1500, 3200), ease: 'Sine.easeInOut', onComplete: () => this.time.delayedCall(Phaser.Math.Between(200, 1500), wander) });
      };
      wander();
    }
    for (let i = 0; i < 8; i++) {
      const f = this.add.image(Phaser.Math.Between(48, w * TILE - 48), Phaser.Math.Between(48, h * TILE - 48), 'fx', 'firefly').setDepth(20001).setAlpha(0);
      this.fireflies.push(f);
      const drift = () => {
        this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-30, 30), y: f.y + Phaser.Math.Between(-20, 20), duration: Phaser.Math.Between(2000, 4000), ease: 'Sine.easeInOut', onComplete: drift });
      };
      drift();
    }
  }

  private layoutNight() {
    this.night.setSize(this.scale.width + 4, this.scale.height + 4);
  }

  private updateNight() {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    const MAX = 0.28;
    let a = 0;
    if (hour >= 21 || hour < 5) a = MAX;
    else if (hour >= 18) a = ((hour - 18) / 3) * MAX;
    else if (hour < 7) a = ((7 - hour) / 2) * MAX;
    this.night.setFillStyle(hour >= 17 && hour < 20 ? 0x7a3a6a : 0x1a2a6a, a);
    const glow = a > 0.2 ? (Math.sin(this.time.now / 300) + 1) / 2 : 0;
    this.fireflies.forEach((f, i) => f.setAlpha(a > 0.2 ? glow * (0.4 + ((i * 37) % 60) / 100) : 0));
  }

  // ---------- customers ----------

  private handleEvents(events: WorldEvent[], live: boolean) {
    let changed = false;
    for (const e of events) {
      if (e.type === 'sale' || e.type === 'customer_left') {
        changed = true;
        if (live && this.customerQueue.length < 4) this.customerQueue.push(e.type === 'sale');
      } else if (e.type === 'ripe') {
        if (live) this.events.emit('toast', 'A crop is ready!');
      } else if (e.type === 'eggs') {
        if (live && !this.eggBang) {
          const w = this.world;
          this.eggBang = this.add.text(w.coop.tx * TILE + 24, w.coop.ty * TILE - 6, '!', style({ color: P.yellow })).setOrigin(0.5, 1).setDepth(9999);
          this.tweens.add({ targets: this.eggBang, y: this.eggBang.y - 4, duration: 400, yoyo: true, repeat: -1 });
          audio.play('cluck');
        }
      }
    }
    if (changed) {
      this.syncCounter();
      this.afterChange();
    }
  }

  private spawnCustomer(bought: boolean) {
    const w = this.world;
    const look = CUSTOMER_LOOKS[this.customerTex++ % CUSTOMER_LOOKS.length];
    const road = w.roadY * TILE + 14;
    const path = [
      { x: w.customerEntry.tx * TILE + 8, y: road },
      { x: (w.counter.tx + 3) * TILE, y: road },
    ];
    const stop = { x: w.counter.tx * TILE + 16, y: road };
    const c = new Customer(this, `char-${look.id}`, path, stop, bought, () => {
      if (bought) {
        audio.play('coin');
        this.pop(w.counter.tx * TILE + 16, w.counter.ty * TILE + 4, 'coin', 'sold!');
      }
    });
    this.customers.push(c);
  }

  // ---------- crops ----------

  syncCrops() {
    const plots = this.state.world.plots;
    const now = Date.now();
    const sprinkler = this.state.upgradeLevel('sprinkler') > 0;
    const seen = new Set<string>();
    for (const key in plots) {
      const p = plots[key];
      const [tx, ty] = key.split(',').map(Number);
      if (p.tilled) this.farmLayer.putTileAt(isWatered(p, now) || (sprinkler && p.crop) ? T.WATERED : T.TILLED, tx, ty);
      else this.farmLayer.removeTileAt(tx, ty);
      if (!p.crop) continue;
      seen.add(key);
      const frame = `${p.crop}-${Math.min(3, p.stage)}`;
      let v = this.cropViews.get(key);
      if (!v) {
        const sprite = this.add.image(tx * TILE, (ty + 1) * TILE, 'crops', frame).setOrigin(0, 1).setDepth((ty + 1) * TILE - 6);
        sprite.setScale(0.6);
        this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.easeOut' });
        v = { sprite };
        this.cropViews.set(key, v);
      } else if (v.sprite.frame.name !== frame) {
        v.sprite.setFrame(frame);
        this.tweens.add({ targets: v.sprite, scaleY: 1.2, duration: 120, yoyo: true });
      }
      if (isRipe(p) && !v.spark) {
        v.spark = this.add.sprite(tx * TILE + 12, ty * TILE + 1, 'fx', 'spark0').setDepth(9000);
        v.spark.play('spark');
        this.tweens.add({ targets: v.spark, y: ty * TILE - 2, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (!isRipe(p) && v.spark) {
        v.spark.destroy();
        v.spark = undefined;
      }
    }
    for (const [key, v] of this.cropViews) {
      if (!seen.has(key)) {
        v.sprite.destroy();
        v.spark?.destroy();
        this.cropViews.delete(key);
      }
    }
  }

  // ---------- hud ----------

  pushHud(force = false) {
    const a = this.currentAction();
    const q = currentQuest(this.state.world);
    const quest = q ? { title: q.title, progress: Math.min(q.target, q.progress(this.state.world)), target: q.target } : null;
    const data: HudData = {
      coins: this.state.coins,
      reputation: this.state.reputation,
      inventory: this.state.world.inventory,
      dishes: this.state.world.dishes.length,
      selectedSeed: this.state.selectedSeed,
      action: a,
      quest,
    };
    const snapshot = JSON.stringify(data);
    if (!force && snapshot === this.lastHud) return;
    this.lastHud = snapshot;
    this.events.emit('hud', data);
  }

  // ---------- loop ----------

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50);
    let dx = this.joy.x;
    let dy = this.joy.y;
    if (!this.uiOpen && this.keys) {
      if (this.keys.A.isDown) dx -= 1;
      if (this.keys.D.isDown) dx += 1;
      if (this.keys.W.isDown) dy -= 1;
      if (this.keys.S.isDown) dy += 1;
    }
    if (this.uiOpen) dx = dy = 0;
    this.player.move(dx, dy, dt);
    this.updateCompanion(time, dt);
    this.player.update();
    this.companion.update();

    for (const c of this.customers) c.update(time, dt);
    this.customers = this.customers.filter((c) => !c.done);
    if (this.customerQueue.length && this.customers.length < 3 && time - this.lastCustomerSpawn > 1200) {
      this.lastCustomerSpawn = time;
      this.spawnCustomer(this.customerQueue.shift() as boolean);
    }
    for (const h of this.hens) h.update(time, dt);

    const a = this.currentAction();
    this.cursor.clear();
    if (a && ['till', 'plant', 'water', 'harvest', 'none', 'fish'].includes(a.type)) {
      const { tx, ty } = this.player.facingTile;
      this.cursor.lineStyle(1, a.enabled ? 0xffffff : 0xffe066, 1);
      this.cursor.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    }

    if (this.sprinklerObjs.length && time - this.lastSprinkle > 900) {
      this.lastSprinkle = time;
      const f = this.world.farmRect;
      const x = (f.x + Math.random() * f.w) * TILE;
      const y = (f.y + Math.random() * f.h) * TILE;
      const d = this.add.image(x, y, 'icons', 'drop').setScale(0.5).setDepth(y + 10).setAlpha(0.8);
      this.tweens.add({ targets: d, y: y + 6, alpha: 0, duration: 500, onComplete: () => d.destroy() });
    }

    if (time - this.lastTick > 1000) {
      this.lastTick = time;
      const events = this.state.tick(Date.now());
      this.syncCrops();
      this.handleEvents(events, true);
      this.updateNight();
    }
    if (time - this.lastSave > 5000) {
      this.lastSave = time;
      this.state.saveIfDirty();
    }
    this.pushHud();
  }

  private updateCompanion(time: number, dt: number) {
    let dx = 0;
    let dy = 0;
    if (!this.uiOpen && this.cursors) {
      if (this.cursors.left.isDown) dx -= 1;
      if (this.cursors.right.isDown) dx += 1;
      if (this.cursors.up.isDown) dy -= 1;
      if (this.cursors.down.isDown) dy += 1;
    }
    if (dx || dy) {
      this.companionManualUntil = time + 6000;
      this.companionTarget = null;
      this.companion.move(dx, dy, dt);
      return;
    }
    if (time < this.companionManualUntil) {
      this.companion.move(0, 0, dt);
      return;
    }
    if (!this.companionTarget && time > this.companionNext) {
      const a = this.world.companionAnchor;
      const tx = a.tx + Phaser.Math.Between(-3, 3);
      const ty = a.ty + Phaser.Math.Between(-2, 3);
      if (!this.isBlocked(tx, ty)) this.companionTarget = { x: tx * TILE + 8, y: ty * TILE + 14 };
      this.companionNext = time + Phaser.Math.Between(1500, 4000);
    }
    if (this.companionTarget) {
      const ddx = this.companionTarget.x - this.companion.x;
      const ddy = this.companionTarget.y - this.companion.y;
      if (Math.hypot(ddx, ddy) < 3) {
        this.companionTarget = null;
        this.companion.move(0, 0, dt);
      } else {
        const before = { x: this.companion.x, y: this.companion.y };
        this.companion.move(ddx, ddy, dt);
        if (Math.abs(before.x - this.companion.x) < 0.01 && Math.abs(before.y - this.companion.y) < 0.01) this.companionTarget = null;
      }
    } else {
      this.companion.move(0, 0, dt);
    }
  }
}
