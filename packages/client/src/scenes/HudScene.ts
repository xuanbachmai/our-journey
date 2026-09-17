import Phaser from 'phaser';
import {
  canCook,
  CROPS,
  CROP_IDS,
  GRADE_NAMES,
  ITEMS,
  QUESTS,
  RECIPES,
  SELLABLE,
  STEP_INFO,
  unlockedRecipes,
  UPGRADE_IDS,
  UPGRADES,
  type CropId,
  type ItemId,
  type Quest,
} from '@hh/shared';
import { P } from '../art/palette';
import { LETTER } from '../config/letter';
import { audio } from '../game/audio';
import type { AwaySummary } from '../game/state';
import { button, panel, plain, style } from '../ui/text';
import type { CookResult, FarmScene, HudData } from './FarmScene';

const JOY_R = 20;

export class HudScene extends Phaser.Scene {
  private farm!: FarmScene;
  private isTouch = false;
  private coinText!: Phaser.GameObjects.Text;
  private repBar!: Phaser.GameObjects.Graphics;
  private repText!: Phaser.GameObjects.Text;
  private itemRow!: Phaser.GameObjects.Container;
  private hotbar!: Phaser.GameObjects.Container;
  private slotGfx: Phaser.GameObjects.Graphics[] = [];
  private slotCounts: Phaser.GameObjects.Text[] = [];
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
  private last?: HudData;

  constructor() {
    super('Hud');
  }

