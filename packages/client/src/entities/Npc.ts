import Phaser from 'phaser';
import { TILE } from '../art/tiles';
import type { NpcDef } from '../areas/types';
import { Character, type CollisionWorld } from './Character';

/** A villager who wanders near home and says a line when talked to. */
export class Npc {
  ch: Character;
  private target: { x: number; y: number } | null = null;
  private next = 0;
  private lineIndex = 0;
  private pauseUntil = 0;

  constructor(
    private scene: Phaser.Scene,
    readonly def: NpcDef,
    texKey: string,
    name: string,
    world: CollisionWorld,
  ) {
    this.ch = new Character(scene, texKey, name, def.tx * TILE + 8, def.ty * TILE + 14, world);
    this.next = scene.time.now + Phaser.Math.Between(500, 3000);
  }

  /** Returns the line said. */
  talk(): string {
    const line = this.def.lines[this.lineIndex % this.def.lines.length];
    this.lineIndex++;
    this.pauseUntil = this.scene.time.now + 4000;
    this.target = null;
    this.ch.showBubble(null, line, 3800);
    return line;
  }

  facePlayer(px: number, py: number) {
    const dx = px - this.ch.x;
    const dy = py - this.ch.y;
    this.ch.face(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  }

  update(time: number, dt: number) {
    if (time < this.pauseUntil || this.def.wander === 0) {
      this.ch.move(0, 0, dt);
      this.ch.update();
      return;
    }
    if (!this.target && time > this.next) {
      const tx = this.def.tx + Phaser.Math.Between(-this.def.wander, this.def.wander);
      const ty = this.def.ty + Phaser.Math.Between(-this.def.wander, this.def.wander);
      if (!this.ch.world.isBlocked(tx, ty)) this.target = { x: tx * TILE + 8, y: ty * TILE + 14 };
      this.next = time + Phaser.Math.Between(1500, 5000);
    }
    if (this.target) {
      const dx = this.target.x - this.ch.x;
      const dy = this.target.y - this.ch.y;
      if (Math.hypot(dx, dy) < 3) {
        this.target = null;
        this.ch.move(0, 0, dt);
      } else if (!this.ch.move(dx, dy, dt)) {
        this.target = null;
      }
    } else {
      this.ch.move(0, 0, dt);
    }
    this.ch.update();
  }

  destroy() {
    this.ch.destroy();
  }
}
