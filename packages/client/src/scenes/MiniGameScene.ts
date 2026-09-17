import Phaser from 'phaser';
import { STEP_INFO } from '@hh/shared';
import { audio } from '../game/audio';
import { makeMiniGame, type MiniGame, type MiniGameId } from '../cook/minigames';
import { panel, plain, style } from '../ui/text';

export interface MiniGameData {
  title: string;
  steps: MiniGameId[];
  leniency: number;
  ingredientIcons: string[];
  onDone: (scores: number[]) => void;
  /** Fishing only: 0 easy .. 1 very hard. */
  difficulty?: number;
  fishColor?: string;
  /** Co-op: which step indexes I play. Others are awaited through `waitFor`. */
  mine?: number[];
  /** Co-op: report my step score to the partner. */
  onStep?: (index: number, score: number) => void;
  /** Co-op: wait for the partner's score for a step. Resolves null if they left. */
  waitFor?: (index: number) => Promise<number | null>;
  partnerName?: string;
  onCancel?: () => void;
}

const STEP_LABEL: Record<MiniGameId, { name: string; hint: string; hintTouch: string }> = {
  ...STEP_INFO,
  reel: { name: 'Fishing', hint: 'Wait for the "!", then press SPACE', hintTouch: 'Wait for the "!", then tap' },
};

/** Runs a list of mini-games one after another and reports their scores. */
export class MiniGameScene extends Phaser.Scene {
  private data_!: MiniGameData;
  private index = 0;
  private scores: number[] = [];
  private game_: MiniGame | null = null;
  private header!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private dots!: Phaser.GameObjects.Graphics;
  private space!: Phaser.Input.Keyboard.Key | undefined;
  private isTouch = false;
  private pointerDown = false;
  private finished = false;
  private waitText?: Phaser.GameObjects.Text;

  constructor() {
    super('MiniGame');
  }

  init(data: MiniGameData) {
    this.data_ = data;
    this.index = 0;
    this.scores = [];
    this.game_ = null;
    this.finished = false;
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.isTouch = this.sys.game.device.input.touch;
    this.add.rectangle(W / 2, H / 2, W * 3, H * 3, 0x2a1a2f, 0.55).setInteractive();
    const pw = Math.min(280, W - 8);
    const ph = Math.min(170, H - 6);
    const g = this.add.graphics();
    panel(g, Math.round(W / 2 - pw / 2), Math.round(H / 2 - ph / 2), pw, ph, 0xfff4dc);
    g.fillStyle(0xffd23f, 1).fillRect(Math.round(W / 2 - pw / 2) + 2, Math.round(H / 2 - ph / 2) + 2, pw - 4, 14);
    this.header = this.add.text(W / 2, Math.round(H / 2 - ph / 2) + 9, '', plain()).setOrigin(0.5);
    this.hint = this.add.text(W / 2, Math.round(H / 2 + ph / 2) - 10, '', plain({ color: '#7a6a70', align: 'center', wordWrap: { width: pw - 16 } })).setOrigin(0.5);
    this.dots = this.add.graphics();

    this.space = this.input.keyboard?.addKey('SPACE');
    this.input.keyboard?.on('keydown-SPACE', () => this.game_?.key('space'));
    this.input.keyboard?.on('keydown-ENTER', () => this.game_?.key('enter'));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerDown = true;
      audio.unlock();
      this.game_?.down(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.game_?.move(p.x, p.y, p.isDown));
    const up = (p: Phaser.Input.Pointer) => {
      this.pointerDown = false;
      this.game_?.up(p.x, p.y);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);

    void this.startStep();
  }

  private isMine(i: number) {
    return !this.data_.mine || this.data_.mine.includes(i);
  }

  private async startStep() {
    const id = this.data_.steps[this.index];
    const info = STEP_LABEL[id];
    const total = this.data_.steps.length;
    this.header.setText(total > 1 ? `${this.data_.title}  -  ${info.name} (${this.index + 1}/${total})` : `${this.data_.title}`);
    this.drawDots();
    const { width: W, height: H } = this.scale;
    if (!this.isMine(this.index) && this.data_.waitFor) {
      this.hint.setText(`${this.data_.partnerName ?? 'Your partner'} is doing this step...`);
      this.waitText = this.add.text(W / 2, H / 2, `waiting for ${this.data_.partnerName ?? 'partner'}`, style({ color: '#ffe066' })).setOrigin(0.5);
      this.tweens.add({ targets: this.waitText, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
      const score = await this.data_.waitFor(this.index);
      this.waitText.destroy();
      if (score === null) {
        this.finished = true;
        this.scene.stop();
        this.data_.onCancel?.();
        return;
      }
      this.stepDone(score, false);
      return;
    }
    this.hint.setText(this.isTouch ? info.hintTouch : info.hint);
    this.game_ = makeMiniGame(id, {
      scene: this,
      cx: Math.round(W / 2),
      cy: Math.round(H / 2) + 2,
      leniency: this.data_.leniency,
      isTouch: this.isTouch,
      held: () => this.pointerDown || !!this.space?.isDown,
      finish: (score) => this.stepDone(score, true),
      sfx: (n) => audio.play(n),
      ingredientIcons: this.data_.ingredientIcons,
      difficulty: this.data_.difficulty ?? 0.3,
      fishColor: this.data_.fishColor,
    });
    this.game_.create();
  }

  update(_time: number, delta: number) {
    this.game_?.update(Math.min(delta, 50));
  }

  private drawDots() {
    const { width: W, height: H } = this.scale;
    this.dots.clear();
    const n = this.data_.steps.length;
    if (n <= 1) return;
    const x0 = W / 2 - (n - 1) * 6;
    const y = Math.round(H / 2 - Math.min(170, H - 6) / 2) + 22;
    for (let i = 0; i < n; i++) {
      const s = this.scores[i];
      const color = s === undefined ? (i === this.index ? 0xffd23f : 0xd9c9b8) : s >= 0.72 ? 0x3fb35f : s >= 0.5 ? 0xffd23f : 0xff6b6b;
      this.dots.fillStyle(0x4a2a3f, 1).fillCircle(x0 + i * 12, y, 4);
      this.dots.fillStyle(color, 1).fillCircle(x0 + i * 12, y, 3);
      if (this.data_.mine && !this.isMine(i)) this.dots.fillStyle(0xffffff, 0.8).fillCircle(x0 + i * 12, y, 1);
    }
  }

  private stepDone(score: number, mine: boolean) {
    this.scores.push(score);
    if (mine) this.data_.onStep?.(this.index, score);
    this.drawDots();
    const { width: W, height: H } = this.scale;
    const stars = score >= 0.9 ? 3 : score >= 0.72 ? 2 : score >= 0.5 ? 1 : 0;
    const label = ['Oops', 'Ok', 'Good!', 'Perfect!'][stars];
    const t = this.add.text(W / 2, H / 2 - 10, `${label}  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, style({ fontSize: '10px', color: stars >= 2 ? '#ffe066' : '#fff' })).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: t, y: t.y - 8, duration: 600 });
    this.time.delayedCall(750, () => {
      t.destroy();
      this.game_?.destroy();
      this.game_ = null;
      this.index++;
      if (this.index < this.data_.steps.length) void this.startStep();
      else this.finish();
    });
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    const scores = this.scores.slice();
    this.scene.stop();
    this.data_.onDone(scores);
  }
}
