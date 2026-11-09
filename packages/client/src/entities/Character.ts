import Phaser from 'phaser';
import { CHAR_H } from '../art/characters';
import { TILE } from '../art/tiles';
import { P } from '../art/palette';
import { plain } from '../ui/text';
import { audio } from '../game/audio';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface CollisionWorld {
  isBlocked(tx: number, ty: number): boolean;
}

export const SPEED = 62;
/** Riding a horse outdoors. */
export const RIDE_MULT = 1.7;
const FOOT_W = 8;
const FOOT_H = 5;

export class Character {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  facing: Facing = 'down';
  moving = false;
  speed = SPEED;
  isPlayer = false;
  running = false;
  private busyUntil = 0;
  private lastBumpAt = 0;
  private lastDustAt = 0;
  private bubble?: Phaser.GameObjects.Container;
  texKey: string;

  constructor(
    readonly scene: Phaser.Scene,
    texKey: string,
    readonly name: string,
    x: number,
    y: number,
    readonly world: CollisionWorld,
  ) {
    this.texKey = texKey;
    // a soft contact shadow so the character sits on the ground, not above it
    this.shadow = scene.add.ellipse(x, y, 13, 5, 0x2a1a2f, 0.24).setOrigin(0.5, 0.5);
    this.sprite = scene.add.sprite(x, y, texKey, 0).setOrigin(0.5, 1);
    this.label = scene.add
      .text(x, y - CHAR_H - 2, name, plain({ color: '#ffffff', stroke: P.outline, strokeThickness: 2.5 }))
      .setOrigin(0.5, 1);
    this.playIdle();
  }

  /** Swap the sprite sheet (outfit change). */
  setTexture(key: string) {
    this.texKey = key;
    this.sprite.setTexture(key, 0);
    this.playIdle();
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }
  get tileX() {
    return Math.floor(this.sprite.x / TILE);
  }
  get tileY() {
    return Math.floor((this.sprite.y - 2) / TILE);
  }

  setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
    this.update();
  }

  /** Tile directly in front of the character. */
  get facingTile() {
    const d = this.dir();
    const px = this.sprite.x + d.x * 15;
    const py = this.sprite.y - 3 + d.y * 15;
    return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) };
  }

  dir() {
    switch (this.facing) {
      case 'up':
        return { x: 0, y: -1 };
      case 'down':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      default:
        return { x: 1, y: 0 };
    }
  }

  get busy() {
    return this.scene.time.now < this.busyUntil;
  }

  setBusy(ms: number) {
    this.busyUntil = this.scene.time.now + ms;
  }

  /** dx, dy normalised -1..1. Returns true if the character actually moved. */
  move(dx: number, dy: number, dtMs: number): boolean {
    if (this.busy) {
      this.moving = false;
      this.playIdle();
      return false;
    }
    const len = Math.hypot(dx, dy);
    if (len < 0.15) {
      if (this.moving) {
        this.moving = false;
        this.playIdle();
      }
      return false;
    }
    const nx = (dx / len) * Math.min(1, len);
    const ny = (dy / len) * Math.min(1, len);
    if (Math.abs(nx) > Math.abs(ny)) this.facing = nx > 0 ? 'right' : 'left';
    else this.facing = ny > 0 ? 'down' : 'up';

    const effectiveSpeed = this.running ? this.speed * 1.45 : this.speed;
    const step = (effectiveSpeed * dtMs) / 1000;
    const before = { x: this.sprite.x, y: this.sprite.y };
    const tryX = this.sprite.x + nx * step;
    if (!this.collides(tryX, this.sprite.y)) {
      this.sprite.x = tryX;
    } else if (Math.abs(ny) < 0.25) {
      // Corner-sliding assistance through 1-tile fence gates and doorways
      const slide = step * 0.65;
      if (!this.collides(tryX, this.sprite.y - 4) && !this.collides(this.sprite.x, this.sprite.y - slide)) {
        this.sprite.y -= slide;
      } else if (!this.collides(tryX, this.sprite.y + 4) && !this.collides(this.sprite.x, this.sprite.y + slide)) {
        this.sprite.y += slide;
      }
    }
    const tryY = this.sprite.y + ny * step;
    if (!this.collides(this.sprite.x, tryY)) {
      this.sprite.y = tryY;
    } else if (Math.abs(nx) < 0.25) {
      const slide = step * 0.65;
      if (!this.collides(this.sprite.x - 4, tryY) && !this.collides(this.sprite.x - slide, this.sprite.y)) {
        this.sprite.x -= slide;
      } else if (!this.collides(this.sprite.x + 4, tryY) && !this.collides(this.sprite.x + slide, this.sprite.y)) {
        this.sprite.x += slide;
      }
    }

    this.moving = true;
    this.playWalk();
    const moved = Math.abs(before.x - this.sprite.x) > 0.001 || Math.abs(before.y - this.sprite.y) > 0.001;

    if (!moved && this.isPlayer) {
      if (this.scene.time.now > this.lastBumpAt + 280) {
        this.lastBumpAt = this.scene.time.now;
        audio.play('bump');
      }
    } else if (this.running && moved && this.scene.time.now > this.lastDustAt + 140) {
      this.lastDustAt = this.scene.time.now;
      this.spawnDust();
    }
    return moved;
  }

  private spawnDust() {
    const d = this.dir();
    const dustX = this.sprite.x - d.x * 4 + (Math.random() * 4 - 2);
    const dustY = this.sprite.y - 1 - d.y * 2;
    const dust = this.scene.add.rectangle(dustX, dustY, 3, 2, 0xe8c187, 0.7).setDepth(this.sprite.y - 1);
    this.scene.tweens.add({
      targets: dust,
      y: dustY - 2,
      scaleX: 0.3,
      scaleY: 0.3,
      alpha: 0,
      duration: 160,
      onComplete: () => dust.destroy(),
    });
  }

  private collides(x: number, y: number) {
    const left = x - FOOT_W / 2;
    const right = x + FOOT_W / 2 - 1;
    const top = y - FOOT_H;
    const bottom = y - 1;
    for (const [px, py] of [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ]) {
      if (this.world.isBlocked(Math.floor(px / TILE), Math.floor(py / TILE))) return true;
    }
    return false;
  }

  private animSuffix() {
    return this.facing === 'up' ? 'up' : this.facing === 'down' ? 'down' : 'side';
  }

  playIdle() {
    this.sprite.setFlipX(this.facing === 'left');
    this.sprite.play(`${this.texKey}-idle-${this.animSuffix()}`, true);
  }

  playWalk() {
    this.sprite.setFlipX(this.facing === 'left');
    this.sprite.play(`${this.texKey}-walk-${this.animSuffix()}`, true);
  }

  face(f: Facing) {
    this.facing = f;
    this.playIdle();
  }

  bounce() {
    this.scene.tweens.add({ targets: this.sprite, scaleY: 0.85, scaleX: 1.12, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Little speech / emote bubble above the head. */
  showBubble(iconFrame: string | null, text?: string, ms = 1600) {
    this.bubble?.destroy();
    const items: Phaser.GameObjects.GameObject[] = [];
    const g = this.scene.add.graphics();
    let w = 14;
    let t: Phaser.GameObjects.Text | undefined;
    if (text) {
      t = this.scene.add.text(0, 0, text, plain({ color: P.outline, wordWrap: { width: 120 } })).setOrigin(0.5, 1);
      w = t.width + 12;
    }
    const hgt = t ? t.height + 8 : 16;
    g.fillStyle(0x4a2a3f, 1).fillRoundedRect(-w / 2 - 1, -hgt - 1, w + 2, hgt + 2, 3);
    g.fillStyle(0xfff4dc, 1).fillRoundedRect(-w / 2, -hgt, w, hgt, 3);
    g.fillStyle(0xfff4dc, 1).fillTriangle(-3, 0, 3, 0, 0, 3);
    items.push(g);
    if (t) {
      t.setPosition(0, -4);
      items.push(t);
    } else if (iconFrame) {
      items.push(this.scene.add.image(0, -8, 'icons', iconFrame));
    }
    const c = this.scene.add.container(this.sprite.x, this.sprite.y - CHAR_H - 8, items).setDepth(30000);
    this.bubble = c;
    this.scene.tweens.add({ targets: c, y: c.y - 3, duration: 300, yoyo: true, repeat: 1 });
    this.scene.time.delayedCall(ms, () => {
      if (this.bubble === c) {
        c.destroy();
        this.bubble = undefined;
      }
    });
  }

  update() {
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - 1)).setDepth(this.sprite.y - 0.5);
    this.label.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - CHAR_H - 1));
    this.label.setDepth(this.sprite.y + 1);
    this.bubble?.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - CHAR_H - 6));
  }

  destroy() {
    this.shadow.destroy();
    this.sprite.destroy();
    this.label.destroy();
    this.bubble?.destroy();
  }
}
