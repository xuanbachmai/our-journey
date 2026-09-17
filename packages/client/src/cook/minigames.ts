import Phaser from 'phaser';
import { P } from '../art/palette';
import { plain, style } from '../ui/text';

export type MiniGameId = 'chop' | 'stir' | 'flip' | 'season' | 'heat' | 'plate' | 'reel';

export interface MiniGameCtx {
  scene: Phaser.Scene;
  /** Centre of the play area. */
  cx: number;
  cy: number;
  /** 1 = normal, larger = more forgiving (stove upgrades). */
  leniency: number;
  isTouch: boolean;
  /** true while a pointer or SPACE is held. */
  held(): boolean;
  finish(score: number): void;
  sfx(name: 'chop' | 'flip' | 'shake' | 'good' | 'bad' | 'bite' | 'splash' | 'blip'): void;
  /** Icon frame names for ingredients (plate step). */
  ingredientIcons: string[];
}

export abstract class MiniGame {
  protected objs: Phaser.GameObjects.GameObject[] = [];
  protected done = false;
  constructor(protected c: MiniGameCtx) {}
  abstract create(): void;
  update(_dt: number) {}
  down(_x: number, _y: number) {}
  move(_x: number, _y: number, _isDown: boolean) {}
  up(_x: number, _y: number) {}
  key(_k: 'space' | 'enter') {}
  protected keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.objs.push(o);
    return o;
  }
  protected end(score: number) {
    if (this.done) return;
    this.done = true;
    this.c.finish(Phaser.Math.Clamp(score, 0, 1));
  }
  destroy() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
  protected zoneBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, z0: number, z1: number, vertical = false) {
    g.fillStyle(0x4a2a3f, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0xfff4dc, 1).fillRect(x, y, w, h);
    g.fillStyle(0x7de8c8, 1);
    if (vertical) g.fillRect(x, y + h * (1 - z1), w, h * (z1 - z0));
    else g.fillRect(x + w * z0, y, w * (z1 - z0), h);
  }
}

// ---------------------------------------------------------------- CHOP
export class ChopGame extends MiniGame {
  private g!: Phaser.GameObjects.Graphics;
  private knife!: Phaser.GameObjects.Image;
  private t = 0;
  private hits: number[] = [];
  private need = 5;
  private counter!: Phaser.GameObjects.Text;
  private zoneHalf = 0.09;
  private zoneC = 0.5;
  private speed = 1.4;

  create() {
    const { scene, cx, cy } = this.c;
    this.zoneHalf *= this.c.leniency;
    this.g = this.keep(scene.add.graphics());
    // cutting board
    this.g.fillStyle(0x4a2a3f, 1).fillRect(cx - 52, cy - 22, 104, 30);
    this.g.fillStyle(0xe2ad70, 1).fillRect(cx - 50, cy - 20, 100, 26);
    this.g.fillStyle(0xc98b4e, 1).fillRect(cx - 50, cy + 2, 100, 4);
    this.keep(scene.add.image(cx, cy - 8, 'icons', this.c.ingredientIcons[0] ?? 'crop-tomato').setScale(2));
    this.knife = this.keep(scene.add.image(cx, cy - 30, 'mg', 'knife').setOrigin(0.5, 1));
    this.counter = this.keep(scene.add.text(cx, cy + 34, `0 / ${this.need}`, plain()).setOrigin(0.5));
    this.drawBar();
  }

  private drawBar() {
    const { cx, cy } = this.c;
    this.zoneBar(this.g, cx - 60, cy + 14, 120, 8, this.zoneC - this.zoneHalf, this.zoneC + this.zoneHalf);
  }

  private pos() {
    return 0.5 + 0.5 * Math.sin(this.t * this.speed * Math.PI);
  }