  create() {
    this.farm = this.scene.get('Farm') as FarmScene;
    this.isTouch = this.sys.game.device.input.touch;
    this.input.addPointer(2);

    // top-left: coins, reputation, items
    this.add.image(6, 6, 'icons', 'coin').setOrigin(0, 0);
    this.coinText = this.add.text(20, 8, '0', style({ color: P.yellow })).setOrigin(0, 0);
    this.add.image(6, 19, 'icons', 'heart').setOrigin(0, 0);
    this.repBar = this.add.graphics();
    this.repText = this.add.text(66, 21, '0', style({ color: '#ff8fa3' })).setOrigin(0, 0);
    this.itemRow = this.add.container(6, 34);

    // top-right: quest ticker + menu
    this.questGfx = this.add.graphics();
    this.questText = this.add.text(0, 0, '', plain({ color: P.outline })).setOrigin(0, 0.5);
    const qz = this.add.zone(0, 0, 10, 10).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    qz.on('pointerdown', () => this.openJournal('quests'));
    this.questBox = this.add.container(0, 0, [this.questGfx, this.questText, qz]);
    this.menuBtn = this.iconButton('menu', () => this.openJournal('quests'));

    // hotbar
    this.hotbar = this.add.container(0, 0);
    CROP_IDS.forEach((id, i) => {
      const g = this.add.graphics();
      const icon = this.add.image(i * 22 + 11, 11, 'icons', `seed-${id}`);
      const count = this.add.text(i * 22 + 20, 20, '0', style()).setOrigin(1, 1);
      const zone = this.add.zone(i * 22 + 11, 11, 22, 22).setInteractive();
      zone.on('pointerdown', () => this.farm.selectSeed(id));
      this.slotGfx.push(g);
      this.slotCounts.push(count);
      this.hotbar.add([g, icon, count, zone]);
    });

    // action button
    this.actionGfx = this.add.graphics();
    this.actionLabel = this.add.text(0, 0, '', plain()).setOrigin(0.5);
    this.actionHint = this.add.text(0, 24, this.isTouch ? '' : '[SPACE]', style({ color: '#fff' })).setOrigin(0.5, 0);
    const zone = this.add.zone(0, 0, 52, 52).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.farm.doAction();
      this.tweens.add({ targets: this.actionBtn, scale: 0.9, duration: 60, yoyo: true });
    });
    this.actionBtn = this.add.container(0, 0, [this.actionGfx, this.actionLabel, this.actionHint, zone]);

    // joystick
    this.joyBase = this.add.graphics().setVisible(false);
    this.joyKnob = this.add.graphics().setVisible(false);
    this.joyBase.fillStyle(0x000000, 0.18).fillCircle(0, 0, JOY_R + 4).lineStyle(1, 0xffffff, 0.6).strokeCircle(0, 0, JOY_R + 4);
    this.joyKnob.fillStyle(0xffffff, 0.75).fillCircle(0, 0, 9).lineStyle(1, 0x4a2a3f, 1).strokeCircle(0, 0, 9);

    this.hint = this.add
      .text(0, 0, this.isTouch ? 'left side: move\nright button: act' : 'WASD move  SPACE act  1-4 seeds\narrows + ENTER: friend', style({ color: '#fff', align: 'center' }))
      .setOrigin(0.5, 1)
      .setLineSpacing(2)
      .setAlpha(0.9);
    this.time.delayedCall(9000, () => this.tweens.add({ targets: this.hint, alpha: 0, duration: 800 }));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (this.overlay || this.farm.isUiOpen() || !this.isTouch) return;
      if (p.x < this.scale.width * 0.5 && p.y > 40 && this.joyPointer === null) {
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
      this.farm.setJoystick(dx / JOY_R, dy / JOY_R);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joyPointer) return;
      this.joyPointer = null;
      this.joyBase.setVisible(false);
      this.joyKnob.setVisible(false);
      this.farm.setJoystick(0, 0);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    const f = this.farm.events;
    f.on('hud', (d: HudData) => this.refresh(d));
    f.on('toast', (msg: string) => this.showToast(msg));
    f.on('openShop', () => this.openShop('seeds'));
    f.on('openMail', () => this.openMail());
    f.on('openCounter', () => this.openCounter());
    f.on('openRecipes', () => this.openRecipes());
    f.on('cookResult', (r: CookResult) => this.openCookResult(r));
    f.on('away', (a: AwaySummary) => this.openAway(a));
    f.on('quest', (q: Quest) => this.showQuestBanner(q));
    this.input.keyboard?.on('keydown-ESC', () => this.closeOverlay());
    this.input.keyboard?.on('keydown-J', () => (this.overlay ? this.closeOverlay() : this.openJournal('quests')));

    this.scale.on('resize', () => this.layout());
    this.layout();
    this.farm.pushHud(true);
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

  private layout() {
    const { width: W, height: H } = this.scale;
    this.hotbar.setPosition(Math.round(W / 2 - 44), H - 26);
    this.actionBtn.setPosition(W - 30, H - 32);
    this.hint.setPosition(W / 2, H - 30);
    this.menuBtn.setPosition(W - 14, 12);
    this.questBox.setPosition(W - 28, 12);
    this.overlay?.setPosition(Math.round(W / 2), Math.round(H / 2));
    if (this.last) this.refresh(this.last);
  }

  private refresh(d: HudData) {
    this.last = d;
    this.coinText.setText(String(d.coins));
    this.repBar.clear();
    this.repBar.fillStyle(0x4a2a3f, 1).fillRect(20, 22, 44, 6);
    this.repBar.fillStyle(0xff8fa3, 1).fillRect(21, 23, Math.round(42 * (d.reputation / 100)), 4);
    this.repText.setText(String(Math.floor(d.reputation)));
    // items row
    this.itemRow.removeAll(true);
    let x = 0;
    for (const id of SELLABLE) {
      const n = d.inventory[id] ?? 0;
      if (!n) continue;
      this.itemRow.add(this.add.image(x, 0, 'icons', ITEMS[id].icon).setOrigin(0, 0));
      this.itemRow.add(this.add.text(x + 13, 3, String(n), style()).setOrigin(0, 0));
      x += 28;
    }
    if (d.dishes) {
      this.itemRow.add(this.add.image(x, 0, 'icons', 'plate').setOrigin(0, 0));
      this.itemRow.add(this.add.text(x + 13, 3, String(d.dishes), style()).setOrigin(0, 0));
    }
    // hotbar
    CROP_IDS.forEach((id, i) => {
      const g = this.slotGfx[i];
      g.clear();
      panel(g, i * 22, 0, 22, 22, d.selectedSeed === id ? 0xffe066 : 0xfff4dc, d.selectedSeed === id ? 0xff8fcf : 0x4a2a3f);
      this.slotCounts[i].setText(String(d.inventory[`seed:${id}`] ?? 0));
    });
    // action
    const a = d.action;
    this.actionGfx.clear();
    const on = !!a && a.enabled;
    this.actionGfx.fillStyle(0x4a2a3f, 1).fillCircle(0, 1, 19);
    this.actionGfx.fillStyle(on ? 0xffd23f : 0xd9c9b8, 1).fillCircle(0, 0, 18);
    this.actionGfx.fillStyle(0xffffff, on ? 0.5 : 0.25).fillCircle(-4, -6, 5);
    this.actionLabel.setText(a ? a.label : '').setColor(on ? P.outline : '#8a7a70');
    this.actionBtn.setAlpha(a ? 1 : 0.55);
    // quest ticker
    this.questGfx.clear();
    if (d.quest) {
      const txt = `${d.quest.title}  ${d.quest.progress}/${d.quest.target}`;
      this.questText.setText(txt).setPosition(-this.questText.width - 8, 0);
      const w = this.questText.width + 14;
      panel(this.questGfx, -w, -9, w, 18, 0xfff4dc);
      this.questText.setPosition(-w + 7, 0);
      (this.questBox.list[2] as Phaser.GameObjects.Zone).setPosition(-w, 0).setSize(w, 18);
    } else {
      this.questText.setText('');
    }
  }

  // ---------- toast & banners ----------

  private showToast(msg: string) {
    this.toast?.destroy();
    const { width: W } = this.scale;
    const t = this.add.text(0, 0, msg, plain()).setOrigin(0.5);
    const g = this.add.graphics();
    panel(g, -t.width / 2 - 6, -9, t.width + 12, 18, 0xfff4dc);
    const c = this.add.container(Math.round(W / 2), -12, [g, t]).setDepth(50);
    this.toast = c;
    this.tweens.add({ targets: c, y: 14, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c,
      y: -12,
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
    this.tweens.add({ targets: c, y: 40, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: -24, duration: 300, delay: 2600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
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
    this.farm.setUiOpen(true);
    c.setScale(0.8);
    this.tweens.add({ targets: c, scale: 1, duration: 150, ease: 'Back.easeOut' });
    return c;
  }

  closeOverlay() {
    if (!this.overlay) return;
    this.overlay.destroy();
    this.overlay = undefined;
    this.farm.setUiOpen(false);
  }

  private tabs(c: Phaser.GameObjects.Container, w: number, h: number, items: [string, () => void][], active: number) {
    const tw = Math.floor((w - 16) / items.length);
    items.forEach(([label, fn], i) => {
      const b = button(this, -w / 2 + 8 + i * tw, -h / 2 + 19, tw - 3, 15, label, fn, i === active ? 0xffe066 : 0xe8dcc8);
      c.add(b.container);
    });
  }

  // --- market ---
  private openShop(tab: 'seeds' | 'upgrades') {
    const w = 260;
    const h = 168;
    const c = this.openOverlay(w, h, `Market   (coins: ${this.farm.state.coins})`);
    this.tabs(c, w, h, [
      ['Seeds & sell', () => this.openShop('seeds')],
      ['Upgrades', () => this.openShop('upgrades')],
    ], tab === 'seeds' ? 0 : 1);
    const st = this.farm.state;
    const top = -h / 2 + 38;

    if (tab === 'seeds') {
      let sellTotal = 0;
      for (const id of SELLABLE) sellTotal += st.count(id) * ITEMS[id].sellPrice;
      const sell = button(this, -w / 2 + 8, top, w - 16, 16, sellTotal ? `Sell all produce  +${sellTotal}` : 'No produce to sell', () => {
        const r = st.sellAllProduce();
        if (r.count) {
          audio.play('coin');
          this.showToast(`Sold ${r.count} items for ${r.total} coins!`);
          this.farm.afterChange();
          this.openShop('seeds');
        }
      }, 0x7de8c8);
      sell.setEnabled(sellTotal > 0);
      c.add(sell.container);
      CROP_IDS.forEach((id, i) => {
        const y = top + 30 + i * 17;
        const def = CROPS[id];
        c.add(this.add.image(-w / 2 + 14, y, 'icons', `seed-${id}`));
        c.add(this.add.text(-w / 2 + 24, y, def.name, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 112, y, `${def.seedPrice}c`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
        c.add(this.add.image(-w / 2 + 150, y, 'icons', `crop-${id}`));
        c.add(this.add.text(-w / 2 + 160, y, `${def.sellPrice}c`, plain({ color: '#3f9a5f' })).setOrigin(0, 0.5));
        const buy = button(this, w / 2 - 62, y - 8, 26, 16, 'x1', () => this.buySeed(id, 1));
        const buy5 = button(this, w / 2 - 34, y - 8, 26, 16, 'x5', () => this.buySeed(id, 5));
        buy.setEnabled(st.coins >= def.seedPrice);
        buy5.setEnabled(st.coins >= def.seedPrice * 5);
        c.add([buy.container, buy5.container]);
      });
    } else {
      UPGRADE_IDS.forEach((id, i) => {
        const y = top + 6 + i * 18;
        const def = UPGRADES[id];
        const lvl = st.upgradeLevel(id);
        const price = st.upgradePrice(id);
        c.add(this.add.image(-w / 2 + 14, y, 'icons', def.icon));
        const lvlText = def.prices.length > 1 ? ` ${lvl}/${def.prices.length}` : lvl ? ' (owned)' : '';
        c.add(this.add.text(-w / 2 + 24, y - 5, `${def.name}${lvlText}`, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(-w / 2 + 24, y + 5, def.desc, plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        if (price !== null) {
          const locked = def.requires && st.upgradeLevel(def.requires) === 0;
          c.add(this.add.text(w / 2 - 66, y, locked ? 'needs coop' : `${price}c`, plain({ color: locked ? '#7a6a70' : '#b07a00' })).setOrigin(1, 0.5));
          const b = button(this, w / 2 - 60, y - 7, 44, 14, 'Buy', () => {
            if (this.farm.purchaseUpgrade(id)) {
              this.showToast(`Bought ${def.name}!`);
              this.openShop('upgrades');
            } else audio.play('bad');
          });
          b.setEnabled(st.canBuyUpgrade(id));
          c.add(b.container);
        } else {
          c.add(this.add.text(w / 2 - 20, y, 'max', plain({ color: '#3f9a5f' })).setOrigin(1, 0.5));
        }
      });
    }
  }

  private buySeed(id: CropId, qty: number) {
    const st = this.farm.state;
    if (st.buySeed(id, qty)) {
      audio.play('coin');
      this.showToast(`Bought ${qty} ${CROPS[id].name} seeds`);
      this.farm.afterChange();
      this.openShop('seeds');
    } else {
      audio.play('bad');
      this.showToast('Not enough coins!');
    }
  }

  // --- counter ---
  private openCounter(tab: 'dishes' | 'counter' = 'dishes') {
    const w = 270;
    const h = 168;
    const st = this.farm.state;
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
            this.farm.syncCounter();
            this.farm.afterChange();
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
              this.farm.syncCounter();
              this.farm.afterChange();
              this.openCounter('counter');
            }
          }, 0xffd23f);
          c.add(b.container);
        } else {
          c.add(this.add.text(-w / 2 + 30, y, 'empty slot', plain({ color: '#7a6a70' })).setOrigin(0, 0.5));
        }
      });
    }
    c.add(this.add.text(0, h / 2 - 9, 'Sells while you are away', plain({ color: '#7a6a70' })).setOrigin(0.5));
  }

  // --- recipes ---
  private openRecipes() {
    const w = 280;
    const h = 168;
    const c = this.openOverlay(w, h, 'Kitchen');
    const st = this.farm.state;
    const unlocked = unlockedRecipes(st.reputation);
    const top = -h / 2 + 22;
    Object.values(RECIPES).forEach((r, i) => {
      const y = top + 8 + i * 18;
      const open = unlocked.includes(r.id);
      c.add(this.add.image(-w / 2 + 14, y, 'icons', `dish-${r.id}`).setAlpha(open ? 1 : 0.4));
      c.add(this.add.text(-w / 2 + 24, open ? y - 5 : y, open ? r.name : `${r.name}  (rep ${r.unlockRep})`, plain({ color: open ? P.outline : '#9a8a90' })).setOrigin(0, 0.5));
      if (open) {
        let x = -w / 2 + 24;
        for (const k in r.ingredients) {
          const id = k as ItemId;
          const need = r.ingredients[id] ?? 0;
          const have = st.count(id);
          c.add(this.add.image(x + 6, y + 5, 'icons', ITEMS[id].icon));
          c.add(this.add.text(x + 13, y + 5, `${have}/${need}`, plain({ color: have >= need ? '#3f9a5f' : '#d94a4a' })).setOrigin(0, 0.5));
          x += 40;
        }
        c.add(this.add.text(w / 2 - 66, y - 5, `${r.basePrice}c`, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
        c.add(this.add.text(w / 2 - 66, y + 5, `${r.steps.length} steps`, plain({ color: '#7a6a70' })).setOrigin(1, 0.5));
        const b = button(this, w / 2 - 60, y - 7, 44, 14, 'Cook', () => {
          this.closeOverlay();
          audio.play('open');
          this.farm.startCooking(r.id);
        }, 0x7de8c8);
        b.setEnabled(canCook(r, st.world.inventory));
        c.add(b.container);
      }
    });
  }

  private openCookResult(r: CookResult) {
    this.farm.setUiOpen(false);
    const w = 250;
    const h = 110;
    const c = this.openOverlay(w, h, 'Dish ready!');
    const grade = GRADE_NAMES[r.grade];
    const dish = this.add.image(-40, 4, 'icons', `dish-${r.recipe}`).setScale(3);
    c.add(dish);
    this.tweens.add({ targets: dish, angle: -6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(this.add.text(-10, -14, RECIPES[r.recipe].name, plain()).setOrigin(0, 0.5));
    c.add(this.add.text(-10, 2, `Grade ${grade}`, style({ fontSize: '12px', color: ['#9a8a90', '#ffffff', '#7de8c8', '#ffe066'][r.grade] })).setOrigin(0, 0.5));
    c.add(this.add.text(-10, 18, `worth ${r.price}c`, plain({ color: '#b07a00' })).setOrigin(0, 0.5));
    c.add(this.add.text(0, h / 2 - 10, 'Put it on the counter to sell', plain({ color: '#7a6a70' })).setOrigin(0.5));
    if (r.grade === 3) {
      for (let i = 0; i < 6; i++) {
        const s = this.add.image(Phaser.Math.Between(-90, 90), Phaser.Math.Between(-40, 40), 'icons', 'star').setScale(0.8);
        c.add(s);
        this.tweens.add({ targets: s, y: s.y - 20, alpha: 0, duration: 900, delay: i * 120, repeat: -1 });
      }
    }
  }

  // --- journal ---
  private openJournal(tab: 'quests' | 'stats' | 'settings') {
    const w = 300;
    const h = 168;
    const c = this.openOverlay(w, h, 'Journal');
    this.tabs(c, w, h, [
      ['Quests', () => this.openJournal('quests')],
      ['Stats', () => this.openJournal('stats')],
      ['Settings', () => this.openJournal('settings')],
    ], ['quests', 'stats', 'settings'].indexOf(tab));
    const st = this.farm.state;
    const top = -h / 2 + 40;
    if (tab === 'quests') {
      const claimed = st.world.questsClaimed;
      const idx = QUESTS.findIndex((q) => !claimed.includes(q.id));
      const show = QUESTS.slice(Math.max(0, idx - 2), Math.max(0, idx - 2) + 6);
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
    } else if (tab === 'stats') {
      const s = st.world.stats;
      const lines: [string, string][] = [
        ['Crops harvested', String(s.harvest ?? 0)],
        ['Dishes cooked', String(s.cook ?? 0)],
        ['S grade dishes', String(s['cook:S'] ?? 0)],
        ['Dishes sold', String(s.sale ?? 0)],
        ['Coins from customers', String(s.earned ?? 0)],
        ['Fish caught', String(s.fish ?? 0)],
        ['Eggs collected', String(s.egg ?? 0)],
        ['Reputation', `${Math.floor(st.reputation)} / 100`],
      ];
      lines.forEach(([k, v], i) => {
        const y = top + i * 14;
        c.add(this.add.text(-w / 2 + 12, y, k, plain()).setOrigin(0, 0.5));
        c.add(this.add.text(w / 2 - 12, y, v, plain({ color: '#b07a00' })).setOrigin(1, 0.5));
      });
    } else {
      const d = st.data;
      const sfx = button(this, -w / 2 + 12, top - 6, w - 24, 16, `Sound effects: ${d.soundOn ? 'on' : 'off'}`, () => {
        d.soundOn = !d.soundOn;
        audio.sfxOn = d.soundOn;
        st.touch();
        this.openJournal('settings');
      });
      const music = button(this, -w / 2 + 12, top + 14, w - 24, 16, `Music: ${d.musicOn ? 'on' : 'off'}`, () => {
        d.musicOn = !d.musicOn;
        audio.setMusic(d.musicOn);
        st.touch();
        this.openJournal('settings');
      });
      const title = button(this, -w / 2 + 12, top + 34, w - 24, 16, 'Back to title', () => {
        st.save();
        this.closeOverlay();
        this.scene.stop('Farm');
        this.scene.start('Title');
        this.scene.stop();
      }, 0xe8dcc8);
      c.add([sfx.container, music.container, title.container]);
      const help = [
        'Grow crops, cook, sell dishes.',
        'Customers buy while you are away.',
        'Reputation unlocks recipes.',
        this.isTouch ? 'Left: move. Right button: act.' : 'WASD move, SPACE act, J journal',
      ];
      help.forEach((l, i) => c.add(this.add.text(-w / 2 + 12, top + 62 + i * 11, l, plain({ color: '#7a6a70' })).setOrigin(0, 0.5)));
    }
  }

  private openAway(a: AwaySummary) {
    const sales = a.events.filter((e) => e.type === 'sale');
    const earned = sales.reduce((s, e) => s + (e.type === 'sale' ? e.price : 0), 0);
    const left = a.events.filter((e) => e.type === 'customer_left').length;
    const ripe = a.events.filter((e) => e.type === 'ripe').length;
    const eggs = a.events.reduce((s, e) => s + (e.type === 'eggs' ? e.count : 0), 0);
    const mins = Math.round(a.awayMs / 60000);
    const when = mins < 60 ? `${mins} min` : mins < 60 * 48 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} days`;
    const lines: [string, string][] = [];
    if (sales.length) lines.push(['dish-tomato_soup', `${sales.length} dishes sold, +${earned} coins`]);
    if (left) lines.push(['dots', `${left} customers left: empty counter`]);
    if (ripe) lines.push(['star', `${ripe} crops ready to harvest`]);
    if (eggs) lines.push(['egg', `${eggs} eggs laid`]);
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

  private openMail() {
    const w = 210;
    const h = Math.min(this.scale.height - 10, 30 + LETTER.length * 11);
    const c = this.openOverlay(w, h, 'A letter for you');
    LETTER.forEach((line, i) => c.add(this.add.text(-w / 2 + 10, -h / 2 + 24 + i * 11, line, plain()).setOrigin(0, 0)));
    const heart = this.add.image(w / 2 - 14, h / 2 - 10, 'icons', 'heart');
    c.add(heart);
    this.tweens.add({ targets: heart, scale: 1.3, duration: 500, yoyo: true, repeat: -1 });
  }
}
