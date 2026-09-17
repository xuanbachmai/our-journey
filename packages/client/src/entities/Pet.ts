import Phaser from 'phaser';
import type { PetId } from '@hh/shared';
import { CHAR_H } from '../art/characters';
import { P } from '../art/palette';

export interface Followable {
  x: number;
  y: number;
  moving: boolean;
}

/** A pet that trots after its owner, keeping a little distance, and sits when the owner stops. */
export class Pet {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  private frameT = 0;
  private heart?: Phaser.GameObjects.Image;

  constructor(
    private scene: Phaser.Scene,
    readonly kind: PetId,
    name: string,
    x: number,
    y: number,
    private owner: Followable,
  ) {
    this.sprite = scene.add.sprite(x, y, 'critters', `${kind}0`).setOrigin(0.5, 1);
    this.label = scene.add
      .text(x, y - 14, name, { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffe066', stroke: P.outline, strokeThickness: 3, resolution: 1 })
      .setOrigin(0.5, 1);
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }

  setOwner(o: Followable) {
    this.owner = o;
  }

  teleportTo(x: number, y: number) {
    this.sprite.setPosition(x, y);
  }

  /** Little heart when petted. */
  love() {
    this.heart?.destroy();
    this.heart = this.scene.add.image(this.sprite.x, this.sprite.y - 16, 'fx', 'heart').setDepth(30000);
    this.scene.tweens.add({ targets: this.heart, y: this.heart.y - 10, alpha: 0, duration: 900, onComplete: () => this.heart?.destroy() });
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1.2, scaleY: 0.85, duration: 100, yoyo: true, repeat: 2 });
  }

  update(dt: number) {
    this.frameT += dt;
    const dx = this.owner.x - this.sprite.x;
    const dy = this.owner.y - this.sprite.y;
    const d = Math.hypot(dx, dy);
    const want = 18;
    if (d > want) {
      const speed = d > 80 ? 110 : 58;
      const step = Math.min(d - want, (speed * dt) / 1000);
      this.sprite.x += (dx / d) * step;
      this.sprite.y += (dy / d) * step;
      this.sprite.setFlipX(dx < 0);
      this.sprite.setFrame(`${this.kind}${Math.floor(this.frameT / 150) % 2}`);
    } else {
      this.sprite.setFrame(`${this.kind}0`);
    }
    if (d > 260) this.sprite.setPosition(this.owner.x - 12, this.owner.y);
    this.sprite.setDepth(this.sprite.y);
    this.label.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - 12));
    this.label.setDepth(this.sprite.y + 1);
    void CHAR_H;
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
    this.heart?.destroy();
  }
}