  update(dt: number) {
    if (this.done) return;
    this.t += dt / 1000;
    const p = this.pos();
    this.knife.x = this.c.cx - 60 + 120 * p;
    this.g.clear();
    this.g.fillStyle(0x4a2a3f, 1).fillRect(this.c.cx - 52, this.c.cy - 22, 104, 30);
    this.g.fillStyle(0xe2ad70, 1).fillRect(this.c.cx - 50, this.c.cy - 20, 100, 26);
    this.g.fillStyle(0xc98b4e, 1).fillRect(this.c.cx - 50, this.c.cy + 2, 100, 4);
    this.drawBar();
    // guide line from the knife down to the timing bar
    this.g.fillStyle(0xffffff, 0.5).fillRect(this.knife.x - 0.5, this.c.cy - 30, 1, 44);
    this.g.fillStyle(0xff6b6b, 1).fillRect(this.c.cx - 60 + 120 * p - 1, this.c.cy + 12, 2, 12);
  }

  private chop() {
    if (this.done) return;
    const d = Math.abs(this.pos() - this.zoneC);
    const acc = Phaser.Math.Clamp(1 - d / this.zoneHalf, 0, 1);
    this.hits.push(acc);
    this.c.sfx(acc > 0 ? 'chop' : 'bad');
    this.c.scene.tweens.add({ targets: this.knife, y: this.c.cy - 14, duration: 60, yoyo: true });
    this.counter.setText(`${this.hits.length} / ${this.need}`);
    const pop = this.keep(this.c.scene.add.text(this.knife.x, this.c.cy - 36, acc > 0.8 ? 'Perfect!' : acc > 0.4 ? 'Good' : acc > 0 ? 'Ok' : 'Miss', style({ color: acc > 0.8 ? '#ffe066' : '#fff' })).setOrigin(0.5));
    this.c.scene.tweens.add({ targets: pop, y: pop.y - 12, alpha: 0, duration: 500, onComplete: () => pop.destroy() });
    this.speed += 0.15;
    if (this.hits.length >= this.need) {
      const avg = this.hits.reduce((a, b) => a + b, 0) / this.need;
      this.c.scene.time.delayedCall(350, () => this.end(avg));
    }
  }

  down() {
    this.chop();
  }
  key(k: 'space' | 'enter') {
    if (k === 'space') this.chop();
  }
}

// ---------------------------------------------------------------- STIR
export class StirGame extends MiniGame {
  private g!: Phaser.GameObjects.Graphics;
  private spoon!: Phaser.GameObjects.Image;
  private lastAngle: number | null = null;
  private omega = 0;
  private elapsed = 0;
  private good = 0;
  private duration = 5;
  private min = 2.5;
  private max = 8;
  private meter!: Phaser.GameObjects.Graphics;

  create() {
    const { scene, cx, cy } = this.c;
    this.min /= this.c.leniency;
    this.max *= this.c.leniency;
    this.keep(scene.add.image(cx, cy + 4, 'mg', 'pot'));
    this.g = this.keep(scene.add.graphics());
    this.spoon = this.keep(scene.add.image(cx, cy - 10, 'mg', 'spoon').setOrigin(0.5, 0.2));
    this.meter = this.keep(scene.add.graphics());
  }

  private angleOf(x: number, y: number) {
    return Math.atan2(y - (this.c.cy - 4), x - this.c.cx);
  }

  move(x: number, y: number, isDown: boolean) {
    if (!isDown || this.done) {
      this.lastAngle = null;
      return;
    }
    const a = this.angleOf(x, y);
    if (this.lastAngle !== null) {
      let d = a - this.lastAngle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.omega = this.omega * 0.6 + (Math.abs(d) / (1 / 60)) * 0.4;
    }
    this.lastAngle = a;
    this.spoon.setRotation(a + Math.PI / 2);
    this.spoon.x = this.c.cx + Math.cos(a) * 10;
    this.spoon.y = this.c.cy - 4 + Math.sin(a) * 6;
  }

  up() {
    this.lastAngle = null;
  }

