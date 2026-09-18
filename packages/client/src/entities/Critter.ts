import Phaser from 'phaser';
import { TILE } from '../art/tiles';
import type { CritterKind } from '../areas/types';

export interface PenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A farm animal that wanders inside its pen and pecks or grazes now and then. */
export class Critter {
  sprite: Phaser.GameObjects.Sprite;
  private target: { x: number; y: number } | null = null;
  private next = 0;
  private idleUntil = 0;
  private frameT = 0;

  constructor(
    private scene: Phaser.Scene,
    readonly kind: CritterKind,
    private pen: PenRect,
    private speed = 20,
  ) {
    const p = this.randomPoint();
    this.sprite = scene.add.sprite(p.x, p.y, 'critters', `${kind}0`).setOrigin(0.5, 1);
    this.next = scene.time.now + Phaser.Math.Between(300, 2000);
  }

  private randomPoint() {
    return {
      x: this.pen.x * TILE + 8 + Math.random() * (this.pen.w * TILE - 16),
      y: this.pen.y * TILE + 12 + Math.random() * (this.pen.h * TILE - 14),
    };
  }

  update(time: number, dt: number) {
    this.frameT += dt;
    if (time < this.idleUntil) {
      this.sprite.setFrame(`${this.kind}${Math.floor(this.frameT / 260) % 2}`);
      this.sprite.setDepth(this.sprite.y);
      return;
    }
    if (!this.target && time > this.next) {
      if (Math.random() < 0.45) {
        this.idleUntil = time + Phaser.Math.Between(800, 2000);
        this.next = time + Phaser.Math.Between(800, 3000);
        return;
      }
      this.target = this.randomPoint();
    }
    if (this.target) {
      const dx = this.target.x - this.sprite.x;
      const dy = this.target.y - this.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        this.target = null;
        this.next = time + Phaser.Math.Between(800, 3000);
        this.sprite.setFrame(`${this.kind}0`);
      } else {
        const step = (this.speed * dt) / 1000;
        this.sprite.x += (dx / d) * step;
        this.sprite.y += (dy / d) * step;
        this.sprite.setFlipX(dx < 0);
        this.sprite.setFrame(`${this.kind}${Math.floor(this.frameT / 180) % 2}`);
      }
    } else {
      this.sprite.setFrame(`${this.kind}0`);
    }
    this.sprite.setDepth(this.sprite.y);
  }

  destroy() {
    this.sprite.destroy();
  }
}
