import Phaser from 'phaser';
import { PATIENCE_S, RECIPES, type RecipeId } from '@hh/shared';
import { TILE } from '../art/tiles';
import { CHAR_H } from '../art/characters';
import type { DinerTable } from '../areas/types';
import { Character } from './Character';

const NO_COLLISION = { isBlocked: () => false };

export type DinerPhase = 'walking' | 'seated' | 'leaving' | 'gone';

/** A restaurant guest: walks to a chair, orders a dish, waits, then leaves happy or sad. */
export class Diner {
  ch: Character;
  phase: DinerPhase = 'walking';
  patience = PATIENCE_S;
  private bubble?: Phaser.GameObjects.Container;
  private bar?: Phaser.GameObjects.Graphics;
  private path: { x: number; y: number }[];
  private exit: { x: number; y: number };
  served = false;

  constructor(
    private scene: Phaser.Scene,
    texKey: string,
    name: string,
    readonly table: DinerTable,
    entry: { tx: number; ty: number },
    readonly recipe: RecipeId,
  ) {
    const ex = entry.tx * TILE + 8;
    const ey = entry.ty * TILE + 14;
    this.ch = new Character(scene, texKey, name, ex, ey, NO_COLLISION);
    this.exit = { x: ex, y: ey + 4 };
    const cx = table.chairTx * TILE + 8;
    const cy = table.chairTy * TILE + 12;
    this.path = [{ x: cx, y: ey }, { x: cx, y: cy }];
  }

  private sit() {
    this.phase = 'seated';
    this.ch.face('up');
    const w = 26;
    const g = this.scene.add.graphics();
    g.fillStyle(0x4a2a3f, 1).fillRoundedRect(-w / 2 - 1, -19, w + 2, 20, 3);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -18, w, 18, 3);
    g.fillStyle(0xffffff, 1).fillTriangle(-3, 0, 3, 0, 0, 3);
    const icon = this.scene.add.image(0, -9, 'icons', `dish-${this.recipe}`);
    this.bubble = this.scene.add.container(this.ch.x, this.ch.y - CHAR_H - 12, [g, icon]).setDepth(30000);
    this.ch.label.setVisible(false);
    this.bar = this.scene.add.graphics().setDepth(30001);
  }

  /** Called when the player hands over a dish. */
  serve(happy: boolean) {
    this.served = true;
    this.bubble?.destroy();
    this.bar?.destroy();
    this.bubble = undefined;
    this.bar = undefined;
    this.ch.showBubble(happy ? 'heart' : 'dots', undefined, 1400);
    this.scene.time.delayedCall(1400, () => this.leave());
  }

  private leave() {
    if (this.phase === 'gone') return;
    this.phase = 'leaving';
    this.bubble?.destroy();
    this.bar?.destroy();
    this.path = [{ x: this.ch.x, y: this.exit.y - 16 }, { x: this.exit.x, y: this.exit.y - 16 }, { x: this.exit.x, y: this.exit.y + 6 }];
  }

  update(time: number, dt: number): 'timeout' | null {
    void time;
    let result: 'timeout' | null = null;
    if (this.phase === 'walking' || this.phase === 'leaving') {
      const wp = this.path[0];
      if (!wp) {
        if (this.phase === 'walking') this.sit();
        else {
          this.phase = 'gone';
          this.ch.destroy();
        }
        return null;
      }
      const dx = wp.x - this.ch.x;
      const dy = wp.y - this.ch.y;
      if (Math.hypot(dx, dy) < 2) this.path.shift();
      else this.ch.move(dx, dy, dt);
      this.ch.update();
      return null;
    }
    if (this.phase === 'seated' && !this.served) {
      this.patience -= dt / 1000;
      if (this.bar) {
        this.bar.clear();
        const f = Math.max(0, this.patience / PATIENCE_S);
        this.bar.fillStyle(0x4a2a3f, 1).fillRect(this.ch.x - 11, this.ch.y - CHAR_H - 28, 22, 4);
        this.bar.fillStyle(f > 0.4 ? 0x3fb35f : f > 0.2 ? 0xffd23f : 0xff6b6b, 1).fillRect(this.ch.x - 10, this.ch.y - CHAR_H - 27, Math.round(20 * f), 2);
      }
      if (this.patience <= 0) {
        this.served = true;
        result = 'timeout';
        this.ch.showBubble('dots', undefined, 1000);
        this.bubble?.destroy();
        this.bar?.destroy();
        this.bubble = undefined;
        this.bar = undefined;
        this.scene.time.delayedCall(900, () => this.leave());
      }
    }
    this.ch.update();
    return result;
  }

  get name() {
    return RECIPES[this.recipe].name;
  }

  destroy() {
    this.bubble?.destroy();
    this.bar?.destroy();
    this.ch.destroy();
    this.phase = 'gone';
  }
}