  update(dt: number) {
    if (this.done) return;
    this.elapsed += dt / 1000;
    if (this.lastAngle === null) this.omega *= 0.85;
    const inRange = this.omega >= this.min && this.omega <= this.max;
    if (inRange) {
      this.good += dt / 1000;
      if (Math.random() < 0.15) {
        const b = this.keep(this.c.scene.add.image(this.c.cx + Phaser.Math.Between(-12, 12), this.c.cy - 2, 'mg', 'bubble'));
        this.c.scene.tweens.add({ targets: b, y: b.y - 10, alpha: 0, duration: 400, onComplete: () => b.destroy() });
      }
    }
    // speed meter
    const { cx, cy } = this.c;
    this.meter.clear();
    const v = Phaser.Math.Clamp(this.omega / 12, 0, 1);
    this.zoneBar(this.meter, cx - 60, cy + 30, 120, 8, this.min / 12, this.max / 12);
    this.meter.fillStyle(inRange ? 0x3fb35f : 0xff6b6b, 1).fillRect(cx - 60 + 120 * v - 1, cy + 28, 2, 12);
    // time
    this.meter.fillStyle(0x4a2a3f, 1).fillRect(cx - 60, cy - 46, 120, 4);
    this.meter.fillStyle(0xffd23f, 1).fillRect(cx - 60, cy - 46, 120 * (1 - this.elapsed / this.duration), 4);
    if (this.elapsed >= this.duration) this.end(this.good / this.duration + 0.05);
  }
}

// ---------------------------------------------------------------- FLIP
export class FlipGame extends MiniGame {
  private g!: Phaser.GameObjects.Graphics;
  private cake!: Phaser.GameObjects.Image;
  private v = 0;
  private rate = 0.75;
  private flips: number[] = [];
  private need = 3;
  private z0 = 0.62;
  private z1 = 0.8;
  private text!: Phaser.GameObjects.Text;

  create() {
    const { scene, cx, cy } = this.c;
    const extra = (this.c.leniency - 1) * 0.08;
    this.z0 -= extra;
    this.z1 += extra;
    this.keep(scene.add.image(cx - 4, cy + 10, 'mg', 'pan'));
    this.cake = this.keep(scene.add.image(cx - 4, cy + 4, 'mg', 'pancake'));
    this.g = this.keep(scene.add.graphics());
    this.text = this.keep(scene.add.text(cx, cy + 34, `0 / ${this.need}`, plain()).setOrigin(0.5));
  }

  update(dt: number) {
    if (this.done) return;
    this.v += (dt / 1000) * this.rate;
    if (this.v > 1) {
      this.v = 0;
      this.flips.push(0);
      this.c.sfx('bad');
      this.burn();
    }
    const { cx, cy } = this.c;
    this.g.clear();
    this.zoneBar(this.g, cx + 44, cy - 40, 10, 70, this.z0, this.z1, true);
    this.g.fillStyle(0xff6b6b, 1).fillRect(cx + 42, cy - 40 + 70 * (1 - this.v) - 1, 14, 2);
  }

  private burn() {
    const t = this.keep(this.c.scene.add.text(this.c.cx - 4, this.c.cy - 20, 'Burnt!', style({ color: '#ff6b6b' })).setOrigin(0.5));
    this.c.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    this.text.setText(`${this.flips.length} / ${this.need}`);
    this.check();
  }

  private flip() {
    if (this.done) return;
    const centre = (this.z0 + this.z1) / 2;
    const half = (this.z1 - this.z0) / 2;
    const acc = Phaser.Math.Clamp(1 - Math.abs(this.v - centre) / half, 0, 1);
    this.flips.push(acc);
    this.v = 0;
    this.c.sfx(acc > 0 ? 'flip' : 'bad');
    this.c.scene.tweens.add({ targets: this.cake, y: this.c.cy - 22, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
    this.c.scene.tweens.add({ targets: this.cake, scaleY: -1, duration: 360, yoyo: true });
    const t = this.keep(this.c.scene.add.text(this.c.cx - 4, this.c.cy - 30, acc > 0.8 ? 'Perfect!' : acc > 0.4 ? 'Nice' : acc > 0 ? 'Meh' : 'Too early', style({ color: acc > 0.8 ? '#ffe066' : '#fff' })).setOrigin(0.5));
    this.c.scene.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 600, onComplete: () => t.destroy() });
    this.text.setText(`${this.flips.length} / ${this.need}`);
    this.rate += 0.15;
    this.check();
  }

