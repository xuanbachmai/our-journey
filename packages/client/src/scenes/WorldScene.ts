import Phaser from 'phaser';
import {
  ANIMALS,
  AREAS,
  cropTotalSeconds,
  CHAPTERS,
  FISH,
  pickFish,
  villager,
  type FishId,
  currentChapter,
  currentQuest,
  guideFor,
  dinerIntervalS,
  emptyPlot,
  formatDuration,
  FURNITURE,
  GRADE_NAMES,
  gradeFor,
  growthFraction,
  isRipe,
  isSpecialDay,
  isWatered,
  ITEMS,
  otherPlayer,
  pickDinerOrder,
  RECIPES,
  serveValue,
  WATER_DURATION_MS,
  weatherFor,
  type AreaId,
  type CropId,
  type Dish,
  type FurnitureId,
  type ItemId,
  type PlayerId,
  type RecipeId,
  type UpgradeId,
  type Weather,
  type WorldEvent,
  type WorldState,
} from '@hh/shared';
import { getArea } from '../areas';
import type { AreaDef, AreaObject, InteractId } from '../areas/types';
import { buildCharacterTexture, CUSTOMER_LOOKS, FAMILY_LOOKS, LOOKS, SHOPKEEPER_LOOKS, type CharacterLook } from '../art/characters';
import { P } from '../art/palette';
import { T, TILE, TILESET_KEY } from '../art/tiles';
import { Character, type Facing } from '../entities/Character';
import { Critter } from '../entities/Critter';
import { Customer } from '../entities/Customer';
import { Diner } from '../entities/Diner';
import { Npc } from '../entities/Npc';
import { Pet } from '../entities/Pet';
import { audio } from '../game/audio';
import { net, type PosMsg } from '../game/net';
import { GameState, plotKey } from '../game/state';
import { style } from '../ui/text';
import type { MiniGameData } from './MiniGameScene';

export type ActionType = 'till' | 'plant' | 'water' | 'harvest' | 'fish' | 'talk' | 'serve' | 'pet' | 'forage' | 'place' | 'pickup' | InteractId | 'none';

export interface Action {
  type: ActionType;
  label: string;
  enabled: boolean;
  /** Extra info for the HUD, e.g. sign text or npc index. */
  ref?: number;
  text?: string;
}

export interface HudData {
  coins: number;
  reputation: number;
  inventory: Partial<Record<ItemId, number>>;
  dishes: number;
  dishCap: number;
  selectedSeed: CropId;
  action: Action | null;
  quest: { title: string; progress: number; target: number; chapter: number; hint: string } | null;
  area: AreaId;
  areaName: string;
  weather: Weather;
  partner: { id: PlayerId; online: boolean; area: AreaId | null } | null;
  online: boolean;
  decorate: { item: FurnitureId | null; mode: 'place' | 'pickup' | null } | null;
  special: string | null;
  loveDays: number;
}

export interface CookResult {
  recipe: RecipeId;
  grade: number;
  price: number;
  scores: number[];
  coop: boolean;
}

export interface WorldInit {
  player?: PlayerId;
  area?: AreaId;
  tx?: number;
  ty?: number;
  facing?: Facing;
  /** First entry after the title screen. */
  fresh?: boolean;
}

interface CropView {
  sprite: Phaser.GameObjects.Image;
  spark?: Phaser.GameObjects.Sprite;
}

interface CoopSession {
  recipe: RecipeId;
  initiator: PlayerId;
  waiters: Map<number, (score: number | null) => void>;
  received: Map<number, number>;
  accepted: boolean;
}

const POS_INTERVAL = 120;

export class WorldScene extends Phaser.Scene {
  state!: GameState;
  area!: AreaDef;
  areaId: AreaId = 'farm';
  playerId: PlayerId = 'xb';
  player!: Character;
  remote: Character | null = null;
  remoteTarget: { x: number; y: number; facing: Facing; moving: boolean } | null = null;
  remoteArea: AreaId | null = null;
  companion: Character | null = null;
  pet: Pet | null = null;
  remotePet: Pet | null = null;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private farmLayer!: Phaser.Tilemaps.TilemapLayer;
  private blocked: boolean[][] = [];
  private cropViews = new Map<string, CropView>();
  private cursor!: Phaser.GameObjects.Graphics;
  private joy = { x: 0, y: 0 };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastTick = 0;
  private lastSave = 0;
  private lastHud = '';
  private lastPos = 0;
  private lastPlaceSave = 0;
  private uiOpen = false;
  private customers: Customer[] = [];
  private customerQueue: boolean[] = [];
  private customerTex = 0;
  private lastCustomerSpawn = 0;
  private critters: Critter[] = [];
  private npcs: Npc[] = [];
  private diners: Diner[] = [];
  private nextDiner = 0;
  private dinerTex = 0;
  private forageSprites = new Map<string, Phaser.GameObjects.Image>();
  private furnitureSprites: Phaser.GameObjects.Image[] = [];
  private counterDishes: Phaser.GameObjects.Image[] = [];
  private objectSprites: { obj: AreaObject; img: Phaser.GameObjects.Image }[] = [];
  private night!: Phaser.GameObjects.Rectangle;
  private cloud!: Phaser.GameObjects.Rectangle;
  private fireflies: Phaser.GameObjects.Image[] = [];
  private rain: Phaser.GameObjects.Image[] = [];
  private weather: Weather = 'sunny';
  private inPortal = false;
  private transitioning = false;
  private decorate: { item: FurnitureId | null; mode: 'place' | 'pickup' | null; tx: number; ty: number; ghost?: Phaser.GameObjects.Image } = { item: null, mode: null, tx: 0, ty: 0 };
  private coop: CoopSession | null = null;
  private stateBroadcastTimer: number | null = null;
  private heartTimer = 0;
  private specialLabel: string | null = null;
  private lastSprinkle = 0;
  private netHandlers: [string, (p: unknown) => void][] = [];
  private fresh = false;
  private eggBang?: Phaser.GameObjects.Text;

  constructor() {
    super('World');
  }

  /** Phaser reuses the scene object between areas, so every per-visit field must be reset here. */
  private resetFields() {
    this.remote = null;
    this.remoteTarget = null;
    this.companion = null;
    this.pet = null;
    this.remotePet = null;
    this.cropViews = new Map();
    this.joy = { x: 0, y: 0 };
    this.lastTick = 0;
    this.lastSave = 0;
    this.lastHud = '';
    this.lastPos = 0;
    this.lastPlaceSave = 0;
    this.uiOpen = false;
    this.customers = [];
    this.customerQueue = [];
    this.lastCustomerSpawn = 0;
    this.critters = [];
    this.npcs = [];
    this.diners = [];
    this.nextDiner = 0;
    this.forageSprites = new Map();
    this.furnitureSprites = [];
    this.counterDishes = [];
    this.objectSprites = [];
    this.fireflies = [];
    this.rain = [];
    this.weather = 'sunny';
    this.inPortal = false;
    this.transitioning = false;
    this.decorate = { item: null, mode: null, tx: 0, ty: 0 };
    this.coop = null;
    this.heartTimer = 0;
    this.specialLabel = null;
    this.lastSprinkle = 0;
    this.eggBang = undefined;
    this.companionTarget = null;
    this.companionNext = 0;
    this.lastMoving = false;
    this.fireworkTimer = 0;
    this.guideMarker = undefined;
    this.guideWorld = null;
    this.lastGuideCheck = 0;
    this.lastEdgeSent = '';
  }

  init(data: WorldInit) {
    this.resetFields();
    this.playerId = data.player ?? this.registry.get('player') ?? 'xb';
    this.registry.set('player', this.playerId);
    this.fresh = !!data.fresh;
    const existing = this.registry.get('state') as GameState | undefined;
    if (!existing || data.fresh) {
      const initial = this.registry.get('initialWorld') as WorldState | undefined;
      this.state = new GameState(initial);
      this.registry.remove('initialWorld');
      this.registry.set('state', this.state);
    } else {
      this.state = existing;
    }
    this.state.me = this.playerId;
    const place = this.state.meData.place;
    this.areaId = data.area ?? (place?.area && AREAS[place.area] ? place.area : 'farm');
    this.area = getArea(this.areaId);
    this.spawnAt = data.tx !== undefined && data.ty !== undefined ? { x: data.tx * TILE + 8, y: data.ty * TILE + 14 } : place && place.area === this.areaId && !data.area ? { x: place.x, y: place.y } : { x: this.area.spawn.tx * TILE + 8, y: this.area.spawn.ty * TILE + 14 };
    this.spawnFacing = data.facing ?? 'down';
  }
  private spawnAt = { x: 0, y: 0 };
  private spawnFacing: Facing = 'down';

