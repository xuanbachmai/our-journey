import Phaser from 'phaser';
import { newWorld, PLAYER_IDS, type PlayerId, type WorldState } from '@hh/shared';
import { buildCharacterTexture, LOOKS } from '../art/characters';
import { P } from '../art/palette';
import { net, type Seats } from '../game/net';
import { confirmBox, promptText } from '../ui/dom';
import { button, plain, style, type Button } from '../ui/text';

type Mode = 'loading' | 'menu' | 'pick';

/**
 * Title + pairing. Online: New farm / Join a farm with a 6-letter code, sticky per device.
 * Solo mode when no backend is configured.
 */
export class TitleScene extends Phaser.Scene {
  private mode: Mode = 'loading';
  private ui: Phaser.GameObjects.GameObject[] = [];
  private chosen = false;
  private pickCtx: { code: string | null; seats: Seats | null; world: WorldState | null } = { code: null, seats: null, world: null };
  private status?: Phaser.GameObjects.Text;

  constructor() {
    super('Title');
  }

  create() {
    this.chosen = false;
    this.drawBackdrop();
    // redraw on rotate, but only while the title is actually showing; a stale listener
    // used to restart the title behind the game whenever the phone was rotated
    const onResize = () => {
      if (this.scene.isActive() && !this.chosen) this.scene.restart();
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    void this.boot();
  }

  private drawBackdrop() {
    const { width: W, height: H } = this.scale;
    const g = this.add.graphics();
    const bands = ['#7ecbff', '#8fd4ff', '#a3ddff', '#bce8ff', '#d6f2ff'];
    bands.forEach((c, i) => {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1);
      g.fillRect(0, (H * i) / bands.length, W, H / bands.length + 1);
    });
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
    this.add.image(6, H - 30, 'trees', 2).setOrigin(0, 1);
    this.add.image(W - 6, H - 28, 'trees', 0).setOrigin(1, 1);
    this.add.image(W - 40, H - 22, 'trees', 3).setOrigin(1, 1).setScale(0.8);
    const titleY = Math.min(H * 0.2, H - 140);
    const title = this.add.text(W / 2, titleY, 'Our Journey', style({ fontSize: '16px', color: '#fff4dc', strokeThickness: 4 })).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, titleY + 16, 'a little farm for two', style({ color: '#ffe066' })).setOrigin(0.5);
    this.status = this.add.text(W / 2, H - 8, '', style({ color: '#fff' })).setOrigin(0.5, 1);
  }

  private clearUi() {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
  }

  private setStatus(t: string) {
    this.status?.setText(t);
  }

  private async boot() {
    const params = new URLSearchParams(window.location.search);
    const join = params.get('join');
    if (!net.enabled) {
      this.setStatus('Solo mode: no backend configured');
      this.showPick(null, null, null);
      return;
    }
    // returning from a magic link?
    if (window.location.hash.includes('access_token') || params.get('code')) {
      this.setStatus('Restoring your seat...');
      try {
        await net.restoreFromUser();
      } catch {
        /* ignore */
      }
      history.replaceState(null, '', window.location.pathname);
    }
    if (join && !net.pairing) {
      history.replaceState(null, '', window.location.pathname);
      await this.joinWithCode(join.toUpperCase());
      return;
    }
    if (net.pairing) {
      this.setStatus(`Farm ${net.pairing.code}. Loading...`);
      const w = await net.fetchWorld(net.pairing.code);
      if (!w) {
        this.setStatus('Could not reach the farm. Check your connection.');
        this.showMenu(true);
        return;
      }
      const seat = w.seats[net.pairing.player];
      if (!seat || seat.device !== net.deviceId) {
        // our seat was reset on another device; re-pick
        this.showPick(net.pairing.code, w.seats, w.state);
        return;
      }
      this.start(net.pairing.player, w.state);
      return;
    }
    this.showMenu(false);
  }

  private showMenu(retry: boolean) {
    this.mode = 'menu';
    this.clearUi();
    const { width: W, height: H } = this.scale;
    const y0 = H - 96;
    const bw = 130;
    const mk = (i: number, label: string, fn: () => void, color?: number): Button => {
      const b = button(this, W / 2 - bw / 2, y0 + i * 22, bw, 18, label, fn, color);
      this.ui.push(b.container);
      return b;
    };
    if (retry) mk(-1, 'Try again', () => this.scene.restart(), 0xffd23f);
    mk(0, 'New farm', () => void this.newFarm(), 0x7de8c8);
    mk(1, 'Join a farm', () => void this.joinPrompt());
    mk(2, 'Play solo', () => this.showPick(null, null, null), 0xe8dcc8);
    const hint = this.add.text(W / 2, y0 + 70, 'One of you creates the farm, the other joins with the code', plain({ color: P.outline, align: 'center', wordWrap: { width: W - 40 } })).setOrigin(0.5, 0);
    this.ui.push(hint);
    if (!retry) this.setStatus('');
  }

  private async newFarm() {
    this.setStatus('Creating your farm...');
    const world = newWorld(Date.now());
    const code = await net.createWorld(world);
    if (!code) {
      this.setStatus(`Could not create a farm: ${net.lastError || 'no connection'}`);
      return;
    }
    this.setStatus(`Farm created! Code ${code}`);
    this.showPick(code, { xb: null, qd: null }, world);
  }

  private async joinPrompt() {
    const code = await promptText({ title: 'Enter the 6-letter farm code', placeholder: 'ABC123', code: true, maxLength: 6, okLabel: 'Join' });
    if (!code) return;
    await this.joinWithCode(code);
  }

  private async joinWithCode(code: string) {
    this.setStatus('Looking for the farm...');
    const w = await net.fetchWorld(code);
    if (!w) {
      this.setStatus('No farm with that code. Check the letters.');
      this.showMenu(false);
      return;
    }
    this.setStatus(`Found farm ${code}. Who are you?`);
    this.showPick(code, w.seats, w.state);
  }

  private showPick(code: string | null, seats: Seats | null, world: WorldState | null) {
    this.mode = 'pick';
    this.pickCtx = { code, seats, world };
    this.clearUi();
    const { width: W, height: H } = this.scale;
    this.ui.push(this.add.text(W / 2, H - 102, code ? `Farm ${code}: who are you?` : 'who are you today?', plain({ color: P.outline })).setOrigin(0.5));
    PLAYER_IDS.forEach((id, i) => {
      const x = W / 2 + (i === 0 ? -34 : 34);
      const y = H - 44;
      const look = LOOKS[id];
      const seat = seats?.[id];
      const taken = !!seat && seat.device !== net.deviceId;
      const tex = buildCharacterTexture(this, look);
      const spr = this.add.sprite(x, y, tex, 0).setOrigin(0.5, 1).setScale(2);
      spr.play(`${tex}-idle-down`);
      if (taken) spr.setTint(0x888888);
      else this.tweens.add({ targets: spr, y: y - 4, duration: 500 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const name = this.add.text(x, y + 6, taken ? `${look.name} (taken)` : look.name, style({ color: taken ? '#aaaaaa' : look.hair })).setOrigin(0.5, 0);
      this.ui.push(spr, name);
      if (taken) return;
      const zone = this.add.zone(x, y - 24, 44, 60).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => spr.setTint(0xffffcc));
      zone.on('pointerout', () => spr.clearTint());
      zone.on('pointerdown', () => void this.choose(id, spr));
      this.ui.push(zone);
    });
    if (code) {
      const back = button(this, 6, H - 24, 60, 16, 'Back', () => this.showMenu(false), 0xe8dcc8);
      this.ui.push(back.container);
    } else if (net.enabled) {
      const back = button(this, 6, H - 24, 60, 16, 'Back', () => this.showMenu(false), 0xe8dcc8);
      this.ui.push(back.container);
    }
    this.input.keyboard?.once('keydown-ONE', () => void this.choose('xb'));
    this.input.keyboard?.once('keydown-TWO', () => void this.choose('qd'));
  }

  private async choose(id: PlayerId, spr?: Phaser.GameObjects.Sprite) {
    if (this.chosen || this.mode !== 'pick') return;
    this.chosen = true;
    if (spr) this.tweens.add({ targets: spr, scale: 2.4, duration: 120, yoyo: true });
    const { code, world } = this.pickCtx;
    if (code && net.enabled) {
      this.setStatus('Claiming your seat...');
      const r = await net.claimSeat(code, id);
      if (r !== 'ok') {
        this.chosen = false;
        this.setStatus(r === 'taken' ? 'That character is already taken on another phone.' : `Could not join: ${net.lastError}`);
        const w = await net.fetchWorld(code);
        if (w) this.showPick(code, w.seats, w.state);
        return;
      }
      if (!net.pairing || !world) return;
      this.start(id, world);
      return;
    }
    this.start(id, null);
  }

  private start(id: PlayerId, world: WorldState | null) {
    this.registry.set('player', id);
    if (world) this.registry.set('initialWorld', world);
    this.registry.remove('state');
    this.cameras.main.fadeOut(250, 255, 244, 220);
    this.time.delayedCall(260, () => {
      this.scene.start('World', { player: id, fresh: true });
      this.scene.launch('Hud');
    });
  }

  /** Used by the settings panel. */
  static async leaveFarm(): Promise<boolean> {
    const ok = await confirmBox('Leave this farm? Your device will be unpaired. The farm itself stays.', 'Leave', 'Stay');
    if (!ok) return false;
    await net.leaveFarm();
    return true;
  }
}