  private check() {
    if (this.flips.length >= this.need) {
      const avg = this.flips.reduce((a, b) => a + b, 0) / this.need;
      this.c.scene.time.delayedCall(400, () => this.end(avg));
    }
  }

  down() {
    this.flip();
  }
  key(k: 'space' | 'enter') {
    if (k === 'space') this.flip();
  }
}

// ---------------------------------------------------------------- SEASON
export class SeasonGame extends MiniGame {
  private g!: Phaser.GameObjects.Graphics;
  private shaker!: Phaser.GameObjects.Image;
  private v = 0;
  private z0 = 0.55;
  private z1 = 0.75;
  private elapsed = 0;
  private doneBtn!: Phaser.GameObjects.Container;
  private lastShake = 0;

  create() {
    const { scene, cx, cy } = this.c;
    const extra = (this.c.leniency - 1) * 0.08;
    this.z0 -= extra;
    this.z1 += extra;
    this.keep(scene.add.image(cx - 30, cy + 8, 'mg', 'pot'));
    this.shaker = this.keep(scene.add.image(cx + 6, cy - 22, 'mg', 'shaker'));
    this.g = this.keep(scene.add.graphics());
    const bg = scene.add.graphics();
    bg.fillStyle(0x4a2a3f, 1).fillRoundedRect(-24, -9, 48, 18, 4);
    bg.fillStyle(0x7de8c8, 1).fillRoundedRect(-22, -8, 44, 16, 4);
    const label = scene.add.text(0, 0, 'Done', plain()).setOrigin(0.5);
    const zone = scene.add.zone(0, 0, 48, 18).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      this.finishNow();
    });
    this.doneBtn = this.keep(scene.add.container(cx + 40, cy + 6, [bg, label, zone]));
  }

  update(dt: number) {
    if (this.done) return;
    this.elapsed += dt / 1000;
    const { cx, cy } = this.c;
    this.g.clear();
    this.zoneBar(this.g, cx - 60, cy + 30, 120, 8, this.z0, this.z1);
    this.g.fillStyle(0xff8fcf, 1).fillRect(cx - 60, cy + 30, 120 * Math.min(1, this.v), 8);
    if (this.v > 1) this.g.fillStyle(0xff6b6b, 1).fillRect(cx - 60, cy + 30, 120, 8);
    if (this.elapsed > 7 || this.v > 1.15) this.finishNow();
    this.doneBtn.setAlpha(this.v > 0 ? 1 : 0.5);
  }

  private shake() {
    if (this.done) return;
    const now = this.c.scene.time.now;
    if (now - this.lastShake < 90) return;
    this.lastShake = now;
    this.v += 0.07 + Math.random() * 0.05;
    this.c.sfx('shake');
    this.c.scene.tweens.add({ targets: this.shaker, angle: -35, duration: 60, yoyo: true });
    for (let i = 0; i < 3; i++) {
      const p = this.keep(this.c.scene.add.rectangle(this.shaker.x - 4 + Math.random() * 6, this.shaker.y + 8, 1, 1, 0xffffff));
      this.c.scene.tweens.add({ targets: p, x: this.c.cx - 30 + Phaser.Math.Between(-10, 10), y: this.c.cy - 4, alpha: 0, duration: 250, onComplete: () => p.destroy() });
    }
  }

  private finishNow() {
    if (this.done) return;
    const centre = (this.z0 + this.z1) / 2;
    const half = (this.z1 - this.z0) / 2;
    const score = this.v > 1 ? 0 : Phaser.Math.Clamp(1 - Math.abs(this.v - centre) / (half * 1.6), 0, 1);
    this.c.sfx(score > 0.5 ? 'good' : 'bad');
    this.end(score);
  }

  down(x: number, y: number) {
    // taps on the Done button are handled by its zone
    if (Math.abs(x - this.doneBtn.x) < 26 && Math.abs(y - this.doneBtn.y) < 11) return;
    this.shake();
  }
  key(k: 'space' | 'enter') {
    if (k === 'space') this.shake();
    else this.finishNow();
  }
}