  create() {
    const a = this.area;
    this.blocked = a.blocked.map((r) => r.slice());
    this.state.data.lastPlayer = this.playerId;
    audio.sfxOn = this.state.data.soundOn;
    audio.setMusic(this.state.data.musicOn);
    this.cameras.main.setBackgroundColor(AREAS[this.areaId].outdoor ? P.grassDark : '#2a1a2f');
    this.cameras.main.fadeIn(250, 255, 244, 220);

    // ---- tiles ----
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: a.w, height: a.h });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE, TILE, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const ground = map.createBlankLayer('ground', tileset);
    if (!ground) throw new Error('layer missing');
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) ground.putTileAt(a.tiles[y][x], x, y);
    ground.setDepth(-20);
    this.ground = ground;
    const farmLayer = map.createBlankLayer('farm', tileset);
    if (!farmLayer) throw new Error('layer missing');
    farmLayer.setDepth(-10);
    this.farmLayer = farmLayer;

    // ---- objects ----
    for (const o of a.objects) this.addObject(o);
    this.applyUpgradeBlocks();

    // ---- me ----
    const look = LOOKS[this.playerId];
    const tex = buildCharacterTexture(this, look, this.state.outfit);
    const collision = { isBlocked: (tx: number, ty: number) => this.isBlocked(tx, ty) };
    this.player = new Character(this, tex, look.name, this.spawnAt.x, this.spawnAt.y, collision);
    this.player.face(this.spawnFacing);
    this.inPortal = this.portalAt(this.player.tileX, this.player.tileY) !== null;
    if (this.state.pet) {
      this.pet = new Pet(this, this.state.pet.type, this.state.pet.name, this.player.x - 12, this.player.y, this.player);
    }

    // ---- partner ----
    this.setupPartner(collision);

    // ---- camera ----
    this.cameras.main.setBounds(0, 0, a.w * TILE, a.h * TILE);
    this.cameras.main.startFollow(this.player.sprite, true, 1, 1);
    this.cameras.main.setRoundPixels(true);

    this.cursor = this.add.graphics().setDepth(-5);
    this.tweens.add({ targets: this.cursor, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

    this.night = this.add.rectangle(0, 0, 10, 10, 0x1a2a6a, 0).setOrigin(0).setScrollFactor(0).setDepth(20000);
    this.cloud = this.add.rectangle(0, 0, 10, 10, 0x6a7a9a, 0).setOrigin(0).setScrollFactor(0).setDepth(19999);
    this.scale.on('resize', this.layoutOverlays, this);
    this.layoutOverlays();

    // ---- input ----
    const kb = this.input.keyboard;
    if (kb) {
      this.cursors = kb.createCursorKeys();
      this.keys = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on('keydown-SPACE', () => this.doAction());
      kb.on('keydown-E', () => this.doAction());
      kb.on('keydown-ENTER', () => this.decorate.mode === 'place' && this.decoratePlace());
      kb.on('keydown-ESC', () => this.decorate.mode && this.stopDecorate());
      const seeds: CropId[] = ['wheat', 'carrot', 'tomato', 'strawberry', 'potato', 'corn', 'blueberry', 'pumpkin'];
      ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'].forEach((k, i) => kb.on(`keydown-${k}`, () => this.selectSeed(seeds[i])));
      kb.on('keydown', () => audio.unlock());
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (this.decorate.mode && !this.uiOpen) {
        const wp = this.cameras.main.getWorldPoint(p.x, p.y);
        this.decorateMoveTo(Math.floor(wp.x / TILE), Math.floor(wp.y / TILE));
      }
    });

    // ---- per-area content ----
    this.syncCrops();
    this.syncCounter();
    this.syncFurniture();
    this.syncForage();
    this.spawnCritters();
    this.spawnNpcs();
    this.spawnButterflies();
    this.updateLoveTree();
    this.setupSpecialDay();
    this.updateWeather(true);
    this.createGuide();

    // ---- first entry ----
    if (this.fresh) {
      this.state.markPlayedToday();
      if (this.state.away) {
        const away = this.state.away;
        this.time.delayedCall(700, () => this.events.emit('away', away));
      }
      this.time.delayedCall(1200, () => {
        for (const c of this.state.checkPostcards()) this.events.emit('postcard', c);
      });
    }
    if (this.state.discover(this.areaId)) {
      audio.play('quest');
      this.events.emit('toast', `Discovered ${AREAS[this.areaId].name}!`);
    }
    this.state.setPlace(this.areaId, this.player.x, this.player.y);

    // ---- sync ----
    this.setupNet();

    const saveNow = () => {
      this.state.setPlace(this.areaId, this.player.x, this.player.y);
      this.state.save();
      if (net.enabled) void net.saveNow(this.state.world);
    };
    const onHide = () => document.visibilityState === 'hidden' && saveNow();
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onHide);
    this.events.once('shutdown', () => {
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onHide);
      this.scale.off('resize', this.layoutOverlays, this);
      for (const [ev, h] of this.netHandlers) net.off(ev, h);
      this.netHandlers = [];
      this.state.onChange = null;
      if (this.stateBroadcastTimer) clearTimeout(this.stateBroadcastTimer);
      audio.setRain(false);
    });
    this.afterChange();
  }

  // ------------------------------------------------------------ objects

  private upgradeOwned(req: string | undefined): boolean {
    if (!req) return true;
    const [id, lvl] = req.split(':');
    return this.state.upgradeLevel(id as UpgradeId) >= (lvl ? Number(lvl) : 1);
  }

  private addObject(o: AreaObject) {
    if (!this.upgradeOwned(o.requiresUpgrade)) return;
    const by = (o.ty + o.h) * TILE + (o.dy ?? 0);
    const img = this.add.image(o.tx * TILE, by, o.key, o.frame).setOrigin(0, 1);
    img.setDepth(o.floor ? -15 : by - 2);
    this.objectSprites.push({ obj: o, img });
    if (o.blocked) for (let y = o.ty; y < o.ty + o.h; y++) for (let x = o.tx; x < o.tx + o.w; x++) if (this.blocked[y]?.[x] !== undefined) this.blocked[y][x] = true;
  }

  private applyUpgradeBlocks() {
    for (const ub of this.area.upgradeBlocks ?? []) {
      if (!this.upgradeOwned(ub.upgrade || undefined)) continue;
      for (const t of ub.tiles) if (this.blocked[t.ty]?.[t.tx] !== undefined) this.blocked[t.ty][t.tx] = true;
    }
    if (this.areaId === 'farm' && this.state.upgradeLevel('coop') > 0) {
      const pen = this.area.pens?.[0];
      if (pen) for (let x = pen.x; x < pen.x + pen.w; x++) for (let y = pen.y; y < pen.y + pen.h; y++) this.ground.putTileAt(T.PATH, x, y);
    }
    if (this.areaId === 'farm') {
      if (this.state.upgradeLevel('sprinkler') > 0) for (const s of this.area.sprinklers ?? []) this.add.image(s.tx * TILE, (s.ty + 1) * TILE - 2, 'props', 'sprinkler').setOrigin(0, 1).setDepth((s.ty + 1) * TILE + 1);
      if (this.state.upgradeLevel('flowers') > 0) for (const f of this.area.flowerBeds ?? []) this.add.image(f.tx * TILE, (f.ty + 1) * TILE, 'props', 'flowerbed').setOrigin(0, 1).setDepth((f.ty + 1) * TILE - 3);
    }
  }

  /** Re-add objects that an upgrade just unlocked (coop, hives, tables). */
  private refreshUpgradeObjects() {
    for (const o of this.area.objects) {
      if (!o.requiresUpgrade) continue;
      if (this.objectSprites.some((s) => s.obj === o)) continue;
      this.addObject(o);
    }
    this.applyUpgradeBlocks();
    this.spawnCritters();
  }

  isBlocked(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= this.area.w || ty >= this.area.h) return true;
    return this.blocked[ty][tx];
  }

  private portalAt(tx: number, ty: number) {
    return this.area.portals.find((p) => tx >= p.tx && tx < p.tx + p.w && ty >= p.ty && ty < p.ty + p.h) ?? null;
  }

  private nearObject(o: AreaObject, ch: Character) {
    const px = ch.tileX;
    const py = ch.tileY;
    return px >= o.tx - 1 && px <= o.tx + o.w && py >= o.ty - 1 && py <= o.ty + o.h;
  }

  // ------------------------------------------------------------ partner & net

  private setupPartner(collision: { isBlocked: (tx: number, ty: number) => boolean }) {
    const other = otherPlayer(this.playerId);
    if (!net.enabled || !net.pairing) {
      // solo mode: the other character keeps you company on the farm
      if (this.areaId === 'farm' && this.area.companionAnchor) {
        const look = LOOKS[other];
        const tex = buildCharacterTexture(this, look, this.state.world.players[other].outfit);
        this.companion = new Character(this, tex, look.name, this.area.companionAnchor.tx * TILE + 8, this.area.companionAnchor.ty * TILE + 14, collision);
      }
      return;
    }
    // online: show the partner where they were last seen in this area (asleep until they move)
    const place = this.state.world.players[other].place;
    this.remoteArea = place?.area ?? null;
    if (place && place.area === this.areaId) this.ensureRemote(place.x, place.y, 'down');
  }

  private ensureRemote(x: number, y: number, facing: Facing) {
    const other = otherPlayer(this.playerId);
    if (!this.remote) {
      const look = LOOKS[other];
      const tex = buildCharacterTexture(this, look, this.state.world.players[other].outfit);
      this.remote = new Character(this, tex, look.name, x, y, { isBlocked: () => false });
      const pet = this.state.world.players[other].pet;
      if (pet) this.remotePet = new Pet(this, pet.type, pet.name, x - 12, y, this.remote);
    } else {
      this.remote.setPosition(x, y);
    }
    this.remote.face(facing);
    this.remote.update();
    this.remoteTarget = { x, y, facing, moving: false };
  }

  private removeRemote() {
    this.remote?.destroy();
    this.remote = null;
    this.remotePet?.destroy();
    this.remotePet = null;
    this.remoteTarget = null;
  }

  private setupNet() {
    if (!net.enabled || !net.pairing) return;
    const on = (ev: string, h: (p: unknown) => void) => {
      net.on(ev, h);
      this.netHandlers.push([ev, h]);
    };
    on('pos', (p) => {
      const m = p as PosMsg;
      if (m.player === this.playerId) return;
      this.remoteArea = m.area;
      if (m.area !== this.areaId) {
        if (this.remote) this.removeRemote();
        return;
      }
      if (!this.remote) {
        this.ensureRemote(m.x, m.y, m.facing);
        return;
      }
      const other = otherPlayer(this.playerId);
      const tex = buildCharacterTexture(this, LOOKS[other], m.outfit);
      if (this.remote.texKey !== tex) this.remote.setTexture(tex);
      if (m.pet && !this.remotePet) this.remotePet = new Pet(this, m.pet.type as never, m.pet.name, m.x - 12, m.y, this.remote);
      if (!m.pet && this.remotePet) {
        this.remotePet.destroy();
        this.remotePet = null;
      }
      this.remoteTarget = { x: m.x, y: m.y, facing: m.facing, moving: m.moving };
    });
    on('state', (p) => {
      const m = p as { world: WorldState; from: PlayerId };
      if (m.from === this.playerId) return;
      if (m.world.changeCounter <= this.state.world.changeCounter) return;
      const myPlace = this.state.meData.place;
      const myDays = this.state.meData.daysPlayed;
      this.state.replaceWorld(m.world);
      // never let the partner's copy move me
      this.state.meData.place = myPlace;
      for (const d of myDays) if (!this.state.meData.daysPlayed.includes(d)) this.state.meData.daysPlayed.push(d);
      this.refreshFromState();
    });
    on('emote', (p) => {
      const m = p as { from: PlayerId; icon: string };
      if (m.from === this.playerId || !this.remote) return;
      this.remote.showBubble(m.icon);
      if (m.icon === 'heart' || m.icon === 'hug') this.heartBurst(this.remote.x, this.remote.y - 20);
    });
    on('coop', (p) => this.onCoopMessage(p as { kind: string; from: PlayerId; recipe?: RecipeId; index?: number; score?: number }));
    on('note', () => {
      audio.play('pop');
      this.events.emit('toast', `A new note from ${otherPlayer(this.playerId)} is in the mailbox!`);
      this.events.emit('notes');
    });
    on('ping', (p) => {
      const m = p as { kind: string };
      if (m.kind === 'answer') this.events.emit('toast', `${otherPlayer(this.playerId)} answered today's question`);
    });
    net.onPresence = (online) => {
      const other = otherPlayer(this.playerId);
      if (!online.has(other) && this.remote) this.removeRemote();
      this.pushHud(true);
    };
    this.state.onChange = (w) => {
      if (this.stateBroadcastTimer) clearTimeout(this.stateBroadcastTimer);
      this.stateBroadcastTimer = window.setTimeout(() => {
        this.stateBroadcastTimer = null;
        net.send('state', { world: w, from: this.playerId });
      }, 250);
      net.scheduleSave(w);
    };
    void net.connect(this.playerId).then(() => this.broadcastPos(true));
  }

  private broadcastPos(force = false) {
    if (!net.enabled || !net.pairing) return;
    const now = this.time.now;
    if (!force && now - this.lastPos < POS_INTERVAL) return;
    this.lastPos = now;
    const msg: PosMsg = {
      player: this.playerId,
      area: this.areaId,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      facing: this.player.facing,
      moving: this.player.moving,
      outfit: this.state.outfit,
      pet: this.state.pet ? { type: this.state.pet.type, name: this.state.pet.name } : null,
    };
    net.send('pos', msg);
  }

  /** After the partner's copy replaced ours. */
  refreshFromState() {
    this.syncCrops();
    this.syncCounter();
    this.syncFurniture();
    this.syncForage();
    this.refreshUpgradeObjects();
    this.updateLoveTree();
    const tex = buildCharacterTexture(this, LOOKS[this.playerId], this.state.outfit);
    if (this.player.texKey !== tex) this.player.setTexture(tex);
    this.pushHud(true);
  }

  get partnerOnline() {
    return net.enabled && net.online.has(otherPlayer(this.playerId));
  }

  emote(icon: string) {
    this.player.showBubble(icon);
    if (icon === 'heart' || icon === 'hug') this.heartBurst(this.player.x, this.player.y - 20);
    audio.play('pop');
    net.send('emote', { from: this.playerId, icon });
  }

  private heartBurst(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const h = this.add.image(x + Phaser.Math.Between(-8, 8), y, 'fx', 'heart').setDepth(30000);
      this.tweens.add({ targets: h, y: y - 18 - Phaser.Math.Between(0, 10), x: h.x + Phaser.Math.Between(-6, 6), alpha: 0, duration: 900 + i * 80, onComplete: () => h.destroy() });
    }
  }

  // ------------------------------------------------------------ co-op cooking

  private onCoopMessage(m: { kind: string; from: PlayerId; recipe?: RecipeId; index?: number; score?: number }) {
    if (m.from === this.playerId) return;
    if (m.kind === 'invite' && m.recipe) {
      this.events.emit('coopInvite', { from: m.from, recipe: m.recipe });
    } else if (m.kind === 'accept' && this.coop && this.coop.initiator === this.playerId) {
      this.coop.accepted = true;
      this.launchCoop();
    } else if (m.kind === 'decline') {
      if (this.coop) {
        this.coop = null;
        this.setUiOpen(false);
        this.events.emit('toast', `${m.from} is busy right now`);
      }
    } else if (m.kind === 'step' && this.coop && m.index !== undefined && m.score !== undefined) {
      this.coop.received.set(m.index, m.score);
      const w = this.coop.waiters.get(m.index);
      if (w) {
        w(m.score);
        this.coop.waiters.delete(m.index);
      }
    } else if (m.kind === 'cancel' && this.coop) {
      for (const w of this.coop.waiters.values()) w(null);
      this.coop = null;
    }
  }

  /** Invite the partner to cook this recipe together. */
  inviteCoop(recipe: RecipeId): boolean {
    if (!this.partnerOnline) return false;
    const r = RECIPES[recipe];
    for (const k in r.ingredients) if (this.state.count(k as ItemId) < (r.ingredients[k as ItemId] ?? 0)) return false;
    this.coop = { recipe, initiator: this.playerId, waiters: new Map(), received: new Map(), accepted: false };
    net.send('coop', { kind: 'invite', from: this.playerId, recipe });
    this.setUiOpen(true);
    this.events.emit('toast', `Waiting for ${otherPlayer(this.playerId)} to join...`);
    this.time.delayedCall(20000, () => {
      if (this.coop && !this.coop.accepted && this.coop.initiator === this.playerId) {
        this.coop = null;
        this.setUiOpen(false);
        this.events.emit('toast', 'No answer. Cook alone or try later.');
      }
    });
    return true;
  }

  acceptCoop(recipe: RecipeId, from: PlayerId) {
    this.coop = { recipe, initiator: from, waiters: new Map(), received: new Map(), accepted: true };
    net.send('coop', { kind: 'accept', from: this.playerId });
    this.launchCoop();
  }

  declineCoop() {
    net.send('coop', { kind: 'decline', from: this.playerId });
  }

  private launchCoop() {
    const c = this.coop;
    if (!c) return;
    const r = RECIPES[c.recipe];
    const initiator = c.initiator === this.playerId;
    if (initiator) for (const k in r.ingredients) this.state.add(k as ItemId, -(r.ingredients[k as ItemId] ?? 0));
    const mine = r.steps.map((_, i) => i).filter((i) => (i % 2 === 0) === initiator);
    this.setUiOpen(true);
    const data: MiniGameData = {
      title: `${r.name} together`,
      steps: r.steps,
      leniency: this.cookLeniency() + 0.15,
      ingredientIcons: this.ingredientIcons(c.recipe),
      mine,
      partnerName: otherPlayer(this.playerId),
      onStep: (index, score) => net.send('coop', { kind: 'step', from: this.playerId, index, score }),
      waitFor: (index) =>
        new Promise<number | null>((resolve) => {
          const got = c.received.get(index);
          if (got !== undefined) resolve(got);
          else c.waiters.set(index, resolve);
        }),
      onCancel: () => {
        this.coop = null;
        this.setUiOpen(false);
        this.events.emit('toast', 'Cooking together was cancelled');
      },
      onDone: (scores) => {
        this.coop = null;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const grade = gradeFor(Math.min(1, avg + 0.05));
        const dish: Dish = { recipe: c.recipe, grade };
        if (initiator) {
          this.state.addDish(dish);
          this.state.stat('cook');
          this.state.stat('coop');
          this.state.stat(`cook:${GRADE_NAMES[grade]}`);
          this.state.stat(`cook:r:${c.recipe}`);
          this.state.recordDishGrade(c.recipe, grade);
        }
        audio.play(grade >= 2 ? 'great' : 'good');
        this.heartBurst(this.player.x, this.player.y - 20);
        this.events.emit('cookResult', { recipe: c.recipe, grade, price: this.state.priceOf(dish), scores, coop: true } as CookResult);
        this.afterChange();
      },
    };
    this.scene.launch('MiniGame', data);
  }

  // ------------------------------------------------------------ hud helpers

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

  afterChange() {
    const events = this.state.checkProgress();
    if (events.length) {
      audio.play('quest');
      this.events.emit('progress', events);
      this.lastGuideCheck = 0;
    }
    for (const c of this.state.checkPostcards()) this.events.emit('postcard', c);
    this.pushHud(true);
  }

  pushHud(force = false) {
    const a = this.currentAction();
    const q = currentQuest(this.state.world);
    const other = otherPlayer(this.playerId);
    const data: HudData = {
      coins: this.state.coins,
      reputation: this.state.reputation,
      inventory: this.state.world.inventory,
      dishes: this.state.world.dishes.length,
      dishCap: this.state.dishCap,
      selectedSeed: this.state.selectedSeed,
      action: a,
      quest: q ? { title: q.title, progress: Math.min(q.target, q.progress(this.state.world)), target: q.target, chapter: CHAPTERS.indexOf(currentChapter(this.state.world) as never) + 1, hint: q.hint } : null,
      area: this.areaId,
      areaName: AREAS[this.areaId].name,
      weather: this.weather,
      partner: net.enabled && net.pairing ? { id: other, online: net.online.has(other), area: this.remoteArea } : null,
      online: net.enabled && !!net.pairing,
      decorate: this.decorate.mode ? { item: this.decorate.item, mode: this.decorate.mode } : null,
      special: this.specialLabel,
      loveDays: this.state.daysTogether,
    };
    const snapshot = JSON.stringify(data);
    if (!force && snapshot === this.lastHud) return;
    this.lastHud = snapshot;
    this.events.emit('hud', data);
  }

  // ------------------------------------------------------------ actions

  currentAction(ch: Character = this.player): Action | null {
    const a = this.area;
    if (this.decorate.mode === 'place') {
      const ok = this.decorate.item ? this.canPlace(this.decorate.item, this.decorate.tx, this.decorate.ty) : false;
      return { type: 'place', label: ok ? 'Place' : 'Blocked', enabled: ok };
    }
    if (this.decorate.mode === 'pickup') {
      const idx = this.furnitureIndexAt(this.decorate.tx, this.decorate.ty);
      return { type: 'pickup', label: idx >= 0 ? 'Pick up' : 'Nothing', enabled: idx >= 0, ref: idx };
    }
    // diners to serve
    for (let i = 0; i < this.diners.length; i++) {
      const d = this.diners[i];
      if (d.phase !== 'seated' || d.served) continue;
      if (Math.abs(d.ch.x - ch.x) < 22 && Math.abs(d.ch.y - ch.y) < 26) {
        const has = this.state.world.dishes.findIndex((x) => x.recipe === d.recipe);
        if (has >= 0) return { type: 'serve', label: 'Serve', enabled: true, ref: i };
        const any = this.state.world.dishes.length > 0;
        return { type: 'serve', label: any ? 'Serve other' : `Needs ${RECIPES[d.recipe].name}`, enabled: any, ref: i };
      }
    }
    // npcs
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i];
      if (Math.abs(n.ch.x - ch.x) < 22 && Math.abs(n.ch.y - ch.y) < 24) {
        return { type: 'talk', label: n.def.opens ? 'Shop' : 'Talk', enabled: true, ref: i };
      }
    }
    // interactable objects
    for (const { obj } of this.objectSprites) {
      if (!obj.interact || !this.nearObject(obj, ch)) continue;
      if (obj.interact === 'coop') {
        const w = this.state.waitingAt('farm', ['chicken']);
        const hens = this.state.animalCount('chicken');
        return w.length ? { type: 'coop', label: `Eggs ${w[0].count}`, enabled: true } : { type: 'none', label: hens ? 'No eggs yet' : 'No hens', enabled: false };
      }
      if (obj.interact === 'hives') {
        const w = this.state.waitingAt('farm', ['bee']);
        return w.length ? { type: 'hives', label: `Honey ${w[0].count}`, enabled: true } : { type: 'none', label: this.state.animalCount('bee') ? 'No honey yet' : 'No hives', enabled: false };
      }
      if (obj.interact === 'barn') {
        const w = this.state.waitingAt('ranch');
        const n = w.reduce((s, x) => s + x.count, 0);
        return n ? { type: 'barn', label: `Collect ${n}`, enabled: true } : { type: 'none', label: this.state.animalCount('cow') + this.state.animalCount('sheep') ? 'Nothing yet' : 'No animals', enabled: false };
      }
      return { type: obj.interact, label: obj.label ?? 'Use', enabled: true, text: obj.text };
    }
    // forage
    for (const f of a.forage) {
      if (Math.abs(ch.tileX - f.tx) <= 1 && Math.abs(ch.tileY - f.ty) <= 1 && this.state.forageAvailable(f.key, f.respawnMin)) {
        return { type: 'forage', label: 'Gather', enabled: true, text: f.key };
      }
    }
    // fishing
    const { tx, ty } = ch.facingTile;
    const d = ch.dir();
    if (a.tiles[ty]?.[tx] === T.WATER || a.tiles[ty + d.y]?.[tx + d.x] === T.WATER) {
      return this.state.upgradeLevel('rod') > 0 ? { type: 'fish', label: 'Fish', enabled: true } : { type: 'none', label: 'Need rod', enabled: false };
    }
    // field
    if (!a.farm?.has(plotKey(tx, ty))) return this.petAction(ch);
    const p = this.state.plot(tx, ty);
    const now = Date.now();
    const sprinkler = this.state.upgradeLevel('sprinkler') > 0;
    if (p.crop) {
      if (isRipe(p)) return { type: 'harvest', label: 'Harvest', enabled: true };
      if (!isWatered(p, now) && !sprinkler) return { type: 'water', label: 'Water', enabled: true };
      const left = cropTotalSeconds(p.crop) * (1 - growthFraction(p));
      return { type: 'none', label: formatDuration(left), enabled: false };
    }
    if (p.tilled) {
      const seeds = this.state.count(`seed:${this.state.selectedSeed}`);
      if (seeds > 0) return { type: 'plant', label: 'Plant', enabled: true };
      return { type: 'none', label: 'No seeds', enabled: false };
    }
    return { type: 'till', label: 'Till', enabled: true };
  }

  /**
   * Petting is the lowest-priority action and needs the player to face the pet.
   * The pet trots right behind you, so without this it would hide every other action.
   */
  private petAction(ch: Character): Action | null {
    const p = this.pet;
    const st = this.state.pet;
    if (!p || !st) return null;
    const dx = p.x - ch.x;
    const dy = p.y - ch.y;
    if (Math.hypot(dx, dy) > 22) return null;
    const d = ch.dir();
    if (dx * d.x + dy * d.y <= 0) return null;
    if (Date.now() - st.lastPetAt < 60_000) return null;
    return { type: 'pet', label: 'Pet', enabled: true };
  }

  doAction() {
    if (this.uiOpen) return;
    this.performAction(this.player);
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
        const qty = ITEMS[`crop:${id}`] ? (id === 'wheat' || id === 'potato' || id === 'blueberry' ? 2 : 1) : 1;
        this.state.add(`crop:${id}`, qty);
        this.state.setPlot(tx, ty, { ...emptyPlot(), tilled: true });
        this.state.stat('harvest', qty);
        this.state.stat(`harvest:${id}`, qty);
        this.pop(cx, cy, `crop-${id}`, `+${qty}`);
        audio.play('harvest');
        break;
      }
      case 'coop':
      case 'hives':
      case 'barn': {
        const got = this.state.collect(a.type === 'barn' ? 'ranch' : 'farm', a.type === 'coop' ? ['chicken'] : a.type === 'hives' ? ['bee'] : undefined);
        got.forEach((g, i) => this.time.delayedCall(i * 250, () => this.pop(ch.x, ch.y - 10, ITEMS[g.item].icon, `+${g.count}`)));
        audio.play(a.type === 'barn' ? 'moo' : a.type === 'hives' ? 'pop' : 'cluck');
        this.eggBang?.destroy();
        this.eggBang = undefined;
        break;
      }
      case 'forage': {
        const f = this.area.forage.find((x) => x.key === a.text);
        if (!f) return;
        const n = this.state.takeForage(f.key, f.item);
        this.pop(f.tx * TILE + 8, f.ty * TILE + 8, ITEMS[f.item].icon, `+${n}`);
        audio.play('harvest');
        this.syncForage();
        break;
      }
      case 'pet': {
        if (this.state.petPet()) {
          this.pet?.love();
          audio.play(this.state.pet?.type === 'dog' ? 'bark' : this.state.pet?.type === 'cat' ? 'meow' : 'pop');
        }
        break;
      }
      case 'talk': {
        const n = this.npcs[a.ref ?? -1];
        if (!n) return;
        n.facePlayer(ch.x, ch.y);
        if (n.def.opens) {
          audio.play('open');
          this.events.emit(n.def.opens === 'store' ? 'openStore' : n.def.opens === 'tailor' ? 'openTailor' : n.def.opens === 'furnshop' ? 'openFurnshop' : 'openPetshop');
        } else {
          audio.play('blip');
          const line = n.talk(this.playerId);
          const v = villager(n.def.id);
          if (v) {
            const r = this.state.talkVillager(v.id);
            this.events.emit('dialog', { name: n.ch.name, text: line, villager: { id: v.id, hearts: r.hearts, canGift: this.state.canGiftToday(v.id) } });
            this.friendFeedback(v.name, n, r.heartUp, r.hearts, r.rewards);
          } else this.events.emit('dialog', { name: n.ch.name, text: line });
          this.state.stat('talk');
          this.state.stat(`talk:${n.def.id}`);
          if (this.areaId === 'qdhome' || this.areaId === 'xbhome') this.state.stat(`talkfam:${n.def.id}`);
          this.afterChange();
        }
        return;
      }
      case 'serve': {
        const d = this.diners[a.ref ?? -1];
        if (!d) return;
        let idx = this.state.world.dishes.findIndex((x) => x.recipe === d.recipe);
        if (idx < 0) idx = 0;
        const dish = this.state.removeDish(idx);
        if (!dish) return;
        const v = serveValue(dish, this.state.reputation, this.state.cozyBonus + this.state.upgradeLevel('decor') * 0.08, d.patience, d.recipe);
        const match = dish.recipe === d.recipe;
        this.state.addCoins(v.paid + v.tip);
        this.state.addRep(v.rep);
        this.state.stat('served');
        this.state.stat('earned', v.paid + v.tip);
        if (match) this.state.stat('served:match');
        d.serve(match);
        this.pop(d.ch.x, d.ch.y - 10, 'coin', `+${v.paid}${v.tip ? ` +${v.tip} tip` : ''}`);
        audio.play(v.tip > 0 ? 'tip' : 'serve');
        break;
      }
      case 'place':
        this.decoratePlace();
        return;
      case 'pickup':
        this.decoratePickup();
        return;
      case 'fish':
        this.startFishing();
        return;
      case 'sign':
        audio.play('blip');
        this.events.emit('openSign', a.text ?? '');
        return;
      case 'mailbox':
        this.state.data.seenLetter = true;
        this.state.stat('mail');
        audio.play('open');
        this.events.emit('openMail');
        return;
      case 'stall':
        audio.play('open');
        this.events.emit('openStall');
        return;
      case 'counter':
        audio.play('open');
        this.events.emit('openCounter');
        return;
      case 'kitchen':
        audio.play('open');
        this.events.emit('openRecipes');
        return;
      case 'board':
        audio.play('open');
        this.events.emit('openBoard');
        return;
      case 'store':
        audio.play('open');
        this.events.emit('openStore');
        return;
      case 'tailor':
        audio.play('open');
        this.events.emit('openTailor');
        return;
      case 'petshop':
        audio.play('open');
        this.events.emit('openPetshop');
        return;
      case 'furnshop':
        audio.play('open');
        this.events.emit('openFurnshop');
        return;
      case 'wardrobe':
        audio.play('open');
        this.events.emit('openWardrobe');
        return;
      case 'lovetree':
        audio.play('open');
        this.events.emit('openLoveTree');
        return;
      default:
        return;
    }
    ch.bounce();
    ch.setBusy(220);
    this.syncCrops();
    this.afterChange();
  }

  // ------------------------------------------------------------ cooking & fishing

  cookLeniency() {
    return 1 + this.state.upgradeLevel('stove') * 0.3;
  }

  private ingredientIcons(id: RecipeId) {
    const icons: string[] = [];
    const r = RECIPES[id];
    for (const k in r.ingredients) {
      const icon = ITEMS[k as ItemId].icon;
      for (let i = 0; i < (r.ingredients[k as ItemId] ?? 0) && icons.length < 5; i++) icons.push(icon);
    }
    return icons;
  }

  startCooking(id: RecipeId): boolean {
    const r = RECIPES[id];
    if (this.state.world.dishes.length >= this.state.dishCap) {
      this.events.emit('toast', 'Your dish bag is full. Sell or serve some first.');
      return false;
    }
    for (const k in r.ingredients) if (this.state.count(k as ItemId) < (r.ingredients[k as ItemId] ?? 0)) return false;
    for (const k in r.ingredients) this.state.add(k as ItemId, -(r.ingredients[k as ItemId] ?? 0));
    this.setUiOpen(true);
    const data: MiniGameData = {
      title: r.name,
      steps: r.steps,
      leniency: this.cookLeniency(),
      ingredientIcons: this.ingredientIcons(id),
      onDone: (scores) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const grade = gradeFor(avg);
        const dish: Dish = { recipe: id, grade };
        this.state.addDish(dish);
        this.state.stat('cook');
        this.state.stat(`cook:${GRADE_NAMES[grade]}`);
        this.state.stat(`cook:r:${id}`);
        this.state.recordDishGrade(id, grade);
        audio.play(grade >= 2 ? 'great' : grade === 1 ? 'good' : 'bad');
        this.events.emit('cookResult', { recipe: id, grade, price: this.state.priceOf(dish), scores, coop: false } as CookResult);
        this.afterChange();
      },
    };
    this.scene.launch('MiniGame', data);
    return true;
  }

  private startFishing() {
    this.setUiOpen(true);
    // which fish bites depends on the pond, the hour and the weather
    const { fish, size } = pickFish(this.areaId === 'forest' ? 'forest' : 'farm', new Date().getHours(), this.weather === 'rain', Math.random);
    const data: MiniGameData = {
      title: fish.rarity === 'legendary' ? 'Something huge bites!' : fish.rarity === 'rare' ? 'A strong pull!' : 'Fishing',
      steps: ['reel'],
      leniency: 1 + this.state.upgradeLevel('stove') * 0.1,
      difficulty: fish.difficulty,
      fishColor: fish.color,
      ingredientIcons: [],
      onDone: (scores) => {
        this.setUiOpen(false);
        if (scores[0] > 0) {
          const r = this.state.recordCatch(fish, size);
          this.pop(this.player.x, this.player.y - 10, `fish-${fish.id}`, `+${fish.units}`);
          audio.play(fish.rarity === 'common' ? 'harvest' : 'great');
          if (r.isNew || r.record || fish.rarity !== 'common') this.events.emit('catch', { id: fish.id as FishId, size, isNew: r.isNew, record: r.record, bonus: r.bonus });
          else this.events.emit('toast', `Caught a ${fish.name}, ${size} cm`);
        } else this.events.emit('toast', `The ${FISH[fish.id].rarity === 'common' ? 'fish' : FISH[fish.id].name} got away...`);
        this.afterChange();
      },
    };
    this.scene.launch('MiniGame', data);
  }

  /** Hearts float up and heart rewards become banners. */
  private friendFeedback(name: string, npc: Npc | undefined, heartUp: boolean, hearts: number, rewards: { hearts: number; text: string }[]) {
    if (npc && heartUp) {
      this.heartBurst(npc.ch.x, npc.ch.y - 24);
      audio.play('great');
    }
    const events = rewards.map((r) => ({ kind: 'friend' as const, name, hearts: r.hearts, text: r.text }));
    if (heartUp && !rewards.length) events.push({ kind: 'friend', name, hearts, text: `${name} likes you more` });
    if (events.length) this.events.emit('progress', events);
    this.afterChange();
  }

  /** Called by the gift picker. Returns the reaction for the dialogue box. */
  giveGift(villagerId: string, key: string) {
    const v = villager(villagerId);
    const r = this.state.giveGift(villagerId, key);
    if (!v || !r) return null;
    const npc = this.npcs.find((n) => n.def.id === villagerId);
    if (npc) {
      npc.ch.showBubble(r.reaction === 'love' || r.reaction === 'like' ? 'heart' : 'dots', undefined, 1800);
      if (r.reaction === 'love') this.heartBurst(npc.ch.x, npc.ch.y - 24);
    }
    audio.play(r.reaction === 'love' ? 'great' : r.reaction === 'like' ? 'good' : r.reaction === 'dislike' ? 'bad' : 'blip');
    this.friendFeedback(v.name, npc, r.heartUp, r.hearts, r.rewards);
    return r;
  }

  purchaseUpgrade(id: UpgradeId): boolean {
    const ok = this.state.buyUpgrade(id);
    if (!ok) return false;
    audio.play('coin');
    this.refreshUpgradeObjects();
    this.afterChange();
    return true;
  }

  // ------------------------------------------------------------ travel

  /** Walk through a door or use the map. */
  travelTo(area: AreaId, tx?: number, ty?: number, facing?: Facing) {
    if (this.transitioning) return;
    this.transitioning = true;
    audio.play('door');
    this.state.setPlace(this.areaId, this.player.x, this.player.y);
    this.state.save();
    if (this.decorate.mode) this.stopDecorate();
    this.cameras.main.fadeOut(220, 255, 244, 220);
    this.time.delayedCall(230, () => {
      const target = getArea(area);
      const sx = tx ?? target.spawn.tx;
      const sy = ty ?? target.spawn.ty;
      this.state.setPlace(area, sx * TILE + 8, sy * TILE + 14);
      this.scene.restart({ player: this.playerId, area, tx: sx, ty: sy, facing: facing ?? 'down' } as WorldInit);
    });
  }

  private checkPortals() {
    const p = this.portalAt(this.player.tileX, this.player.tileY);
    if (!p) {
      this.inPortal = false;
      return;
    }
    if (this.inPortal) return;
    this.inPortal = true;
    this.travelTo(p.to, p.targetTx, p.targetTy, p.facing);
  }

  // ------------------------------------------------------------ furniture

  private furnitureIndexAt(tx: number, ty: number): number {
    return this.state.world.furniturePlaced.findIndex((f) => {
      const d = FURNITURE[f.id];
      return tx >= f.tx && tx < f.tx + d.w && ty >= f.ty && ty < f.ty + d.h;
    });
  }

  canPlace(id: FurnitureId, tx: number, ty: number): boolean {
    const fr = this.area.floorRect;
    if (!fr) return false;
    const d = FURNITURE[id];
    if (d.wall) {
      if (ty !== 1) return false;
      if (tx < 1 || tx + d.w > this.area.w - 1) return false;
      for (const o of this.area.objects) if (o.ty === 1 && tx < o.tx + o.w && tx + d.w > o.tx) return false;
    } else {
      if (tx < fr.x || ty < fr.y || tx + d.w > fr.x + fr.w || ty + d.h > fr.y + fr.h) return false;
      const door = this.area.portals[0];
      if (door && ty + d.h > fr.y + fr.h - 1 && tx <= door.tx && tx + d.w > door.tx) return false;
    }
    for (const f of this.state.world.furniturePlaced) {
      const e = FURNITURE[f.id];
      if (tx < f.tx + e.w && tx + d.w > f.tx && ty < f.ty + e.h && ty + d.h > f.ty) return false;
    }
    return true;
  }

  startDecorate(item: FurnitureId | null, mode: 'place' | 'pickup') {
    if (this.areaId !== 'home') return;
    this.stopDecorate();
    this.decorate = { item, mode, tx: this.player.tileX, ty: Math.max(2, this.player.tileY - 1) };
    if (item && mode === 'place') {
      this.decorate.ghost = this.add.image(0, 0, 'furniture', item).setOrigin(0, 1).setAlpha(0.7).setDepth(25000);
    }
    this.decorateMoveTo(this.decorate.tx, this.decorate.ty);
    this.pushHud(true);
  }

  stopDecorate() {
    this.decorate.ghost?.destroy();
    this.decorate = { item: null, mode: null, tx: 0, ty: 0 };
    this.cursor.clear();
    this.pushHud(true);
  }

  decorateMoveTo(tx: number, ty: number) {
    if (!this.decorate.mode) return;
    this.decorate.tx = Phaser.Math.Clamp(tx, 0, this.area.w - 1);
    this.decorate.ty = Phaser.Math.Clamp(ty, 0, this.area.h - 1);
    if (this.decorate.ghost && this.decorate.item) {
      const d = FURNITURE[this.decorate.item];
      this.decorate.ghost.setPosition(this.decorate.tx * TILE, (this.decorate.ty + d.h) * TILE + (d.wall ? -2 : 0));
      this.decorate.ghost.setTint(this.canPlace(this.decorate.item, this.decorate.tx, this.decorate.ty) ? 0xffffff : 0xff6b6b);
    }
    this.pushHud(true);
  }

  decorateNudge(dx: number, dy: number) {
    this.decorateMoveTo(this.decorate.tx + dx, this.decorate.ty + dy);
  }

  decoratePlace() {
    const { item, tx, ty } = this.decorate;
    if (!item || !this.canPlace(item, tx, ty)) {
      audio.play('bad');
      return;
    }
    this.state.placeFurniture(item, tx, ty);
    audio.play('place');
    this.syncFurniture();
    const left = this.state.furnitureOwned(item);
    if (left > 0) this.decorateMoveTo(tx, ty);
    else this.stopDecorate();
    this.afterChange();
  }

  decoratePickup() {
    const idx = this.furnitureIndexAt(this.decorate.tx, this.decorate.ty);
    if (idx < 0) return;
    this.state.pickUpFurniture(idx);
    audio.play('pop');
    this.syncFurniture();
    this.afterChange();
  }

  syncFurniture() {
    for (const s of this.furnitureSprites) s.destroy();
    this.furnitureSprites = [];
    if (this.areaId !== 'home') return;
    // reset floor blocking then apply
    const fr = this.area.floorRect;
    if (fr) for (let y = fr.y; y < fr.y + fr.h; y++) for (let x = fr.x; x < fr.x + fr.w; x++) this.blocked[y][x] = this.area.blocked[y][x];
    for (const f of this.state.world.furniturePlaced) {
      const d = FURNITURE[f.id];
      const by = (f.ty + d.h) * TILE + (d.wall ? -2 : 0);
      const img = this.add.image(f.tx * TILE, by, 'furniture', f.id).setOrigin(0, 1).setDepth(d.floor ? -12 : d.wall ? -11 : by - 2);
      this.furnitureSprites.push(img);
      if (!d.wall && !d.floor) for (let y = f.ty; y < f.ty + d.h; y++) for (let x = f.tx; x < f.tx + d.w; x++) this.blocked[y][x] = true;
    }
  }

  // ------------------------------------------------------------ per-area content

  syncCounter() {
    this.counterDishes.forEach((d) => d.destroy());
    this.counterDishes = [];
    if (this.areaId !== 'farm') return;
    const c = this.area.objects.find((o) => o.interact === 'counter');
    if (!c) return;
    this.state.world.counter.forEach((s, i) => {
      if (!s.dish) return;
      const img = this.add.image(c.tx * TILE + 5 + (i % 3) * 10, c.ty * TILE + 6 - Math.floor(i / 3) * 3, 'icons', `dish-${s.dish.recipe}`).setDepth((c.ty + 1) * TILE + 1);
      this.counterDishes.push(img);
    });
  }

  syncForage() {
    for (const f of this.area.forage) {
      const ok = this.state.forageAvailable(f.key, f.respawnMin);
      let s = this.forageSprites.get(f.key);
      if (ok && !s) {
        s = this.add.image(f.tx * TILE + 8, (f.ty + 1) * TILE, 'props', f.item === 'berry' ? 'berrybush' : f.item).setOrigin(0.5, 1).setDepth((f.ty + 1) * TILE - 2);
        this.forageSprites.set(f.key, s);
      } else if (!ok && s) {
        s.destroy();
        this.forageSprites.delete(f.key);
      }
    }
  }

  private spawnCritters() {
    for (const pen of this.area.pens ?? []) {
      const want = this.state.animalCount(pen.animal);
      const have = this.critters.filter((c) => c.kind === pen.animal).length;
      for (let i = have; i < want; i++) this.critters.push(new Critter(this, pen.animal, pen, pen.animal === 'chicken' ? 22 : 14));
    }
  }

  private spawnNpcs() {
    for (const n of this.area.npcs) {
      const look: CharacterLook = (SHOPKEEPER_LOOKS as Record<string, CharacterLook>)[n.lookId] ?? FAMILY_LOOKS[n.lookId] ?? CUSTOMER_LOOKS.find((c) => c.id === n.lookId) ?? CUSTOMER_LOOKS[0];
      const tex = buildCharacterTexture(this, look);
      this.npcs.push(new Npc(this, n, tex, look.name, { isBlocked: (tx, ty) => this.isBlocked(tx, ty) }));
    }
  }

  private updateLoveTree() {
    const o = this.objectSprites.find((s) => s.obj.interact === 'lovetree');
    if (!o) return;
    o.img.setFrame(`lovetree${this.state.loveTreeStage}`);
  }

  private setupSpecialDay() {
    const sd = isSpecialDay(this.state.world.specialDays, Date.now());
    this.specialLabel = sd ? sd.label : null;
    if (!sd) return;
    for (const p of this.area.party ?? []) {
      const b = this.add.image(p.tx * TILE + 8, (p.ty + 1) * TILE, 'props', 'balloons').setOrigin(0.5, 1).setDepth((p.ty + 1) * TILE);
      this.tweens.add({ targets: b, y: b.y - 3, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (this.areaId === 'farm') {
      for (let x = 4; x < 12; x += 2) this.add.image(x * TILE, 2 * TILE + 6, 'props', 'bunting').setOrigin(0, 0).setDepth(3 * TILE);
    }
    const key = `oj-special-${sd.label}-${new Date().toDateString()}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        this.time.delayedCall(1500, () => this.events.emit('toast', `Happy ${sd.label}!`));
      }
    } catch {
      /* ignore */
    }
  }

  private fireworkTimer = 0;
  private updateFireworks(time: number, dt: number) {
    if (!this.specialLabel || !AREAS[this.areaId].outdoor) return;
    const hour = new Date().getHours();
    if (hour < 19 && hour > 5) return;
    this.fireworkTimer -= dt;
    if (this.fireworkTimer > 0) return;
    this.fireworkTimer = 1800 + Math.random() * 1500;
    const cam = this.cameras.main;
    const x = cam.worldView.x + 40 + Math.random() * (cam.worldView.width - 80);
    const y = cam.worldView.y + 20 + Math.random() * 40;
    const color = [0xff6b6b, 0xffd23f, 0x7de8c8, 0xff8fcf, 0x6fb8ff][Math.floor(Math.random() * 5)];
    audio.play('firework');
    for (let i = 0; i < 14; i++) {
      const p = this.add.rectangle(x, y, 2, 2, color).setDepth(25000);
      const ang = (i / 14) * Math.PI * 2;
      const r = 18 + Math.random() * 14;
      this.tweens.add({ targets: p, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r + 8, alpha: 0, duration: 800 + Math.random() * 300, ease: 'Quad.easeOut', onComplete: () => p.destroy() });
    }
    void time;
  }

  private spawnButterflies() {
    if (!AREAS[this.areaId].outdoor) return;
    const { w, h } = this.area;
    for (let i = 0; i < 5; i++) {
      const b = this.add.sprite(Phaser.Math.Between(48, w * TILE - 48), Phaser.Math.Between(48, h * TILE - 48), 'fx', 'bf0-0').setDepth(5000);
      b.play(`bf${i % 3}`);
      const wander = () => {
        if (!b.scene) return;
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
        if (!f.scene) return;
        this.tweens.add({ targets: f, x: f.x + Phaser.Math.Between(-30, 30), y: f.y + Phaser.Math.Between(-20, 20), duration: Phaser.Math.Between(2000, 4000), ease: 'Sine.easeInOut', onComplete: drift });
      };
      drift();
    }
  }

  private layoutOverlays() {
    this.night?.setSize(this.scale.width + 4, this.scale.height + 4);
    this.cloud?.setSize(this.scale.width + 4, this.scale.height + 4);
  }

  private updateNight() {
    if (!AREAS[this.areaId].outdoor) {
      this.night.setFillStyle(0x1a2a6a, 0);
      return;
    }
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

  private updateWeather(first = false) {
    const w = weatherFor(this.state.world.seed, Date.now());
    if (w === this.weather && !first) return;
    this.weather = w;
    const outdoor = AREAS[this.areaId].outdoor;
    this.cloud.setFillStyle(0x6a7a9a, outdoor && w !== 'sunny' ? (w === 'rain' ? 0.18 : 0.1) : 0);
    audio.setRain(outdoor && w === 'rain');
    for (const r of this.rain) r.destroy();
    this.rain = [];
    if (outdoor && w === 'rain') {
      for (let i = 0; i < 40; i++) {
        const d = this.add.image(0, 0, 'fx', 'raindrop').setScrollFactor(0).setDepth(19998).setAlpha(0.7);
        d.setData('vx', -20 + Math.random() * 10);
        d.setPosition(Math.random() * this.scale.width, Math.random() * this.scale.height);
        this.rain.push(d);
      }
    }
    this.pushHud(true);
  }

  private updateRain(dt: number) {
    if (!this.rain.length) return;
    const W = this.scale.width;
    const H = this.scale.height;
    for (const d of this.rain) {
      d.y += (180 * dt) / 1000;
      d.x += ((d.getData('vx') as number) * dt) / 1000;
      if (d.y > H + 4) {
        d.y = -6;
        d.x = Math.random() * (W + 20);
      }
      if (d.x < -4) d.x = W + 2;
    }
  }

  // ------------------------------------------------------------ crops

  syncCrops() {
    if (!this.area.farm) return;
    const plots = this.state.world.plots;
    const now = Date.now();
    const sprinkler = this.state.upgradeLevel('sprinkler') > 0;
    const seen = new Set<string>();
    for (const key in plots) {
      const p = plots[key];
      const [tx, ty] = key.split(',').map(Number);
      if (!this.area.farm.has(key)) continue;
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

  // ------------------------------------------------------------ effects

  private puff(x: number, y: number, kind: 'dust' | 'drop') {
    for (let i = 0; i < 5; i++) {
      const s = kind === 'dust' ? this.add.image(x, y, 'fx', i % 2 ? 'dust0' : 'dust1') : this.add.image(x + (i - 2) * 3, y - 10, 'icons', 'drop').setScale(0.6);
      s.setDepth(y + 20);
      const ang = (i / 5) * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(ang) * 8, y: kind === 'dust' ? y + Math.sin(ang) * 5 - 4 : y + 2, alpha: 0, duration: kind === 'dust' ? 320 : 420, delay: i * 30, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    }
  }

  pop(x: number, y: number, icon: string, text?: string) {
    const img = this.add.image(x, y - 4, 'icons', icon).setDepth(y + 30);
    this.tweens.add({ targets: img, y: y - 22, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({ targets: img, alpha: 0, duration: 250, delay: 450, onComplete: () => img.destroy() });
    if (text) {
      const t = this.add.text(x + 9, y - 10, text, style({ color: P.yellow })).setOrigin(0, 1).setDepth(y + 31);
      this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    }
  }

  // ------------------------------------------------------------ customers & diners

  private handleEvents(events: WorldEvent[]) {
    let changed = false;
    for (const e of events) {
      if (e.type === 'sale' || e.type === 'customer_left') {
        changed = true;
        if (this.areaId === 'farm' && this.customerQueue.length < 4) this.customerQueue.push(e.type === 'sale');
      } else if (e.type === 'ripe') {
        if (this.areaId === 'farm') this.events.emit('toast', 'A crop is ready!');
      } else if (e.type === 'produce') {
        if (ANIMALS[e.animal].home === 'farm' && this.areaId === 'farm' && !this.eggBang) {
          const o = this.area.objects.find((x) => x.interact === (e.animal === 'bee' ? 'hives' : 'coop'));
          if (o) {
            this.eggBang = this.add.text(o.tx * TILE + (o.w * TILE) / 2, o.ty * TILE - 6, '!', style({ color: P.yellow })).setOrigin(0.5, 1).setDepth(9999);
            this.tweens.add({ targets: this.eggBang, y: this.eggBang.y - 4, duration: 400, yoyo: true, repeat: -1 });
          }
          audio.play(e.animal === 'bee' ? 'pop' : 'cluck');
        }
      } else if (e.type === 'rain') {
        this.updateWeather(true);
      } else if (e.type === 'orders') {
        this.events.emit('toast', 'New orders on the town board!');
      }
    }
    if (changed) {
      this.syncCounter();
      this.afterChange();
    }
  }

  private spawnCustomer(bought: boolean) {
    const a = this.area;
    if (!a.customerEntry || !a.counterStop || a.roadY === undefined) return;
    const look = CUSTOMER_LOOKS[this.customerTex++ % CUSTOMER_LOOKS.length];
    const road = a.roadY * TILE + 14;
    const path = [
      { x: a.customerEntry.tx * TILE + 8, y: road },
      { x: (a.counterStop.tx + 2) * TILE, y: road },
    ];
    const stop = { x: a.counterStop.tx * TILE + 8, y: road };
    const tex = buildCharacterTexture(this, look);
    const c = new Customer(this, tex, path, stop, bought, () => {
      if (bought) {
        audio.play('coin');
        this.pop(stop.x, stop.y - 30, 'coin', 'sold!');
      }
    });
    this.customers.push(c);
  }

  private updateDiners(time: number, dt: number) {
    if (this.areaId !== 'restaurant' || !this.area.tables || !this.area.dinerEntry) return;
    for (const d of this.diners) {
      const r = d.update(time, dt);
      if (r === 'timeout') {
        this.state.addRep(-0.5);
        this.state.stat('diner:left');
        audio.play('bad');
        this.events.emit('toast', 'A diner left hungry...');
        this.afterChange();
      }
    }
    this.diners = this.diners.filter((d) => d.phase !== 'gone');
    if (time < this.nextDiner) return;
    this.nextDiner = time + dinerIntervalS(this.state.reputation) * 1000;
    const tables = this.area.tables.slice(0, this.state.tables);
    const free = tables.filter((t) => !this.diners.some((d) => d.table === t));
    if (!free.length) return;
    const table = free[Math.floor(Math.random() * free.length)];
    const look = CUSTOMER_LOOKS[this.dinerTex++ % CUSTOMER_LOOKS.length];
    const tex = buildCharacterTexture(this, look);
    const order = pickDinerOrder(this.state.reputation, this.state.world.books, Math.random);
    this.diners.push(new Diner(this, tex, look.name, table, this.area.dinerEntry, order.recipe));
    audio.play('door');
  }

  // ------------------------------------------------------------ loop

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50);
    if (this.transitioning) return;
    let dx = this.joy.x;
    let dy = this.joy.y;
    if (!this.uiOpen && this.keys) {
      if (this.keys.A.isDown) dx -= 1;
      if (this.keys.D.isDown) dx += 1;
      if (this.keys.W.isDown) dy -= 1;
      if (this.keys.S.isDown) dy += 1;
      if (this.decorate.mode && this.cursors) {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) this.decorateNudge(-1, 0);
        if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) this.decorateNudge(1, 0);
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.decorateNudge(0, -1);
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.decorateNudge(0, 1);
      }
    }
    if (this.uiOpen) dx = dy = 0;
    const moved = this.player.move(dx, dy, dt);
    this.player.update();
    if (moved || (!this.player.moving && this.lastMoving)) this.broadcastPos(!this.player.moving && this.lastMoving);
    this.lastMoving = this.player.moving;
    if (moved && time - this.lastPlaceSave > 2000) {
      this.lastPlaceSave = time;
      this.state.setPlace(this.areaId, this.player.x, this.player.y);
    }
    this.checkPortals();
    if (this.transitioning) return;

    // remote partner interpolation
    if (this.remote && this.remoteTarget) {
      const t = this.remoteTarget;
      const ddx = t.x - this.remote.x;
      const ddy = t.y - this.remote.y;
      const d = Math.hypot(ddx, ddy);
      if (d > 1) {
        const step = Math.min(d, (Math.max(62, d * 6) * dt) / 1000);
        this.remote.sprite.x += (ddx / d) * step;
        this.remote.sprite.y += (ddy / d) * step;
        this.remote.facing = t.facing;
        this.remote.moving = true;
        this.remote.playWalk();
      } else if (this.remote.moving || this.remote.facing !== t.facing) {
        this.remote.facing = t.facing;
        this.remote.moving = false;
        this.remote.playIdle();
      }
      this.remote.update();
      // together hearts
      if (Math.abs(this.remote.x - this.player.x) < 20 && Math.abs(this.remote.y - this.player.y) < 20) {
        this.heartTimer -= dt;
        if (this.heartTimer <= 0) {
          this.heartTimer = 1400;
          const h = this.add.image((this.remote.x + this.player.x) / 2, Math.min(this.remote.y, this.player.y) - 30, 'fx', 'heart').setDepth(30000);
          this.tweens.add({ targets: h, y: h.y - 14, alpha: 0, duration: 1000, onComplete: () => h.destroy() });
        }
      }
    }
    this.updateCompanion(time, dt);

    this.pet?.update(dt);
    this.remotePet?.update(dt);
    for (const c of this.customers) c.update(time, dt);
    this.customers = this.customers.filter((c) => !c.done);
    if (this.customerQueue.length && this.customers.length < 3 && time - this.lastCustomerSpawn > 1200) {
      this.lastCustomerSpawn = time;
      this.spawnCustomer(this.customerQueue.shift() as boolean);
    }
    for (const c of this.critters) c.update(time, dt);
    for (const n of this.npcs) {
      n.update(time, dt);
      // name tags only for villagers close by, so a crowded room stays readable
      n.ch.label.setVisible(Math.hypot(n.ch.x - this.player.x, n.ch.y - this.player.y) < 44);
    }
    this.updateDiners(time, dt);
    this.updateRain(dt);
    this.updateFireworks(time, dt);
    this.updateGuide(time);

    // cursor
    const a = this.currentAction();
    this.cursor.clear();
    if (this.decorate.mode) {
      const d = this.decorate.item ? FURNITURE[this.decorate.item] : { w: 1, h: 1 };
      this.cursor.lineStyle(1, a?.enabled ? 0x7de8c8 : 0xff6b6b, 1);
      this.cursor.strokeRect(this.decorate.tx * TILE + 0.5, this.decorate.ty * TILE + 0.5, d.w * TILE - 1, d.h * TILE - 1);
    } else if (a && ['till', 'plant', 'water', 'harvest', 'none', 'fish'].includes(a.type)) {
      const { tx, ty } = this.player.facingTile;
      this.cursor.lineStyle(1, a.enabled ? 0xffffff : 0xffe066, 1);
      this.cursor.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
    }

    if (this.areaId === 'farm' && this.state.upgradeLevel('sprinkler') > 0 && time - this.lastSprinkle > 900 && this.area.farmRect) {
      this.lastSprinkle = time;
      const f = this.area.farmRect;
      const x = (f.x + Math.random() * f.w) * TILE;
      const y = (f.y + Math.random() * f.h) * TILE;
      const d = this.add.image(x, y, 'icons', 'drop').setScale(0.5).setDepth(y + 10).setAlpha(0.8);
      this.tweens.add({ targets: d, y: y + 6, alpha: 0, duration: 500, onComplete: () => d.destroy() });
    }

    if (time - this.lastTick > 1000) {
      this.lastTick = time;
      const events = this.state.tick(Date.now());
      this.syncCrops();
      this.syncForage();
      this.handleEvents(events);
      // catches progress from actions that open a panel, from the partner, and from the day changing
      const progress = this.state.checkProgress();
      if (progress.length) {
        audio.play('quest');
        this.events.emit('progress', progress);
        this.lastGuideCheck = 0;
        this.pushHud(true);
      }
      this.updateNight();
      this.updateWeather();
      const gift = this.state.petGiftCheck();
      if (gift && this.pet) {
        audio.play(this.state.pet?.type === 'dog' ? 'bark' : 'pop');
        this.pop(this.pet.x, this.pet.y - 6, ITEMS[gift].icon, '+1');
        this.events.emit('toast', `${this.state.pet?.name} found a ${ITEMS[gift].name}!`);
        this.afterChange();
      }
    }
    if (time - this.lastSave > 5000) {
      this.lastSave = time;
      this.state.saveIfDirty();
    }
    this.pushHud();
  }
  private lastMoving = false;

  // ------------------------------------------------------------ guide arrow

  private guideMarker?: Phaser.GameObjects.Container;
  private guideWorld: { x: number; y: number } | null = null;
  private lastGuideCheck = 0;
  private lastEdgeSent = '';

  private createGuide() {
    const arrow = this.add.graphics();
    arrow.fillStyle(0x4a2a3f, 1).fillTriangle(-7, -3, 7, -3, 0, 7);
    arrow.fillStyle(0xffd23f, 1).fillTriangle(-5, -2, 5, -2, 0, 5);
    arrow.fillStyle(0xfff4b0, 1).fillRect(-2, -2, 2, 2);
    const ring = this.add.graphics();
    ring.lineStyle(1, 0xffd23f, 0.9).strokeEllipse(0, 14, 16, 6);
    this.guideMarker = this.add.container(0, 0, [ring, arrow]).setDepth(29000).setVisible(false);
    this.tweens.add({ targets: arrow, y: -5, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: ring, alpha: 0.3, duration: 420, yoyo: true, repeat: -1 });
  }

  /** Where the next task happens: a spot in this area, or the door that leads toward it. */
  private guidePoint(): { x: number; y: number } | null {
    if (!this.state.data.guideOn) return null;
    const t = guideFor(currentQuest(this.state.world), this.state.world);
    if (!t) return null;
    if (t.area === this.areaId) return { x: t.tx * TILE + 8, y: t.ty * TILE + 8 };
    const portal = this.portalToward(t.area);
    return portal ? { x: (portal.tx + portal.w / 2) * TILE, y: (portal.ty + portal.h / 2) * TILE } : null;
  }

  /** First door on the shortest route from this area to `target`. */
  private portalToward(target: AreaId): AreaDef['portals'][number] | null {
    const first = new Map<AreaId, AreaDef['portals'][number]>();
    const seen = new Set<AreaId>([this.areaId]);
    const queue: AreaId[] = [];
    for (const p of this.area.portals) {
      if (seen.has(p.to)) continue;
      seen.add(p.to);
      first.set(p.to, p);
      queue.push(p.to);
    }
    while (queue.length) {
      const id = queue.shift() as AreaId;
      if (id === target) return first.get(id) ?? null;
      for (const p of getArea(id).portals) {
        if (seen.has(p.to)) continue;
        seen.add(p.to);
        first.set(p.to, first.get(id) as AreaDef['portals'][number]);
        queue.push(p.to);
      }
    }
    return null;
  }

  private updateGuide(time: number) {
    if (!this.guideMarker) return;
    if (time - this.lastGuideCheck > 500) {
      this.lastGuideCheck = time;
      this.guideWorld = this.guidePoint();
    }
    const p = this.guideWorld;
    if (!p || this.uiOpen || this.decorate.mode) {
      this.guideMarker.setVisible(false);
      this.sendEdge(null);
      return;
    }
    const near = Math.hypot(p.x - this.player.x, p.y - (this.player.y - 6)) < 18;
    this.guideMarker.setPosition(p.x, p.y - 16).setVisible(!near);
    const view = this.cameras.main.worldView;
    const inside = p.x > view.x + 10 && p.x < view.right - 10 && p.y > view.y + 10 && p.y < view.bottom - 10;
    this.sendEdge(inside ? null : Math.atan2(p.y - view.centerY, p.x - view.centerX));
  }

  /** Tell the HUD to show an edge arrow when the target is off screen. */
  private sendEdge(angle: number | null) {
    const key = angle === null ? '' : String(Math.round(angle * 16));
    if (key === this.lastEdgeSent) return;
    this.lastEdgeSent = key;
    this.events.emit('guideEdge', angle);
  }

  private companionTarget: { x: number; y: number } | null = null;
  private companionNext = 0;
  private updateCompanion(time: number, dt: number) {
    const c = this.companion;
    if (!c || !this.area.companionAnchor) return;
    if (!this.companionTarget && time > this.companionNext) {
      const an = this.area.companionAnchor;
      const tx = an.tx + Phaser.Math.Between(-3, 3);
      const ty = an.ty + Phaser.Math.Between(-2, 3);
      if (!this.isBlocked(tx, ty)) this.companionTarget = { x: tx * TILE + 8, y: ty * TILE + 14 };
      this.companionNext = time + Phaser.Math.Between(1500, 4000);
    }
    if (this.companionTarget) {
      const ddx = this.companionTarget.x - c.x;
      const ddy = this.companionTarget.y - c.y;
      if (Math.hypot(ddx, ddy) < 3 || !c.move(ddx, ddy, dt)) {
        this.companionTarget = null;
        c.move(0, 0, dt);
      }
    } else c.move(0, 0, dt);
    c.update();
  }
}
