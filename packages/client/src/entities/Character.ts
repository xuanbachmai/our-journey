import Phaser from 'phaser';
import { CHAR_H } from '../art/characters';
import { TILE } from '../art/tiles';
import { P } from '../art/palette';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface CollisionWorld {
  isBlocked(tx: number, ty: number): boolean;
}

const SPEED = 62; // px per second
const FOOT_W = 8;
const FOOT_H = 5;

export class Character {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  facing: Facing = 'down';
  moving = false;
  private busyUntil = 0;

  constructor(
    readonly scene: Phaser.Scene,
    readonly texKey: string,
    readonly name: string,
    x: number,
    y: number,
    readonly world: CollisionWorld,
  ) {
    this.sprite = scene.add.sprite(x, y, texKey, 0).setOrigin(0.5, 1);
    this.label = scene.add
      .text(x, y - CHAR_H - 3, name, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#ffffff',
        stroke: P.outline,
        strokeThickness: 3,
        resolution: 1,
      })
      .setOrigin(0.5, 1);
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

  /** Tile directly in front of the character. */
  get facingTile() {
    const d = this.dir();
    const px = this.sprite.x + d.x * 12;
    const py = this.sprite.y - 3 + d.y * 12;
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

  /** dx, dy normalised -1..1. */
  move(dx: number, dy: number, dtMs: number) {
    if (this.busy) {
      this.moving = false;
      this.playIdle();
      return;
    }
    const len = Math.hypot(dx, dy);
    if (len < 0.15) {
      if (this.moving) {
        this.moving = false;
        this.playIdle();
      }
      return;
    }
    const nx = (dx / len) * Math.min(1, len);
    const ny = (dy / len) * Math.min(1, len);
    if (Math.abs(nx) > Math.abs(ny)) this.facing = nx > 0 ? 'right' : 'left';
    else this.facing = ny > 0 ? 'down' : 'up';

    const step = (SPEED * dtMs) / 1000;
    const tryX = this.sprite.x + nx * step;
    if (!this.collides(tryX, this.sprite.y)) this.sprite.x = tryX;
    const tryY = this.sprite.y + ny * step;
    if (!this.collides(this.sprite.x, tryY)) this.sprite.y = tryY;

    this.moving = true;
    this.playWalk();
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

  /** Little hop used for actions. */
  bounce() {
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.85,
      scaleX: 1.12,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  update() {
    this.sprite.setDepth(this.sprite.y);
    this.label.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - CHAR_H - 3));
    this.label.setDepth(this.sprite.y + 1);
  }
}