// ---------------------------------------------------------------- HEAT
export class HeatGame extends MiniGame {
  private g!: Phaser.GameObjects.Graphics;
  private flame!: Phaser.GameObjects.Image;
  private f = 0.2;
  private elapsed = 0;
  private good = 0;
  private duration = 6;
  private half = 0.12;
  private frameT = 0;

  create() {
    const { scene, cx, cy } = this.c;
    this.half *= this.c.leniency;
    this.keep(scene.add.image(cx - 30, cy + 2, 'mg', 'pot'));
    this.flame = this.keep(scene.add.image(cx - 30, cy + 28, 'mg', 'flame0').setOrigin(0.5, 1));
    this.g = this.keep(scene.add.graphics());
  }

  private band(t: number) {
    return 0.5 + 0.25 * Math.sin(t * 0.9) * Math.cos(t * 0.35);
  }

  update(dt: number) {
    if (this.done) return;
    const s = dt / 1000;
    this.elapsed += s;
    this.frameT += s;
    if (this.c.held()) this.f = Math.min(1, this.f + 0.9 * s);
    else this.f = Math.max(0, this.f - 0.7 * s);
    const centre = this.band(this.elapsed);
    const inBand = Math.abs(this.f - centre) <= this.half;
    if (inBand) this.good += s;
    this.flame.setFrame(`flame${Math.floor(this.frameT * 10) % 3}`);
    this.flame.setScale(0.5 + this.f, 0.4 + this.f * 1.1);
    const { cx, cy } = this.c;
    this.g.clear();
    this.zoneBar(this.g, cx + 30, cy - 40, 12, 76, centre - this.half, centre + this.half, true);
    this.g.fillStyle(inBand ? 0x3fb35f : 0xff6b6b, 1).fillRect(cx + 27, cy - 40 + 76 * (1 - this.f) - 1, 18, 2);
    this.g.fillStyle(0x4a2a3f, 1).fillRect(cx - 60, cy - 46, 120, 4);
    this.g.fillStyle(0xffd23f, 1).fillRect(cx - 60, cy - 46, 120 * (1 - this.elapsed / this.duration), 4);
    if (this.elapsed >= this.duration) this.end(this.good / this.duration + 0.05);
  }
}

// ---------------------------------------------------------------- PLATE
export class PlateGame extends MiniGame {
  private items: { img: Phaser.GameObjects.Image; placed: boolean }[] = [];
  private dragging: Phaser.GameObjects.Image | null = null;
  private elapsed = 0;
  private limit = 8;
  private g!: Phaser.GameObjects.Graphics;

  create() {
    const { scene, cx, cy } = this.c;
    this.limit *= this.c.leniency;
    this.g = this.keep(scene.add.graphics());
    this.keep(scene.add.image(cx, cy + 4, 'icons', 'plate').setScale(3));
    const icons = this.c.ingredientIcons.length ? this.c.ingredientIcons : ['crop-tomato', 'crop-carrot', 'crop-wheat'];
    const spots = [
      [-60, -30],
      [60, -30],
      [-60, 30],
      [60, 30],
      [0, -42],
    ];
    icons.slice(0, 5).forEach((icon, i) => {
      const img = this.keep(scene.add.image(cx + spots[i][0], cy + spots[i][1], 'icons', icon).setScale(1.6));
      this.items.push({ img, placed: false });
    });
  }

  private pick(x: number, y: number) {
    for (const it of this.items) if (!it.placed && Math.abs(it.img.x - x) < 12 && Math.abs(it.img.y - y) < 12) return it.img;
    return null;
  }

