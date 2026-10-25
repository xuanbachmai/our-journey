import Phaser from 'phaser';
import {
  ACCESSORIES,
  applyReward,
  COSTUMES,
  type Costume,
  normaliseGiftCode,
  type RewardLine,
  dayIndex,
  dueLabel,
  formatDuration,
  HANDS,
  HAND_IDS,
  machineMargin,
  MACHINES,
  MACHINE_IDS,
  type MachineId,
  ACCESSORY_IDS,
  ANIMALS,
  ANIMAL_IDS,
  AREAS,
  BOOKS,
  canCook,
  cozyPoints,
  CROPS,
  clothingDef,
  clothingIds,
  CROP_IDS,
  BOND_REWARDS,
  bondProgress,
  MAX_BOND,
  PHOTO_SPOTS,
  type Photo,
  SEEDS_PER_CROP,
  TOOL_IDS,
  TOOL_REACH,
  TOOL_TIERS,
  TOOLS,
  type ToolId,
  FURNITURE_CATS,
  isFreeClothing,
  type ClothingKind,
  type FurnitureCat,
  type Outfit,
  FISH,
  FISH_IDS,
  friendPoints,
  GIFT_LINES,
  heartsFor,
  knownLoves,
  villager,
  VILLAGERS,
  type FishId,
  dayKey,
  DYES,
  DYE_IDS,
  FURNITURE,
  FURNITURE_IDS,
  GRADE_NAMES,
  HAIR_COLORS,
  HAIR_IDS,
  HATS,
  HAT_IDS,
  ITEMS,
  LOVE_TREE_STAGES,
  nextLoveTreeMilestone,
  otherPlayer,
  OUTDOOR_AREAS,
  PETS,
  PET_IDS,
  CHAPTERS,
  currentChapter,
  DAILY_BONUS,
  dailyDefs,
  dailyProgress,
  questionForDay,
  RECIPES,
  recipeUnlocked,
  SELLABLE,
  UPGRADE_IDS,
  UPGRADES,
  type AnimalId,
  type AreaId,
  type BookId,
  type CropId,
  type FurnitureId,
  type ItemId,
  type Order,
  type PlayerId,
  type Postcard,
  type RecipeId,
  type UpgradeId,
} from '@hh/shared';
import { buildCharacterTexture, LOOKS } from '../art/characters';
import { P } from '../art/palette';
import { LETTER } from '../config/letter';
import { audio } from '../game/audio';
import { net, type NoteRow } from '../game/net';
import { eraseLocalData, MAX_PENDING_GIFTS, type AwaySummary, type ProgressEvent } from '../game/state';
import { confirmBox, copyToClipboard, promptText } from '../ui/dom';
import { button, count, FONT_OPTIONS, inset, meter, note, pill, titleBar, type FontKey, getSavedFontKey, panel, plain, refreshFontConfig, saveFontKey, style, tiny } from '../ui/text';
import { TitleScene } from './TitleScene';
import type { CookResult, HudData, WorldScene } from './WorldScene';

const JOY_R = 20;
const ROW = 18;
/** Rows that carry a name and a note underneath. */
const ROW2 = 25;

interface HelpPage {
  title: string;
  icon: string;
  lines: string[];
}

const HELP: HelpPage[] = [
  { title: 'Your journey', icon: 'star', lines: ['The bar at the top shows your next', 'task. Follow the yellow arrow to', 'where it happens. Tap the bar for', 'the Story: 13 chapters with rewards.', 'Today has 3 small daily tasks.'] },
  { title: 'Farming', icon: 'seed-tomato', lines: ['Till a plot, plant a seed, water it.', 'Crops grow in real time, even when', 'the game is closed. Dry soil pauses.', 'Rain and the sprinkler water for you.', 'Upgrade the hoe, can and sickle at', 'the stall to work 3 or 9 tiles.'] },
  { title: 'Cooking', icon: 'dish-tomato_soup', lines: ['Cook at the kitchen by the house or', 'inside the restaurant. Each recipe', 'is a few mini-games. Good timing', 'means a better grade: C, B, A or S.', 'Reputation and books unlock recipes.'] },
  { title: 'Selling', icon: 'coin', lines: ['Counter by the road: dishes sell by', 'themselves, day and night.', 'Restaurant: diners sit down and order.', 'Bring the dish fast for a tip.', 'Town board: orders pay extra.'] },
  { title: 'Exploring', icon: 'map', lines: ['Roads lead east to Maple Town,', 'west to Sunny Ranch. North of town', 'is Whisper Forest, east of town is', 'Family Lane with both family homes.', 'Every door opens. The map travels', 'to places you have discovered.'] },
  { title: 'Home', icon: 'furn-sofa', lines: ['Buy furniture at Cozy Corner, place', 'it at home with Decorate. There is', 'a sale every day. Coziness raises', 'dish prices. Rosa sells outfits,', 'hats and dyes; try them on first.'] },
  { title: 'Friends', icon: 'heart', lines: ['Talk to villagers every day and give', 'one gift each. Hearts unlock rewards', 'at 2 and 4. Loved gifts give the most', 'hearts; you learn them as you go.', 'The Book (Journal) tracks it all.'] },
  { title: 'Fishing', icon: 'fish-koi', lines: ['10 kinds of fish live in the ponds.', 'Some bite only at night or in rain.', 'Rare fish pull harder. The first of', 'each kind pays a bonus. Check the', 'Book to see what is left to catch.'] },
  { title: 'Animals', icon: 'cow', lines: ['Hens and ducks lay eggs at the coop.', 'Cows, sheep, goats and pigs live at', 'the ranch: collect at the barn. Build', 'pens at the pet shop. Buy a horse and', 'ride it from the stable: much faster!'] },
  { title: 'Together', icon: 'heart', lines: ['The Love Tree grows on days you both', 'play. Leave notes in the mailbox.', 'Answer the daily question. Cook a', 'dish together when both online.', 'Special days bring fireworks.'] },
  { title: 'Us two', icon: 'heart', lines: ['Your bond grows when you both play,', 'leave notes, answer the question,', 'cook together, take photos at the', 'camera spots and wrap gifts in the', 'mailbox. Bond levels give rewards!'] },
  { title: 'Controls', icon: 'menu', lines: ['Phone: drag left half to move, big', 'button to act, bag button top left.', 'PC: WASD, SPACE. 1-8 seeds, B bag,', 'J journal, M map. In Decorate:', 'arrows move, ENTER places, ESC stops.'] },
];

export class HudScene extends Phaser.Scene {
  private world!: WorldScene;
  private isTouch = false;
  private coinText!: Phaser.GameObjects.Text;
  private repBar!: Phaser.GameObjects.Graphics;
  private statusGfx!: Phaser.GameObjects.Graphics;
  private repText!: Phaser.GameObjects.Text;
  private bagBtn!: Phaser.GameObjects.Container;
  private bagBadge!: Phaser.GameObjects.Text;
  private lastBagTotal = -1;
  private bagTab: 'produce' | 'seeds' | 'dishes' | 'home' | 'tools' = 'produce';
  private bagSel: string | null = null;
  private hotbar!: Phaser.GameObjects.Container;
  private trayGfx!: Phaser.GameObjects.Graphics;
  private slotGfx: Phaser.GameObjects.Graphics[] = [];
  private slotCounts: Phaser.GameObjects.Text[] = [];
  private slotIcons: Phaser.GameObjects.Image[] = [];
  private slotSeeds: CropId[] = [];
  private actionBtn!: Phaser.GameObjects.Container;
  private actionGfx!: Phaser.GameObjects.Graphics;
  private actionLabel!: Phaser.GameObjects.Text;
  private actionHint!: Phaser.GameObjects.Text;
  private joyBase!: Phaser.GameObjects.Graphics;
  private joyKnob!: Phaser.GameObjects.Graphics;
  private joyPointer: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private toast?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;
  private hint!: Phaser.GameObjects.Text;
  private questBox!: Phaser.GameObjects.Container;
  private questGfx!: Phaser.GameObjects.Graphics;
  private questText!: Phaser.GameObjects.Text;
  private menuBtn!: Phaser.GameObjects.Container;
  private mapBtn!: Phaser.GameObjects.Container;
  private helpBtn!: Phaser.GameObjects.Container;
  private emoteBtn!: Phaser.GameObjects.Container;
  private rideBtn!: Phaser.GameObjects.Container;
  private rideIcon!: Phaser.GameObjects.Image;
  private decorBtn!: Phaser.GameObjects.Container;
  private decorStop!: Phaser.GameObjects.Container;
  private areaText!: Phaser.GameObjects.Text;
  private weatherIcon!: Phaser.GameObjects.Image;
  private partnerText!: Phaser.GameObjects.Text;
  private emoteRow?: Phaser.GameObjects.Container;
  private last?: HudData;
  private page = 0;
  private localNotes: NoteRow[] = [];

  constructor() {
    super('Hud');
  }

