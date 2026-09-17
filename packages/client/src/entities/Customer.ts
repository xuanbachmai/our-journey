import Phaser from 'phaser';
import { Character } from './Character';

const NO_COLLISION = { isBlocked: () => false };

/**
 * A villager who walks along the road to the counter, reacts, and leaves.
 * Purely cosmetic: the simulation already decided whether they bought something.
 */
export class Customer {
  ch: Character;
  private waypoints: { x: number; y: number }[];
  private idx = 0;
  private waitUntil = 0;
  private reacted = false;
  done = false;

  constructor(
    private scene: Phaser.Scene,
    texKey: string,
    private path: { x: number; y: number }[],
    private counterStop: { x: number; y: number },
    private bought: boolean,
    private onArrive: () => void,
  ) {
    const start = path[0];
    this.ch = new Character(scene, texKey, '', start.x, start.y, NO_COLLISION);
    this.ch.label.setVisible(false);
    this.waypoints = [...path.slice(1), counterStop];
  }

  update(time: number, dt: number) {
    if (this.done) return;
    if (this.waitUntil && time < this.waitUntil) {
      this.ch.move(0, 0, dt);
      this.ch.facing = 'up';
      this.ch.playIdle();
      this.ch.update();
      return;
    }
    if (this.idx >= this.waypoints.length) {
      this.done = true;
      this.ch.sprite.destroy();
      this.ch.label.destroy();
      return;
    }
    const wp = this.waypoints[this.idx];
    const dx = wp.x - this.ch.x;
    const dy = wp.y - this.ch.y;
    if (Math.hypot(dx, dy) < 2) {
      this.idx++;
      if (!this.reacted && wp === this.counterStop) {
        this.reacted = true;
        this.waitUntil = time + 1400;
        this.onArrive();
        const icon = this.scene.add.image(this.ch.x, this.ch.y - 28, 'icons', this.bought ? 'heart' : 'dots').setDepth(9999);
        this.scene.tweens.add({ targets: icon, y: icon.y - 8, duration: 500, yoyo: true, repeat: 1, onComplete: () => icon.destroy() });
        // walk back the way we came
        this.waypoints = [...this.waypoints, ...this.path.slice().reverse()];
      }
    } else {
      this.ch.move(dx, dy, dt);
    }
    this.ch.update();
  }
}