  down(x: number, y: number) {
    this.dragging = this.pick(x, y);
  }
  move(x: number, y: number, isDown: boolean) {
    if (!isDown || !this.dragging) return;
    this.dragging.setPosition(x, y);
  }
  up(x: number, y: number) {
    if (!this.dragging) return;
    const d = Math.hypot(x - this.c.cx, y - (this.c.cy + 4));
    const it = this.items.find((i) => i.img === this.dragging);
    if (it && d < 16) {
      it.placed = true;
      const n = this.items.filter((i) => i.placed).length;
      it.img.setPosition(this.c.cx + (n - 2) * 8, this.c.cy + 2).setScale(1.2);
      this.c.sfx('blip');
      if (this.items.every((i) => i.placed)) {
        const remaining = Math.max(0, this.limit - this.elapsed) / this.limit;
        this.c.sfx('good');
        this.c.scene.time.delayedCall(300, () => this.end(0.45 + 0.55 * remaining));
      }
    }
    this.dragging = null;
  }

  update(dt: number) {
    if (this.done) return;
    this.elapsed += dt / 1000;
    const { cx, cy } = this.c;
    this.g.clear();
    this.g.fillStyle(0x4a2a3f, 1).fillRect(cx - 60, cy - 56, 120, 4);
    this.g.fillStyle(0xffd23f, 1).fillRect(cx - 60, cy - 56, 120 * Math.max(0, 1 - this.elapsed / this.limit), 4);
    if (this.elapsed >= this.limit) {
      const placed = this.items.filter((i) => i.placed).length;
      this.end((placed / this.items.length) * 0.4);
    }
  }
}

// ---------------------------------------------------------------- REEL (fishing)
export class ReelGame extends MiniGame {
  private phase: 'wait' | 'bite' | 'reel' = 'wait';
  private t = 0;
  private biteAt = 0;
  private g!: Phaser.GameObjects.Graphics;
  private bobber!: Phaser.GameObjects.Image;
  private fish!: Phaser.GameObjects.Image;
  private text!: Phaser.GameObjects.Text;
  private fishPos = 0.5;
  private fishTarget = 0.5;
  private barPos = 0.5;
  private barV = 0;
  private barH = 0.26;
  private progress = 0.35;
  private tries = 0;
  private elapsed = 0;
  private bang!: Phaser.GameObjects.Text;

