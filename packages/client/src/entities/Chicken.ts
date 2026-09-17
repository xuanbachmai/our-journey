import Phaser from 'phaser';
import { TILE } from '../art/tiles';
import type { Rect } from '../game/worldgen';

/** A hen that wanders inside the pen and pecks now and then. */
export class Chicken {
  sprite: Phaser.GameObjects.Sprite;
  private target: { x: number; y: number } | null = null;
  private next = 0;
  private peckUntil = 0;

  constructor(
    private scene: Phaser.Scene,
    private pen: Rect,
  ) {
    const p = this.randomPoint();
    this.sprite = scene.add.sprite(p.x, p.y, 'chicken', 0).setOrigin(0.5, 1);
    this.next = scene.time.now + Phaser.Math.Between(300, 2000);
  }

  private randomPoint() {
    return {
      x: this.pen.x * TILE + 6 + Math.random() * (this.pen.w * TILE - 12),
      y: this.pen.y * TILE + 10 + Math.random() * (this.pen.h * TILE - 12),
    };
  }

  update(time: number, dt: number) {
    if (time < this.peckUntil) {
      this.sprite.setFrame(Math.floor(time / 180) % 2);
      return;
    }
    this.sprite.setFrame(0);
    if (!this.target && time > this.next) {
      if (Math.random() < 0.4) {
        this.peckUntil = time + Phaser.Math.Between(600, 1400);
        this.next = time + Phaser.Math.Between(800, 2500);
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
        this.next = time + Phaser.Math.Between(800, 2500);
      } else {
        const step = (22 * dt) / 1000;
        this.sprite.x += (dx / d) * step;
        this.sprite.y += (dy / d) * step;
        this.sprite.setFlipX(dx < 0);
        this.sprite.y += Math.sin(time / 60) * 0.15;
      }
    }
    this.sprite.setDepth(this.sprite.y);
  }

  destroy() {
    this.sprite.destroy();
  }
}
