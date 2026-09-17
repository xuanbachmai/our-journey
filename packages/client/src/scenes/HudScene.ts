import Phaser from 'phaser';
import {
  ACCESSORIES,
  ACCESSORY_IDS,
  ANIMALS,
  ANIMAL_IDS,
  AREAS,
  BOOKS,
  canCook,
  cozyPoints,
  CROPS,
  CROP_IDS,
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
  QUESTS,
  questionForDay,
  RECIPES,
  recipeUnlocked,
  SELLABLE,
  UPGRADE_IDS,
  UPGRADES,
  type AreaId,
  type BookId,
  type CropId,
  type FurnitureId,
  type ItemId,
  type Order,
  type PlayerId,
  type Postcard,
  type Quest,
  type RecipeId,
  type UpgradeId,
} from '@hh/shared';
import { P } from '../art/palette';
import { LETTER } from '../config/letter';
import { audio } from '../game/audio';
import { net, type NoteRow } from '../game/net';
import type { AwaySummary } from '../game/state';
import { confirmBox, copyToClipboard, promptText } from '../ui/dom';
import { button, panel, plain, style } from '../ui/text';
import { TitleScene } from './TitleScene';
import type { CookResult, HudData, WorldScene } from './WorldScene';

const JOY_R = 20;
const ROW = 17;

interface HelpPage {
  title: string;
  icon: string;
  lines: string[];
}

const HELP: HelpPage[] = [
  { title: 'Farming', icon: 'seed-tomato', lines: ['Till a plot, plant a seed, water it.', 'Crops grow in real time, even when', 'the game is closed. Dry soil pauses.', 'Rain and the sprinkler water for you.', 'Ripe crops sparkle. Harvest them!'] },
  { title: 'Cooking', icon: 'dish-tomato_soup', lines: ['Cook at the kitchen by the house or', 'inside the restaurant. Each recipe', 'is a few mini-games. Good timing', 'means a better grade: C, B, A or S.', 'Reputation and books unlock recipes.'] },
  { title: 'Selling', icon: 'coin', lines: ['Counter by the road: dishes sell by', 'themselves, day and night.', 'Restaurant: diners sit down and order.', 'Bring the dish fast for a tip.', 'Town board: orders pay extra.'] },
  { title: 'Exploring', icon: 'map', lines: ['Roads lead east to Maple Town,', 'west to Sunny Ranch, north of town', 'to Whisper Forest. Every door opens.', 'Use the map to travel to places', 'you have already discovered.'] },
  { title: 'Home', icon: 'furn-sofa', lines: ['Buy furniture at the store and place', 'it inside the house with Decorate.', 'Coziness raises your dish prices.', 'The wardrobe changes hats, dyes', 'and hair from the tailor.'] },
  { title: 'Animals', icon: 'cow', lines: ['Hens lay eggs at the coop. Cows and', 'sheep at the ranch make milk and wool.', 'Bees make honey. Collect at the barn,', 'coop or hives. Pets follow you and', 'dig up little gifts. Pet them!'] },
  { title: 'Together', icon: 'heart', lines: ['The Love Tree grows on days you both', 'play. Leave notes in the mailbox.', 'Answer the daily question. Cook a', 'dish together when both online.', 'Special days bring fireworks.'] },
  { title: 'Controls', icon: 'menu', lines: ['Phone: drag left half to move, big', 'button to act. PC: WASD, SPACE.', 'Number keys pick seeds. J journal,', 'M map. In Decorate: arrows move,', 'ENTER places, ESC stops.'] },
];

export class HudScene extends Phaser.Scene {
  private world!: WorldScene;
  private isTouch = false;
  private coinText!: Phaser.GameObjects.Text;
  private repBar!: Phaser.GameObjects.Graphics;
  private repText!: Phaser.GameObjects.Text;
  private itemRow!: Phaser.GameObjects.Container;
  private hotbar!: Phaser.GameObjects.Container;
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

    this.add.image(6, 6, 'icons', 'coin').setOrigin(0, 0);
    this.coinText = this.add.text(20, 8, '0', style({ color: P.yellow })).setOrigin(0, 0);
    this.add.image(6, 19, 'icons', 'heart').setOrigin(0, 0);
    this.repBar = this.add.graphics();
    this.repText = this.add.text(66, 21, '0', style({ color: '#ff8fa3' })).setOrigin(0, 0);
    this.itemRow = this.add.container(6, 34);

    // top centre: area + weather + partner
    this.areaText = this.add.text(0, 6, '', style({ color: '#fff' })).setOrigin(0.5, 0);
    this.weatherIcon = this.add.image(0, 12, 'icons', 'sun');
    this.partnerText = this.add.text(0, 18, '', style({ color: '#ffe066' })).setOrigin(0.5, 0);

    // top right: quest ticker, menu, map, help
    this.questGfx = this.add.graphics();
    this.questText = this.add.text(0, 0, '', plain({ color: P.outline })).setOrigin(0, 0.5);
    const qz = this.add.zone(0, 0, 10, 10).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    qz.on('pointerdown', () => this.openJournal('quests'));
    this.questBox = this.add.container(0, 0, [this.questGfx, this.questText, qz]);
    this.menuBtn = this.iconButton('menu', () => this.openJournal('quests'));
    this.mapBtn = this.iconButton('map', () => this.openMap());
    this.helpBtn = this.iconButton('help', () => this.openHelp(0));
    this.emoteBtn = this.iconButton('heart', () => this.toggleEmotes());
    this.decorBtn = this.smallButton('Decorate', () => this.openDecorate(), 0xffe066);
    this.decorStop = this.smallButton('Done', () => this.world.stopDecorate(), 0x7de8c8);