  create() {
    this.world = this.scene.get('World') as WorldScene;
    this.isTouch = this.sys.game.device.input.touch;
    this.input.addPointer(2);

    // Coins and the bond ride on their own pills, so they read against grass,
    // paving or a night sky without an outline on every glyph.
    this.statusGfx = this.add.graphics();
    this.add.image(8, 6, 'icons', 'coin').setOrigin(0, 0);
    this.coinText = this.add.text(22, 8, '0', plain({ color: '#8a5e00' })).setOrigin(0, 0);
    this.add.image(8, 23, 'icons', 'heart').setOrigin(0, 0);
    this.repBar = this.add.graphics();
    this.repText = this.add.text(70, 25, '0', note({ color: '#a8456a' })).setOrigin(0, 0);
    // bag button replaces the old row of loose item icons
    {
      const g = this.add.graphics();
      panel(g, -12, -12, 24, 24, 0xfff4dc);
      const icon = this.add.image(0, -1, 'icons', 'bag').setScale(1.5);
      this.bagBadge = this.add.text(13, 13, '0', style()).setOrigin(1, 1);
      const z = this.add.zone(0, 0, 26, 26).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        audio.play('open');
        this.overlay ? this.closeOverlay() : this.openBag();
      });
      this.bagBtn = this.add.container(0, 0, [g, icon, this.bagBadge, z]);
    }

    // top centre: area + weather + partner
    this.areaText = this.add.text(0, 6, '', style({ color: '#fff' })).setOrigin(0.5, 0);
    this.weatherIcon = this.add.image(0, 12, 'icons', 'sun');
    this.partnerText = this.add.text(0, 18, '', style({ color: '#ffe066' })).setOrigin(0.5, 0);

    // top right: quest ticker, menu, map, help
    this.questGfx = this.add.graphics();
    this.questText = this.add.text(0, 0, '', plain({ color: P.outline })).setOrigin(0, 0.5);
    const qz = this.add.zone(0, 0, 10, 10).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    qz.on('pointerdown', () => this.openJournal('journey'));
    this.questBox = this.add.container(0, 0, [this.questGfx, this.questText, qz]);
    this.menuBtn = this.iconButton('menu', () => this.openJournal('journey'));
    this.mapBtn = this.iconButton('map', () => this.openMap());
    this.helpBtn = this.iconButton('help', () => this.openHelp(0));
    this.emoteBtn = this.iconButton('heart', () => this.toggleEmotes());
    // one button for the horse, the bicycle and the car, so phones can ride too
    this.rideBtn = this.iconButton('horse', () => this.world.cycleMount());
    this.rideIcon = this.rideBtn.list.find((o) => o instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image;
    this.rideBtn.setVisible(false);
    this.decorBtn = this.smallButton('Decorate', () => this.openDecorate(), 0xffe066);
    this.decorStop = this.smallButton('Done', () => this.world.stopDecorate(), 0x7de8c8);

    // hotbar
    this.hotbar = this.add.container(0, 0);
    this.trayGfx = this.add.graphics();
    this.hotbar.add(this.trayGfx);
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics();
      const icon = this.add.image(i * 20 + 10, 10, 'icons', 'seed-wheat');
      const count = this.add.text(i * 20 + 19, 19, '0', tiny()).setOrigin(1, 1);
      const zone = this.add.zone(i * 20 + 10, 10, 20, 20).setInteractive();
      zone.on('pointerdown', () => this.slotSeeds[i] && this.world.selectSeed(this.slotSeeds[i]));
      this.slotGfx.push(g);
      this.slotCounts.push(count);
      this.slotIcons.push(icon);
      this.hotbar.add([g, icon, count, zone]);
    }

    // action button
    this.actionGfx = this.add.graphics();
    this.actionLabel = this.add.text(0, 0, '', plain({ align: 'center', wordWrap: { width: 44 } })).setOrigin(0.5);
    this.actionHint = this.add.text(0, 27, this.isTouch ? '' : '[SPACE]', style({ color: '#fff' })).setOrigin(0.5, 0);
    const zone = this.add.zone(0, 0, 60, 60).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.world.doAction();
      this.tweens.add({ targets: this.actionBtn, scale: 0.9, duration: 60, yoyo: true });
    });
    this.actionBtn = this.add.container(0, 0, [this.actionGfx, this.actionLabel, this.actionHint, zone]);

    // joystick
    this.joyBase = this.add.graphics().setVisible(false);
    this.joyKnob = this.add.graphics().setVisible(false);
    this.joyBase.fillStyle(0x000000, 0.18).fillCircle(0, 0, JOY_R + 4).lineStyle(1, 0xffffff, 0.6).strokeCircle(0, 0, JOY_R + 4);
    this.joyKnob.fillStyle(0xffffff, 0.75).fillCircle(0, 0, 9).lineStyle(1, 0x4a2a3f, 1).strokeCircle(0, 0, 9);

    this.hint = this.add
      .text(0, 0, this.isTouch ? 'left side: move\nright button: act' : 'WASD move  SPACE act  1-8 seeds\nJ journal  M map', style({ color: '#fff', align: 'center' }))
      .setOrigin(0.5, 1)
      .setLineSpacing(2)
      .setAlpha(0.9);
    this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (this.overlay || this.world.isUiOpen() || !this.isTouch) return;
      // taps on HUD buttons (bag, hotbar, decorate) must not start the joystick
      if (this.input.hitTestPointer(p).length > 0) return;
      if (p.x < this.scale.width * 0.5 && p.y > 30 && this.joyPointer === null) {
        this.joyPointer = p.id;
        this.joyOrigin = { x: p.x, y: p.y };
        this.joyBase.setPosition(p.x, p.y).setVisible(true);
        this.joyKnob.setPosition(p.x, p.y).setVisible(true);
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointer) return;
      let dx = p.x - this.joyOrigin.x;
      let dy = p.y - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > JOY_R) {
        dx = (dx / len) * JOY_R;
        dy = (dy / len) * JOY_R;
      }
      this.joyKnob.setPosition(this.joyOrigin.x + dx, this.joyOrigin.y + dy);
      this.world.setJoystick(dx / JOY_R, dy / JOY_R);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointer) return;
      this.joyPointer = null;
      this.joyBase.setVisible(false);
      this.joyKnob.setVisible(false);
      this.world.setJoystick(0, 0);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    this.bindWorld();
    this.input.keyboard?.on('keydown-ESC', () => this.closeOverlay());
    this.input.keyboard?.on('keydown-J', () => (this.overlay ? this.closeOverlay() : this.openJournal('journey')));
    this.input.keyboard?.on('keydown-M', () => (this.overlay ? this.closeOverlay() : this.openMap()));
    const bagKey = () => (this.overlay ? this.closeOverlay() : this.openBag());
    this.input.keyboard?.on('keydown-B', bagKey);
    this.input.keyboard?.on('keydown-I', bagKey);

    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.layout();
    this.world.pushHud(true);
  }

  /** The world scene restarts on every door; re-bind its events each time. */
  private bindWorld() {
    const w = this.scene.get('World') as WorldScene;
    this.world = w;
    const f = w.events;
    // the world scene object survives area changes; drop the listeners from the previous visit
    for (const ev of ['hud', 'toast', 'openStall', 'openStore', 'openTailor', 'openPetshop', 'openFurnshop', 'openWardrobe', 'openMail', 'openCounter', 'openRecipes', 'openBoard', 'openSign', 'openLoveTree', 'cookResult', 'away', 'progress', 'guideEdge', 'postcard', 'coopInvite', 'notes', 'dialog', 'catch', 'openSeedMaker', 'photo', 'gifts', 'openMachine']) f.removeAllListeners(ev);
    f.on('hud', (d: HudData) => this.refresh(d));
    f.on('toast', (msg: string) => this.showToast(msg));
    f.on('openStall', () => this.openStall('seeds'));
    f.on('openStore', () => this.openStore('seeds'));
    f.on('openFurnshop', () => {
      this.shopSel = null;
      this.openFurnshop('living');
    });
    f.on('openTailor', () => {
      this.shopSel = null;
      this.page = 0;
      this.openClothes('buy', 'looks');
    });
    f.on('openPetshop', () => this.openPetshop('pets'));
    f.on('openSeedMaker', () => this.openSeedMaker());
    f.on('photo', (p: Photo) => this.showPhoto(p));
    f.on('gifts', () => this.openGiftReveal());
    f.on('openWardrobe', () => {
      this.shopSel = null;
      this.page = 0;
      this.openClothes('equip', 'looks');
    });
    f.on('openMail', () => this.openMail('letter'));
    f.on('openCounter', () => this.openCounter());
    f.on('openRecipes', () => this.openRecipes(0));
    f.on('openBoard', () => this.openBoard());
    f.on('openMachine', (id: MachineId) => this.openMachine(id));
    f.on('openSign', (t: string) => this.openSign(t));
    f.on('openLoveTree', () => this.openLoveTree());
    f.on('dialog', (d: { name: string; text: string; villager?: { id: string; hearts: number; canGift: boolean } }) => this.showDialog(d.name, d.text, d.villager));
    f.on('catch', (c: { id: FishId; size: number; isNew: boolean; record: boolean; bonus: number }) => this.showCatch(c));
    f.on('cookResult', (r: CookResult) => this.openCookResult(r));
    f.on('away', (a: AwaySummary) => this.openAway(a));
    f.on('progress', (events: ProgressEvent[]) => this.onProgress(events));
    f.on('guideEdge', (angle: number | null) => this.setEdgeArrow(angle));
    f.on('postcard', (c: Postcard) => this.showPostcard(c));
    f.on('coopInvite', (m: { from: PlayerId; recipe: RecipeId; session: string }) => this.openCoopInvite(m));
    f.on('notes', () => this.refreshNotesBadge());
    f.once('shutdown', () => {
      this.setEdgeArrow(null);
      this.closeOverlay();
      this.closeDialog();
      this.time.delayedCall(50, () => {
        if (this.scene.isActive('World')) this.bindWorld();
        else this.time.delayedCall(300, () => this.scene.isActive('World') && this.bindWorld());
      });
    });
  }

  private iconButton(icon: string, onClick: () => void) {
    const g = this.add.graphics();
    panel(g, -9, -9, 18, 18, 0xfff4dc);
    const img = this.add.image(0, 0, 'icons', icon);
    const z = this.add.zone(0, 0, 20, 20).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => {
      audio.play('blip');
      onClick();
    });
    return this.add.container(0, 0, [g, img, z]);
  }

  private smallButton(label: string, onClick: () => void, color: number) {
    const b = button(this, 0, 0, 56, 16, label, onClick, color);
    return b.container;
  }

  private layout() {
    const { width: W, height: H } = this.scale;
    this.hotbar.setPosition(Math.round(W / 2 - 80), H - 24);
    this.actionBtn.setPosition(W - 30, H - 32);
    this.hint.setPosition(W / 2, H - 30);
    this.menuBtn.setPosition(W - 14, 12);
    this.mapBtn.setPosition(W - 36, 12);
    this.helpBtn.setPosition(W - 58, 12);
    this.questBox.setPosition(W - 72, 12);
    this.emoteBtn.setPosition(W - 30, H - 78);
    this.rideBtn.setPosition(W - 58, H - 78);
    this.bagBtn.setPosition(18, 46);
    this.decorBtn.setPosition(6, 64);
    this.decorStop.setPosition(6, 64);
    this.areaText.setOrigin(1, 0).setPosition(W - 8, 26);
    this.partnerText.setOrigin(1, 0).setPosition(W - 8, 38);
    this.weatherIcon.setPosition(W - 8 - this.areaText.width - 10, 32);
    if (this.overlay) {
      // an open panel re-fits when the window changes, so turning a phone or
      // dragging a window edge never leaves half of it off screen
      const size = this.overlay.getData('size') as { w: number; h: number } | undefined;
      if (size) {
        this.tweens.killTweensOf(this.overlay);
        this.overlay.setScale(Math.min(1, (W - 8) / size.w, (H - 6) / size.h));
      }
      this.overlay.setPosition(Math.round(W / 2), Math.round(H / 2));
    }
    this.emoteRow?.setPosition(W - 30, H - 100);
    if (this.last) this.refresh(this.last);
  }

  private refresh(d: HudData) {
    this.last = d;
    this.coinText.setText(String(d.coins));
    this.repText.setText(String(Math.floor(d.reputation)));
    this.statusGfx.clear();
    pill(this.statusGfx, 4, 4, 18 + this.coinText.width, 16, 0xfff4dc);
    pill(this.statusGfx, 4, 21, 65 + this.repText.width, 16, 0xfff4dc);
    this.repBar.clear();
    meter(this.repBar, 22, 26, 44, 6, d.reputation / 100, 0xe05fa8);
    // bag badge: produce + dishes carried; a little hop when something new goes in
    let total = d.dishes;
    for (const id of SELLABLE) total += d.inventory[id] ?? 0;
    this.bagBadge.setText(total > 99 ? '99+' : String(total)).setColor(d.dishes >= d.dishCap ? '#ff6b6b' : '#ffffff');
    if (this.lastBagTotal >= 0 && total > this.lastBagTotal && !this.tweens.isTweening(this.bagBtn)) this.tweens.add({ targets: this.bagBtn, y: this.bagBtn.y - 4, duration: 90, yoyo: true });
    this.lastBagTotal = total;
    // hotbar: only crops you own seeds of or that are unlocked
    this.slotSeeds = CROP_IDS.filter((c) => (d.inventory[`seed:${c}`] ?? 0) > 0 || CROPS[c].unlockRep <= d.reputation);
    const n = this.slotSeeds.length;
    this.hotbar.setPosition(Math.round(this.scale.width / 2 - n * 10), this.scale.height - 24);
    this.trayGfx.clear();
    if (n) this.trayGfx.fillStyle(0x2d1b33, 0.4).fillRoundedRect(-4, -4, n * 20 + 8, 28, 6);
    for (let i = 0; i < 8; i++) {
      const id = this.slotSeeds[i];
      const g = this.slotGfx[i];
      g.clear();
      const vis = !!id;
      this.slotIcons[i].setVisible(vis);
      this.slotCounts[i].setVisible(vis);
      if (!id) continue;
      // the chosen one stands proud, the rest are cut into the tray
      (d.selectedSeed === id ? panel : inset)(g, i * 20, 0, 20, 20, d.selectedSeed === id ? 0xffe066 : 0xfff4dc, d.selectedSeed === id ? 0xff8fcf : 0x4a2a3f);
      this.slotIcons[i].setFrame(`seed-${id}`);
      this.slotCounts[i].setText(String(d.inventory[`seed:${id}`] ?? 0));
    }
    // action
    const a = d.action;
    this.actionGfx.clear();
    const on = !!a && a.enabled;
    this.actionGfx.fillStyle(0x4a2a3f, 1).fillCircle(0, 2, 22);
    this.actionGfx.fillStyle(on ? 0xffd23f : 0xd9c9b8, 1).fillCircle(0, 0, 21);
    this.actionGfx.fillStyle(0xffffff, on ? 0.45 : 0.2).fillCircle(-5, -7, 6);
    this.actionLabel.setText(a ? a.label : '').setColor(on ? P.outline : '#8a7a70').setFontSize(a && a.label.length > 7 ? '6px' : '8px');
    this.actionBtn.setAlpha(a ? 1 : 0.55);
    const mounts = d.mounts ?? [];
    this.rideBtn.setVisible(mounts.length > 0 && !d.decorate);
    if (mounts.length) {
      const next = d.mount === null ? mounts[0] : (mounts[(mounts.indexOf(d.mount) + 1) % (mounts.length + 1)] ?? null);
      this.rideIcon.setTexture('icons', next === 'bike' ? 'bike' : next === 'car' ? 'car' : 'horse');
      this.rideIcon.setAlpha(next ? 1 : 0.5);
    }
    // quest ticker
    this.questGfx.clear();
    if (d.quest) {
      // fit between the coins on the left and the three buttons on the right
      const prog = d.quest.target > 1 ? ` ${d.quest.progress}/${d.quest.target}` : '';
      const maxChars = Math.max(8, Math.floor((this.scale.width - 150) / 8));
      let title = d.quest.title;
      if (title.length + prog.length > maxChars) title = `${title.slice(0, Math.max(3, maxChars - prog.length - 1))}…`;
      const txt = `${title}${prog}`;
      this.questText.setText(txt);
      const w = Math.min(this.questText.width + 14, this.scale.width - 150);
      const stepped = d.quest.target > 1;
      const h = stepped ? 24 : 18;
      panel(this.questGfx, -w, -h / 2, w, h, 0xfff4dc);
      this.questText.setPosition(-w + 7, stepped ? -3 : 0);
      if (stepped) meter(this.questGfx, -w + 7, 5, w - 14, 5, d.quest.progress / d.quest.target, 0x7de8c8);
      (this.questBox.list[2] as Phaser.GameObjects.Zone).setPosition(-w, 0).setSize(w, h);
    } else this.questText.setText('');
    // area & weather & partner
    this.areaText.setText(d.areaName + (d.special ? `  *${d.special}*` : ''));
    this.weatherIcon.setFrame(d.weather === 'rain' ? 'rain' : d.weather === 'cloudy' ? 'cloud' : 'sun');
    this.weatherIcon.setVisible(AREAS[d.area].outdoor);
    this.weatherIcon.setPosition(this.scale.width - 8 - this.areaText.width - 10, 32);
    if (d.partner) {
      this.partnerText.setText(d.partner.online ? `${d.partner.id} is ${d.partner.area === d.area ? 'here' : d.partner.area ? `at ${AREAS[d.partner.area].name}` : 'online'}` : `${d.partner.id} is away`).setColor(d.partner.online ? '#7de8c8' : '#d9c9b8');
    } else this.partnerText.setText(d.online ? '' : 'solo');
    this.emoteBtn.setVisible(!!d.partner?.online);
    this.decorBtn.setVisible(d.area === 'home' && !d.decorate);
    this.decorStop.setVisible(!!d.decorate);
  }

  // ---------- catches, gifts and the book ----------

  private showCatch(c: { id: FishId; size: number; isNew: boolean; record: boolean; bonus: number }) {
    const f = FISH[c.id];
    const colors: Record<string, string> = { common: '#7a6a70', uncommon: '#3f9a5f', rare: '#3f7fd0', legendary: '#e6a800' };
    const w = 250;
    const h = 118;
    const o = this.openOverlay(w, h, c.isNew ? 'New fish for the book!' : 'Nice catch!');
    const icon = this.add.image(-78, 2, 'icons', `fish-${c.id}`).setScale(4);
    o.add(icon);
    this.tweens.add({ targets: icon, angle: 8, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    o.add(this.add.text(-40, -26, f.name, style({ fontSize: '10px', color: '#fff4dc' })).setOrigin(0, 0.5));
    o.add(this.add.text(-40, -10, f.rarity.toUpperCase(), plain({ color: colors[f.rarity] })).setOrigin(0, 0.5));
    o.add(this.add.text(-40, 4, `${c.size} cm${c.record ? '  Record!' : ''}`, plain({ color: c.record ? '#e05fa8' : '#4a2a3f' })).setOrigin(0, 0.5));
    o.add(this.add.text(-40, 18, `+${f.units} fish${c.bonus ? `, +${c.bonus} coins` : ''}`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    const ok = button(this, -30, h / 2 - 24, 60, 16, 'Yay!', () => this.closeOverlay(), 0x7de8c8);
    o.add(ok.container);
    if (f.rarity === 'rare' || f.rarity === 'legendary') {
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(Phaser.Math.Between(-110, 110), Phaser.Math.Between(-40, 30), 'icons', 'star').setScale(0.8);
        o.add(s);
        this.tweens.add({ targets: s, y: s.y - 18, alpha: 0, duration: 900, delay: i * 140, repeat: -1 });
      }
    }
  }

  private giftName(key: string) {
    if (key.startsWith('dish:')) return RECIPES[key.slice(5) as RecipeId]?.name ?? key;
    return ITEMS[key as ItemId]?.name ?? key;
  }

  /** Pick something from the bag to give; loved gifts you already know are starred. */
  private openGiftPicker(id: string, name: string) {
    const st = this.world.state;
    const v = villager(id);
    if (!v) return;
    const w = 300;
    const h = 150;
    const c = this.openOverlay(w, h, `A gift for ${name}`);
    const entries: { key: string; icon: string; count: number }[] = [];
    for (const it of SELLABLE) if (st.count(it) > 0) entries.push({ key: it, icon: ITEMS[it].icon, count: st.count(it) });
    const dishCounts = new Map<string, number>();
    for (const d of st.world.dishes) dishCounts.set(d.recipe, (dishCounts.get(d.recipe) ?? 0) + 1);
    for (const [r, n] of dishCounts) entries.push({ key: `dish:${r}`, icon: `dish-${r}`, count: n });
    const loved = knownLoves(st.world, v);
    const top = -h / 2 + 24;
    if (!entries.length) {
      c.add(this.add.text(0, 0, 'Nothing to give yet.\nHarvest or cook first!', plain({ color: '#7a6a70', align: 'center' })).setOrigin(0.5));
      return;
    }
    const cols = 10;
    const slot = 26;
    const x0 = -(cols * slot) / 2;
    entries.slice(0, 30).forEach((e, i) => {
      const sx = x0 + (i % cols) * slot;
      const sy = top + Math.floor(i / cols) * slot;
      const g = this.add.graphics();
      inset(g, sx, sy, 24, 24, loved.includes(e.key) ? 0xffe8f4 : 0xffffff, loved.includes(e.key) ? 0xff8fcf : 0x4a2a3f);
      c.add(g);
      c.add(this.add.image(sx + 12, sy + 11, 'icons', e.icon).setScale(1.5));
      if (e.count > 1) c.add(this.add.text(sx + 25, sy + 26, String(e.count), tiny()).setOrigin(1, 1));
      if (loved.includes(e.key)) c.add(this.add.image(sx + 5, sy + 5, 'icons', 'heart').setScale(0.6));
      const z = this.add.zone(sx + 12, sy + 12, 24, 24).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        const r = this.world.giveGift(id, e.key);
        this.closeOverlay();
        if (!r) return;
        const lines = GIFT_LINES[r.reaction];
        this.showDialog(name, lines[Math.floor(Math.random() * lines.length)], { id, hearts: r.hearts, canGift: false });
      });
      c.add(z);
    });
    const hearts = heartsFor(friendPoints(st.world, id));
    c.add(this.add.text(0, h / 2 - 22, loved.length ? `${name} loves: ${loved.map((k) => this.giftName(k)).join(', ')}` : `Find out what ${name} loves`, plain({ color: '#e05fa8' })).setOrigin(0.5));
    c.add(this.add.text(0, h / 2 - 9, `One gift a day   Hearts ${hearts}/5`, plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  private bookTab: 'cards' | 'photos' | 'fish' | 'dishes' | 'friends' = 'cards';
  private bookSel: string | null = null;

  /** The Book: postcards, fish, dishes and friends collected so far. */
  private bookPage(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const st = this.world.state;
    const wd = st.world;
    const tabs: [typeof this.bookTab, string][] = [
      ['cards', 'Cards'],
      ['photos', 'Photos'],
      ['fish', 'Fish'],
      ['dishes', 'Dishes'],
      ['friends', 'Friends'],
    ];
    tabs.forEach(([id, label], i) => {
      const tw = Math.floor((w - 16) / tabs.length);
      const b = button(this, -w / 2 + 8 + i * tw, top - 6, tw - 4, 16, label, () => {
        this.bookTab = id;
        this.bookSel = null;
        this.page = 0;
        this.openJournal('album');
      }, this.bookTab === id ? 0xffe066 : 0xe8dcc8);
      c.add(b.container);
    });
    const y0 = top + 18;

    if (this.bookTab === 'cards') {
      const cards = wd.postcards;
      if (!cards.length) c.add(this.add.text(0, y0 + 44, 'Postcards appear at special moments', plain({ color: '#7a6a70' })).setOrigin(0.5));
      const card = cards[this.page % Math.max(1, cards.length)];
      if (card) this.drawPostcard(c, card, 0, y0 + 50);
      this.pager(c, w, h, this.page % Math.max(1, cards.length), Math.max(1, cards.length), (p) => {
        this.page = p;
        this.openJournal('album');
      });
      return;
    }

    if (this.bookTab === 'photos') {
      const photos = [...(wd.photos ?? [])].reverse();
      if (!photos.length) c.add(this.add.text(0, y0 + 48, 'Find the camera spots around the world.\nTogether, you both end up in the photo!', plain({ color: '#7a6a70', align: 'center' })).setOrigin(0.5));
      const per = 2;
      const pages = Math.max(1, Math.ceil(photos.length / per));
      const page = this.page % pages;
      photos.slice(page * per, page * per + per).forEach((p, i) => {
        this.drawPhoto(c, p, (i === 0 ? -1 : 1) * 76, y0 + 54, 1);
        const z = this.add.zone((i === 0 ? -1 : 1) * 76, y0 + 54, 112, 92).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => this.showPhoto(p));
        c.add(z);
      });
      this.pager(c, w, h, page, pages, (p) => {
        this.page = p;
        this.openJournal('album');
      });
      return;
    }

    if (this.bookTab === 'fish') {
      const colors: Record<string, string> = { common: '#7a6a70', uncommon: '#3f9a5f', rare: '#3f7fd0', legendary: '#e6a800' };
      const slot = 32;
      const x0 = -(5 * slot) / 2;
      let caught = 0;
      FISH_IDS.forEach((id, i) => {
        const sx = x0 + (i % 5) * slot;
        const sy = y0 + Math.floor(i / 5) * slot;
        const have = (wd.stats[`fish:${id}`] ?? 0) > 0;
        if (have) caught++;
        const sel = this.bookSel === id;
        const g = this.add.graphics();
        panel(g, sx, sy, 29, 29, sel ? 0xffe066 : have ? 0xffffff : 0xefe4d2, sel ? 0xff8fcf : 0x4a2a3f);
        c.add(g);
        const img = this.add.image(sx + 14.5, sy + 14.5, 'icons', `fish-${id}`).setScale(2);
        if (!have) img.setTint(0x4a2a3f).setAlpha(0.35);
        c.add(img);
        const z = this.add.zone(sx + 14.5, sy + 14.5, 29, 29).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => {
          this.bookSel = id;
          this.openJournal('album');
        });
        c.add(z);
      });
      const sel = (this.bookSel as FishId | null) ?? FISH_IDS[0];
      const f = FISH[sel];
      const have = (wd.stats[`fish:${sel}`] ?? 0) > 0;
      const dy = y0 + 2 * slot + 14;
      this.rowCard(c, -w / 2 + 10, dy - 10, w - 20, 44, null, 0xfffdf9);
      c.add(this.add.text(-w / 2 + 18, dy, have ? f.name : '???', plain()).setOrigin(0, 0.5));
      c.add(this.add.text(w / 2 - 18, dy, f.rarity.toUpperCase(), plain({ color: colors[f.rarity] })).setOrigin(1, 0.5));
      c.add(this.add.text(-w / 2 + 18, dy + 13, f.hint, note({ color: '#6a5560' })).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 18, dy + 25, have ? `Caught ${wd.stats[`fish:${sel}`]}   ·   Best ${wd.stats[`fishbest:${sel}`] ?? 0} cm` : 'Not caught yet', note({ color: '#9a5b00' })).setOrigin(0, 0.5));
      c.add(this.add.text(0, h / 2 - 10, `${caught} / ${FISH_IDS.length} fish discovered`, note({ color: '#7a6a70' })).setOrigin(0.5));
      return;
    }

    if (this.bookTab === 'dishes') {
      const ids = Object.keys(RECIPES) as RecipeId[];
      const cols = 9;
      const slot = 32;
      const x0 = -(cols * slot) / 2;
      let cooked = 0;
      ids.forEach((id, i) => {
        const sx = x0 + (i % cols) * slot;
        const sy = y0 + Math.floor(i / cols) * slot;
        const best = wd.stats[`best:${id}`] ?? 0;
        const times = wd.stats[`cook:r:${id}`] ?? 0;
        if (times > 0) cooked++;
        const sel = this.bookSel === id;
        const g = this.add.graphics();
        panel(g, sx, sy, 29, 29, sel ? 0xffe066 : times ? 0xffffff : 0xefe4d2, sel ? 0xff8fcf : 0x4a2a3f);
        c.add(g);
        c.add(this.add.image(sx + 14.5, sy + 13.5, 'icons', `dish-${id}`).setScale(1.6).setAlpha(times ? 1 : 0.3));
        if (best) c.add(this.add.text(sx + 27, sy + 28, GRADE_NAMES[best - 1], style({ color: ['#cfcfd9', '#ffffff', '#7de8c8', '#ffe066'][best - 1] })).setOrigin(1, 1));
        const z = this.add.zone(sx + 14.5, sy + 14.5, 29, 29).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => {
          this.bookSel = id;
          this.openJournal('album');
        });
        c.add(z);
      });
      const sel = (this.bookSel as RecipeId | null) ?? ids[0];
      const r = RECIPES[sel];
      const times = wd.stats[`cook:r:${sel}`] ?? 0;
      const best = wd.stats[`best:${sel}`] ?? 0;
      const dy = y0 + 2 * slot + 16;
      this.rowCard(c, -w / 2 + 10, dy - 10, w - 20, 32, null, 0xfffdf9);
      c.add(this.add.text(-w / 2 + 18, dy, r.name, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(w / 2 - 18, dy, `${r.basePrice}c`, plain({ color: '#9a5b00' })).setOrigin(1, 0.5));
      const lock = r.book ? BOOKS[r.book].name : `reputation ${r.unlockRep}`;
      c.add(this.add.text(-w / 2 + 18, dy + 13, times ? `Best grade ${GRADE_NAMES[best - 1] ?? '-'}  ·  Cooked ${times} times` : recipeUnlocked(r, st.reputation, wd.books) ? 'Not cooked yet' : `Unlocks with ${lock}`, note({ color: '#6a5560' })).setOrigin(0, 0.5));
      c.add(this.add.text(0, h / 2 - 10, `${cooked} / ${ids.length} recipes cooked`, note({ color: '#7a6a70' })).setOrigin(0.5));
      return;
    }

    // friends: 4 per page
    const per = 4;
    const pages = Math.ceil(VILLAGERS.length / per);
    const page = this.page % pages;
    VILLAGERS.slice(page * per, page * per + per).forEach((v, i) => {
      const y = y0 + 14 + i * 29;
      const pts = friendPoints(wd, v.id);
      const hearts = heartsFor(pts);
      this.rowCard(c, -w / 2 + 10, y - 13, w - 20, 26, { key: 'icons', frame: 'heart' }, 0xfffdf9, 0xffe8f4);
      c.add(this.add.text(-w / 2 + 36, y - 5, v.name, plain()).setOrigin(0, 0.5));
      for (let k = 0; k < 5; k++) c.add(this.add.image(w / 2 - 64 + k * 11, y - 5, 'icons', 'heart').setScale(0.75).setAlpha(k < hearts ? 1 : 0.35));
      const loved = knownLoves(wd, v);
      const line = loved.length ? `Loves ${loved.map((k) => this.giftName(k)).join(', ')}` : v.where;
      c.add(this.add.text(-w / 2 + 36, y + 6, line.length > 42 ? `${line.slice(0, 41)}…` : line, note({ color: loved.length ? '#d94b94' : '#6a5560' })).setOrigin(0, 0.5));
    });
    this.pager(c, w, h, page, pages, (p) => {
      this.page = p;
      this.openJournal('album');
    });
  }

  // ---------- dialogue box (villagers) ----------

  private dialog?: Phaser.GameObjects.Container;
  private dialogTimer?: Phaser.Time.TimerEvent;

  /** Pokemon-style text box along the bottom with a name tag. Tap it or wait to close. */
  private showDialog(name: string, text: string, friend?: { id: string; hearts: number; canGift: boolean }) {
    this.dialog?.destroy();
    this.dialogTimer?.remove();
    const { width: W, height: H } = this.scale;
    const w = Math.min(300, W - 72);
    const t = this.add.text(-w / 2 + 10, -8, text, plain({ wordWrap: { width: w - 20 }, lineSpacing: 3 })).setOrigin(0, 0);
    const h = Math.max(30, t.height + 18);
    const g = this.add.graphics();
    panel(g, -w / 2, -h / 2 - 2, w, h, 0xfff4dc);
    t.setY(-h / 2 + 8);
    const tagW = name.length * 8 + 12;
    const tag = this.add.graphics();
    panel(tag, -w / 2 + 6, -h / 2 - 12, tagW, 14, 0xffd23f);
    const tagText = this.add.text(-w / 2 + 6 + tagW / 2, -h / 2 - 5, name, plain()).setOrigin(0.5);
    const arrow = this.add.text(w / 2 - 10, h / 2 - 10, '▼', plain({ color: '#b07a00' })).setOrigin(0.5);
    this.tweens.add({ targets: arrow, y: arrow.y + 2, duration: 400, yoyo: true, repeat: -1 });
    const zone = this.add.zone(0, 0, w, h).setInteractive();
    const extra: Phaser.GameObjects.GameObject[] = [];
    if (friend) {
      // friendship hearts next to the name tag, and a gift button while one is allowed today
      for (let i = 0; i < 5; i++) extra.push(this.add.image(-w / 2 + 12 + tagW + i * 9, -h / 2 - 5, 'icons', 'heart').setScale(0.7).setAlpha(i < friend.hearts ? 1 : 0.4));
      if (friend.canGift) {
        const gift = button(this, w / 2 - 52, -h / 2 - 14, 46, 14, 'Gift', () => {
          this.closeDialog();
          this.openGiftPicker(friend.id, name);
        }, 0xff8fcf);
        extra.push(gift.container);
      }
    }
    const c = this.add.container(Math.round(W / 2 - 18), Math.round(H - 30 - h / 2), [g, t, tag, tagText, arrow, zone, ...extra]).setDepth(45);
    zone.on('pointerdown', () => this.closeDialog());
    this.dialog = c;
    c.setScale(0.9);
    this.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.dialogTimer = this.time.delayedCall(Math.max(friend?.canGift ? 7000 : 3500, text.length * 90), () => this.closeDialog());
  }

  private closeDialog() {
    this.dialog?.destroy();
    this.dialog = undefined;
    this.dialogTimer?.remove();
    this.dialogTimer = undefined;
  }

  // ---------- toast & banners ----------

  private showToast(msg: string) {
    this.toast?.destroy();
    const { width: W } = this.scale;
    const t = this.add.text(0, 0, msg, plain({ align: 'center', wordWrap: { width: W - 40 } })).setOrigin(0.5);
    const g = this.add.graphics();
    panel(g, -t.width / 2 - 6, -t.height / 2 - 4, t.width + 12, t.height + 8, 0xfff4dc);
    const c = this.add.container(Math.round(W / 2), -20, [g, t]).setDepth(50);
    this.toast = c;
    this.tweens.add({ targets: c, y: 44, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c,
      y: -20,
      duration: 300,
      delay: 3200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        c.destroy();
        if (this.toast === c) this.toast = undefined;
      },
    });
  }

  private bannerQueue: { title: string; sub: string; big: boolean }[] = [];
  private bannerBusy = false;

  /** Task, chapter and daily completions arrive in bursts; show them one at a time. */
  private onProgress(events: ProgressEvent[]) {
    for (const e of events) {
      if (e.kind === 'task') this.bannerQueue.push({ title: `Done: ${e.title}`, sub: `+${e.reward} coins`, big: false });
      else if (e.kind === 'daily') this.bannerQueue.push({ title: `Daily: ${e.title}`, sub: `+${e.reward} coins`, big: false });
      else if (e.kind === 'dailyAll') this.bannerQueue.push({ title: 'All daily tasks done!', sub: `+${e.reward} coins, +1 reputation`, big: true });
      else if (e.kind === 'bond') this.bannerQueue.push({ title: `Bond level ${e.level}!`, sub: e.text, big: true });
      else if (e.kind === 'match') this.bannerQueue.push({ title: 'Matching outfits!', sub: `Twinning with ${e.partner}, +bond`, big: false });
      else if (e.kind === 'friend') this.bannerQueue.push({ title: `${e.name}: ${e.hearts} heart${e.hearts === 1 ? '' : 's'}`, sub: e.text, big: e.text !== `${e.name} likes you more` });
      else {
        this.bannerQueue.push({ title: `Chapter ${e.number} complete!`, sub: e.rewardText, big: true });
        if (e.next) this.bannerQueue.push({ title: `Next chapter: ${e.next}`, sub: 'Tap the task bar to see it', big: false });
      }
    }
    this.nextBanner();
  }

  private nextBanner() {
    if (this.bannerBusy) return;
    const b = this.bannerQueue.shift();
    if (!b) return;
    this.bannerBusy = true;
    const { width: W } = this.scale;
    const t1 = this.add.text(8, -6, b.title, plain()).setOrigin(0.5);
    const t2 = this.add.text(8, 6, b.sub, plain({ color: '#b07a00' })).setOrigin(0.5);
    const w = Math.min(W - 16, Math.max(t1.width, t2.width) + 40);
    const g = this.add.graphics();
    panel(g, -w / 2, -16, w, 32, b.big ? 0xffe066 : 0xfff4dc, b.big ? 0xff8fcf : 0x4a2a3f);
    const star = this.add.image(-w / 2 + 14, 0, 'icons', b.big ? 'star' : 'book');
    const c = this.add.container(Math.round(W / 2), -24, [g, star, t1, t2]).setDepth(60);
    if (b.big) this.tweens.add({ targets: star, angle: 360, duration: 1200, repeat: -1 });
    this.tweens.add({ targets: c, y: 64, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c,
      y: -24,
      duration: 260,
      delay: b.big ? 2600 : 1500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        c.destroy();
        this.bannerBusy = false;
        this.nextBanner();
      },
    });
  }

  private edgeArrow?: Phaser.GameObjects.Container;

  /** Arrow at the screen edge pointing toward the next task when it is off screen. */
  private setEdgeArrow(angle: number | null) {
    if (angle === null) {
      this.edgeArrow?.setVisible(false);
      return;
    }
    if (!this.edgeArrow) {
      const g = this.add.graphics();
      g.fillStyle(0x4a2a3f, 1).fillTriangle(10, 0, -7, -8, -7, 8);
      g.fillStyle(0xffd23f, 1).fillTriangle(7, 0, -5, -6, -5, 6);
      this.edgeArrow = this.add.container(0, 0, [g]).setDepth(35);
      this.tweens.add({ targets: g, x: 3, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const { width: W, height: H } = this.scale;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const k = Math.min((W / 2 - 22) / Math.max(Math.abs(dx), 1e-6), (H / 2 - 34) / Math.max(Math.abs(dy), 1e-6));
    this.edgeArrow.setPosition(Math.round(W / 2 + dx * k), Math.round(H / 2 + dy * k)).setRotation(angle).setVisible(true);
  }

  private pendingPostcards: Postcard[] = [];

  /** Postcards wait until no other panel is open, so they never cover a result screen. */
  private showPostcard(card: Postcard) {
    this.pendingPostcards.push(card);
    this.flushPostcards();
  }

  private flushPostcards() {
    if (!this.pendingPostcards.length) return;
    if (this.overlay || this.world.isUiOpen()) {
      this.time.delayedCall(600, () => this.flushPostcards());
      return;
    }
    const card = this.pendingPostcards.shift() as Postcard;
    audio.play('great');
    const c = this.openOverlay(250, 124, 'New postcard!');
    this.drawPostcard(c, card, 0, 2);
    c.add(this.add.text(0, 50, 'Saved in your Book', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  private drawPostcard(c: Phaser.GameObjects.Container, card: Postcard, x: number, y: number) {
    const g = this.add.graphics();
    panel(g, x - 80, y - 36, 160, 72, 0xffffff);
    g.fillStyle(0x7ecbff, 1).fillRect(x - 78, y - 34, 156, 40);
    g.fillStyle(0x8ad84f, 1).fillRect(x - 78, y + 6, 156, 28);
    c.add(g);
    if (card.scene === 'tree') c.add(this.add.image(x, y + 10, 'furniture', 'lovetree5').setOrigin(0.5, 1));
    if (card.scene === 'restaurant') c.add(this.add.image(x, y + 10, 'buildings', 'restaurant').setOrigin(0.5, 1).setScale(0.5));
    if (card.scene === 'pet') c.add(this.add.image(x + 22, y + 12, 'critters', 'dog0').setOrigin(0.5, 1));
    const players = this.world.state.world.players;
    c.add(this.add.image(x - 12, y + 16, buildCharacterTexture(this, LOOKS.xb, players.xb.outfit), 0).setOrigin(0.5, 1));
    c.add(this.add.image(x + 6, y + 16, buildCharacterTexture(this, LOOKS.qd, players.qd.outfit), 0).setOrigin(0.5, 1));
    if (card.scene === 'first_dish' || card.scene === 's_dish') c.add(this.add.image(x - 3, y - 12, 'icons', 'dish-tomato_soup').setScale(1.5));
    if (card.scene === 'rich') c.add(this.add.image(x - 3, y - 12, 'icons', 'coin').setScale(1.5));
    if (card.scene === 'together' || card.scene === 'first_sale' || card.scene === 'orders') c.add(this.add.image(x - 3, y - 14, 'icons', 'heart').setScale(1.5));
    // the frame ends at y + 36, and a line of this font is twelve pixels tall
    c.add(this.add.text(x, y + 19, card.title, plain({ color: P.outline })).setOrigin(0.5, 0.5));
    c.add(this.add.text(x, y + 29, card.day, plain({ color: '#6a5a60' })).setOrigin(0.5, 0.5));
  }

  // ---------- overlays ----------

  private openOverlay(w: number, h: number, title: string): Phaser.GameObjects.Container {
    this.closeOverlay();
    const { width: W, height: H } = this.scale;
    // Panels are laid out at their designed size and the whole thing is shrunk
    // to fit the screen. Clamping the size instead used to cut off the bottom
    // row on short screens, because the contents were still placed for the
    // size the panel asked for.
    const fit = Math.min(1, (W - 8) / w, (H - 6) / h);
    const dim = this.add.rectangle(0, 0, W * 3, H * 3, 0x2a1a2f, 0.48).setInteractive();
    const g = this.add.graphics();
    panel(g, -w / 2, -h / 2, w, h, 0xfff4dc);
    titleBar(g, -w / 2 + 2, -h / 2 + 2, w - 4, 17);
    const t = this.add.text(0, -h / 2 + 10.5, title, plain()).setOrigin(0.5);
    const close = button(this, w / 2 - 18, -h / 2 + 3, 15, 15, 'x', () => this.closeOverlay(), 0xff8fcf);
    const c = this.add.container(Math.round(W / 2), Math.round(H / 2), [dim, g, t, close.container]).setDepth(100);
    c.setData('size', { w, h });
    this.overlay = c;
    this.world.setUiOpen(true);
    c.setScale(fit * 0.85);
    this.tweens.add({ targets: c, scale: fit, duration: 150, ease: 'Back.easeOut' });
    return c;
  }

  closeOverlay() {
    if (!this.overlay) return;
    this.overlay.destroy();
    this.overlay = undefined;
    this.world.setUiOpen(false);
    if (this.pendingPostcards.length) this.time.delayedCall(400, () => this.flushPostcards());
  }

  /**
   * Tabs as pills. The live one is filled and sits a pixel proud of the rest,
   * so which page you are on reads at a glance instead of by shade.
   */
  private tabs(c: Phaser.GameObjects.Container, w: number, h: number, items: [string, () => void][], active: number) {
    const tw = Math.floor((w - 16) / items.length);
    const g = this.add.graphics();
    c.add(g);
    items.forEach(([label, fn], i) => {
      const live = i === active;
      const x = -w / 2 + 8 + i * tw;
      const y = -h / 2 + (live ? 21 : 22);
      pill(g, x, y, tw - 3, live ? 17 : 15, live ? 0xffd23f : 0xf3e7d4, live ? 0x4a2a3f : 0xd8c4b4);
      c.add(this.add.text(x + (tw - 3) / 2, y + (live ? 8.5 : 7.5), label, plain({ color: live ? '#3b2133' : '#6a5a60' })).setOrigin(0.5));
      const z = this.add.zone(x + (tw - 3) / 2, y + 8, tw - 3, 20).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        audio.play('blip');
        fn();
      });
      c.add(z);
    });
  }

/**
   * The row every list is made of: a raised strip with a tinted tile for the
   * icon, so a row reads as one thing you can act on rather than two lines of
   * text that happen to sit near a button.
   */
  private rowCard(c: Phaser.GameObjects.Container, x: number, y: number, w: number, h: number, icon: { key: string; frame: string } | null, tint = 0xfffaf0, tile = 0xf3e7d4) {
    const g = this.add.graphics();
    g.fillStyle(0xe0cdbb, 1).fillRoundedRect(x, y, w, h, 4);
    g.fillStyle(tint, 1).fillRoundedRect(x + 1, y + 1, w - 2, h - 3, 4);
    c.add(g);
    if (icon) {
      g.fillStyle(0x4a2a3f, 1).fillRoundedRect(x + 4, y + (h - 18) / 2, 18, 18, 4);
      g.fillStyle(tile, 1).fillRoundedRect(x + 5, y + (h - 18) / 2 + 1, 16, 16, 3);
      c.add(this.add.image(x + 13, y + h / 2, icon.key, icon.frame));
    }
    return g;
  }

  /** Pager arrows at the bottom of a panel. */
  private pager(c: Phaser.GameObjects.Container, w: number, h: number, page: number, pages: number, go: (p: number) => void) {
    if (pages <= 1) return;
    c.add(this.add.text(0, h / 2 - 10, `${page + 1} / ${pages}`, plain({ color: '#7a6a70' })).setOrigin(0.5));
    const prev = button(this, -64, h / 2 - 17, 24, 14, '<', () => go((page + pages - 1) % pages), 0xe8dcc8);
    const next = button(this, 40, h / 2 - 17, 24, 14, '>', () => go((page + 1) % pages), 0xe8dcc8);
    c.add([prev.container, next.container]);
    void w;
  }

/** A price in a coin chip, so it reads as money rather than as a number. */
  private priceTag(c: Phaser.GameObjects.Container, x: number, y: number, price: number, canAfford: boolean) {
    const label = this.add.text(x - 2, y, String(price), plain({ color: canAfford ? '#8a5e00' : '#b4432a' })).setOrigin(1, 0.5);
    const g = this.add.graphics();
    pill(g, x - label.width - 16, y - 7, label.width + 18, 14, canAfford ? 0xfff2c2 : 0xffe0dc, canAfford ? 0xd8b45e : 0xd98a7a);
    g.fillStyle(0xffd23f, 1).fillCircle(x - label.width - 8, y, 3);
    g.fillStyle(0x4a2a3f, 1).fillCircle(x - label.width - 8, y, 3).fillStyle(0xffd23f, 1).fillCircle(x - label.width - 8, y, 2);
    c.add(g);
    c.add(label);
  }

  // ---------- stall (farm) ----------
  private openStall(tab: 'seeds' | 'tools' | 'upgrades' | 'sell') {
    const w = 270;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `Farm stall   (coins: ${st.coins})`);
    this.tabs(c, w, h, [
      ['Seeds', () => this.openStall('seeds')],
      ['Tools', () => this.openStall('tools')],
      ['Farm', () => this.openStall('upgrades')],
      ['Sell', () => this.openStall('sell')],
    ], ['seeds', 'tools', 'upgrades', 'sell'].indexOf(tab));
    if (tab === 'seeds') this.seedList(c, w, h, () => this.openStall('seeds'));
    else if (tab === 'tools') this.upgradeList(c, w, h, 'tools', () => this.openStall('tools'));
    else if (tab === 'upgrades') this.upgradeList(c, w, h, 'stall', () => this.openStall('upgrades'));
    else this.sellList(c, w, h, () => this.openStall('sell'));
  }

  private seedList(c: Phaser.GameObjects.Container, w: number, h: number, reopen: () => void) {
    const st = this.world.state;
    const top = -h / 2 + 44;
    CROP_IDS.slice(this.page * 7, this.page * 7 + 7).forEach((id, i) => {
      const y = top + i * ROW;
      const def = CROPS[id];
      const open = st.seedUnlocked(id);
      c.add(this.add.image(-w / 2 + 14, y, 'icons', `seed-${id}`).setAlpha(open ? 1 : 0.4));
      c.add(this.add.text(-w / 2 + 24, y, open ? def.name : `${def.name} (rep ${def.unlockRep})`, plain({ color: open ? P.outline : '#9a8a90' })).setOrigin(0, 0.5));
      if (!open) return;
      c.add(this.add.text(-w / 2 + 104, y, `${def.seedPrice}c`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 136, y, `grows ${this.growText(id)}`, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
      const buy = button(this, w / 2 - 66, y - 7, 28, 14, 'x1', () => this.buySeed(id, 1, reopen));
      const buy5 = button(this, w / 2 - 36, y - 7, 28, 14, 'x5', () => this.buySeed(id, 5, reopen));
      buy.setEnabled(st.coins >= def.seedPrice);
      buy5.setEnabled(st.coins >= def.seedPrice * 5);
      c.add([buy.container, buy5.container]);
    });
    this.pager(c, w, h, this.page, Math.ceil(CROP_IDS.length / 7), (p) => {
      this.page = p;
      reopen();
    });
  }

  private growText(id: CropId) {
    const s = CROPS[id].stageSeconds.reduce((a, b) => a + b, 0);
    return s < 3600 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`;
  }

  private buySeed(id: CropId, qty: number, reopen: () => void) {
    const st = this.world.state;
    if (st.buySeed(id, qty)) {
      audio.play('coin');
      this.showToast(`Bought ${qty} ${CROPS[id].name} seeds`);
      this.world.afterChange();
      reopen();
    } else {
      audio.play('bad');
      this.showToast('Not enough coins!');
    }
  }

  private upgPage = 0;

  /** Returns how many pages the list needed, so callers can keep footers clear of the pager. */
  private upgradeList(c: Phaser.GameObjects.Container, w: number, h: number, shop: 'stall' | 'tools' | 'store' | 'petshop', reopen: () => void): number {
    const st = this.world.state;
    const top = -h / 2 + 46;
    const all = UPGRADE_IDS.filter((u) => UPGRADES[u].shop === shop);
    const per = Math.max(1, Math.floor((h / 2 - 26 - top) / 21));
    const pages = Math.max(1, Math.ceil(all.length / per));
    const page = this.upgPage % pages;
    if (pages > 1)
      this.pager(c, w, h, page, pages, (p) => {
        this.upgPage = p;
        reopen();
      });
    all.slice(page * per, page * per + per).forEach((id, i) => {
      const y = top + i * 21;
      const def = UPGRADES[id];
      const lvl = st.upgradeLevel(id);
      const price = st.upgradePrice(id);
      c.add(this.add.image(-w / 2 + 14, y, 'icons', def.icon));
      const isTool = (TOOL_IDS as string[]).includes(id);
      const lvlText = isTool ? ` (${TOOL_TIERS[lvl]})` : def.prices.length > 1 ? ` ${lvl}/${def.prices.length}` : lvl ? ' (owned)' : '';
      c.add(this.add.text(-w / 2 + 24, y - 5, `${def.name}${lvlText}`, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 24, y + 5, def.desc, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
      if (price !== null) {
        const locked = def.requires && st.upgradeLevel(def.requires) === 0;
        this.priceTag(c, w / 2 - 62, y, price, !locked && st.coins >= price);
        const b = button(this, w / 2 - 58, y - 7, 44, 14, 'Buy', () => {
          if (this.world.purchaseUpgrade(id)) {
            this.showToast(`Bought ${def.name}!`);
            reopen();
          } else audio.play('bad');
        });
        b.setEnabled(st.canBuyUpgrade(id));
        c.add(b.container);
      } else c.add(this.add.text(w / 2 - 20, y, 'max', plain({ color: '#3f9a5f' })).setOrigin(1, 0.5));
    });
    return pages;
  }

  private sellList(c: Phaser.GameObjects.Container, w: number, h: number, reopen: () => void) {
    const st = this.world.state;
    const top = -h / 2 + 44;
    const owned = SELLABLE.filter((id) => st.count(id) > 0);
    if (!owned.length) c.add(this.add.text(0, top + 20, 'Nothing to sell yet', plain({ color: '#7a6a70' })).setOrigin(0.5));
    let total = 0;
    owned.slice(this.page * 6, this.page * 6 + 6).forEach((id, i) => {
      const y = top + i * ROW;
      const price = st.sellPrice(id);
      const base = ITEMS[id].sellPrice;
      const arrow = price > base * 1.08 ? '▲' : price < base * 0.92 ? '▼' : '';
      c.add(this.add.image(-w / 2 + 14, y, 'icons', ITEMS[id].icon));
      c.add(this.add.text(-w / 2 + 24, y, `${ITEMS[id].name} x${st.count(id)}`, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 140, y, `${price}c ${arrow}`, plain({ color: arrow === '▲' ? '#3f9a5f' : arrow === '▼' ? '#d94a4a' : '#b07a00' })).setOrigin(0, 0.5));
      const s1 = button(this, w / 2 - 66, y - 7, 28, 14, 'x1', () => {
        st.sellItem(id, 1);
        audio.play('coin');
        this.world.afterChange();
        reopen();
      }, 0x7de8c8);
      const sa = button(this, w / 2 - 36, y - 7, 28, 14, 'all', () => {
        st.sellItem(id, 999);
        audio.play('coin');
        this.world.afterChange();
        reopen();
      }, 0x7de8c8);
      c.add([s1.container, sa.container]);
    });
    for (const id of owned) total += st.count(id) * st.sellPrice(id);
    if (owned.length) {
      const all = button(this, -w / 2 + 8, h / 2 - 20, 110, 16, `Sell all  +${total}`, () => {
        const r = st.sellAllProduce();
        audio.play('coin');
        this.showToast(`Sold ${r.count} items for ${r.total} coins`);
        this.world.afterChange();
        reopen();
      }, 0x7de8c8);
      c.add(all.container);
    }
    c.add(this.add.text(w / 2 - 8, h / 2 - 12, 'prices change daily', plain({ color: '#7a6a70' })).setOrigin(1, 0.5));
    this.pager(c, w, h, this.page, Math.max(1, Math.ceil(owned.length / 6)), (p) => {
      this.page = p;
      reopen();
    });
  }

  // ---------- town store ----------
  private openStore(tab: 'seeds' | 'books' | 'machines' | 'sell') {
    const w = 280;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `General Store   (coins: ${st.coins})`);
    this.tabs(c, w, h, [
      ['Seeds', () => this.openStore('seeds')],
      ['Books+', () => this.openStore('books')],
      ['Make', () => this.openStore('machines')],
      ['Sell', () => this.openStore('sell')],
    ], ['seeds', 'books', 'machines', 'sell'].indexOf(tab));
    const reopen = () => this.openStore(tab);
    if (tab === 'seeds') this.seedList(c, w, h, reopen);
    else if (tab === 'machines') this.machineList(c, w, h, reopen);
    else if (tab === 'sell') this.sellList(c, w, h, reopen);
    else if (tab === 'books') {
      const top = -h / 2 + 46;
      (Object.keys(BOOKS) as BookId[]).forEach((id, i) => {
        const y = top + i * 18;
        const b = BOOKS[id];
        c.add(this.add.image(-w / 2 + 14, y, 'icons', 'book'));
        c.add(this.add.text(-w / 2 + 24, y - 5, b.name + (st.hasBook(id) ? ' (owned)' : ''), plain()).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 24, y + 5, b.desc, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        if (!st.hasBook(id)) {
          this.priceTag(c, w / 2 - 62, y, b.price, st.coins >= b.price);
          const btn = button(this, w / 2 - 58, y - 7, 44, 14, 'Buy', () => {
            if (st.buyBook(id)) {
              audio.play('coin');
              this.showToast(`New recipes unlocked!`);
              this.world.afterChange();
              reopen();
            } else audio.play('bad');
          });
          btn.setEnabled(st.coins >= b.price);
          c.add(btn.container);
        }
      });
      c.add(this.add.text(-w / 2 + 8, top + 44, 'Restaurant & bag', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
      const ids = UPGRADE_IDS.filter((u) => UPGRADES[u].shop === 'store');
      ids.forEach((id, i) => {
        const y = top + 60 + i * 18;
        const def = UPGRADES[id];
        const lvl = st.upgradeLevel(id);
        const price = st.upgradePrice(id);
        c.add(this.add.image(-w / 2 + 14, y, 'icons', def.icon));
        c.add(this.add.text(-w / 2 + 24, y - 5, `${def.name}${def.prices.length > 1 ? ` ${lvl}/${def.prices.length}` : lvl ? ' (owned)' : ''}`, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 24, y + 5, def.desc, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        if (price !== null) {
          this.priceTag(c, w / 2 - 62, y, price, st.coins >= price);
          const btn = button(this, w / 2 - 58, y - 7, 44, 14, 'Buy', () => {
            if (this.world.purchaseUpgrade(id)) {
              this.showToast(`Bought ${def.name}!`);
              reopen();
            } else audio.play('bad');
          });
          btn.setEnabled(st.canBuyUpgrade(id));
          c.add(btn.container);
        } else c.add(this.add.text(w / 2 - 20, y, 'max', plain({ color: '#3f9a5f' })).setOrigin(1, 0.5));
      });
    }
  }

  // ---------- tailor & wardrobe ----------
  private shopSel: string | null = null;
  private previewFacing = 0;

  /** Scale an image down (or up to maxScale) so it fits a box. */
  private fitImage(img: Phaser.GameObjects.Image, maxW: number, maxH: number, maxScale: number) {
    img.setScale(Math.min(maxScale, maxW / img.width, maxH / img.height));
    return img;
  }

  /** Card-grid clothes shop with a try-on mannequin. 'buy' is Rosa's Tailor, 'equip' is the home wardrobe. */
  /**
   * Whole looks. Five are free from the first morning and hand over their
   * pieces when you wear them, so there is something to mix with on day one;
   * the rest are a set, priced a third under the pieces you still need.
   */
  private looksPage(c: Phaser.GameObjects.Container, w: number, h: number, mode: 'buy' | 'equip') {
    const st = this.world.state;
    const look = LOOKS[this.world.playerId];
    const reopen = () => this.openClothes(mode, 'looks');
    const list = mode === 'buy' ? COSTUMES.filter((x) => !x.free) : COSTUMES;
    const pick = (c?: Costume) => (c && list.includes(c) ? c : undefined);
    const sel = pick(COSTUMES.find((x) => x.id === this.shopSel)) ?? pick(st.wornCostume) ?? list[0];
    const top = -h / 2 + 38;

    // ---- the one you are looking at ----
    const pw = 94;
    const pxl = -w / 2 + 8;
    const g = this.add.graphics();
    panel(g, pxl, top, pw, h / 2 - 8 - top, 0xfff9ee);
    c.add(g);
    const cx = pxl + pw / 2;
    const tex = buildCharacterTexture(this, look, sel.outfit);
    c.add(this.add.image(cx, top + 46, tex, [0, 3, 6][this.previewFacing]).setScale(3));
    const turn = this.add.zone(cx, top + 46, 50, 84).setInteractive({ useHandCursor: true });
    turn.on('pointerdown', () => {
      this.previewFacing = (this.previewFacing + 1) % 3;
      audio.play('pop');
      reopen();
    });
    c.add(turn);
    c.add(this.add.text(cx, top + 88, sel.name, plain()).setOrigin(0.5));

    const owned = st.costumeOwned(sel);
    const wearing = st.wearingCostume(sel);
    const { price, full, unlockRep } = st.costumePrice(sel);
    let label = wearing ? 'Wearing' : owned ? 'Wear it' : `Set ${price}c`;
    let colour = wearing ? 0xffe066 : owned ? 0x7de8c8 : 0xffd23f;
    let can = !wearing;
    if (!owned && unlockRep > st.reputation) {
      label = `Rep ${unlockRep}`;
      colour = 0xe8dcc8;
      can = false;
    } else if (!owned) can = st.coins >= price;
    const b = button(this, pxl + 6, h / 2 - 26, pw - 12, 18, label, () => {
      const got = owned ? st.wearCostume(sel) : st.buyCostume(sel);
      if (!got) return audio.play('bad');
      audio.play(owned ? 'pop' : 'coin');
      this.showToast(owned ? `${sel.name}: looking good` : `${sel.name} is yours — every piece of it`);
      this.world.refreshFromState();
      this.world.afterChange();
      reopen();
    }, colour);
    b.setEnabled(can);
    c.add(b.container);
    // one line under the name: what the set saves while buying, the flavour once it is yours
    const sub = !owned && price < full ? `${full}c if you buy the pieces` : sel.blurb;
    c.add(this.add.text(cx, top + 99, sub, note({ color: '#6a5a60', align: 'center', wordWrap: { width: pw - 4 } })).setOrigin(0.5, 0));

    // ---- the rack ----
    const gx = pxl + pw + 8;
    const cw = 28;
    const chh = 52;
    const cols = 6;
    const per = cols * 2;
    const pages = Math.max(1, Math.ceil(list.length / per));
    const page = this.page % pages;
    list.slice(page * per, page * per + per).forEach((cos, i) => {
      const x = gx + (i % cols) * (cw + 2);
      const y = top + Math.floor(i / cols) * (chh + 4);
      const has = st.costumeOwned(cos);
      const locked = !has && cos.unlockRep > st.reputation;
      const isSel = cos.id === sel.id;
      const cg = this.add.graphics();
      panel(cg, x, y, cw, chh, isSel ? 0xffe066 : st.wearingCostume(cos) ? 0xdff7ee : 0xffffff, isSel ? 0xff8fcf : 0x4a2a3f);
      c.add(cg);
      const img = this.add.image(x + cw / 2, y + chh / 2 - 5, buildCharacterTexture(this, look, cos.outfit), 0).setScale(1.5);
      if (locked) img.setAlpha(0.35);
      c.add(img);
      const tag = cos.free ? 'free' : locked ? `${cos.unlockRep} rep` : has ? 'yours' : `${st.costumePrice(cos).price}c`;
      const tagColour = cos.free ? '#1f6a56' : has ? '#1f6a56' : locked ? '#6a5a60' : '#8a5e00';
      c.add(this.add.text(x + cw / 2, y + chh - 7, tag, note({ color: tagColour })).setOrigin(0.5));
      const z = this.add.zone(x + cw / 2, y + chh / 2, cw, chh).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.shopSel = cos.id;
        audio.play('blip');
        reopen();
      });
      c.add(z);
    });
    if (pages > 1)
      this.pager(c, w, h, page, pages, (n) => {
        this.page = n;
        reopen();
      });
    else c.add(this.add.text(gx + 93, h / 2 - 12, mode === 'buy' ? 'A set costs less than the pieces' : 'The first five are yours already', note({ color: '#6a5a60' })).setOrigin(0.5));
  }

  private openClothes(mode: 'buy' | 'equip', kind: ClothingKind | 'looks') {
    const st = this.world.state;
    const w = 300;
    const h = 176;
    const c = this.openOverlay(w, h, mode === 'buy' ? `Rosa's Tailor   (coins: ${st.coins})` : 'Wardrobe');
    const reopen = () => this.openClothes(mode, kind);
    const kinds: [ClothingKind | 'looks', string][] = [
      ['looks', 'Looks'],
      ['top', 'Outfits'],
      ['hat', 'Hats'],
      ['accessory', 'Extras'],
      ['dye', 'Dyes'],
      ['hair', 'Hair'],
    ];
    this.tabs(
      c,
      w,
      h,
      kinds.map(([k, label]) => [label, () => {
        this.shopSel = null;
        this.page = 0;
        this.openClothes(mode, k);
      }]),
      kinds.findIndex(([k]) => k === kind),
    );
    if (kind === 'looks') return this.looksPage(c, w, h, mode);
    const ids = clothingIds(kind);
    const list = mode === 'buy' ? ids.filter((id) => !isFreeClothing(id) && !clothingDef(kind, id).rewardOnly) : ids.filter((id) => st.owns(kind, id));
    const worn = st.outfit[kind] as string;
    const sel = this.shopSel && list.includes(this.shopSel) ? this.shopSel : list.includes(worn) ? worn : list[0];
    const look = LOOKS[this.world.playerId];
    const trial = (id: string): Outfit => ({ ...st.outfit, [kind]: id });
    const top = -h / 2 + 38;

    // ---- try-on mannequin ----
    const pw = 94;
    const pxl = -w / 2 + 8;
    const ph = h / 2 - 8 - top;
    const g = this.add.graphics();
    panel(g, pxl, top, pw, ph, 0xfff9ee);
    c.add(g);
    const cx = pxl + pw / 2;
    if (sel) {
      const def = clothingDef(kind, sel);
      const tex = buildCharacterTexture(this, look, trial(sel));
      const img = this.add.image(cx, top + 46, tex, [0, 3, 6][this.previewFacing]).setScale(3);
      c.add(img);
      const turn = this.add.zone(cx, top + 46, 50, 84).setInteractive({ useHandCursor: true });
      turn.on('pointerdown', () => {
        this.previewFacing = (this.previewFacing + 1) % 3;
        audio.play('pop');
        reopen();
      });
      c.add(turn);
      const sale = mode === 'buy' && st.isOnSale(kind, sel);
      const { price, unlockRep } = st.clothingPrice(kind, sel);
      if (sale) c.add(this.add.text(pxl + 4, top + 4, 'SALE -30%', plain({ color: '#d94a4a' })).setOrigin(0, 0));
      c.add(this.add.text(cx, top + 93, def.name, plain()).setOrigin(0.5));
      const owned = st.owns(kind, sel);
      const wearing = worn === sel;
      let label = wearing ? 'Wearing' : 'Wear';
      let enabled = !wearing;
      let color = wearing ? 0xffe066 : 0x7de8c8;
      if (!owned) {
        if (unlockRep > st.reputation) {
          label = `Rep ${unlockRep}`;
          enabled = false;
          color = 0xe8dcc8;
        } else {
          label = `Buy ${price}c`;
          enabled = st.coins >= price;
          color = 0xffd23f;
        }
      }
      const b = button(this, pxl + 6, top + 102, pw - 12, 16, label, () => {
        if (!owned) {
          if (!st.buyClothing(kind, sel)) return audio.play('bad');
          audio.play('coin');
          this.showToast(`${def.name}: yours! Wearing it now.`);
        } else audio.play('pop');
        st.setOutfit({ [kind]: sel } as Partial<Outfit>);
        this.world.refreshFromState();
        this.world.afterChange();
        reopen();
      }, color);
      b.setEnabled(enabled);
      c.add(b.container);
    } else c.add(this.add.text(cx, top + 50, 'Nothing yet.\nVisit Rosa!', plain({ color: '#7a6a70', align: 'center' })).setOrigin(0.5));

    // ---- item cards: each one is you, wearing it ----
    const gx = pxl + pw + 8;
    const cw = 29;
    const chh = 34;
    const cols = 6;
    const per = cols * 3;
    const pages = Math.max(1, Math.ceil(list.length / per));
    const page = this.page % pages;
    list.slice(page * per, page * per + per).forEach((id, i) => {
      const x = gx + (i % cols) * (cw + 1);
      const y = top + Math.floor(i / cols) * (chh + 1);
      const def = clothingDef(kind, id);
      const owned = st.owns(kind, id);
      const locked = !owned && def.unlockRep > st.reputation;
      const isSel = id === sel;
      const cg = this.add.graphics();
      panel(cg, x, y, cw, chh, isSel ? 0xffe066 : worn === id ? 0xdff7ee : 0xffffff, isSel ? 0xff8fcf : 0x4a2a3f);
      c.add(cg);
      const img = this.add.image(x + cw / 2, y + chh / 2 + 1, buildCharacterTexture(this, look, trial(id)), 0);
      if (locked) img.setAlpha(0.35);
      c.add(img);
      if (mode === 'buy' && st.isOnSale(kind, id)) c.add(this.add.text(x + 2, y + 1, '%', plain({ color: '#d94a4a' })).setOrigin(0, 0));
      if (mode === 'buy' && owned) c.add(this.add.image(x + cw - 6, y + 6, 'icons', 'heart').setScale(0.6));
      const z = this.add.zone(x + cw / 2, y + chh / 2, cw, chh).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.shopSel = id;
        audio.play('blip');
        reopen();
      });
      c.add(z);
    });
    if (pages > 1)
      this.pager(c, w, h, page, pages, (p) => {
        this.page = p;
        reopen();
      });
    else if (mode === 'buy') {
      const s = st.clothingSale;
      c.add(this.add.text(gx + 93, h / 2 - 12, `Sale: ${clothingDef(s.kind, s.id).name} -30%`, plain({ color: '#d94a4a' })).setOrigin(0.5));
    } else c.add(this.add.text(gx + 93, h / 2 - 12, 'Pick one, then put it on', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  // ---------- Cozy Corner (furniture) ----------
  private openFurnshop(cat: FurnitureCat) {
    const st = this.world.state;
    const w = 300;
    const h = 176;
    const c = this.openOverlay(w, h, `Cozy Corner   (coins: ${st.coins})`);
    const reopen = () => this.openFurnshop(cat);
    this.tabs(
      c,
      w,
      h,
      FURNITURE_CATS.map((k) => [k.name, () => {
        this.shopSel = null;
        this.openFurnshop(k.id);
      }]),
      FURNITURE_CATS.findIndex((k) => k.id === cat),
    );
    const list = FURNITURE_IDS.filter((id) => FURNITURE[id].cat === cat && !FURNITURE[id].rewardOnly).sort((a, b) => FURNITURE[a].unlockRep - FURNITURE[b].unlockRep || FURNITURE[a].price - FURNITURE[b].price);
    const sel = (this.shopSel && list.includes(this.shopSel as FurnitureId) ? this.shopSel : list[0]) as FurnitureId;
    const sale = st.furnitureSale;
    const top = -h / 2 + 38;

    // ---- preview ----
    const pw = 96;
    const pxl = -w / 2 + 8;
    const g = this.add.graphics();
    panel(g, pxl, top, pw, h / 2 - 8 - top, 0xfff9ee);
    g.fillStyle(0xf0dcc0, 1).fillRect(pxl + 2, top + 56, pw - 4, 20);
    c.add(g);
    const cx = pxl + pw / 2;
    const def = FURNITURE[sel];
    const open = def.unlockRep <= st.reputation;
    c.add(this.fitImage(this.add.image(cx, top + 66, 'furniture', sel).setOrigin(0.5, 1), pw - 12, 58, 2.5).setAlpha(open ? 1 : 0.4));
    if (sel === sale) c.add(this.add.text(pxl + 4, top + 4, 'SALE -30%', plain({ color: '#d94a4a' })).setOrigin(0, 0));
    c.add(this.add.text(cx, top + 82, def.name, plain()).setOrigin(0.5));
    const owned = st.furnitureOwned(sel) + st.world.furniturePlaced.filter((p) => p.id === sel).length;
    c.add(this.add.text(cx, top + 93, `+${def.cozy} cozy${def.wall ? ', wall' : ''}`, plain({ color: '#7a6a70' })).setOrigin(0.5));
    const price = st.furniturePrice(sel);
    const b = button(this, pxl + 6, top + 102, pw - 12, 16, open ? `Buy ${price}c` : `Rep ${def.unlockRep}`, () => {
      if (!st.buyFurniture(sel)) return audio.play('bad');
      audio.play('coin');
      this.showToast(`${def.name} bought. Place it at home with Decorate!`);
      this.world.afterChange();
      reopen();
    }, open ? 0xffd23f : 0xe8dcc8);
    b.setEnabled(open && st.coins >= price);
    c.add(b.container);

    // ---- cards ----
    const gx = pxl + pw + 8;
    const cs = 29;
    const cols = 6;
    list.forEach((id, i) => {
      const x = gx + (i % cols) * (cs + 1);
      const y = top + Math.floor(i / cols) * (cs + 1);
      const d = FURNITURE[id];
      const isOpen = d.unlockRep <= st.reputation;
      const cg = this.add.graphics();
      panel(cg, x, y, cs, cs, id === sel ? 0xffe066 : 0xffffff, id === sel ? 0xff8fcf : 0x4a2a3f);
      c.add(cg);
      c.add(this.fitImage(this.add.image(x + cs / 2, y + cs / 2, 'furniture', id), cs - 5, cs - 5, 1).setAlpha(isOpen ? 1 : 0.35));
      if (id === sale) c.add(this.add.text(x + 2, y + 1, '%', plain({ color: '#d94a4a' })).setOrigin(0, 0));
      const have = st.furnitureOwned(id);
      if (have) c.add(this.add.text(x + cs - 2, y + cs - 1, `x${have}`, tiny()).setOrigin(1, 1));
      const z = this.add.zone(x + cs / 2, y + cs / 2, cs, cs).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.shopSel = id;
        audio.play('blip');
        reopen();
      });
      c.add(z);
    });
    c.add(this.add.text(gx + 90, h / 2 - 12, `Sale: ${FURNITURE[sale].name} -30%`, plain({ color: '#d94a4a' })).setOrigin(0.5));
  }

  // ---------- us two: bond, photos, gifts ----------
  private giftRetry = false;
  private shownGifts = new Set<string>();

  /** Name and icon for a gift key (item id, dish:recipe:grade or furn:id). */
  private giftInfo(key: string): { name: string; icon: string; tab: string; frame: string } {
    if (key.startsWith('dish:')) {
      const [, recipe, grade] = key.split(':');
      return { name: `${RECIPES[recipe as RecipeId].name} ${GRADE_NAMES[Number(grade)]}`, icon: `dish-${recipe}`, tab: 'dishes', frame: '' };
    }
    if (key.startsWith('furn:')) {
      const id = key.slice(5) as FurnitureId;
      return { name: FURNITURE[id].name, icon: `furn-${id}`, tab: 'home', frame: id };
    }
    return { name: ITEMS[key as ItemId]?.name ?? key, icon: ITEMS[key as ItemId]?.icon ?? 'gift', tab: 'produce', frame: '' };
  }

  /** A polaroid: the spot, the two of you (or just you) in the outfits you wore that day. */
  private drawPhoto(c: Phaser.GameObjects.Container, p: Photo, x: number, y: number, s = 1) {
    const spot = PHOTO_SPOTS[p.spot];
    const pw = 112 * s;
    const ph = 92 * s;
    const g = this.add.graphics();
    panel(g, x - pw / 2, y - ph / 2, pw, ph, 0xffffff);
    const ix = x - pw / 2 + 5 * s;
    const iy = y - ph / 2 + 5 * s;
    const iw = pw - 10 * s;
    const ih = ph - 24 * s;
    g.fillStyle(Phaser.Display.Color.HexStringToColor(spot.sky).color, 1).fillRect(ix, iy, iw, ih * 0.62);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(spot.ground).color, 1).fillRect(ix, iy + ih * 0.62, iw, ih * 0.38);
    if (p.spot === 'pond') g.fillStyle(0x5fcbff, 1).fillEllipse(ix + iw * 0.75, iy + ih * 0.8, iw * 0.4, ih * 0.18);
    c.add(g);
    const groundY = iy + ih - 6 * s;
    const bg: [string, string | number, number][] = [
      ['props', 'fountain', 0.9],
      ['furniture', 'lovetree6', 0.9],
      ['trees', 0, 0.9],
      ['buildings', 'house_qd', 0.45],
      ['barn', 0, 0.45],
    ];
    const [key, frame, sc] = bg[['fountain', 'lovetree', 'pond', 'lane', 'ranch'].indexOf(p.spot)];
    c.add(this.add.image(ix + iw * 0.24, iy + ih * 0.7, key, frame).setOrigin(0.5, 1).setScale(sc * s).setAlpha(0.95));
    const who = (['xb', 'qd'] as PlayerId[]).filter((id) => p.outfits[id]);
    who.forEach((id, i) => {
      const cx = who.length === 2 ? ix + iw * 0.6 + (i === 0 ? -9 : 9) * s : ix + iw * 0.62;
      c.add(this.add.image(cx, groundY, buildCharacterTexture(this, LOOKS[id], p.outfits[id]), 0).setOrigin(0.5, 1).setScale(s));
    });
    if (who.length === 2) c.add(this.add.image(ix + iw * 0.6, groundY - 30 * s, 'icons', 'heart').setScale(s));
    c.add(this.add.text(x, y + ph / 2 - 13 * s, spot.name, plain({ color: P.outline })).setOrigin(0.5).setScale(Math.max(0.6, s)));
    if (s >= 1) c.add(this.add.text(x, y + ph / 2 - 5, p.day, plain({ color: '#9a8a90' })).setOrigin(0.5));
  }

  private showPhoto(p: Photo) {
    const c = this.openOverlay(160, 138, p.together ? 'A photo of us!' : 'Click!');
    this.drawPhoto(c, p, 0, 4, 1);
    c.add(this.add.text(0, 62, 'Saved in the Book', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  /** Unwrap gifts from your partner, one at a time. */
  private openGiftReveal() {
    const st = this.world.state;
    const g = st.giftsForMe.find((x) => !this.shownGifts.has(x.id));
    if (!g || this.overlay?.getData('gift')) return;
    if (this.overlay) {
      // wait until the current panel closes; only one retry at a time
      if (this.giftRetry) return;
      this.giftRetry = true;
      this.time.delayedCall(1500, () => {
        this.giftRetry = false;
        this.openGiftReveal();
      });
      return;
    }
    const c = this.openOverlay(220, 130, `A gift from ${g.from}!`);
    c.setData('gift', true);
    this.shownGifts.add(g.id);
    const box = this.add.image(0, -16, 'icons', 'gift').setScale(4);
    c.add(box);
    this.tweens.add({ targets: box, angle: 6, duration: 180, yoyo: true, repeat: -1 });
    c.add(this.add.text(0, 22, 'Wrapped just for you', plain({ color: '#7a6a70' })).setOrigin(0.5));
    const open = button(this, -40, 40, 80, 16, 'Open it', () => {
      const got = st.openGift(g.id);
      if (!got) return;
      audio.play('great');
      this.world.afterChange();
      const info = this.giftInfo(got.key);
      const cc = this.openOverlay(230, 130, `From ${got.from}, with love`);
      cc.setData('gift', true);
      const img = info.frame ? this.fitImage(this.add.image(0, -22, 'furniture', info.frame), 60, 40, 2) : this.add.image(0, -22, 'icons', info.icon).setScale(3);
      cc.add(img);
      for (let i = 0; i < 8; i++) {
        const h = this.add.image(Phaser.Math.Between(-90, 90), Phaser.Math.Between(-40, 20), 'icons', 'heart').setScale(0.8);
        cc.add(h);
        this.tweens.add({ targets: h, y: h.y - 20, alpha: 0, duration: 1200, delay: i * 120, repeat: -1 });
      }
      cc.add(this.add.text(0, 6, info.name, plain()).setOrigin(0.5));
      cc.add(this.add.text(0, 24, got.msg ? `"${got.msg}"` : '(no note, just love)', plain({ color: '#e05fa8', align: 'center', wordWrap: { width: 200 } })).setOrigin(0.5));
      const ok = button(this, -30, 44, 60, 16, st.giftsForMe.length ? 'Next' : 'Aww', () => {
        this.closeOverlay();
        if (st.giftsForMe.length) this.openGiftReveal();
      }, 0x7de8c8);
      cc.add(ok.container);
    }, 0xff8fcf);
    c.add(open.container);
  }

  /** Mailbox Gift tab: wrap something from the bag with a short note. */
  private giftTab(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const st = this.world.state;
    const other = otherPlayer(this.world.playerId);
    const entries: { key: string; icon: string; frame?: string; count: number }[] = [];
    for (const id of SELLABLE) if (st.count(id) > 0) entries.push({ key: id, icon: ITEMS[id].icon, count: st.count(id) });
    const dishes = new Map<string, number>();
    for (const d of st.world.dishes) dishes.set(`dish:${d.recipe}:${d.grade}`, (dishes.get(`dish:${d.recipe}:${d.grade}`) ?? 0) + 1);
    for (const [k, n] of dishes) entries.push({ key: k, icon: `dish-${k.split(':')[1]}`, count: n });
    for (const f of FURNITURE_IDS) if (st.furnitureOwned(f) > 0) entries.push({ key: `furn:${f}`, icon: '', frame: f, count: st.furnitureOwned(f) });
    const waiting = st.giftsWaiting.length;
    c.add(this.add.text(0, top + 2, waiting ? `${waiting} gift${waiting > 1 ? 's' : ''} waiting for ${other} to open` : `Pick something to wrap for ${other}`, plain({ color: '#e05fa8' })).setOrigin(0.5));
    if (!entries.length) {
      c.add(this.add.text(0, top + 40, 'Your bag is empty.\nHarvest, cook or buy something first.', plain({ color: '#7a6a70', align: 'center' })).setOrigin(0.5));
      return;
    }
    const cols = 9;
    const slot = 26;
    const x0 = -(cols * slot) / 2;
    entries.slice(0, 27).forEach((e, i) => {
      const sx = x0 + (i % cols) * slot;
      const sy = top + 12 + Math.floor(i / cols) * slot;
      const g = this.add.graphics();
      inset(g, sx, sy, 24, 24, 0xffffff);
      c.add(g);
      c.add(e.frame ? this.fitImage(this.add.image(sx + 12, sy + 12, 'furniture', e.frame), 20, 20, 1) : this.add.image(sx + 12, sy + 12, 'icons', e.icon).setScale(1.5));
      if (e.count > 1) c.add(this.add.text(sx + 25, sy + 26, String(e.count), tiny()).setOrigin(1, 1));
      const z = this.add.zone(sx + 12, sy + 12, 24, 24).setInteractive({ useHandCursor: true });
      z.on('pointerdown', async () => {
        const name = this.giftInfo(e.key).name;
        const msg = await promptText({ title: `Wrap ${name} for ${other}`, placeholder: 'A little something for you <3', maxLength: 120, okLabel: 'Wrap it' });
        if (msg === null) return;
        if (!st.wrapGift(e.key, msg)) {
          audio.play('bad');
          this.showToast(st.giftsWaiting.length >= MAX_PENDING_GIFTS ? `${other} has gifts to open first!` : 'Could not wrap that');
          return;
        }
        audio.play('great');
        this.showToast(`Wrapped! ${other} finds it next time`);
        this.world.afterChange();
        void this.openMail('gift');
      });
      c.add(z);
    });
  }

  private lastSeenText(at?: number) {
    if (this.world.partnerOnline) return 'here now';
    if (!at) return 'not here yet';
    const m = Math.round((Date.now() - at) / 60000);
    if (m < 2) return 'here just now';
    if (m < 60) return `here ${m}m ago`;
    if (m < 60 * 36) return `here ${Math.round(m / 60)}h ago`;
    return `here ${Math.round(m / 1440)} days ago`;
  }

  /** Journal "Us" tab: the bond, the two of you, and little gestures. */
  private usPage(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const st = this.world.state;
    const me = this.world.playerId;
    const other = otherPlayer(me);
    // left: the two of you as you look right now
    const lw = 114;
    const g = this.add.graphics();
    panel(g, -w / 2 + 10, top - 4, lw, h / 2 - 10 - (top - 4), 0xffe8f4, 0xff8fcf);
    c.add(g);
    const lx = -w / 2 + 10 + lw / 2;
    const players = st.world.players;
    c.add(this.add.image(lx - 18, top + 84, buildCharacterTexture(this, LOOKS.xb, players.xb.outfit), 0).setOrigin(0.5, 1).setScale(2.2));
    c.add(this.add.image(lx + 18, top + 84, buildCharacterTexture(this, LOOKS.qd, players.qd.outfit), 0).setOrigin(0.5, 1).setScale(2.2));
    const heart = this.add.image(lx, top + 22, 'icons', 'heart').setScale(1.6);
    c.add(heart);
    this.tweens.add({ targets: heart, scale: 2, duration: 600, yoyo: true, repeat: -1 });
    c.add(this.add.text(lx, top + 100, st.matching ? 'Matching outfits!' : 'Different outfits', plain({ color: st.matching ? '#d94b94' : '#7a6a70' })).setOrigin(0.5));
    const started = Math.max(1, Math.floor((Date.now() - st.world.createdAt) / 86_400_000) + 1);
    c.add(this.add.text(lx, top + 116, `Day ${started} of us`, note({ color: '#6a5560' })).setOrigin(0.5));

    // right: bond level
    const rx = -w / 2 + 10 + lw + 10;
    const lvl = st.bondLevel;
    const prog = bondProgress(st.bondPoints);
    c.add(this.add.text(rx, top + 2, `Bond Level ${lvl}${lvl >= MAX_BOND ? ' (Max)' : ''}`, style({ color: '#ff8fcf' })).setOrigin(0, 0.5));
    const bw = w / 2 - 10 - rx;
    const bar = this.add.graphics();
    panel(bar, rx, top + 12, bw, 10, 0xffffff);
    bar.fillStyle(0xff8fcf, 1).fillRect(rx + 2, top + 14, Math.round((bw - 4) * (prog ? prog[0] / prog[1] : 1)), 6);
    c.add(bar);
    const next = BOND_REWARDS.find((r) => r.level > lvl);
    c.add(this.add.text(rx, top + 28, next ? `Next (Lv ${next.level}): ${next.text}` : 'Soulmates — everything unlocked!', note({ color: '#6a5560', wordWrap: { width: bw } })).setOrigin(0, 0));
    const lines = [
      `Days played together: ${st.daysTogether}`,
      `Photos: ${st.world.photos?.length ?? 0}   ·   Gifts sent: ${st.world.stats.giftsent ?? 0}`,
      `Today's bond: +${Object.values(st.world.bond?.got ?? {}).reduce((a, b) => a + b, 0)} pts`,
      `Partner (${other}): ${this.lastSeenText(st.world.players[other].lastSeen)}`,
    ];
    lines.forEach((l, i) => {
      const ly = top + 58 + i * 16;
      this.rowCard(c, rx, ly - 7, bw, 14, null, 0xfffdf9);
      c.add(this.add.text(rx + 6, ly, l, plain()).setOrigin(0, 0.5));
    });
    const btnW = Math.floor((bw - 6) / 2);
    const heartBtn = button(this, rx, h / 2 - 28, btnW, 18, 'Send love', async () => {
      const body = `<3 ${me} is thinking of you`;
      if (net.enabled && net.pairing) {
        if (!(await net.sendNote(other, body))) return this.showToast('Could not send. Check your connection.');
      } else {
        this.localNotes = this.loadLocalNotes();
        this.localNotes.unshift({ id: Date.now(), from_player: me, to_player: other, body, created_at: new Date().toISOString(), read: false });
        this.saveLocalNotes();
      }
      st.sendHeart();
      this.world.emote('heart');
      this.showToast(`Sent a heart to ${other}`);
      this.world.afterChange();
      this.openJournal('us');
    }, 0xff8fcf);
    const giftBtn = button(this, rx + btnW + 6, h / 2 - 28, btnW, 18, 'Wrap gift', () => void this.openMail('gift'), 0xffe066);
    c.add([heartBtn.container, giftBtn.container]);
  }

  // ---------- seed maker ----------
  private openSeedMaker() {
    const st = this.world.state;
    const w = 270;
    const h = 168;
    const c = this.openOverlay(w, h, 'Seed maker');
    const crops = CROP_IDS.filter((id) => st.count(`crop:${id}`) > 0);
    const top = -h / 2 + 30;
    c.add(this.add.text(0, top, `Clean 1 crop into ${SEEDS_PER_CROP} seeds`, plain({ color: '#7a6a70' })).setOrigin(0.5));
    if (!crops.length) {
      c.add(this.add.text(0, 10, 'No crops in the bag.\nHarvest something first!', plain({ color: '#7a6a70', align: 'center' })).setOrigin(0.5));
      return;
    }
    crops.slice(0, 6).forEach((id, i) => {
      const y = top + 20 + i * ROW;
      const have = st.count(`crop:${id}`);
      c.add(this.add.image(-w / 2 + 14, y, 'icons', `crop-${id}`));
      c.add(this.add.text(-w / 2 + 24, y, `${CROPS[id].name} x${have}`, plain()).setOrigin(0, 0.5));
      c.add(this.add.image(-w / 2 + 120, y, 'icons', `seed-${id}`));
      c.add(this.add.text(-w / 2 + 130, y, `${st.count(`seed:${id}`)}`, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
      const make = (n: number) => {
        const got = st.makeSeeds(id, n);
        if (!got) return audio.play('bad');
        audio.play('pop');
        this.showToast(`+${got} ${CROPS[id].name} seeds`);
        this.world.afterChange();
        this.openSeedMaker();
      };
      const one = button(this, w / 2 - 98, y - 7, 40, 14, 'x1', () => make(1), 0x7de8c8);
      const all = button(this, w / 2 - 54, y - 7, 44, 14, 'All', () => make(have), 0xffe066);
      c.add([one.container, all.container]);
    });
  }

  // ---------- pet shop ----------
  private openPetshop(tab: 'pets' | 'animals' | 'build') {
    const w = 300;
    const h = 176;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `Pet & Barn Shop   (coins: ${st.coins})`);
    this.tabs(c, w, h, [
      ['Pets', () => this.openPetshop('pets')],
      ['Animals', () => { this.shopSel = null; this.openPetshop('animals'); }],
      ['Build', () => this.openPetshop('build')],
    ], ['pets', 'animals', 'build'].indexOf(tab));
    const top = -h / 2 + 46;
    if (tab === 'build') {
      const pages = this.upgradeList(c, w, h, 'petshop', () => this.openPetshop('build'));
      if (pages < 2) c.add(this.add.text(0, h / 2 - 12, 'New pens show up right away', plain({ color: '#7a6a70' })).setOrigin(0.5));
      return;
    }
    if (tab === 'pets') {
      PET_IDS.forEach((id, i) => {
        const y = top + i * 20;
        const def = PETS[id];
        c.add(this.add.image(-w / 2 + 14, y, 'icons', def.icon));
        c.add(this.add.text(-w / 2 + 24, y - 5, def.name, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 24, y + 5, `follows you, finds gifts`, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        this.priceTag(c, w / 2 - 66, y, def.price, st.coins >= def.price);
        const b = button(this, w / 2 - 62, y - 7, 50, 14, st.pet?.type === id ? 'Mine' : 'Adopt', async () => {
          if (st.coins < def.price) return audio.play('bad');
          if (st.pet && !(await confirmBox(`${st.pet.name} will stay at the shop. Adopt a new pet?`, 'Adopt', 'Keep'))) return;
          const name = await promptText({ title: `Name your ${def.name.toLowerCase()}`, placeholder: 'Mochi', maxLength: 10 });
          if (!name) return;
          if (st.adoptPet(id, name)) {
            audio.play(id === 'dog' ? 'bark' : id === 'cat' ? 'meow' : 'pop');
            this.showToast(`${name} joins you!`);
            this.closeOverlay();
            this.world.scene.restart({ player: this.world.playerId, area: 'petshop', tx: 8, ty: 8, facing: 'down' });
          }
        }, 0x7de8c8);
        b.setEnabled(st.coins >= def.price && st.pet?.type !== id);
        c.add(b.container);
      });
      c.add(this.add.text(0, h / 2 - 12, st.pet ? `${st.pet.name} loves you ${st.pet.affection}%` : 'One pet per person. Pet it daily!', plain({ color: '#7a6a70' })).setOrigin(0.5));
      return;
    }

    // ---- farm animals: preview on the left, cards on the right ----
    const sel = (this.shopSel && ANIMAL_IDS.includes(this.shopSel as AnimalId) ? this.shopSel : 'chicken') as AnimalId;
    const def = ANIMALS[sel];
    const pt = -h / 2 + 38;
    const pw = 108;
    const pxl = -w / 2 + 8;
    const g = this.add.graphics();
    panel(g, pxl, pt, pw, h / 2 - 8 - pt, 0xfff9ee);
    g.fillStyle(0xcfe9a8, 1).fillRect(pxl + 2, pt + 30, pw - 4, 16);
    c.add(g);
    const cx = pxl + pw / 2;
    const bigKey = sel === 'bee' ? null : `${sel}0`;
    if (bigKey) c.add(this.fitImage(this.add.image(cx, pt + 42, 'critters', bigKey).setOrigin(0.5, 1), pw - 20, 38, 3));
    else c.add(this.add.image(cx, pt + 26, 'icons', 'honey').setScale(3));
    const n = st.animalCount(sel);
    const max = st.animalMax(sel);
    c.add(this.add.text(cx, pt + 55, `${def.name}  ${n}/${max}`, plain()).setOrigin(0.5));
    c.add(this.add.text(cx, pt + 67, def.product ? `${ITEMS[def.product].name} ${def.intervalMin}m` : 'Ride it outdoors', plain({ color: '#7a6a70' })).setOrigin(0.5));
    const price = st.animalPrice(sel);
    const locked = def.requires && st.upgradeLevel(def.requires) === 0;
    let label = price === null ? 'Full' : `Buy ${price}c`;
    if (locked) label = `Needs ${UPGRADES[def.requires as UpgradeId].name}`;
    const b = button(this, pxl + 6, pt + 77, pw - 12, 16, label, () => {
      if (locked) {
        this.openPetshop('build');
        return;
      }
      if (st.buyAnimal(sel)) {
        audio.play(sel === 'cow' ? 'moo' : sel === 'sheep' ? 'baa' : sel === 'chicken' || sel === 'duck' ? 'cluck' : 'pop');
        this.showToast(sel === 'horse' ? 'Your horse waits at the stable. Ride it!' : `A new ${def.name.toLowerCase()} is waiting at the ${def.home === 'farm' ? 'farm' : 'ranch'}!`);
        this.world.afterChange();
        this.openPetshop('animals');
      } else audio.play('bad');
    }, locked ? 0xe8dcc8 : 0x7de8c8);
    b.setEnabled(!!locked || (price !== null && st.canBuyAnimal(sel)));
    c.add(b.container);
    c.add(this.add.text(cx, pt + 98, def.blurb, plain({ color: '#7a6a70', wordWrap: { width: pw - 8 }, align: 'center' })).setOrigin(0.5, 0));

    const gx = pxl + pw + 8;
    const cs = 42;
    ANIMAL_IDS.forEach((id, i) => {
      const x = gx + (i % 4) * (cs + 2);
      const y = pt + Math.floor(i / 4) * (cs + 2);
      const d = ANIMALS[id];
      const isLocked = d.requires && st.upgradeLevel(d.requires) === 0;
      const cg = this.add.graphics();
      panel(cg, x, y, cs, cs, id === sel ? 0xffe066 : 0xffffff, id === sel ? 0xff8fcf : 0x4a2a3f);
      c.add(cg);
      const img = id === 'bee' ? this.add.image(x + cs / 2, y + cs / 2 - 4, 'icons', 'honey').setScale(2) : this.fitImage(this.add.image(x + cs / 2, y + cs / 2 - 3, 'critters', `${id}0`), cs - 8, cs - 16, 2);
      c.add(img.setAlpha(isLocked ? 0.4 : 1));
      c.add(this.add.text(x + cs / 2, y + cs - 7, `${st.animalCount(id)}/${st.animalMax(id)}`, plain({ color: '#7a6a70' })).setOrigin(0.5));
      const z = this.add.zone(x + cs / 2, y + cs / 2, cs, cs).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.shopSel = id;
        audio.play('blip');
        this.openPetshop('animals');
      });
      c.add(z);
    });
  }

  // ---------- counter ----------
  private openCounter(tab: 'dishes' | 'counter' = 'dishes') {
    const w = 270;
    const h = 168;
    const st = this.world.state;
    const free = st.freeSlots();
    const c = this.openOverlay(w, h, 'Display counter');
    this.tabs(c, w, h, [
      [`Dishes (${st.world.dishes.length})`, () => this.openCounter('dishes')],
      [`Counter (${st.slotCount() - free}/${st.slotCount()})`, () => this.openCounter('counter')],
    ], tab === 'dishes' ? 0 : 1);
    const top = -h / 2 + 46;
    const row = (i: number) => top + i * 16;
    if (tab === 'dishes') {
      const dishes = st.world.dishes;
      if (!dishes.length) c.add(this.add.text(0, top + 20, 'Cook something at the kitchen first!', plain({ color: '#7a6a70' })).setOrigin(0.5));
      dishes.slice(0, 7).forEach((d, i) => {
        const y = row(i);
        c.add(this.add.image(-w / 2 + 16, y, 'icons', `dish-${d.recipe}`));
        c.add(this.add.text(-w / 2 + 26, y, RECIPES[d.recipe].name, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(w / 2 - 78, y, `${GRADE_NAMES[d.grade]}  ${st.priceOf(d)}c`, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
        const b = button(this, w / 2 - 72, y - 7, 60, 14, free ? 'Put out' : 'Full', () => {
          if (st.listDish(i)) {
            audio.play('blip');
            this.world.syncCounter();
            this.world.afterChange();
            this.openCounter('dishes');
          }
        }, 0x7de8c8);
        b.setEnabled(free > 0);
        c.add(b.container);
      });
      if (dishes.length > 7) c.add(this.add.text(0, row(7), `+${dishes.length - 7} more`, plain({ color: '#7a6a70' })).setOrigin(0.5));
    } else {
      st.world.counter.forEach((s, i) => {
        const y = row(i);
        const g = this.add.graphics();
        panel(g, -w / 2 + 8, y - 8, w - 16, 16, s.dish ? 0xffffff : 0xe8dcc8);
        c.add(g);
        if (s.dish) {
          c.add(this.add.image(-w / 2 + 20, y, 'icons', `dish-${s.dish.recipe}`));
          c.add(this.add.text(-w / 2 + 30, y, RECIPES[s.dish.recipe].name, plain()).setOrigin(0, 0.5));
          c.add(this.add.text(w / 2 - 78, y, `${GRADE_NAMES[s.dish.grade]}  ${st.priceOf(s.dish)}c`, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
          const b = button(this, w / 2 - 72, y - 7, 60, 14, 'Take', () => {
            if (st.takeDish(i)) {
              audio.play('blip');
              this.world.syncCounter();
              this.world.afterChange();
              this.openCounter('counter');
            }
          }, 0xffd23f);
          c.add(b.container);
        } else c.add(this.add.text(-w / 2 + 30, y, 'empty slot', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
      });
    }
    c.add(this.add.text(0, h / 2 - 9, 'Sells while you are away', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  // ---------- recipes ----------
  private openRecipes(page: number) {
    const w = 290;
    const h = 170;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `Kitchen   (dishes ${st.world.dishes.length}/${st.dishCap})`);
    const all = Object.values(RECIPES);
    const per = 6;
    const pages = Math.ceil(all.length / per);
    const top = -h / 2 + 24;
    const coop = this.world.partnerOnline;
    all.slice(page * per, page * per + per).forEach((r, i) => {
      const y = top + 8 + i * 20;
      const open = recipeUnlocked(r, st.reputation, st.world.books);
      c.add(this.add.image(-w / 2 + 14, y, 'icons', `dish-${r.id}`).setAlpha(open ? 1 : 0.4));
      const lockText = r.book ? `${BOOKS[r.book].name}` : `rep ${r.unlockRep}`;
      c.add(this.add.text(-w / 2 + 24, open ? y - 5 : y, open ? r.name : `${r.name}  (${lockText})`, plain({ color: open ? P.outline : '#9a8a90' })).setOrigin(0, 0.5));
      if (!open) return;
      let x = -w / 2 + 24;
      for (const k in r.ingredients) {
        const id = k as ItemId;
        const need = r.ingredients[id] ?? 0;
        const have = st.count(id);
        c.add(this.add.image(x + 6, y + 6, 'icons', ITEMS[id].icon));
        c.add(this.add.text(x + 13, y + 6, `${have}/${need}`, plain({ color: have >= need ? '#3f9a5f' : '#d94a4a' })).setOrigin(0, 0.5));
        x += 38;
      }
      c.add(this.add.text(w / 2 - (coop ? 110 : 66), y - 5, `${r.basePrice}c`, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
      c.add(this.add.text(w / 2 - (coop ? 110 : 66), y + 5, `${r.steps.length} steps`, plain({ color: '#7a6a70' })).setOrigin(1, 0.5));
      const ok = canCook(r, st.world.inventory) && st.world.dishes.length < st.dishCap;
      const b = button(this, w / 2 - 60, y - 7, 44, 14, 'Cook', () => {
        this.closeOverlay();
        audio.play('open');
        this.world.startCooking(r.id);
      }, 0x7de8c8);
      b.setEnabled(ok);
      c.add(b.container);
      if (coop) {
        const t = button(this, w / 2 - 106, y - 7, 44, 14, '2 chefs', () => {
          this.closeOverlay();
          if (!this.world.inviteCoop(r.id)) this.showToast('Missing ingredients or partner offline');
        }, 0xff8fcf);
        t.setEnabled(ok);
        c.add(t.container);
      }
    });
    this.pager(c, w, h, page, pages, (p) => this.openRecipes(p));
  }

  private openCoopInvite(m: { from: PlayerId; recipe: RecipeId; session: string }) {
    const c = this.openOverlay(230, 90, 'Cook together?');
    c.add(this.add.image(-90, 6, 'icons', `dish-${m.recipe}`).setScale(2));
    c.add(this.add.text(-70, -4, `${m.from} wants to make`, plain()).setOrigin(0, 0.5));
    c.add(this.add.text(-70, 8, `${RECIPES[m.recipe].name} with you!`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    const yes = button(this, -80, 26, 70, 16, 'Join!', () => {
      this.closeOverlay();
      this.world.acceptCoop(m.recipe, m.from, m.session);
    }, 0x7de8c8);
    const no = button(this, 10, 26, 70, 16, 'Not now', () => {
      this.closeOverlay();
      this.world.declineCoop(m.session);
    }, 0xe8dcc8);
    c.add([yes.container, no.container]);
  }

  private openCookResult(r: CookResult) {
    this.world.setUiOpen(false);
    const w = 250;
    const h = 110;
    const c = this.openOverlay(w, h, r.coop ? 'Made together!' : 'Dish ready!');
    const grade = GRADE_NAMES[r.grade];
    const dish = this.add.image(-60, 4, 'icons', `dish-${r.recipe}`).setScale(3);
    c.add(dish);
    this.tweens.add({ targets: dish, angle: -6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(this.add.text(-30, -14, RECIPES[r.recipe].name, plain()).setOrigin(0, 0.5));
    c.add(this.add.text(-30, 2, `Grade ${grade}`, style({ fontSize: '12px', color: ['#9a8a90', '#ffffff', '#7de8c8', '#ffe066'][r.grade] })).setOrigin(0, 0.5));
    c.add(this.add.text(-30, 18, `worth ${r.price}c`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    c.add(this.add.text(0, h / 2 - 10, r.coop ? 'A dish made by both of you' : 'Serve it, sell it, or fill an order', plain({ color: '#7a6a70' })).setOrigin(0.5));
    if (r.grade === 3 || r.coop) {
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-40, 40), 'icons', r.coop ? 'heart' : 'star').setScale(0.8);
        c.add(s);
        this.tweens.add({ targets: s, y: s.y - 20, alpha: 0, duration: 900, delay: i * 120, repeat: -1 });
      }
    }
  }

  // ---------- orders board ----------
  private openBoard(tab: 'orders' | 'contracts' | 'help' = 'orders') {
    const w = 282;
    const h = 176;
    const st = this.world.state;
    const c = this.openOverlay(w, h, 'Work board');
    this.tabs(c, w, h, [
      ['Orders', () => this.openBoard('orders')],
      ['Shipping', () => this.openBoard('contracts')],
      ['Help', () => this.openBoard('help')],
    ], ['orders', 'contracts', 'help'].indexOf(tab));
    if (tab === 'contracts') return this.contractsPage(c, w, h);
    if (tab === 'help') return this.helpPage(c, w, h);
    const top = -h / 2 + 44;
    st.world.orders.forEach((o: Order, i) => {
      const y = top + i * 44;
      const g = this.add.graphics();
      panel(g, -w / 2 + 8, y - 12, w - 16, 40, 0xffffff);
      c.add(g);
      const icon = o.dish ? `dish-${o.dish}` : ITEMS[o.item as ItemId].icon;
      const name = o.dish ? RECIPES[o.dish].name : ITEMS[o.item as ItemId].name;
      c.add(this.add.image(-w / 2 + 22, y + 2, 'icons', icon).setScale(1.5));
      c.add(this.add.text(-w / 2 + 36, y - 4, `${o.from} wants ${o.qty} ${name}`, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 36, y + 8, `reward ${o.reward}c  +${o.rep} rep`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 36, y + 20, `you have ${st.orderHave(o)}`, plain({ color: st.canComplete(o) ? '#3f9a5f' : '#7a6a70' })).setOrigin(0, 0.5));
      const b = button(this, w / 2 - 70, y - 2, 56, 16, 'Deliver', () => {
        const done = st.completeOrder(i);
        if (done) {
          audio.play('quest');
          this.showToast(`${done.from} says thanks! +${done.reward} coins`);
          this.world.afterChange();
          this.openBoard();
        }
      }, 0x7de8c8);
      b.setEnabled(st.canComplete(o));
      c.add(b.container);
    });
    c.add(this.add.text(0, h / 2 - 9, 'Someone new asks every morning', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }


  /** The machines the store sells, with what they turn into what. */
  private machineList(c: Phaser.GameObjects.Container, w: number, h: number, reopen: () => void) {
    const st = this.world.state;
    const top = -h / 2 + 44;
    MACHINE_IDS.forEach((id, i) => {
      const y = top + i * 27;
      const def = MACHINES[id];
      const owned = st.machineCount(id);
      const price = st.machinePrice(id);
      this.rowCard(c, -w / 2 + 8, y - 13, w - 16, 25, { key: 'icons', frame: def.icon });
      c.add(this.add.text(-w / 2 + 28, y - 6, def.name + (owned ? ` (${owned})` : ''), plain()).setOrigin(0, 0.5));
      // short enough to clear the price tag on the right
      c.add(this.add.text(-w / 2 + 28, y + 5, `Makes ${ITEMS[def.output].name.toLowerCase()}, ${formatDuration(def.minutes * 60)} a batch`, note({ color: '#6a5a60' })).setOrigin(0, 0.5));
      if (price === null) {
        const why = owned >= 3 ? 'full' : `${def.unlockRep} rep`;
        c.add(this.add.text(w / 2 - 34, y, why, plain({ color: '#7a6a70' })).setOrigin(0.5));
        return;
      }
      this.priceTag(c, w / 2 - 66, y, price, st.coins >= price);
      const b = button(this, w / 2 - 60, y - 7, 46, 14, 'Buy', () => {
        if (!st.buyMachine(id)) return audio.play('bad');
        audio.play('coin');
        this.showToast(`${def.name} delivered to the yard`);
        this.world.afterChange();
        reopen();
      });
      b.setEnabled(st.coins >= price);
      c.add(b.container);
    });
  }

  // ---------- gift codes ----------

  /** Ask for a code, spend it, then show what came out of it. */
  private async openRedeem() {
    const raw = await promptText({ title: 'Got a code? Type it here', placeholder: 'HAPPYBIRTHDAY', code: true, maxLength: 24, okLabel: 'Redeem' });
    if (!raw) return;
    const code = normaliseGiftCode(raw);
    if (!code) return;
    const res = await net.redeemGift(code);
    if (!res.ok) {
      audio.play('bad');
      const why = res.why === 'already' ? 'This farm has already had that one.'
        : res.why === 'expired' ? 'That code has run out of time.'
        : res.why === 'used up' ? 'That code has been spent.'
        : res.why === 'unknown' ? 'No code like that. Check the spelling?'
        : res.why;
      this.showToast(why);
      return;
    }
    const st = this.world.state;
    const lines = applyReward(st.world, res.reward);
    st.touch();
    this.world.refreshFromState();
    this.world.afterChange();
    audio.play('quest');
    this.showGift(res.message, lines);
  }

  private showGift(message: string | null, lines: RewardLine[]) {
    const w = 250;
    const h = 60 + Math.max(1, lines.length) * ROW + (message ? 20 : 0);
    const c = this.openOverlay(w, h, 'A gift!');
    let y = -h / 2 + 32;
    if (message) {
      c.add(this.add.text(0, y, message, plain({ color: '#a8456a', align: 'center', wordWrap: { width: w - 24 } })).setOrigin(0.5, 0));
      y += 22;
    }
    if (!lines.length) c.add(this.add.text(0, y + 6, 'Nothing in this one!', note({ color: '#6a5a60' })).setOrigin(0.5, 0));
    lines.forEach((l, i) => {
      const ly = y + 8 + i * ROW;
      this.rowCard(c, -w / 2 + 12, ly - 10, w - 24, 20, { key: 'icons', frame: l.icon }, 0xf2fff8, 0xd8f5e6);
      c.add(this.add.text(-w / 2 + 32, ly, l.text, plain()).setOrigin(0, 0.5));
    });
    const ok = button(this, -30, h / 2 - 24, 60, 18, 'Lovely', () => this.closeOverlay(), 0x7de8c8);
    c.add(ok.container);
  }

  // ---------- machines ----------

  /** "in 2h 10m", or "ready" when a batch has just finished. */
  private whenDone(ms: number | null): string {
    if (ms === null) return '';
    if (ms <= 0) return 'ready';
    return 'in ' + formatDuration(ms / 1000);
  }

  /**
   * One machine: what is waiting to be collected, what is cooking, and what
   * you could put in. The margin is shown next to each input, because the only
   * real question here is whether to sell the thing or wait for it.
   */
  private openMachine(id: MachineId) {
    const st = this.world.state;
    const now = Date.now();
    const def = MACHINES[id];
    const w = 282;
    // only as tall as it needs to be: one row per thing it will take
    const h = 104 + def.accepts.length * ROW2;
    const m = st.machineState(id);
    const c = this.openOverlay(w, h, `${def.name}${m.count > 1 ? ` x${m.count}` : ''}`);
    const top = -h / 2 + 30;
    const reopen = () => this.openMachine(id);

    c.add(this.add.text(0, top - 8, `${def.desc} — one batch takes ${formatDuration(def.minutes * 60)}`, note({ color: '#7a6a70' })).setOrigin(0.5));

    // what is finished
    const g = this.add.graphics();
    panel(g, -w / 2 + 8, top + 4, w - 16, 26, 0xffffff);
    c.add(g);
    c.add(this.add.image(-w / 2 + 22, top + 17, 'icons', ITEMS[def.output].icon).setScale(1.5));
    c.add(this.add.text(-w / 2 + 36, top + 11, `${ITEMS[def.output].name} ready: ${m.ready}`, plain()).setOrigin(0, 0.5));
    const runningLabel = m.jobs.length
      ? `${m.jobs.length} of ${st.machineSlots(id)} working, next ${this.whenDone(st.machineNextDone(id))}`
      : `idle — ${st.machineSlots(id)} slot${st.machineSlots(id) === 1 ? '' : 's'} free`;
    c.add(this.add.text(-w / 2 + 36, top + 22, runningLabel, note({ color: '#7a6a70' })).setOrigin(0, 0.5));
    // one little bar per slot: how far through its batch each one is
    const slots = st.machineSlots(id);
    if (slots > 0) {
      const bars = this.add.graphics();
      const bw = Math.floor((w - 24) / Math.max(1, slots)) - 3;
      for (let i = 0; i < slots; i++) {
        const job = m.jobs[i];
        const frac = job ? 1 - Math.max(0, job.doneAt - now) / Math.max(1, job.doneAt - job.startedAt) : 0;
        meter(bars, -w / 2 + 12 + i * (bw + 3), top + 36, bw, 5, frac, job ? 0x7de8c8 : 0xe8dcc8);
      }
      c.add(bars);
    }
    const take = button(this, w / 2 - 66, top + 9, 54, 16, 'Collect', () => {
      const n = st.collectMachine(id);
      if (!n) return audio.play('bad');
      audio.play('pop');
      this.showToast(`+${n} ${ITEMS[def.output].name.toLowerCase()}`);
      this.world.afterChange();
      reopen();
    }, 0x7de8c8);
    take.setEnabled(m.ready > 0);
    c.add(take.container);

    // what you can put in
    const free = st.machineFree(id);
    c.add(this.add.text(-w / 2 + 12, top + 50, 'Put in', note({ color: '#7a6a70' })).setOrigin(0, 0.5));
    def.accepts.forEach((item, i) => {
      const y = top + 66 + i * ROW2;
      const have = st.count(item);
      this.rowCard(c, -w / 2 + 8, y - 12, w - 16, 25, { key: 'icons', frame: ITEMS[item].icon });
      c.add(this.add.text(-w / 2 + 28, y - 6, `${ITEMS[item].name} x${have}`, plain()).setOrigin(0, 0.5));
      const gain = machineMargin(id, item);
      c.add(this.add.text(-w / 2 + 28, y + 5, `+${gain}c more than selling it`, note({ color: '#1f6a56' })).setOrigin(0, 0.5));
      const put = button(this, w / 2 - 66, y - 8, 54, 16, 'Load', () => {
        if (!st.startBatch(id, item)) return audio.play('bad');
        audio.play('pop');
        this.world.afterChange();
        reopen();
      }, 0xffe066);
      put.setEnabled(have > 0 && free > 0);
      c.add(put.container);
    });
    if (free <= 0 && m.jobs.length) c.add(this.add.text(0, h / 2 - 8, 'Every slot is busy — come back later', note({ color: '#7a6a70' })).setOrigin(0.5));
    else if (!def.accepts.some((i) => st.count(i) > 0)) c.add(this.add.text(0, h / 2 - 8, 'Nothing in the bag it can use yet', note({ color: '#7a6a70' })).setOrigin(0.5));
  }

  // ---------- the farm at a glance ----------

  /**
   * The page you open when you are deciding what to do with an evening: what
   * is waiting, what is running, and which crop is actually worth planting.
   */
  private farmPage(c: Phaser.GameObjects.Container, w: number, h: number) {
    const st = this.world.state;
    const f = st.farmSummary();
    const top = -h / 2 + 46;
    const summary: [string, string, string][] = [
      ['crop-tomato', 'Field', `${f.ripe} ripe · ${f.planted} growing${f.dry ? ` · ${f.dry} dry` : ''}`],
      ['egg', 'Barn & Stall', `${f.waiting} in barn · ${f.onCounter} on counter`],
      ['honey', 'Machines', f.running || f.ready ? `${f.running} working · ${f.ready} ready` : 'All machines idle'],
      ['coin', 'Hired Help', f.wages ? `${f.wages}c / day wages` : 'No farmhands hired'],
    ];
    const colW = Math.floor((w - 26) / 2);
    summary.forEach(([icon, title, detail], i) => {
      const cx = -w / 2 + 10 + (i % 2) * (colW + 6);
      const cy = top - 2 + Math.floor(i / 2) * 30;
      this.rowCard(c, cx, cy, colW, 26, { key: 'icons', frame: icon }, 0xfffdf9, 0xf3e7d4);
      c.add(this.add.text(cx + 26, cy + 8, title, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(cx + 26, cy + 19, detail, note({ color: '#6a5560' })).setOrigin(0, 0.5));
    });

    const secY = top + 68;
    c.add(this.add.text(-w / 2 + 12, secY, 'Best Crops to Plant Right Now', plain()).setOrigin(0, 0.5));
    const load = button(this, w / 2 - 104, secY - 8, 94, 16, 'Load machines', () => {
      const n = st.loadAllMachines();
      if (!n) return audio.play('bad');
      audio.play('pop');
      this.showToast(`Started ${n} batch${n === 1 ? '' : 'es'}`);
      this.world.afterChange();
      this.openJournal('farm');
    }, 0xffe066);
    load.setEnabled(MACHINE_IDS.some((id) => st.machineFree(id) > 0 && MACHINES[id].accepts.some((i) => st.count(i) > 0)));
    c.add(load.container);

    st.cropProfit().slice(0, 4).forEach((row, i) => {
      const y = secY + 18 + i * 20;
      this.rowCard(c, -w / 2 + 10, y - 9, w - 20, 18, null, i === 0 ? 0xe6faed : 0xfffdf9);
      c.add(this.add.image(-w / 2 + 20, y, 'icons', `crop-${row.crop}`));
      c.add(this.add.text(-w / 2 + 32, y, CROPS[row.crop].name, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(w / 2 - 76, y, `profit +${row.each}c each`, note({ color: '#6a5560' })).setOrigin(1, 0.5));
      c.add(this.add.text(w / 2 - 16, y, `${Math.round(row.perHour)}c/hr`, plain({ color: i === 0 ? '#1e6f3d' : '#9a5b00' })).setOrigin(1, 0.5));
    });
    void h;
  }

  // ---------- contracts and hired help ----------

  private contractsPage(c: Phaser.GameObjects.Container, w: number, h: number) {
    const st = this.world.state;
    const today = dayIndex(Date.now());
    const top = -h / 2 + 54;
    let y = top;

    for (const ct of st.activeContracts) {
      this.rowCard(c, -w / 2 + 8, y - 15, w - 16, 34, { key: 'icons', frame: ITEMS[ct.item].icon }, 0xf2fff8, 0xd8f5e6);
      c.add(this.add.text(-w / 2 + 32, y - 8, `${ct.from}: ${ct.done}/${ct.qty} ${ITEMS[ct.item].name}`, plain()).setOrigin(0, 0.5));
      const bar = this.add.graphics();
      meter(bar, -w / 2 + 32, y + 1, w - 108, 5, ct.done / Math.max(1, ct.qty), 0xff8fcf);
      c.add(bar);
      c.add(this.add.text(-w / 2 + 32, y + 10, `${ct.reward}c, due ${dueLabel(ct, today)} — you have ${st.count(ct.item)}`, note({ color: '#8a5e00' })).setOrigin(0, 0.5));
      const ship = button(this, w / 2 - 68, y - 8, 56, 16, 'Ship', () => {
        const { sent, finished } = st.shipToContract(ct.id);
        if (!sent) return audio.play('bad');
        audio.play(finished ? 'quest' : 'coin');
        this.showToast(finished ? `${finished.from} paid ${finished.reward} coins!` : `Shipped ${sent}`);
        this.world.afterChange();
        this.openBoard('contracts');
      }, 0x7de8c8);
      ship.setEnabled(st.count(ct.item) > 0);
      c.add(ship.container);
      y += 34;
    }

    if (!st.canTakeContract()) {
      c.add(this.add.text(0, h / 2 - 8, 'Finish one before you take another', note({ color: '#7a6a70' })).setOrigin(0.5));
      return;
    }
    c.add(this.add.text(-w / 2 + 12, y - 2, 'On the board', note({ color: '#7a6a70' })).setOrigin(0, 0.5));
    y += 13;
    st.contractBoard.slice(0, 3).forEach((ct, i) => {
      const row = y + i * ROW2;
      if (row > h / 2 - 16) return;
      this.rowCard(c, -w / 2 + 8, row - 12, w - 16, 25, { key: 'icons', frame: ITEMS[ct.item].icon });
      c.add(this.add.text(-w / 2 + 28, row - 4, `${ct.qty} ${ITEMS[ct.item].name} for ${ct.from}`, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 28, row + 6, `${ct.reward}c  +${ct.rep} rep  ${dueLabel(ct, today)}`, note({ color: '#8a5e00' })).setOrigin(0, 0.5));
      const take = button(this, w / 2 - 62, row - 7, 50, 15, 'Take', () => {
        if (!st.takeContract(i)) return audio.play('bad');
        audio.play('quest');
        this.world.afterChange();
        this.openBoard('contracts');
      }, 0xffe066);
      c.add(take.container);
    });
  }

  private helpPage(c: Phaser.GameObjects.Container, w: number, h: number) {
    const st = this.world.state;
    const top = -h / 2 + 62;
    c.add(this.add.text(0, top - 20, 'Paid a week at a time. They work the mornings you miss.', note({ color: '#7a6a70' })).setOrigin(0.5));
    HAND_IDS.forEach((id, i) => {
      const y = top + 10 + i * 34;
      const hand = HANDS[id];
      const left = st.handDaysLeft(id);
      const price = st.handPrice(id);
      this.rowCard(c, -w / 2 + 8, y - 15, w - 16, 32, { key: 'icons', frame: hand.icon }, left ? 0xf2fff8 : 0xfffaf0, left ? 0xd8f5e6 : 0xf3e7d4);
      c.add(this.add.text(-w / 2 + 32, y - 5, hand.name, plain()).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 32, y + 6, left ? `${hand.desc} — ${left} day${left === 1 ? '' : 's'} left` : hand.desc, note({ color: left ? '#1f6a56' : '#6a5a60' })).setOrigin(0, 0.5));
      if (price === null) {
        c.add(this.add.text(w / 2 - 40, y, `${hand.unlockRep} rep`, note({ color: '#7a6a70' })).setOrigin(0.5));
        return;
      }
      const hire = button(this, w / 2 - 74, y - 8, 62, 16, `${price}c`, () => {
        if (!st.hireHand(id)) return audio.play('bad');
        audio.play('coin');
        this.showToast(`${hand.name} starts tomorrow`);
        this.world.afterChange();
        this.openBoard('help');
      }, 0xffe066);
      hire.setEnabled(st.coins >= price);
      c.add(hire.container);
    });
  }

  // ---------- bag ----------

  private bagEntries(tab: 'produce' | 'seeds' | 'dishes' | 'home' | 'tools'): { key: string; icon: string; count: number; name: string }[] {
    const st = this.world.state;
    if (tab === 'tools') {
      const out: { key: string; icon: string; count: number; name: string }[] = TOOL_IDS.map((id) => ({ key: id as string, icon: TOOLS[id].icon, count: 1, name: `${TOOL_TIERS[st.upgradeLevel(id)]} ${TOOLS[id].name.toLowerCase()}` }));
      if (st.upgradeLevel('rod')) out.push({ key: 'rod', icon: 'rod', count: 1, name: 'Fishing rod' });
      if (st.upgradeLevel('seedmaker')) out.push({ key: 'seedmaker', icon: 'seedmaker', count: 1, name: 'Seed maker' });
      return out;
    }
    if (tab === 'produce') return SELLABLE.filter((id) => st.count(id) > 0).map((id) => ({ key: id, icon: ITEMS[id].icon, count: st.count(id), name: ITEMS[id].name }));
    if (tab === 'seeds') return CROP_IDS.filter((c) => st.count(`seed:${c}`) > 0).map((c) => ({ key: c, icon: `seed-${c}`, count: st.count(`seed:${c}`), name: `${CROPS[c].name} seeds` }));
    if (tab === 'home') return FURNITURE_IDS.filter((f) => st.furnitureOwned(f) > 0).map((f) => ({ key: f, icon: `furn-${f}`, count: st.furnitureOwned(f), name: FURNITURE[f].name }));
    // dishes grouped by recipe and grade, best grade first
    const groups = new Map<string, { key: string; icon: string; count: number; name: string }>();
    for (const d of [...st.world.dishes].sort((a, b) => b.grade - a.grade)) {
      const key = `${d.recipe}:${d.grade}`;
      const g = groups.get(key) ?? { key, icon: `dish-${d.recipe}`, count: 0, name: `${RECIPES[d.recipe].name} ${GRADE_NAMES[d.grade]}` };
      g.count++;
      groups.set(key, g);
    }
    return [...groups.values()];
  }

  /** Item icon for the bag; furniture uses its real sprite shrunk to fit. */
  private bagIcon(tab: string, key: string, icon: string, x: number, y: number, size: number) {
    if (tab === 'home') {
      const img = this.add.image(x, y, 'furniture', key);
      img.setScale(Math.min(size / img.width, size / img.height, 1));
      return img;
    }
    return this.add.image(x, y, 'icons', icon).setScale(size / 12 >= 2 ? 2 : 1.5);
  }

  /** Pokemon-style bag: pockets, a grid of item slots, details for the selected item. */
  private openBag(tab: 'produce' | 'seeds' | 'dishes' | 'home' | 'tools' = this.bagTab) {
    this.bagTab = tab;
    const st = this.world.state;
    const w = 300;
    const h = 176;
    const c = this.openOverlay(w, h, `Bag   (dishes ${st.world.dishes.length}/${st.dishCap})`);
    this.tabs(c, w, h, [
      ['Food', () => this.openBag('produce')],
      ['Seeds', () => this.openBag('seeds')],
      ['Dishes', () => this.openBag('dishes')],
      ['Home', () => this.openBag('home')],
      ['Tools', () => this.openBag('tools')],
    ], ['produce', 'seeds', 'dishes', 'home', 'tools'].indexOf(tab));

    const entries = this.bagEntries(tab).slice(0, 30);
    if (!entries.some((e) => e.key === this.bagSel)) this.bagSel = entries[0]?.key ?? null;

    // grid: 10 x 3 slots
    const cols = 10;
    const slot = 26;
    const x0 = -(cols * slot) / 2;
    const y0 = -h / 2 + 40;
    for (let i = 0; i < cols * 3; i++) {
      const sx = x0 + (i % cols) * slot;
      const sy = y0 + Math.floor(i / cols) * slot;
      const e = entries[i];
      const g = this.add.graphics();
      const sel = !!e && e.key === this.bagSel;
      inset(g, sx, sy, 24, 24, sel ? 0xffe066 : e ? 0xffffff : 0xefe4d2, sel ? 0xff8fcf : e ? 0x4a2a3f : 0xd9c9b8);
      c.add(g);
      if (!e) continue;
      c.add(this.bagIcon(tab, e.key, e.icon, sx + 12, sy + 12, 20));
      if (e.count > 1) c.add(this.add.text(sx + 25, sy + 26, String(e.count), tiny()).setOrigin(1, 1));
      const z = this.add.zone(sx + 12, sy + 12, 24, 24).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        audio.play('blip');
        this.bagSel = e.key;
        this.openBag(tab);
      });
      c.add(z);
    }

    // details of the selected item
    const dy = y0 + 3 * slot + 4;
    const line = this.add.graphics();
    line.fillStyle(0xd9c9b8, 1).fillRect(-w / 2 + 8, dy, w - 16, 1);
    c.add(line);
    const sel = entries.find((e) => e.key === this.bagSel);
    if (!sel) {
      const empty = { produce: 'Harvest, forage, fish or collect from animals', seeds: 'Buy seeds at the farm stall or the store', dishes: 'Cook something in the kitchen', home: 'Buy furniture at Cozy Corner in town', tools: '' }[tab];
      c.add(this.add.text(0, dy + 22, `Nothing here yet. ${empty}.`, plain({ color: '#7a6a70', align: 'center', wordWrap: { width: w - 24 } })).setOrigin(0.5));
      return;
    }
    const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
    const tx = -w / 2 + 38;
    c.add(this.bagIcon(tab, sel.key, sel.icon, -w / 2 + 20, dy + 20, 26));
    c.add(this.add.text(tx, dy + 9, tab === 'tools' ? sel.name : `${sel.name}  x${sel.count}`, plain()).setOrigin(0, 0.5));
    let info = '';
    let hint = '';
    let action: [string, () => void] | null = null;
    if (tab === 'tools') {
      if ((TOOL_IDS as string[]).includes(sel.key)) {
        const lvl = st.upgradeLevel(sel.key as ToolId);
        info = `Works on ${TOOL_REACH[lvl]}`;
        hint = lvl < 2 ? `${TOOL_TIERS[lvl + 1]} upgrade at the farm stall` : 'Best tool there is!';
      } else if (sel.key === 'rod') {
        info = 'Catch 10 kinds of fish';
        hint = 'Face a pond and press act';
      } else {
        info = `1 crop into ${SEEDS_PER_CROP} seeds`;
        hint = 'It stands by the field';
      }
    } else if (tab === 'produce') {
      const id = sel.key as ItemId;
      info = `Sells for ${st.sellPrice(id)}c today`;
      const uses = Object.values(RECIPES).filter((r) => r.ingredients[id]).map((r) => r.name);
      hint = uses.length ? `Used in ${uses[0]}${uses.length > 1 ? ` +${uses.length - 1} more` : ''}` : 'Sell at the stall or store';
    } else if (tab === 'seeds') {
      const id = sel.key as CropId;
      info = `Grows in ${this.growText(id)}, sells ${CROPS[id].sellPrice}c`;
      hint = st.selectedSeed === id ? 'In hand. Plant on tilled soil' : 'Hold it to plant it';
      if (st.selectedSeed !== id) action = ['Hold', () => { this.world.selectSeed(id); this.openBag('seeds'); }];
    } else if (tab === 'dishes') {
      const [recipe, grade] = sel.key.split(':');
      const price = st.priceOf({ recipe: recipe as RecipeId, grade: Number(grade) as 0 | 1 | 2 | 3 });
      info = `Worth ${price}c each`;
      hint = 'Serve, sell or fill an order';
    } else {
      const id = sel.key as FurnitureId;
      const placed = st.world.furniturePlaced.filter((p) => p.id === id).length;
      info = `+${FURNITURE[id].cozy} coziness, ${placed} already placed`;
      if (this.last?.area === 'home') action = ['Place', () => { this.closeOverlay(); this.world.startDecorate(id, 'place'); }];
      else hint = 'Place it inside your home';
    }
    c.add(this.add.text(tx, dy + 21, cut(info, 30), plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    if (hint) c.add(this.add.text(tx, dy + 33, cut(hint, 30), plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
    if (action) {
      const b = button(this, w / 2 - 58, dy + 12, 48, 16, action[0], action[1], 0x7de8c8);
      c.add(b.container);
    }
  }

  // ---------- map ----------
  private openMap() {
    const w = 280;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, 'Map');
    const spots: Record<AreaId, [number, number]> = { ranch: [-110, 20], farm: [-40, 20], town: [30, 20], forest: [30, -35], lane: [100, 20], home: [-40, 50], restaurant: [-40, 50], store: [30, 50], tailor: [30, 50], petshop: [30, 50], furnshop: [30, 50], qdhome: [100, 50], xbhome: [100, 50] };
    const short: Partial<Record<AreaId, string>> = { farm: 'Farm', town: 'Town', forest: 'Forest', ranch: 'Ranch', lane: 'Family' };
    const g = this.add.graphics();
    g.lineStyle(2, 0xc98b4e, 1);
    g.lineBetween(-110, 20, 100, 20);
    g.lineBetween(30, 20, 30, -35);
    c.add(g);
    const here = this.last?.area;
    const partnerArea = this.last?.partner?.online ? this.last.partner.area : null;
    for (const id of OUTDOOR_AREAS) {
      const [x, y] = spots[id];
      const known = st.world.discovered.includes(id);
      const box = this.add.graphics();
      panel(box, x - 28, y - 14, 56, 30, known ? (id === here ? 0xffe066 : 0xffffff) : 0xe0d8cc);
      c.add(box);
      const icon = id === 'farm' ? 'seed-tomato' : id === 'town' ? 'coin' : id === 'forest' ? 'mushroom' : id === 'lane' ? 'heart' : 'cow';
      c.add(this.add.image(x, y - 4, 'icons', known ? icon : 'lock'));
      c.add(this.add.text(x, y + 9, known ? short[id] ?? AREAS[id].name : '???', plain({ color: known ? P.outline : '#9a8a90' })).setOrigin(0.5));
      if (partnerArea === id || (partnerArea && AREAS[partnerArea].parent === id)) c.add(this.add.image(x + 22, y - 10, 'icons', 'heart'));
      if (known && id !== here) {
        const z = this.add.zone(x, y, 56, 30).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => {
          this.closeOverlay();
          this.world.travelTo(id);
        });
        c.add(z);
      }
    }
    c.add(this.add.text(0, h / 2 - 22, here ? `You are at ${AREAS[here].name}` : '', plain({ color: P.outline })).setOrigin(0.5));
    c.add(this.add.text(0, h / 2 - 10, 'Tap a place to travel there', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  // ---------- help ----------
  private openHelp(page: number) {
    const w = 280;
    const h = 160;
    const c = this.openOverlay(w, h, 'How to play');
    const p = HELP[page];
    c.add(this.add.image(-w / 2 + 22, -h / 2 + 34, 'icons', p.icon).setScale(2));
    c.add(this.add.text(-w / 2 + 40, -h / 2 + 34, p.title, style({ fontSize: '10px', color: '#fff4dc' })).setOrigin(0, 0.5));
    c.add(this.add.text(-w / 2 + 12, -h / 2 + 48, p.lines.join(' '), plain({ wordWrap: { width: w - 24 }, lineSpacing: 3 })).setOrigin(0, 0));
    this.pager(c, w, h, page, HELP.length, (n) => this.openHelp(n));
  }

  // ---------- sign / love tree ----------
  private openSign(text: string) {
    const lines = text.split('\n');
    const c = this.openOverlay(220, 40 + lines.length * 12, 'Sign');
    lines.forEach((l, i) => c.add(this.add.text(0, -((lines.length - 1) * 6) + 4 + i * 12, l, plain()).setOrigin(0.5)));
  }

  private openLoveTree() {
    const st = this.world.state;
    const days = st.daysTogether;
    const stage = st.loveTreeStage;
    const next = nextLoveTreeMilestone(days);
    const c = this.openOverlay(280, 134, 'The Love Tree');
    c.add(this.add.image(-100, 42, 'furniture', `lovetree${stage}`).setOrigin(0.5, 1));
    c.add(this.add.text(-60, -26, `${days} day${days === 1 ? '' : 's'} played together`, plain()).setOrigin(0, 0.5));
    c.add(this.add.text(-60, -12, `Stage ${stage} of ${LOVE_TREE_STAGES.length - 1}`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    c.add(this.add.text(-60, 4, next ? `Next bloom at ${next} days` : 'Fully blossomed!', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
    c.add(this.add.text(-60, 18, 'It grows only on days', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
    c.add(this.add.text(-60, 30, 'when you both show up.', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
    c.add(this.add.text(-60, 50, `xb ${st.world.players.xb.daysPlayed.length}d   qd ${st.world.players.qd.daysPlayed.length}d`, plain({ color: P.outline })).setOrigin(0, 0.5));
  }

  // ---------- decorate ----------
  private openDecorate() {
    const w = 260;
    const h = 160;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `Decorate   (cosy ${cozyPoints(st.world.furniturePlaced)}, +${Math.round(st.cozyBonus * 100)}% prices)`);
    const owned = FURNITURE_IDS.filter((id) => st.furnitureOwned(id) > 0);
    const top = -h / 2 + 30;
    if (!owned.length) c.add(this.add.text(0, top + 16, 'Buy furniture at the town store', plain({ color: '#7a6a70' })).setOrigin(0.5));
    owned.slice(0, 6).forEach((id, i) => {
      const y = top + i * ROW;
      c.add(this.add.image(-w / 2 + 14, y, 'icons', `furn-${id}`));
      c.add(this.add.text(-w / 2 + 24, y, `${FURNITURE[id].name} x${st.furnitureOwned(id)}`, plain()).setOrigin(0, 0.5));
      const b = button(this, w / 2 - 62, y - 7, 50, 14, 'Place', () => {
        this.closeOverlay();
        this.world.startDecorate(id, 'place');
        this.showToast(this.isTouch ? 'Tap the floor to move it, then press Place' : 'Arrow keys move it, ENTER places');
      }, 0x7de8c8);
      c.add(b.container);
    });
    const pick = button(this, -w / 2 + 8, h / 2 - 22, 110, 16, 'Pick up furniture', () => {
      this.closeOverlay();
      this.world.startDecorate(null, 'pickup');
      this.showToast(this.isTouch ? 'Tap a piece, then press Pick up' : 'Move the cursor onto a piece, SPACE picks it up');
    }, 0xffe066);
    c.add(pick.container);
    c.add(this.add.text(w / 2 - 8, h / 2 - 14, `${st.world.furniturePlaced.length} placed`, plain({ color: '#7a6a70' })).setOrigin(1, 0.5));
  }

  // ---------- mail: letter + notes ----------
  private async openMail(tab: 'letter' | 'notes' | 'question' | 'gift') {
    const w = 260;
    const h = 168;
    const c = this.openOverlay(w, h, 'Mailbox');
    this.tabs(c, w, h, [
      ['Letter', () => void this.openMail('letter')],
      ['Notes', () => void this.openMail('notes')],
      ['Question', () => void this.openMail('question')],
      ['Gift', () => void this.openMail('gift')],
    ], ['letter', 'notes', 'question', 'gift'].indexOf(tab));
    const top = -h / 2 + 44;
    if (tab === 'letter') {
      LETTER.forEach((line, i) => c.add(this.add.text(-w / 2 + 12, top + i * 11, line, plain()).setOrigin(0, 0)));
      const heart = this.add.image(w / 2 - 16, h / 2 - 12, 'icons', 'heart');
      c.add(heart);
      this.tweens.add({ targets: heart, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
      return;
    }
    if (tab === 'gift') {
      this.giftTab(c, w, h, top);
      return;
    }
    if (tab === 'notes') {
      const me = this.world.playerId;
      const other = otherPlayer(me);
      const notes = net.enabled && net.pairing ? await net.fetchNotes() : this.loadLocalNotes();
      if (net.enabled && net.pairing) void net.markNotesRead();
      if (!this.overlay || this.overlay !== c) return;
      if (!notes.length) c.add(this.add.text(0, top + 16, 'No notes yet. Write the first one!', plain({ color: '#7a6a70' })).setOrigin(0.5));
      notes.slice(0, 5).forEach((n, i) => {
        const y = top + i * 18;
        const mine = n.from_player === me;
        const g = this.add.graphics();
        panel(g, -w / 2 + 8, y - 8, w - 16, 17, mine ? 0xe8f4ff : 0xfff0f6);
        c.add(g);
        const when = new Date(n.created_at);
        c.add(this.add.text(-w / 2 + 12, y, `${mine ? 'you' : n.from_player}: ${n.body.length > 26 ? n.body.slice(0, 25) + '…' : n.body}`, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(w / 2 - 12, y, `${when.getMonth() + 1}/${when.getDate()}`, plain({ color: '#9a8a90' })).setOrigin(1, 0.5));
        const z = this.add.zone(0, y, w - 16, 17).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => {
          const cc = this.openOverlay(240, 100, `Note from ${mine ? 'you' : n.from_player}`);
          cc.add(this.add.text(0, 4, n.body, plain({ align: 'center', wordWrap: { width: 220 } })).setOrigin(0.5));
          const back = button(this, -30, 32, 60, 14, 'Back', () => void this.openMail('notes'), 0xe8dcc8);
          cc.add(back.container);
        });
        c.add(z);
      });
      const write = button(this, -w / 2 + 8, h / 2 - 22, 120, 16, `Write to ${other}`, async () => {
        const body = await promptText({ title: `A note for ${other}`, placeholder: 'Miss you. Water the tomatoes!', multiline: true, maxLength: 300, okLabel: 'Send' });
        if (!body) return;
        if (net.enabled && net.pairing) {
          if (await net.sendNote(other, body)) {
            audio.play('pop');
            this.showToast('Note left in the mailbox');
            this.world.state.stat('note');
            this.world.state.bond('note');
            this.world.afterChange();
          } else this.showToast('Could not send. Check your connection.');
        } else {
          this.localNotes.unshift({ id: Date.now(), from_player: me, to_player: other, body, created_at: new Date().toISOString(), read: false });
          this.saveLocalNotes();
          audio.play('pop');
          this.world.state.stat('note');
          this.world.state.bond('note');
          this.world.afterChange();
        }
        void this.openMail('notes');
      }, 0x7de8c8);
      c.add(write.container);
      return;
    }
    // daily question
    const q = questionForDay(Date.now());
    const day = dayKey(Date.now());
    const me = this.world.playerId;
    const other = otherPlayer(me);
    const answers = net.enabled && net.pairing ? await net.fetchAnswers(day) : this.loadLocalAnswers(day);
    if (!this.overlay || this.overlay !== c) return;
    c.add(this.add.image(-w / 2 + 18, top + 2, 'icons', 'question'));
    c.add(this.add.text(-w / 2 + 32, top + 2, q, plain({ wordWrap: { width: w - 50 } })).setOrigin(0, 0.5));
    const mine = answers[me];
    const theirs = answers[other];
    const both = !!mine && !!theirs;
    c.add(this.add.text(-w / 2 + 12, top + 30, `you: ${mine ? mine : '(not answered yet)'}`, plain({ color: mine ? P.outline : '#9a8a90', wordWrap: { width: w - 24 } })).setOrigin(0, 0));
    c.add(this.add.text(-w / 2 + 12, top + 62, `${other}: ${both ? theirs : theirs ? '(answered, reveals when you do)' : '(not answered yet)'}`, plain({ color: both ? P.outline : '#9a8a90', wordWrap: { width: w - 24 } })).setOrigin(0, 0));
    const ans = button(this, -w / 2 + 8, h / 2 - 22, 110, 16, mine ? 'Change answer' : 'Answer', async () => {
      const a = await promptText({ title: q, placeholder: 'Your answer', multiline: true, maxLength: 200, initial: mine ?? '', okLabel: 'Save' });
      if (!a) return;
      if (net.enabled && net.pairing) await net.answerQuestion(day, a);
      else this.saveLocalAnswer(day, me, a);
      if (!mine) {
        this.world.state.stat('answer');
        this.world.state.bond('answer');
        if (theirs) this.world.state.bond('both_answered');
        this.world.afterChange();
      }
      audio.play('pop');
      void this.openMail('question');
    }, 0x7de8c8);
    c.add(ans.container);
    c.add(this.add.text(w / 2 - 8, h / 2 - 14, 'new daily', plain({ color: '#7a6a70' })).setOrigin(1, 0.5));
  }

  private loadLocalNotes(): NoteRow[] {
    try {
      this.localNotes = JSON.parse(localStorage.getItem('oj-notes-local') ?? '[]') as NoteRow[];
    } catch {
      this.localNotes = [];
    }
    return this.localNotes;
  }

  private saveLocalNotes() {
    try {
      localStorage.setItem('oj-notes-local', JSON.stringify(this.localNotes.slice(0, 30)));
    } catch {
      /* ignore */
    }
  }

  private loadLocalAnswers(day: string): Partial<Record<PlayerId, string>> {
    try {
      const all = JSON.parse(localStorage.getItem('oj-answers-local') ?? '{}') as Record<string, Partial<Record<PlayerId, string>>>;
      return all[day] ?? {};
    } catch {
      return {};
    }
  }

  private saveLocalAnswer(day: string, player: PlayerId, a: string) {
    try {
      const all = JSON.parse(localStorage.getItem('oj-answers-local') ?? '{}') as Record<string, Partial<Record<PlayerId, string>>>;
      all[day] = { ...(all[day] ?? {}), [player]: a };
      localStorage.setItem('oj-answers-local', JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }

  private refreshNotesBadge() {
    /* the mailbox "!" is handled by the toast; kept for future badge */
  }

  // ---------- emotes ----------
  private toggleEmotes() {
    if (this.emoteRow) {
      this.emoteRow.destroy();
      this.emoteRow = undefined;
      return;
    }
    const { width: W, height: H } = this.scale;
    const items: Phaser.GameObjects.GameObject[] = [];
    ['wave', 'heart', 'hug'].forEach((icon, i) => {
      const g = this.add.graphics();
      panel(g, -9, -9, 18, 18, 0xfff4dc);
      const img = this.add.image(0, 0, 'icons', icon);
      const z = this.add.zone(0, 0, 20, 20).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.world.emote(icon);
        this.emoteRow?.destroy();
        this.emoteRow = undefined;
      });
      const c = this.add.container(-i * 24, 0, [g, img, z]);
      items.push(c);
    });
    this.emoteRow = this.add.container(W - 30, H - 100, items).setDepth(40);
  }

  // ---------- journal ----------
  private journeyView: number | null = null;

  private openJournal(tab: 'journey' | 'today' | 'farm' | 'us' | 'album' | 'stats' | 'settings') {
    const w = 356;
    const h = 232;
    const c = this.openOverlay(w, h, 'Journal');
    this.tabs(c, w, h, [
      ['Story', () => { this.journeyView = null; this.openJournal('journey'); }],
      ['Today', () => this.openJournal('today')],
      ['Farm', () => this.openJournal('farm')],
      ['Us', () => this.openJournal('us')],
      ['Book', () => this.openJournal('album')],
      ['Stats', () => this.openJournal('stats')],
      ['Setup', () => this.openJournal('settings')],
    ], ['journey', 'today', 'farm', 'us', 'album', 'stats', 'settings'].indexOf(tab));
    const st = this.world.state;
    const top = -h / 2 + 48;
    if (tab === 'journey') this.journeyPage(c, w, h, top);
    else if (tab === 'today') this.todayPage(c, w, h, top);
    else if (tab === 'farm') this.farmPage(c, w, h);
    else if (tab === 'us') this.usPage(c, w, h, top);
    else if (tab === 'album') {
      this.bookPage(c, w, h, top);
    } else if (tab === 'stats') {
      const s = st.world.stats;
      const cards: [string, string, string][] = [
        ['crop-tomato', 'Crops harvested', String(s.harvest ?? 0)],
        ['dish-tomato_soup', 'Cooked / Co-op', `${s.cook ?? 0} / ${s.coop ?? 0}`],
        ['plate', 'Diners served', String(s.served ?? 0)],
        ['coin', 'Counter sales', String(s.sale ?? 0)],
        ['book', 'Orders delivered', String(s.orders ?? 0)],
        ['coin', 'Total coins earned', String(s.earned ?? 0)],
        ['fish', 'Fish / Forage / Eggs', `${s.fish ?? 0} / ${s.forage ?? 0} / ${s['collect:egg'] ?? 0}`],
        ['heart', 'Days together', String(st.daysTogether)],
        ['star', 'Reputation', `${Math.floor(st.reputation)} / 100`],
      ];
      const colW = Math.floor((w - 26) / 2);
      cards.forEach(([icon, k, v], i) => {
        const cx = -w / 2 + 10 + (i % 2) * (colW + 6);
        const cy = top - 4 + Math.floor(i / 2) * 30;
        const spanW = i === cards.length - 1 ? w - 20 : colW;
        this.rowCard(c, cx, cy, spanW, 25, { key: 'icons', frame: icon }, 0xfffdf9, 0xf3e7d4);
        c.add(this.add.text(cx + 26, cy + 12.5, k, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(cx + spanW - 10, cy + 12.5, v, plain({ color: '#9a5b00' })).setOrigin(1, 0.5));
      });
    } else this.settings(c, w, h, top);
  }

  /** Story: one chapter at a time with its checklist, hints and reward. */
  private journeyPage(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const wd = this.world.state.world;
    const cur = currentChapter(wd);
    const curIdx = cur ? CHAPTERS.indexOf(cur) : CHAPTERS.length - 1;
    const idx = Math.max(0, Math.min(this.journeyView ?? curIdx, CHAPTERS.length - 1));
    const ch = CHAPTERS[idx];
    const complete = wd.questsClaimed.includes(`ch:${ch.id}`);
    const locked = !!cur && idx > curIdx;

    const headerGfx = this.add.graphics();
    pill(
      headerGfx,
      -w / 2 + 36,
      top - 6,
      w - 72,
      16,
      complete ? 0xd8f5e0 : locked ? 0xefe4d2 : 0xfff8dc,
      complete ? 0x3fb35f : 0xd8c4b4,
    );
    c.add(headerGfx);

    const prev = button(this, -w / 2 + 10, top - 6, 22, 15, '<', () => { this.journeyView = idx - 1; this.openJournal('journey'); }, 0xe8dcc8);
    const next = button(this, w / 2 - 32, top - 6, 22, 15, '>', () => { this.journeyView = idx + 1; this.openJournal('journey'); }, 0xe8dcc8);
    prev.setEnabled(idx > 0);
    next.setEnabled(idx < CHAPTERS.length - 1);
    c.add([prev.container, next.container]);
    c.add(
      this.add
        .text(0, top + 2, `Chapter ${idx + 1}/${CHAPTERS.length}  ·  ${ch.title}`, plain({ color: complete ? '#1e6f3d' : locked ? '#8a7a80' : '#3b2133' }))
        .setOrigin(0.5),
    );

    const firstOpen = ch.tasks.findIndex((t) => !wd.questsClaimed.includes(t.id) && t.progress(wd) < t.target);
    ch.tasks.forEach((t, i) => {
      const y = top + 23 + i * 27;
      const done = complete || wd.questsClaimed.includes(t.id);
      const isNext = !locked && !complete && i === firstOpen;
      const cardFill = done ? 0xe6faed : isNext ? 0xfff8dc : locked ? 0xf0e6d8 : 0xfffdf9;
      const tileFill = done ? 0xc5f0d4 : isNext ? 0xffe066 : locked ? 0xe2d4c2 : 0xf3e7d4;
      const g = this.rowCard(
        c,
        -w / 2 + 10,
        y - 12,
        w - 20,
        25,
        { key: 'icons', frame: done ? 'star' : 'book' },
        cardFill,
        tileFill,
      );
      if (isNext) {
        g.lineStyle(1, 0xff8fcf, 1).strokeRoundedRect(-w / 2 + 10, y - 12, w - 20, 25, 4);
      }
      c.add(this.add.text(-w / 2 + 36, y - 5, t.title, plain({ color: locked ? '#8a7a80' : '#3b2133' })).setOrigin(0, 0.5));
      c.add(
        this.add
          .text(-w / 2 + 36, y + 6, locked ? 'Complete earlier chapters first' : done ? 'Completed!' : t.hint, note({ color: done ? '#1e6f3d' : '#6a5560' }))
          .setOrigin(0, 0.5),
      );
      if (!locked) {
        const short = (n: number) => (n >= 1000 ? `${Math.floor(n / 100) / 10}k` : String(n));
        const prog = done ? t.target : Math.min(t.target, t.progress(wd));
        c.add(
          this.add
            .text(w / 2 - 16, y - 5, done ? 'Done' : `${short(prog)}/${short(t.target)}`, plain({ color: done ? '#1e6f3d' : '#3b2133' }))
            .setOrigin(1, 0.5),
        );
        c.add(
          this.add
            .text(w / 2 - 16, y + 6, `+${t.reward}c`, note({ color: done ? '#1e6f3d' : '#9a5b00' }))
            .setOrigin(1, 0.5),
        );
      }
    });

    const footY = h / 2 - 13;
    const footGfx = this.add.graphics();
    pill(footGfx, -w / 2 + 10, footY - 8, w - 20, 16, complete ? 0xe6faed : 0xfff2c2, complete ? 0x3fb35f : 0xd8b45e);
    c.add(footGfx);
    const footer = complete ? `Claimed: ${ch.reward.text}` : locked ? 'Finish the chapters before this one' : `Chapter Reward: ${ch.reward.text}`;
    c.add(this.add.text(0, footY, footer, plain({ color: complete ? '#1e6f3d' : '#8a4b00' })).setOrigin(0.5));
  }

  /** Today: three small tasks that change every day, plus a bonus for all three. */
  private todayPage(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const st = this.world.state;
    if (!st.world.daily) this.world.afterChange();
    const wd = st.world;
    const d = wd.daily;
    c.add(this.add.text(0, top + 2, 'Daily Tasks — complete all 3 for a bonus!', plain()).setOrigin(0.5));
    const defs = dailyDefs(wd);
    if (!d || !defs.length) {
      c.add(this.add.text(0, top + 48, 'New tasks appear each day', plain({ color: '#7a6a70' })).setOrigin(0.5));
      return;
    }
    defs.forEach((def, i) => {
      const y = top + 28 + i * 36;
      const done = d.claimed.includes(def.id);
      const prog = done ? def.target : Math.min(def.target, dailyProgress(wd, def));
      const g = this.rowCard(
        c,
        -w / 2 + 10,
        y - 15,
        w - 20,
        31,
        { key: 'icons', frame: done ? 'star' : 'sun' },
        done ? 0xe6faed : 0xfffdf9,
        done ? 0xc5f0d4 : 0xffe066,
      );
      const barW = 160;
      meter(g, -w / 2 + 36, y + 4, barW, 6, prog / Math.max(1, def.target), done ? 0x3fb35f : 0xffd23f);
      c.add(this.add.text(-w / 2 + 36, y - 6, def.title, plain({ color: '#3b2133' })).setOrigin(0, 0.5));
      c.add(this.add.text(-w / 2 + 44 + barW, y + 7, `${prog}/${def.target}`, note({ color: done ? '#1e6f3d' : '#6a5560' })).setOrigin(0, 0.5));
      c.add(this.add.text(w / 2 - 18, y, done ? 'Done' : `+${def.reward}c`, plain({ color: done ? '#1e6f3d' : '#9a5b00' })).setOrigin(1, 0.5));
    });
    const allDone = d.claimed.includes('all');
    const bonusY = h / 2 - 25;
    const bonusGfx = this.add.graphics();
    pill(bonusGfx, -w / 2 + 10, bonusY - 8, w - 20, 16, allDone ? 0xe6faed : 0xfff2c2, allDone ? 0x3fb35f : 0xd8b45e);
    c.add(bonusGfx);
    c.add(this.add.text(0, bonusY, allDone ? 'Bonus claimed! See you tomorrow' : `Finish all ${defs.length}: +${DAILY_BONUS} coins, +1 rep`, plain({ color: allDone ? '#1e6f3d' : '#8a4b00' })).setOrigin(0.5));
    c.add(this.add.text(0, h / 2 - 8, 'New tasks arrive at midnight', note({ color: '#7a6a70' })).setOrigin(0.5));
  }

  private settings(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const st = this.world.state;
    const d = st.data;
    const btnW = Math.floor((w - 28) / 2);
    const col = (i: number) => -w / 2 + 10 + (i % 2) * (btnW + 8);
    const rowY = (i: number) => top - 2 + Math.floor(i / 2) * 23;
    let slot = 0;
    const mk = (label: string, fn: () => void, color = 0xe8dcc8) => {
      const i = slot++;
      const b = button(this, col(i), rowY(i), btnW, 18, label, fn, color);
      c.add(b.container);
      return b;
    };
    mk(`Sound: ${d.soundOn ? 'on' : 'off'}`, () => {
      d.soundOn = !d.soundOn;
      audio.sfxOn = d.soundOn;
      st.save();
      this.openJournal('settings');
    });
    mk(`Music: ${d.musicOn ? 'on' : 'off'}`, () => {
      d.musicOn = !d.musicOn;
      audio.setMusic(d.musicOn);
      st.save();
      this.openJournal('settings');
    });
    mk(`Guide arrow: ${d.guideOn ? 'on' : 'off'}`, () => {
      d.guideOn = !d.guideOn;
      st.save();
      this.openJournal('settings');
    });
    const fontKey = getSavedFontKey();
    const fontOpt = FONT_OPTIONS[fontKey];
    mk(`Font: ${fontOpt.label}`, () => {
      const keys = Object.keys(FONT_OPTIONS) as FontKey[];
      const nextKey = keys[(keys.indexOf(fontKey) + 1) % keys.length];
      saveFontKey(nextKey);
      refreshFontConfig();
      this.openJournal('settings');
    }, 0x7de8c8);
    mk('Special days', () => void this.openSpecialDays(), 0xffe066);
    if (net.cloudEnabled && net.pairing) mk('Redeem a code', () => void this.openRedeem(), 0x7de8c8);
    if (net.pairing) {
      const code = net.pairing.code;
      mk(`World code: ${code}`, async () => {
        const link = `${window.location.origin}${window.location.pathname}?join=${code}`;
        const ok = await copyToClipboard(link);
        this.showToast(ok ? `Copied World ${code} invite link!` : `World Code: ${code}`);
      }, 0x7de8c8);
      if (net.cloudEnabled) {
        mk('Keep my seat (email)', async () => {
          const cur = await net.userEmail();
          if (cur) {
            this.showToast(`Seat linked to ${cur}`);
            return;
          }
          const email = await promptText({ title: 'Your email, so a new phone can restore this world', placeholder: 'you@example.com', type: 'email', okLabel: 'Send link' });
          if (!email) return;
          this.showToast((await net.linkEmail(email)) ? 'Check your inbox and tap the link' : `Could not send: ${net.lastError}`);
        });
      }
      mk('Reset partner seat', async () => {
        if (!(await confirmBox(`Free ${otherPlayer(this.world.playerId)}'s seat so they can join from a new device?`, 'Reset', 'Cancel'))) return;
        this.showToast((await net.resetPartnerSeat()) ? 'Seat freed. Share the code again.' : 'Could not reset');
      });
    }
    mk('Back to title', () => {
      st.save();
      void net.disconnect();
      this.closeOverlay();
      this.scene.stop('World');
      this.scene.start('Title');
      this.scene.stop();
    });
    mk('Delete world', async () => {
      if (await TitleScene.deleteWorld()) {
        this.closeOverlay();
        this.scene.stop('World');
        this.scene.start('Title');
        this.scene.stop();
      }
    }, 0xff6b6b);
    c.add(
      this.add
        .text(
          0,
          h / 2 - 9,
          net.pairing ? `World ${net.pairing.code}  ·  Max 2 players  ·  1 world per device` : 'Our Journey 1.0',
          note({ color: '#7a6a70' }),
        )
        .setOrigin(0.5),
    );
  }

  private async openSpecialDays() {
    const st = this.world.state;
    const w = 280;
    const h = 164;
    const c = this.openOverlay(w, h, 'Special days');
    const top = -h / 2 + 32;
    const days = st.world.specialDays;
    if (!days.length) c.add(this.add.text(0, top + 20, 'Add birthdays and your anniversary', plain({ color: '#7a6a70' })).setOrigin(0.5));
    days.slice(0, 4).forEach((sd, i) => {
      const y = top + i * 22;
      this.rowCard(c, -w / 2 + 10, y - 10, w - 20, 20, { key: 'icons', frame: 'gift' }, 0xfffdf9, 0xffe8f4);
      c.add(this.add.text(-w / 2 + 34, y, `${sd.label}  ·  ${String(sd.day).padStart(2, '0')}/${String(sd.month).padStart(2, '0')}`, plain()).setOrigin(0, 0.5));
      const del = button(this, w / 2 - 46, y - 7, 32, 14, 'x', () => {
        st.world.specialDays.splice(i, 1);
        st.touch();
        void this.openSpecialDays();
      }, 0xff8fcf);
      c.add(del.container);
    });
    const add = button(this, -w / 2 + 10, h / 2 - 24, 110, 16, 'Add a day', async () => {
      const label = await promptText({ title: 'What is the occasion? (e.g. qd birthday)', placeholder: 'qd birthday', maxLength: 24 });
      if (!label) return;
      const date = await promptText({ title: 'Date as DD/MM', placeholder: '24/12', maxLength: 5 });
      if (!date) return;
      const m = date.match(/^(\d{1,2})[\/.-](\d{1,2})$/);
      if (!m) return this.showToast('Use DD/MM, like 24/12');
      st.world.specialDays.push({ label, day: Number(m[1]), month: Number(m[2]) });
      st.touch();
      audio.play('quest');
      void this.openSpecialDays();
    }, 0x7de8c8);
    c.add(add.container);
    c.add(this.add.text(w / 2 - 10, h / 2 - 16, 'decorations + fireworks that day', note({ color: '#7a6a70' })).setOrigin(1, 0.5));
  }

  // ---------- welcome back ----------
  private openAway(a: AwaySummary) {
    const sales = a.events.filter((e) => e.type === 'sale');
    const earned = sales.reduce((s, e) => s + (e.type === 'sale' ? e.price : 0), 0);
    const left = a.events.filter((e) => e.type === 'customer_left').length;
    const ripe = a.events.filter((e) => e.type === 'ripe').length;
    const produce = a.events.filter((e) => e.type === 'produce').reduce((s, e) => s + (e.type === 'produce' ? e.count : 0), 0);
    const rain = a.events.some((e) => e.type === 'rain');
    const mins = Math.round(a.awayMs / 60000);
    const when = mins < 60 ? `${mins} min` : mins < 60 * 48 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} days`;
    const lines: [string, string][] = [];
    if (sales.length) lines.push(['dish-tomato_soup', `${count(sales.length, 'dish', 'dishes')} sold on the counter (+${earned}c)`]);
    if (sales.length && left) lines.push(['dots', 'Counter sold out — put out more dishes to sell!']);
    if (ripe) lines.push(['star', `${count(ripe, 'crop')} ripened and ready to harvest`]);
    if (produce) lines.push(['egg', `${count(produce, 'item')} waiting from your animals`]);
    if (rain) lines.push(['rain', 'It rained while away — your crops are watered!']);
    // what your love did while you were away
    const say: Record<string, [string, string]> = {
      harvest: ['crop-tomato', 'harvested %c|crop'],
      plant: ['seed-tomato', 'planted %c|seed'],
      water: ['drop', 'watered %c|plant'],
      cook: ['dish-tomato_soup', 'cooked %c|dish|dishes'],
      served: ['plate', 'served %c|diner'],
      fish: ['fish', 'caught %c|fish|fish'],
      forage: ['mushroom', 'foraged %c|thing'],
      gifts: ['gift', 'gave away %c|gift'],
      photos: ['camera', 'took %c|photo'],
      note: ['heart', 'wrote you %c|note'],
      hugs: ['hug', 'hugged you %c|time'],
    };
    if (a.partner) for (const { key, n } of a.partner.news.slice(0, 5)) if (say[key]) {
      const [icon, tpl] = say[key];
      const [text, one, many] = tpl.split('|');
      lines.push([icon, `${a.partner.id} ${text.replace('%c', count(n, one, many))}`]);
    }
    if (!lines.length) {
      this.showToast(`Welcome back! You were away ${when}.`);
      return;
    }
    const w = 310;
    const h = 66 + lines.length * 24;
    const c = this.openOverlay(w, h, mins >= 1 ? `Welcome back! (away ${when})` : 'Welcome back!');
    lines.forEach(([icon, text], i) => {
      const y = -h / 2 + 34 + i * 24;
      this.rowCard(c, -w / 2 + 10, y - 11, w - 20, 22, { key: 'icons', frame: icon }, 0xfffdf9, 0xf3e7d4);
      c.add(this.add.text(-w / 2 + 36, y, text, plain()).setOrigin(0, 0.5));
    });
    const ok = button(this, -36, h / 2 - 24, 72, 18, 'Nice!', () => this.closeOverlay(), 0x7de8c8);
    c.add(ok.container);
    if (earned) audio.play('coin');
  }
}
