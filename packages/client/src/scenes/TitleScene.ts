import Phaser from 'phaser';
import { PLAYER_IDS, type PlayerId } from '@hh/shared';
import { LOOKS } from '../art/characters';
import { P } from '../art/palette';
import { plain, style } from '../ui/text';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width: W, height: H } = this.scale;
    const g = this.add.graphics();
    // sky bands
    const bands = ['#7ecbff', '#8fd4ff', '#a3ddff', '#bce8ff', '#d6f2ff'];
    bands.forEach((c, i) => {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      g.fillRect(0, (H * i) / bands.length, W, H / bands.length + 1);
    });
    // clouds
    g.fillStyle(0xffffff, 1);
    for (const [cx, cy, s] of [
      [40, 30, 1],
      [W - 70, 22, 1.3],
      [W / 2 + 30, 48, 0.8],
    ]) {
      g.fillRect(cx - 12 * s, cy, 24 * s, 6 * s);
      g.fillRect(cx - 6 * s, cy - 5 * s, 14 * s, 6 * s);
      g.fillRect(cx + 2 * s, cy - 2 * s, 10 * s, 4 * s);
    }
    // hills and grass
    g.fillStyle(0x6ec23f, 1);
    g.fillEllipse(W * 0.2, H - 30, 220, 70);
    g.fillEllipse(W * 0.85, H - 34, 200, 60);
    g.fillStyle(0x8ad84f, 1);
    g.fillRect(0, H - 40, W, 40);
    g.fillStyle(0xa6ea63, 1);
    for (let x = 4; x < W; x += 13) g.fillRect(x, H - 40 + ((x * 7) % 11), 2, 1);
    for (let x = 0; x < W; x += 23) {
      const c = [P.pink, P.yellow, P.white, P.purple][(x / 23) % 4];
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      g.fillRect(x + ((x * 3) % 9), H - 34 + ((x * 5) % 20), 2, 2);
    }
    // trees on the sides
    this.add.image(6, H - 30, 'trees', 2).setOrigin(0, 1);
    this.add.image(W - 6, H - 28, 'trees', 0).setOrigin(1, 1);
    this.add.image(W - 40, H - 22, 'trees', 3).setOrigin(1, 1).setScale(0.8);

    // title
    const titleY = Math.min(H * 0.22, H - 140);
    const title = this.add.text(W / 2, titleY, 'Our Journey', style({ fontSize: '16px', color: '#fff4dc', strokeThickness: 4 })).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, titleY + 16, 'a little farm for two', style({ color: '#ffe066' })).setOrigin(0.5);
    this.add.text(W / 2, H - 102, 'who are you today?', plain({ color: P.outline })).setOrigin(0.5);

    PLAYER_IDS.forEach((id, i) => {
      const x = W / 2 + (i === 0 ? -34 : 34);
      const y = H - 44;
      const look = LOOKS[id];
      const spr = this.add.sprite(x, y, `char-${id}`, 0).setOrigin(0.5, 1).setScale(2);
      spr.play(`char-${id}-idle-down`);
      this.tweens.add({ targets: spr, y: y - 4, duration: 500 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const name = this.add.text(x, y + 6, look.name, style({ color: look.hair })).setOrigin(0.5, 0);
      const zone = this.add.zone(x, y - 24, 44, 60).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => spr.setTint(0xffffcc));
      zone.on('pointerout', () => spr.clearTint());
      zone.on('pointerdown', () => this.choose(id, spr));
      name.setDepth(2);
    });

    this.input.keyboard?.on('keydown-ONE', () => this.choose('xb'));
    this.input.keyboard?.on('keydown-TWO', () => this.choose('qd'));

    this.scale.once('resize', () => this.scene.restart());
  }

  private chosen = false;

  choose(id: PlayerId, spr?: Phaser.GameObjects.Sprite) {
    if (this.chosen) return;
    this.chosen = true;
    if (spr) {
      this.tweens.add({ targets: spr, scale: 2.4, duration: 120, yoyo: true });
    }
    this.cameras.main.fadeOut(250, 255, 244, 220);
    this.time.delayedCall(260, () => {
      this.scene.start('Farm', { player: id });
      this.scene.launch('Hud');
    });
  }
}