    // hotbar
    this.hotbar = this.add.container(0, 0);
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics();
      const icon = this.add.image(i * 20 + 10, 10, 'icons', 'seed-wheat');
      const count = this.add.text(i * 20 + 19, 19, '0', style()).setOrigin(1, 1);
      const zone = this.add.zone(i * 20 + 10, 10, 20, 20).setInteractive();
      zone.on('pointerdown', () => this.slotSeeds[i] && this.world.selectSeed(this.slotSeeds[i]));
      this.slotGfx.push(g);
      this.slotCounts.push(count);
      this.slotIcons.push(icon);
      this.hotbar.add([g, icon, count, zone]);
    }

    // action button
    this.actionGfx = this.add.graphics();
    this.actionLabel = this.add.text(0, 0, '', plain({ align: 'center', wordWrap: { width: 40 } })).setOrigin(0.5);
    this.actionHint = this.add.text(0, 24, this.isTouch ? '' : '[SPACE]', style({ color: '#fff' })).setOrigin(0.5, 0);
    const zone = this.add.zone(0, 0, 52, 52).setInteractive({ useHandCursor: true });
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
      if (p.x < this.scale.width * 0.5 && p.y > 44 && this.joyPointer === null) {
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
    this.input.keyboard?.on('keydown-J', () => (this.overlay ? this.closeOverlay() : this.openJournal('quests')));
    this.input.keyboard?.on('keydown-M', () => (this.overlay ? this.closeOverlay() : this.openMap()));

    this.scale.on('resize', () => this.layout());
    this.layout();
    this.world.pushHud(true);
  }

  /** The world scene restarts on every door; re-bind its events each time. */
  private bindWorld() {
    const w = this.scene.get('World') as WorldScene;
    this.world = w;
    const f = w.events;
    // the world scene object survives area changes; drop the listeners from the previous visit
    for (const ev of ['hud', 'toast', 'openStall', 'openStore', 'openTailor', 'openPetshop', 'openWardrobe', 'openMail', 'openCounter', 'openRecipes', 'openBoard', 'openSign', 'openLoveTree', 'cookResult', 'away', 'quest', 'postcard', 'coopInvite', 'notes']) f.removeAllListeners(ev);
    f.on('hud', (d: HudData) => this.refresh(d));
    f.on('toast', (msg: string) => this.showToast(msg));
    f.on('openStall', () => this.openStall('seeds'));
    f.on('openStore', () => this.openStore('seeds'));
    f.on('openTailor', () => this.openTailor('hat'));
    f.on('openPetshop', () => this.openPetshop('pets'));
    f.on('openWardrobe', () => this.openWardrobe('hat'));
    f.on('openMail', () => this.openMail('letter'));
    f.on('openCounter', () => this.openCounter());
    f.on('openRecipes', () => this.openRecipes(0));
    f.on('openBoard', () => this.openBoard());
    f.on('openSign', (t: string) => this.openSign(t));
    f.on('openLoveTree', () => this.openLoveTree());
    f.on('cookResult', (r: CookResult) => this.openCookResult(r));
    f.on('away', (a: AwaySummary) => this.openAway(a));
    f.on('quest', (q: Quest) => this.showQuestBanner(q));
    f.on('postcard', (c: Postcard) => this.showPostcard(c));
    f.on('coopInvite', (m: { from: PlayerId; recipe: RecipeId }) => this.openCoopInvite(m));
    f.on('notes', () => this.refreshNotesBadge());
    f.once('shutdown', () => {
      this.closeOverlay();
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
    this.decorBtn.setPosition(6, 50);
    this.decorStop.setPosition(6, 50);
    this.areaText.setOrigin(1, 0).setPosition(W - 8, 26);
    this.partnerText.setOrigin(1, 0).setPosition(W - 8, 38);
    this.weatherIcon.setPosition(W - 8 - this.areaText.width - 10, 32);
    this.overlay?.setPosition(Math.round(W / 2), Math.round(H / 2));
    this.emoteRow?.setPosition(W - 30, H - 100);
    if (this.last) this.refresh(this.last);
  }

  private refresh(d: HudData) {
    this.last = d;
    this.coinText.setText(String(d.coins));
    this.repBar.clear();
    this.repBar.fillStyle(0x4a2a3f, 1).fillRect(20, 22, 44, 6);
    this.repBar.fillStyle(0xff8fa3, 1).fillRect(21, 23, Math.round(42 * (d.reputation / 100)), 4);
    this.repText.setText(String(Math.floor(d.reputation)));
    this.itemRow.removeAll(true);
    let x = 0;
    for (const id of SELLABLE) {
      const n = d.inventory[id] ?? 0;
      if (!n) continue;
      if (x > 200) break;
      this.itemRow.add(this.add.image(x, 0, 'icons', ITEMS[id].icon).setOrigin(0, 0));
      this.itemRow.add(this.add.text(x + 13, 3, String(n), style()).setOrigin(0, 0));
      x += 28;
    }
    if (d.dishes) {
      this.itemRow.add(this.add.image(x, 0, 'icons', 'plate').setOrigin(0, 0));
      this.itemRow.add(this.add.text(x + 13, 3, `${d.dishes}/${d.dishCap}`, style({ color: d.dishes >= d.dishCap ? '#ff6b6b' : '#fff' })).setOrigin(0, 0));
    }
    // hotbar: only crops you own seeds of or that are unlocked
    this.slotSeeds = CROP_IDS.filter((c) => (d.inventory[`seed:${c}`] ?? 0) > 0 || CROPS[c].unlockRep <= d.reputation);
    const n = this.slotSeeds.length;
    this.hotbar.setPosition(Math.round(this.scale.width / 2 - n * 10), this.scale.height - 24);
    for (let i = 0; i < 8; i++) {
      const id = this.slotSeeds[i];
      const g = this.slotGfx[i];
      g.clear();
      const vis = !!id;
      this.slotIcons[i].setVisible(vis);
      this.slotCounts[i].setVisible(vis);
      if (!id) continue;
      panel(g, i * 20, 0, 20, 20, d.selectedSeed === id ? 0xffe066 : 0xfff4dc, d.selectedSeed === id ? 0xff8fcf : 0x4a2a3f);
      this.slotIcons[i].setFrame(`seed-${id}`);
      this.slotCounts[i].setText(String(d.inventory[`seed:${id}`] ?? 0));
    }
    // action
    const a = d.action;
    this.actionGfx.clear();
    const on = !!a && a.enabled;
    this.actionGfx.fillStyle(0x4a2a3f, 1).fillCircle(0, 1, 19);
    this.actionGfx.fillStyle(on ? 0xffd23f : 0xd9c9b8, 1).fillCircle(0, 0, 18);
    this.actionGfx.fillStyle(0xffffff, on ? 0.5 : 0.25).fillCircle(-4, -6, 5);
    this.actionLabel.setText(a ? a.label : '').setColor(on ? P.outline : '#8a7a70').setFontSize(a && a.label.length > 7 ? '6px' : '8px');
    this.actionBtn.setAlpha(a ? 1 : 0.55);
    // quest ticker
    this.questGfx.clear();
    if (d.quest) {
      const txt = `${d.quest.title} ${d.quest.progress}/${d.quest.target}`;
      this.questText.setText(txt);
      const w = Math.min(this.questText.width + 14, this.scale.width - 150);
      panel(this.questGfx, -w, -9, w, 18, 0xfff4dc);
      this.questText.setPosition(-w + 7, 0);
      (this.questBox.list[2] as Phaser.GameObjects.Zone).setPosition(-w, 0).setSize(w, 18);
    } else this.questText.setText('');
    // area & weather & partner
    this.areaText.setText(d.areaName + (d.special ? `  *${d.special}*` : ''));
    this.weatherIcon.setFrame(d.weather === 'rain' ? 'rain' : d.weather === 'cloudy' ? 'cloud' : 'sun');
    this.weatherIcon.setVisible(AREAS[d.area].outdoor);
    this.weatherIcon.setPosition(Math.round(this.scale.width / 2) + 20 - Math.round(this.areaText.width / 2) - 10, 32);
    if (d.partner) {
      this.partnerText.setText(d.partner.online ? `${d.partner.id} is ${d.partner.area === d.area ? 'here' : d.partner.area ? `at ${AREAS[d.partner.area].name}` : 'online'}` : `${d.partner.id} is away`).setColor(d.partner.online ? '#7de8c8' : '#d9c9b8');
    } else this.partnerText.setText(d.online ? '' : 'solo');
    this.emoteBtn.setVisible(!!d.partner?.online);
    this.decorBtn.setVisible(d.area === 'home' && !d.decorate);
    this.decorStop.setVisible(!!d.decorate);
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

  private showQuestBanner(q: Quest) {
    const { width: W } = this.scale;
    const t1 = this.add.text(0, -6, `Quest complete: ${q.title}`, plain()).setOrigin(0.5);
    const t2 = this.add.text(0, 6, `+${q.reward} coins`, plain({ color: '#b07a00' })).setOrigin(0.5);
    const w = Math.max(t1.width, t2.width) + 24;
    const g = this.add.graphics();
    panel(g, -w / 2, -16, w, 32, 0xffe066, 0xff8fcf);
    const star = this.add.image(-w / 2 + 10, 0, 'icons', 'star');
    const c = this.add.container(Math.round(W / 2), -20, [g, star, t1, t2]).setDepth(60);
    this.tweens.add({ targets: star, angle: 360, duration: 1200, repeat: -1 });
    this.tweens.add({ targets: c, y: 70, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: -24, duration: 300, delay: 2600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
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
    c.add(this.add.text(0, 50, 'Saved in your album', plain({ color: '#7a6a70' })).setOrigin(0.5));
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
    const xbTex = `char-xb-${this.world.state.world.players.xb.outfit.hat}-${this.world.state.world.players.xb.outfit.accessory}-${this.world.state.world.players.xb.outfit.dye}-${this.world.state.world.players.xb.outfit.hair}`;
    const qdTex = `char-qd-${this.world.state.world.players.qd.outfit.hat}-${this.world.state.world.players.qd.outfit.accessory}-${this.world.state.world.players.qd.outfit.dye}-${this.world.state.world.players.qd.outfit.hair}`;
    c.add(this.add.image(x - 12, y + 16, this.textures.exists(xbTex) ? xbTex : 'char-xb-none-none-default-default', 0).setOrigin(0.5, 1));
    c.add(this.add.image(x + 6, y + 16, this.textures.exists(qdTex) ? qdTex : 'char-qd-none-none-default-default', 0).setOrigin(0.5, 1));
    if (card.scene === 'first_dish' || card.scene === 's_dish') c.add(this.add.image(x - 3, y - 12, 'icons', 'dish-tomato_soup').setScale(1.5));
    if (card.scene === 'rich') c.add(this.add.image(x - 3, y - 12, 'icons', 'coin').setScale(1.5));
    if (card.scene === 'together' || card.scene === 'first_sale' || card.scene === 'orders') c.add(this.add.image(x - 3, y - 14, 'icons', 'heart').setScale(1.5));
    c.add(this.add.text(x, y + 22, card.title, plain({ color: P.outline })).setOrigin(0.5, 0.5));
    c.add(this.add.text(x, y + 32, card.day, plain({ color: '#7a6a70' })).setOrigin(0.5, 0.5));
  }

  // ---------- overlays ----------

  private openOverlay(w: number, h: number, title: string): Phaser.GameObjects.Container {
    this.closeOverlay();
    const { width: W, height: H } = this.scale;
    w = Math.min(w, W - 8);
    h = Math.min(h, H - 6);
    const dim = this.add.rectangle(0, 0, W * 3, H * 3, 0x2a1a2f, 0.45).setInteractive();
    const g = this.add.graphics();
    panel(g, -w / 2, -h / 2, w, h, 0xfff4dc);
    g.fillStyle(0xffd23f, 1).fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 14);
    const t = this.add.text(0, -h / 2 + 9, title, plain()).setOrigin(0.5);
    const close = button(this, w / 2 - 16, -h / 2 + 2, 14, 14, 'x', () => this.closeOverlay(), 0xff8fcf);
    const c = this.add.container(Math.round(W / 2), Math.round(H / 2), [dim, g, t, close.container]).setDepth(100);
    c.setData('size', { w, h });
    this.overlay = c;
    this.world.setUiOpen(true);
    c.setScale(0.8);
    this.tweens.add({ targets: c, scale: 1, duration: 150, ease: 'Back.easeOut' });
    return c;
  }

  closeOverlay() {
    if (!this.overlay) return;
    this.overlay.destroy();
    this.overlay = undefined;
    this.world.setUiOpen(false);
    if (this.pendingPostcards.length) this.time.delayedCall(400, () => this.flushPostcards());
  }

  private tabs(c: Phaser.GameObjects.Container, w: number, h: number, items: [string, () => void][], active: number) {
    const tw = Math.floor((w - 16) / items.length);
    items.forEach(([label, fn], i) => {
      const b = button(this, -w / 2 + 8 + i * tw, -h / 2 + 19, tw - 3, 15, label, fn, i === active ? 0xffe066 : 0xe8dcc8);
      c.add(b.container);
    });
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

  private priceTag(c: Phaser.GameObjects.Container, x: number, y: number, price: number, canAfford: boolean) {
    c.add(this.add.text(x, y, `${price}c`, plain({ color: canAfford ? '#b07a00' : '#d94a4a' })).setOrigin(1, 0.5));
  }

  // ---------- stall (farm) ----------
  private openStall(tab: 'seeds' | 'upgrades' | 'sell') {
    const w = 270;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `Farm stall   (coins: ${st.coins})`);
    this.tabs(c, w, h, [
      ['Seeds', () => this.openStall('seeds')],
      ['Tools', () => this.openStall('upgrades')],
      ['Sell', () => this.openStall('sell')],
    ], ['seeds', 'upgrades', 'sell'].indexOf(tab));
    if (tab === 'seeds') this.seedList(c, w, h, () => this.openStall('seeds'));
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

  private upgradeList(c: Phaser.GameObjects.Container, w: number, h: number, shop: 'stall' | 'store' | 'petshop', reopen: () => void) {
    const st = this.world.state;
    const top = -h / 2 + 46;
    UPGRADE_IDS.filter((u) => UPGRADES[u].shop === shop).forEach((id, i) => {
      const y = top + i * 18;
      const def = UPGRADES[id];
      const lvl = st.upgradeLevel(id);
      const price = st.upgradePrice(id);
      c.add(this.add.image(-w / 2 + 14, y, 'icons', def.icon));
      const lvlText = def.prices.length > 1 ? ` ${lvl}/${def.prices.length}` : lvl ? ' (owned)' : '';
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
  private openStore(tab: 'seeds' | 'furniture' | 'books' | 'sell') {
    const w = 280;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `General Store   (coins: ${st.coins})`);
    this.tabs(c, w, h, [
      ['Seeds', () => this.openStore('seeds')],
      ['Decor', () => this.openStore('furniture')],
      ['Books+', () => this.openStore('books')],
      ['Sell', () => this.openStore('sell')],
    ], ['seeds', 'furniture', 'books', 'sell'].indexOf(tab));
    const reopen = () => this.openStore(tab);
    if (tab === 'seeds') this.seedList(c, w, h, reopen);
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
    } else {
      const top = -h / 2 + 44;
      const list = FURNITURE_IDS;
      list.slice(this.page * 7, this.page * 7 + 7).forEach((id, i) => {
        const y = top + i * ROW;
        const def = FURNITURE[id];
        const open = def.unlockRep <= st.reputation;
        c.add(this.add.image(-w / 2 + 14, y, 'icons', `furn-${id}`).setAlpha(open ? 1 : 0.4));
        c.add(this.add.text(-w / 2 + 24, y, open ? `${def.name}${st.furnitureOwned(id) ? ` (x${st.furnitureOwned(id)})` : ''}` : `${def.name} (rep ${def.unlockRep})`, plain({ color: open ? P.outline : '#9a8a90' })).setOrigin(0, 0.5));
        if (!open) return;
        c.add(this.add.text(-w / 2 + 150, y, `+${def.cozy} cosy`, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        this.priceTag(c, w / 2 - 62, y, def.price, st.coins >= def.price);
        const btn = button(this, w / 2 - 58, y - 7, 44, 14, 'Buy', () => {
          if (st.buyFurniture(id)) {
            audio.play('coin');
            this.showToast(`${def.name} bought. Place it at home!`);
            this.world.afterChange();
            reopen();
          } else audio.play('bad');
        });
        btn.setEnabled(st.coins >= def.price);
        c.add(btn.container);
      });
      this.pager(c, w, h, this.page, Math.ceil(list.length / 7), (p) => {
        this.page = p;
        reopen();
      });
    }
  }

  // ---------- tailor & wardrobe ----------
  private clothingRows(c: Phaser.GameObjects.Container, w: number, h: number, kind: 'hat' | 'accessory' | 'dye' | 'hair', mode: 'buy' | 'equip', reopen: () => void) {
    const st = this.world.state;
    const ids = (kind === 'hat' ? HAT_IDS : kind === 'accessory' ? ACCESSORY_IDS : kind === 'dye' ? DYE_IDS : HAIR_IDS) as string[];
    const defs = kind === 'hat' ? HATS : kind === 'accessory' ? ACCESSORIES : kind === 'dye' ? DYES : HAIR_COLORS;
    const top = -h / 2 + 44;
    const list = mode === 'buy' ? ids.filter((id) => id !== 'none' && id !== 'default') : ids;
    list.slice(this.page * 7, this.page * 7 + 7).forEach((id, i) => {
      const y = top + i * ROW;
      const def = (defs as Record<string, { name: string; price: number; unlockRep: number; color?: string }>)[id];
      const owned = st.owns(kind, id);
      const open = def.unlockRep <= st.reputation;
      const equipped = st.outfit[kind] === id;
      if (def.color) {
        const sw = this.add.graphics();
        sw.fillStyle(0x4a2a3f, 1).fillRect(-w / 2 + 9, y - 5, 11, 11);
        sw.fillStyle(Phaser.Display.Color.HexStringToColor(def.color).color, 1).fillRect(-w / 2 + 10, y - 4, 9, 9);
        c.add(sw);
      } else c.add(this.add.image(-w / 2 + 14, y, 'icons', kind === 'hat' ? 'hat' : 'bag').setAlpha(open ? 1 : 0.4));
      c.add(this.add.text(-w / 2 + 24, y, open ? def.name : `${def.name} (rep ${def.unlockRep})`, plain({ color: open ? P.outline : '#9a8a90' })).setOrigin(0, 0.5));
      if (mode === 'buy') {
        if (!open) return;
        if (owned) {
          c.add(this.add.text(w / 2 - 16, y, 'owned', plain({ color: '#3f9a5f' })).setOrigin(1, 0.5));
          return;
        }
        this.priceTag(c, w / 2 - 62, y, def.price, st.coins >= def.price);
        const b = button(this, w / 2 - 58, y - 7, 44, 14, 'Buy', () => {
          if (st.buyClothing(kind, id)) {
            audio.play('coin');
            st.setOutfit({ [kind]: id } as never);
            this.world.refreshFromState();
            this.showToast(`${def.name}: yours! Wearing it now.`);
            this.world.afterChange();
            reopen();
          } else audio.play('bad');
        });
        b.setEnabled(st.coins >= def.price);
        c.add(b.container);
      } else {
        if (!owned) {
          if (open) c.add(this.add.text(w / 2 - 16, y, 'at the tailor', plain({ color: '#9a8a90' })).setOrigin(1, 0.5));
          return;
        }
        const b = button(this, w / 2 - 58, y - 7, 44, 14, equipped ? 'Wearing' : 'Wear', () => {
          st.setOutfit({ [kind]: id } as never);
          audio.play('pop');
          this.world.refreshFromState();
          reopen();
        }, equipped ? 0xffe066 : 0x7de8c8);
        b.setEnabled(!equipped);
        c.add(b.container);
      }
    });
    this.pager(c, w, h, this.page, Math.max(1, Math.ceil(list.length / 7)), (p) => {
      this.page = p;
      reopen();
    });
  }

  private openTailor(tab: 'hat' | 'accessory' | 'dye' | 'hair') {
    const w = 270;
    const h = 168;
    const c = this.openOverlay(w, h, `Rosa's Tailor   (coins: ${this.world.state.coins})`);
    this.tabs(c, w, h, [
      ['Hats', () => this.openTailor('hat')],
      ['Extras', () => this.openTailor('accessory')],
      ['Dyes', () => this.openTailor('dye')],
      ['Hair', () => this.openTailor('hair')],
    ], ['hat', 'accessory', 'dye', 'hair'].indexOf(tab));
    this.clothingRows(c, w, h, tab, 'buy', () => this.openTailor(tab));
  }

  private openWardrobe(tab: 'hat' | 'accessory' | 'dye' | 'hair') {
    const w = 270;
    const h = 168;
    const c = this.openOverlay(w, h, 'Wardrobe');
    this.tabs(c, w, h, [
      ['Hats', () => this.openWardrobe('hat')],
      ['Extras', () => this.openWardrobe('accessory')],
      ['Dyes', () => this.openWardrobe('dye')],
      ['Hair', () => this.openWardrobe('hair')],
    ], ['hat', 'accessory', 'dye', 'hair'].indexOf(tab));
    this.clothingRows(c, w, h, tab, 'equip', () => this.openWardrobe(tab));
  }

  // ---------- pet shop ----------
  private openPetshop(tab: 'pets' | 'animals') {
    const w = 270;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, `Pet & Barn Shop   (coins: ${st.coins})`);
    this.tabs(c, w, h, [
      ['Pets', () => this.openPetshop('pets')],
      ['Farm animals', () => this.openPetshop('animals')],
    ], tab === 'pets' ? 0 : 1);
    const top = -h / 2 + 46;
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
    } else {
      ANIMAL_IDS.forEach((id, i) => {
        const y = top + i * 20;
        const def = ANIMALS[id];
        const price = st.animalPrice(id);
        const n = st.animalCount(id);
        c.add(this.add.image(-w / 2 + 14, y, 'icons', def.icon));
        c.add(this.add.text(-w / 2 + 24, y - 5, `${def.name}  ${n}/${def.max}`, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 24, y + 5, `${ITEMS[def.product].name} / ${def.intervalMin}m, ${def.home}`, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        if (price === null) {
          c.add(this.add.text(w / 2 - 16, y, 'max', plain({ color: '#3f9a5f' })).setOrigin(1, 0.5));
          return;
        }
        const locked = def.requires && st.upgradeLevel(def.requires) === 0;
        if (locked) {
          const up = UPGRADES[def.requires as UpgradeId];
          const upPrice = st.upgradePrice(def.requires as UpgradeId) ?? 0;
          const b = button(this, w / 2 - 96, y - 7, 84, 14, `${def.requires === 'coop' ? 'Coop' : 'Garden'} ${upPrice}c`, () => {
            if (this.world.purchaseUpgrade(def.requires as UpgradeId)) {
              this.showToast(`${up.name} built!`);
              this.openPetshop('animals');
            } else audio.play('bad');
          }, 0xffe066);
          b.setEnabled(st.canBuyUpgrade(def.requires as UpgradeId));
          c.add(b.container);
          return;
        }
        this.priceTag(c, w / 2 - 66, y, price, st.coins >= price);
        const b = button(this, w / 2 - 62, y - 7, 50, 14, 'Buy', () => {
          if (st.buyAnimal(id)) {
            audio.play(id === 'cow' ? 'moo' : id === 'sheep' ? 'baa' : id === 'chicken' ? 'cluck' : 'pop');
            this.showToast(`A new ${def.name.toLowerCase()} is waiting at the ${def.home}!`);
            this.world.afterChange();
            this.openPetshop('animals');
          } else audio.play('bad');
        }, 0x7de8c8);
        b.setEnabled(st.canBuyAnimal(id));
        c.add(b.container);
      });
    }
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

  private openCoopInvite(m: { from: PlayerId; recipe: RecipeId }) {
    const c = this.openOverlay(230, 90, 'Cook together?');
    c.add(this.add.image(-90, 6, 'icons', `dish-${m.recipe}`).setScale(2));
    c.add(this.add.text(-70, -4, `${m.from} wants to make`, plain()).setOrigin(0, 0.5));
    c.add(this.add.text(-70, 8, `${RECIPES[m.recipe].name} with you!`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    const yes = button(this, -80, 26, 70, 16, 'Join!', () => {
      this.closeOverlay();
      this.world.acceptCoop(m.recipe, m.from);
    }, 0x7de8c8);
    const no = button(this, 10, 26, 70, 16, 'Not now', () => {
      this.closeOverlay();
      this.world.declineCoop();
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
  private openBoard() {
    const w = 270;
    const h = 150;
    const st = this.world.state;
    const c = this.openOverlay(w, h, 'Orders board');
    const top = -h / 2 + 28;
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
    c.add(this.add.text(0, h / 2 - 9, 'New requests every day', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  // ---------- map ----------
  private openMap() {
    const w = 280;
    const h = 168;
    const st = this.world.state;
    const c = this.openOverlay(w, h, 'Map');
    const spots: Record<AreaId, [number, number]> = { ranch: [-95, 20], farm: [-20, 20], town: [60, 20], forest: [60, -35], home: [-40, 50], restaurant: [0, 50], store: [40, 50], tailor: [80, 50], petshop: [120, 50] };
    const g = this.add.graphics();
    g.lineStyle(2, 0xc98b4e, 1);
    g.lineBetween(-95, 20, 60, 20);
    g.lineBetween(60, 20, 60, -35);
    c.add(g);
    const here = this.last?.area;
    const partnerArea = this.last?.partner?.online ? this.last.partner.area : null;
    for (const id of OUTDOOR_AREAS) {
      const [x, y] = spots[id];
      const known = st.world.discovered.includes(id);
      const box = this.add.graphics();
      panel(box, x - 28, y - 14, 56, 30, known ? (id === here ? 0xffe066 : 0xffffff) : 0xe0d8cc);
      c.add(box);
      const icon = id === 'farm' ? 'seed-tomato' : id === 'town' ? 'coin' : id === 'forest' ? 'mushroom' : 'cow';
      c.add(this.add.image(x, y - 4, 'icons', known ? icon : 'lock'));
      c.add(this.add.text(x, y + 9, known ? AREAS[id].name.replace('Our ', '').replace('Whisper ', '').replace('Sunny ', '').replace('Maple ', '') : '???', plain({ color: known ? P.outline : '#9a8a90' })).setOrigin(0.5));
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
    c.add(this.add.text(0, h / 2 - 10, 'Tap a place you have discovered to travel there', plain({ color: '#7a6a70' })).setOrigin(0.5));
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
  private async openMail(tab: 'letter' | 'notes' | 'question') {
    const w = 260;
    const h = 168;
    const c = this.openOverlay(w, h, 'Mailbox');
    this.tabs(c, w, h, [
      ['Letter', () => void this.openMail('letter')],
      ['Notes', () => void this.openMail('notes')],
      ['Question', () => void this.openMail('question')],
    ], ['letter', 'notes', 'question'].indexOf(tab));
    const top = -h / 2 + 44;
    if (tab === 'letter') {
      LETTER.forEach((line, i) => c.add(this.add.text(-w / 2 + 12, top + i * 11, line, plain()).setOrigin(0, 0)));
      const heart = this.add.image(w / 2 - 16, h / 2 - 12, 'icons', 'heart');
      c.add(heart);
      this.tweens.add({ targets: heart, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
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
          } else this.showToast('Could not send. Check your connection.');
        } else {
          this.localNotes.unshift({ id: Date.now(), from_player: me, to_player: other, body, created_at: new Date().toISOString(), read: false });
          this.saveLocalNotes();
          audio.play('pop');
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
  private openJournal(tab: 'quests' | 'album' | 'stats' | 'settings') {
    const w = 300;
    const h = 168;
    const c = this.openOverlay(w, h, 'Journal');
    this.tabs(c, w, h, [
      ['Quests', () => this.openJournal('quests')],
      ['Album', () => this.openJournal('album')],
      ['Stats', () => this.openJournal('stats')],
      ['Settings', () => this.openJournal('settings')],
    ], ['quests', 'album', 'stats', 'settings'].indexOf(tab));
    const st = this.world.state;
    const top = -h / 2 + 40;
    if (tab === 'quests') {
      const claimed = st.world.questsClaimed;
      const idx = QUESTS.findIndex((q) => !claimed.includes(q.id));
      const start = Math.max(0, (idx === -1 ? QUESTS.length : idx) - 2);
      const show = QUESTS.slice(start, start + 6);
      show.forEach((q, i) => {
        const y = top + 2 + i * 21;
        const done = claimed.includes(q.id);
        const cur = q.id === QUESTS[idx]?.id;
        const g = this.add.graphics();
        panel(g, -w / 2 + 8, y - 10, w - 16, 20, done ? 0xd8f5e0 : cur ? 0xffffff : 0xe8dcc8);
        c.add(g);
        c.add(this.add.image(-w / 2 + 18, y, 'icons', done ? 'star' : 'book').setAlpha(done || cur ? 1 : 0.4));
        c.add(this.add.text(-w / 2 + 28, y - 5, q.title, plain({ color: done || cur ? P.outline : '#9a8a90' })).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 28, y + 5, q.desc, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        const prog = done ? q.target : Math.min(q.target, q.progress(st.world));
        c.add(this.add.text(w / 2 - 14, y - 5, done ? 'done' : `${prog}/${q.target}`, plain({ color: done ? '#3f9a5f' : P.outline })).setOrigin(1, 0.5));
        c.add(this.add.text(w / 2 - 14, y + 5, `+${q.reward}c`, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
      });
      c.add(this.add.text(0, h / 2 - 8, `${claimed.length} / ${QUESTS.length} quests done`, plain({ color: '#7a6a70' })).setOrigin(0.5));
    } else if (tab === 'album') {
      const cards = st.world.postcards;
      if (!cards.length) c.add(this.add.text(0, top + 30, 'Postcards appear here at special moments', plain({ color: '#7a6a70' })).setOrigin(0.5));
      const card = cards[this.page % Math.max(1, cards.length)];
      if (card) this.drawPostcard(c, card, 0, top + 40);
      this.pager(c, w, h, this.page % Math.max(1, cards.length), Math.max(1, cards.length), (p) => {
        this.page = p;
        this.openJournal('album');
      });
    } else if (tab === 'stats') {
      const s = st.world.stats;
      const lines: [string, string][] = [
        ['Crops harvested', String(s.harvest ?? 0)],
        ['Dishes cooked / together', `${s.cook ?? 0} / ${s.coop ?? 0}`],
        ['Diners served', String(s.served ?? 0)],
        ['Counter sales', String(s.sale ?? 0)],
        ['Orders delivered', String(s.orders ?? 0)],
        ['Coins earned', String(s.earned ?? 0)],
        ['Fish / forage / eggs', `${s.fish ?? 0} / ${s.forage ?? 0} / ${s['collect:egg'] ?? 0}`],
        ['Days together', String(st.daysTogether)],
        ['Reputation', `${Math.floor(st.reputation)} / 100`],
      ];
      lines.forEach(([k, v], i) => {
        const y = top + 4 + i * 13;
        c.add(this.add.text(-w / 2 + 12, y, k, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(w / 2 - 12, y, v, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
      });
    } else this.settings(c, w, h, top);
  }

  private settings(c: Phaser.GameObjects.Container, w: number, h: number, top: number) {
    const st = this.world.state;
    const d = st.data;
    const col = (i: number) => -w / 2 + 12 + (i % 2) * 142;
    const rowY = (i: number) => top + 2 + Math.floor(i / 2) * 20;
    const mk = (i: number, label: string, fn: () => void, color = 0xe8dcc8) => {
      const b = button(this, col(i), rowY(i), 134, 16, label, fn, color);
      c.add(b.container);
      return b;
    };
    mk(0, `Sound: ${d.soundOn ? 'on' : 'off'}`, () => {
      d.soundOn = !d.soundOn;
      audio.sfxOn = d.soundOn;
      st.save();
      this.openJournal('settings');
    });
    mk(1, `Music: ${d.musicOn ? 'on' : 'off'}`, () => {
      d.musicOn = !d.musicOn;
      audio.setMusic(d.musicOn);
      st.save();
      this.openJournal('settings');
    });
    mk(2, 'Special days', () => void this.openSpecialDays(), 0xffe066);
    if (net.enabled && net.pairing) {
      const code = net.pairing.code;
      mk(3, `Farm code: ${code}`, async () => {
        const link = `${window.location.origin}${window.location.pathname}?join=${code}`;
        const ok = await copyToClipboard(link);
        this.showToast(ok ? 'Invite link copied!' : `Code: ${code}`);
      }, 0x7de8c8);
      mk(4, 'Keep my seat (email)', async () => {
        const cur = await net.userEmail();
        if (cur) {
          this.showToast(`Seat linked to ${cur}`);
          return;
        }
        const email = await promptText({ title: 'Your email, so a new phone can restore this farm', placeholder: 'you@example.com', type: 'email', okLabel: 'Send link' });
        if (!email) return;
        this.showToast((await net.linkEmail(email)) ? 'Check your inbox and tap the link' : `Could not send: ${net.lastError}`);
      });
      mk(5, 'Reset partner seat', async () => {
        if (!(await confirmBox(`Free ${otherPlayer(this.world.playerId)}'s seat so they can pair from a new phone?`, 'Reset', 'Cancel'))) return;
        this.showToast((await net.resetPartnerSeat()) ? 'Seat freed. Share the code again.' : 'Could not reset');
      });
      mk(6, 'Leave this farm', async () => {
        if (await TitleScene.leaveFarm()) {
          st.save();
          this.closeOverlay();
          this.scene.stop('World');
          this.scene.start('Title');
          this.scene.stop();
        }
      }, 0xff8fcf);
      mk(7, 'Back to title', () => {
        st.save();
        this.closeOverlay();
        this.scene.stop('World');
        this.scene.start('Title');
        this.scene.stop();
      });
    } else {
      mk(3, 'Back to title', () => {
        st.save();
        this.closeOverlay();
        this.scene.stop('World');
        this.scene.start('Title');
        this.scene.stop();
      });
      c.add(this.add.text(-w / 2 + 12, rowY(4) + 8, net.enabled ? 'Solo mode. Pair up from the title.' : 'Solo mode: no backend configured.', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
    }
    c.add(this.add.text(0, h / 2 - 9, 'Our Journey 1.0', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  private async openSpecialDays() {
    const st = this.world.state;
    const w = 260;
    const h = 150;
    const c = this.openOverlay(w, h, 'Special days');
    const top = -h / 2 + 28;
    const days = st.world.specialDays;
    if (!days.length) c.add(this.add.text(0, top + 16, 'Add birthdays and your anniversary', plain({ color: '#7a6a70' })).setOrigin(0.5));
    days.slice(0, 4).forEach((sd, i) => {
      const y = top + i * 18;
      c.add(this.add.image(-w / 2 + 16, y, 'icons', 'gift'));
      c.add(this.add.text(-w / 2 + 28, y, `${sd.label}  ${String(sd.day).padStart(2, '0')}/${String(sd.month).padStart(2, '0')}`, plain()).setOrigin(0, 0.5));
      const del = button(this, w / 2 - 44, y - 7, 32, 14, 'x', () => {
        st.world.specialDays.splice(i, 1);
        st.touch();
        void this.openSpecialDays();
      }, 0xff8fcf);
      c.add(del.container);
    });
    const add = button(this, -w / 2 + 8, h / 2 - 22, 110, 16, 'Add a day', async () => {
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
    c.add(this.add.text(w / 2 - 8, h / 2 - 14, 'decorations + fireworks that day', plain({ color: '#7a6a70' })).setOrigin(1, 0.5));
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
    if (sales.length) lines.push(['dish-tomato_soup', `${sales.length} dishes sold, +${earned} coins`]);
    if (left) lines.push(['dots', `${left} customers left: empty counter`]);
    if (ripe) lines.push(['star', `${ripe} crops ready to harvest`]);
    if (produce) lines.push(['egg', `${produce} eggs, milk, wool or honey`]);
    if (rain) lines.push(['rain', 'It rained. The field got watered.']);
    if (!lines.length) {
      this.showToast(`Welcome back! You were away ${when}.`);
      return;
    }
    const w = 270;
    const h = 60 + lines.length * 16;
    const c = this.openOverlay(w, h, `Welcome back! (away ${when})`);
    lines.forEach(([icon, text], i) => {
      const y = -h / 2 + 30 + i * 16;
      c.add(this.add.image(-w / 2 + 16, y, 'icons', icon));
      c.add(this.add.text(-w / 2 + 28, y, text, plain()).setOrigin(0, 0.5));
    });
    const ok = button(this, -30, h / 2 - 22, 60, 16, 'Nice!', () => this.closeOverlay(), 0x7de8c8);
    c.add(ok.container);
    if (earned) audio.play('coin');
  }
}