  create() {
    const { scene, cx, cy } = this.c;
    this.barH *= this.c.leniency;
    this.g = this.keep(scene.add.graphics());
    const pond = this.keep(scene.add.graphics());
    pond.fillStyle(0x4a2a3f, 1).fillEllipse(cx, cy + 6, 96, 44);
    pond.fillStyle(0x5fcbff, 1).fillEllipse(cx, cy + 6, 92, 40);
    pond.fillStyle(0xb3ecff, 1).fillRect(cx - 30, cy - 4, 8, 1).fillRect(cx + 10, cy + 12, 10, 1).fillRect(cx - 8, cy + 18, 6, 1);
    this.bobber = this.keep(scene.add.image(cx, cy, 'decor', 'bobber'));
    this.fish = this.keep(scene.add.image(cx + 40, cy, 'mg', 'reelfish').setVisible(false));
    this.text = this.keep(scene.add.text(cx, cy + 54, 'Waiting for a bite...', plain()).setOrigin(0.5));
    this.bang = this.keep(scene.add.text(cx, cy - 22, '!', style({ fontSize: '16px', color: '#ffe066' })).setOrigin(0.5).setVisible(false));
    this.biteAt = 1 + Math.random() * 2.5;
    scene.tweens.add({ targets: this.bobber, y: cy + 2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private hook() {
    if (this.phase === 'bite') {
      this.phase = 'reel';
      this.c.sfx('good');
      this.bang.setVisible(false);
      this.bobber.setVisible(false);
      this.fish.setVisible(true);
      this.text.setText(this.c.isTouch ? 'Hold: keep the fish in the bar' : 'Hold SPACE: keep fish in the bar');
      this.elapsed = 0;
    } else if (this.phase === 'wait') {
      // too early: scare the fish, wait again
      this.tries++;
      this.t = 0;
      this.biteAt = 1 + Math.random() * 2.5;
      this.text.setText('Too early! Waiting...');
      this.c.sfx('bad');
    }
  }

  update(dt: number) {
    if (this.done) return;
    const s = dt / 1000;
    const { cx, cy } = this.c;
    if (this.phase === 'wait') {
      this.t += s;
      if (this.t >= this.biteAt) {
        this.phase = 'bite';
        this.t = 0;
        this.bang.setVisible(true);
        this.c.sfx('bite');
        this.c.scene.tweens.add({ targets: this.bobber, y: cy + 8, duration: 80, yoyo: true, repeat: 3 });
        this.text.setText(this.c.isTouch ? 'Tap now!' : 'Press SPACE now!');
      }
      return;
    }
    if (this.phase === 'bite') {
      this.t += s;
      if (this.t > 1.1) {
        this.tries++;
        this.phase = 'wait';
        this.t = 0;
        this.biteAt = 1 + Math.random() * 2.5;
        this.bang.setVisible(false);
        this.c.sfx('bad');
        this.text.setText(this.tries >= 3 ? 'It got away...' : 'Missed! Waiting...');
        if (this.tries >= 3) this.c.scene.time.delayedCall(700, () => this.end(0));
      }
      return;
    }
    // reel
    this.elapsed += s;
    if (Math.random() < 0.02 || Math.abs(this.fishPos - this.fishTarget) < 0.02) this.fishTarget = Math.random();
    this.fishPos += (this.fishTarget - this.fishPos) * Math.min(1, s * (1.2 + this.elapsed * 0.08));
    const up = this.c.held();
    this.barV += (up ? 2.4 : -2.4) * s;
    this.barV = Phaser.Math.Clamp(this.barV, -1.2, 1.2);
    this.barPos = Phaser.Math.Clamp(this.barPos + this.barV * s, 0, 1);
    if (this.barPos === 0 || this.barPos === 1) this.barV = 0;
    const inside = Math.abs(this.fishPos - this.barPos) <= this.barH / 2;
    this.progress += (inside ? 0.28 : -0.22) * s;
    this.progress = Phaser.Math.Clamp(this.progress, 0, 1);
    // draw
    const x = cx + 30;
    const top = cy - 44;
    const H = 88;
    this.g.clear();
    this.g.fillStyle(0x4a2a3f, 1).fillRect(x - 8, top - 2, 16, H + 4);
    this.g.fillStyle(0x5fcbff, 1).fillRect(x - 6, top, 12, H);
    this.g.fillStyle(inside ? 0x7de8c8 : 0xffe066, 0.9).fillRect(x - 6, top + H * (1 - this.barPos - this.barH / 2), 12, H * this.barH);
    this.fish.setPosition(x, top + H * (1 - this.fishPos));
    // progress
    this.g.fillStyle(0x4a2a3f, 1).fillRect(x + 12, top - 2, 8, H + 4);
    this.g.fillStyle(0xfff4dc, 1).fillRect(x + 14, top, 4, H);
    this.g.fillStyle(0x3fb35f, 1).fillRect(x + 14, top + H * (1 - this.progress), 4, H * this.progress);
    if (this.progress >= 1) {
      this.c.sfx('splash');
      this.end(1);
    } else if (this.progress <= 0 || this.elapsed > 25) {
      this.text.setText('It got away...');
      this.c.sfx('bad');
      this.end(0);
    }
  }

  down() {
    this.hook();
  }
  key(k: 'space' | 'enter') {
    if (k === 'space') this.hook();
  }
}

export function makeMiniGame(id: MiniGameId, ctx: MiniGameCtx): MiniGame {
  switch (id) {
    case 'chop':
      return new ChopGame(ctx);
    case 'stir':
      return new StirGame(ctx);
    case 'flip':
      return new FlipGame(ctx);
    case 'season':
      return new SeasonGame(ctx);
    case 'heat':
      return new HeatGame(ctx);
    case 'plate':
      return new PlateGame(ctx);
    case 'reel':
      return new ReelGame(ctx);
  }
}

export { P };
