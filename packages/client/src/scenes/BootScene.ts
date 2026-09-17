import Phaser from 'phaser';
import { buildCharacterTexture, CUSTOMER_LOOKS, LOOKS } from '../art/characters';
import { buildObjectTextures } from '../art/objects';
import { buildTileset } from '../art/tiles';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  async create() {
    this.cameras.main.setBackgroundColor('#7ecbff');
    try {
      await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 2500))]);
    } catch {
      /* fall back to the default font */
    }
    buildTileset(this);
    buildObjectTextures(this);
    buildCharacterTexture(this, LOOKS.xb);
    buildCharacterTexture(this, LOOKS.qd);
    CUSTOMER_LOOKS.forEach((l) => buildCharacterTexture(this, l));

    const mk = (key: string, frames: string[], rate: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: frames.map((frame) => ({ key: 'fx', frame })), frameRate: rate, repeat: -1 });
    };
    mk('spark', ['spark0', 'spark1'], 4);
    mk('bf0', ['bf0-0', 'bf0-1'], 8);
    mk('bf1', ['bf1-0', 'bf1-1'], 8);
    mk('bf2', ['bf2-0', 'bf2-1'], 8);

    this.scene.start('Title');
  }
}
