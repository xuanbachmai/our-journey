import Phaser from 'phaser';
import { newWorld, PLAYER_IDS, type PlayerId, type WorldState } from '@hh/shared';

/** Survives a scene restart, so a relayout does not re-run the reachability probe. */
let lastReach = { ok: false, at: 0 };
import { buildCharacterTexture, LOOKS } from '../art/characters';
import { P } from '../art/palette';
import { isWorldFullForDevice, MAX_WORLD_PLAYERS, net, seatCount, type Seats } from '../game/net';
import { eraseLocalData, GameState } from '../game/state';
import { confirmBox, copyToClipboard, promptText } from '../ui/dom';
import {
  button,
  FONT_OPTIONS,
  type FontKey,
  getSavedFontKey,
  note,
  panel,
  pill,
  plain,
  refreshFontConfig,
  saveFontKey,
  style,
  type Button,
} from '../ui/text';

type Mode = 'loading' | 'menu' | 'pick' | 'bound';

/**
 * Title + World Manager.
 * - Create World generates a unique 6-character code for that world.
 * - Max 2 people (xb & qd) can join a world.
 * - Sticky 1-world-per-device rule: a device can only create or join 1 world
 *   and sticks with it until the user explicitly deletes that world on the device.
 */
export class TitleScene extends Phaser.Scene {
  private mode: Mode = 'loading';
  private ui: Phaser.GameObjects.GameObject[] = [];
  private chosen = false;
  private bootGen = 0;
  private pickCtx: { code: string | null; seats: Seats | null; world: WorldState | null } = { code: null, seats: null, world: null };
  private status?: Phaser.GameObjects.Text;
  /** Where the status line lives when nothing is competing for the bottom. */
  private statusHome = { x: 0, y: 0 };

  constructor() {
    super('Title');
  }

  create() {
    this.chosen = false;
    this.bootGen++;
    this.drawBackdrop();
    // Rebuilding the whole scene is how this screen re-lays-out, so a resize
    // that changed nothing — and the pane fires several — threw the menu away,
    // put "Connecting to world server..." up and went back to the network. Any
    // tap landing in that window hit nothing, which on a phone is every tap
    // after a rotation or the address bar sliding away. Ignore a size that did
    // not actually change, and let a burst settle before rebuilding once.
    let lastW = this.scale.width;
    let lastH = this.scale.height;
    let pending: number | undefined;
    const onResize = () => {
      if (!this.scene.isActive() || this.chosen) return;
      if (this.scale.width === lastW && this.scale.height === lastH) return;
      lastW = this.scale.width;
      lastH = this.scale.height;
      window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        if (this.scene.isActive() && !this.chosen) this.scene.restart();
      }, 250);
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      window.clearTimeout(pending);
      this.scale.off('resize', onResize);
      this.input.keyboard?.off('keydown-ONE');
      this.input.keyboard?.off('keydown-TWO');
    });
    void this.boot(this.bootGen);
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
      // clear of the font button in the top-right corner: tucked under it, the
      // top half of this cloud is hidden and the rest reads as a stray white box
      [W - 130, 46, 1.3],
      [W / 2 + 30, 26, 0.8],
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
    const titleY = Math.max(22, Math.min(H * 0.16, H - 154));
    const title = this.add.text(W / 2, titleY, 'Our Journey', style({ fontSize: '18px', color: '#fff4dc', strokeThickness: 3 })).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, titleY + 18, 'a little world for two', plain({ color: '#7a4b00', stroke: '#fff4dc', strokeThickness: 2.5 })).setOrigin(0.5);
    this.status = this.add.text(W / 2, H - 6, '', plain({ color: P.outline, stroke: '#fff4dc', strokeThickness: 2.5, align: 'center', wordWrap: { width: W - 24 } })).setOrigin(0.5, 1);
    this.statusHome = { x: W / 2, y: H - 6 };

    const fontKey = getSavedFontKey();
    const fontOpt = FONT_OPTIONS[fontKey];
    button(this, W - 98, 6, 92, 15, `Font: ${fontOpt.label.split(' ')[0]}`, () => {
      const keys = Object.keys(FONT_OPTIONS) as FontKey[];
      const nextKey = keys[(keys.indexOf(fontKey) + 1) % keys.length];
      saveFontKey(nextKey);
      refreshFontConfig();
      this.scene.restart();
    }, 0xfff4dc);
  }

  private clearUi() {
    this.input.keyboard?.off('keydown-ONE');
    this.input.keyboard?.off('keydown-TWO');
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
  }

  private setStatus(t: string) {
    this.status?.setText(t);
  }

  private moveStatus(toTop: boolean) {
    if (!this.status) return;
    const { width: W, height: H } = this.scale;
    if (!toTop) {
      this.status.setOrigin(0.5, 1).setPosition(this.statusHome.x, this.statusHome.y);
      return;
    }
    const subtitleBottom = Math.max(22, Math.min(H * 0.16, H - 154)) + 26;
    this.status.setOrigin(0.5, 1).setPosition(W / 2, Math.max(subtitleBottom + this.status.height, H - 144));
  }

  private isAlive(gen: number): boolean {
    return gen === this.bootGen && this.sys.isActive();
  }

  private async boot(gen: number) {
    const params = new URLSearchParams(window.location.search);
    const join = params.get('join')?.trim().toUpperCase() || null;

    if (net.cloudEnabled) {
      // A rebuild moments after the last one is a relayout, not a fresh start:
      // re-announcing "Connecting to world server..." and going back out to the
      // network makes the screen flicker through a loading state it already
      // finished. Within a few seconds, trust the answer we just got.
      const warm = Date.now() - lastReach.at < 5000;
      if (!warm) this.setStatus('Connecting to world server...');
      const ok = warm ? lastReach.ok : await net.reachable();
      lastReach = { ok, at: Date.now() };
      if (!this.isAlive(gen)) return;
      // Every path that lands somewhere clears this, except the one a new
      // player takes — straight to the menu — which left them reading
      // "Connecting to world server..." for ever on a healthy connection.
      this.setStatus(ok ? '' : 'Cloud server unreachable — running in local world mode.');
      if (window.location.hash.includes('access_token') || params.get('code')) {
        this.setStatus('Restoring your seat...');
        try {
          await net.restoreFromUser();
        } catch {
          /* ignore */
        }
        if (!this.isAlive(gen)) return;
        history.replaceState(null, '', window.location.pathname);
      }
    }

    // If URL has ?join=CODE
    if (join) {
      history.replaceState(null, '', window.location.pathname);
      const bound = net.boundWorldCode;
      if (bound && bound !== join) {
        this.setStatus(`Locked to World ${bound} (1 world per device). Delete it first to join ${join}.`);
      } else {
        await this.joinWithCode(join);
        return;
      }
    }

    // 1. Device already has a claimed world & seat -> stick with this world!
    if (net.pairing) {
      const { code, player } = net.pairing;
      this.setStatus(`Loading World ${code}...`);
      const w = await net.fetchWorld(code);
      if (!this.isAlive(gen)) return;
      if (!w) {
        // World was unreachable or missing on server; preserve local saved state so progress is never wiped
        const fallbackWorld = new GameState().world;
        const seats: Seats = { xb: null, qd: null, [player]: { device: net.deviceId } };
        this.setStatus('');
        this.showBoundWorld(code, player, seats, fallbackWorld);
        return;
      }
      const seat = w.seats[player];
      if (!seat || seat.device !== net.deviceId) {
        if (isWorldFullForDevice(w.seats, net.deviceId)) {
          this.setStatus(`World ${code} is full (${MAX_WORLD_PLAYERS}/${MAX_WORLD_PLAYERS} players). Delete to create a new world.`);
          this.showBoundWorld(code, player, w.seats, w.state, true);
          return;
        }
        this.setStatus('');
        this.showPick(code, w.seats, w.state);
        return;
      }
      this.setStatus('');
      this.showBoundWorld(code, player, w.seats, w.state);
      return;
    }

    // 2. Device created a world (pendingCode) and still needs to pick a character seat
    if (net.pendingCode) {
      const code = net.pendingCode;
      const w = await net.fetchWorld(code);
      if (!this.isAlive(gen)) return;
      if (w) {
        this.setStatus(`World ${code} created! Pick your character to lock in your seat.`);
        this.showPick(code, w.seats, w.state);
        return;
      }
    }

    // 3. No world bound to this device yet -> show Create World / Join World menu
    this.showMenu(false);
  }

  /**
   * Shown when this device has NO active world yet.
   * Offers 'Create World' (generates a unique 6-letter code) and 'Join World (Code)'.
   */
  private showMenu(retry: boolean) {
    this.moveStatus(false);
    this.mode = 'menu';
    this.clearUi();
    const { width: W, height: H } = this.scale;

    const cardW = 250;
    const cardH = retry ? 132 : 112;
    const cy = H / 2 + 22;
    const top = cy - cardH / 2;
    const g = this.add.graphics();
    panel(g, W / 2 - cardW / 2, top, cardW, cardH, 0xfff4dc);
    this.ui.push(g);

    const header = this.add
      .text(W / 2, top + 14, 'Start Your World', plain({ color: '#3b2133' }))
      .setOrigin(0.5);
    this.ui.push(header);

    const bw = 180;
    const mk = (yPos: number, label: string, fn: () => void, color?: number): Button => {
      const b = button(this, W / 2 - bw / 2, yPos, bw, 20, label, fn, color);
      this.ui.push(b.container);
      return b;
    };

    let btnY = top + 28;
    if (retry) {
      mk(btnY, 'Try again', () => this.scene.restart(), 0xffd23f);
      btnY += 24;
    }
    mk(btnY, '+ Create World (New Code)', () => void this.newFarm(), 0x7de8c8);
    mk(btnY + 26, 'Join World with Code', () => void this.joinPrompt(), 0xffe066);

    const ruleText = this.add
      .text(
        W / 2,
        top + cardH - 12,
        `Max ${MAX_WORLD_PLAYERS} players per world  ·  1 world per device`,
        note({ color: '#6a5560', align: 'center' }),
      )
      .setOrigin(0.5);
    this.ui.push(ruleText);
  }

  /**
   * Shown when this device is ALREADY bound to a world.
   * The user cannot create or join another world unless they delete this world first.
   */
  private showBoundWorld(code: string, player: PlayerId, seats: Seats, world: WorldState, fullLocked = false) {
    this.moveStatus(false);
    this.mode = 'bound';
    this.clearUi();
    const { width: W, height: H } = this.scale;

    const cardW = 286;
    const cardH = 128;
    const cy = H / 2 + 20;
    const left = W / 2 - cardW / 2;
    const top = cy - cardH / 2;

    const g = this.add.graphics();
    panel(g, left, top, cardW, cardH, 0xfff4dc);
    pill(g, left + 10, top + 8, cardW - 20, 20, 0xfff8dc, 0xd8b45e);
    this.ui.push(g);

    const joined = Math.max(1, seatCount(seats));
    this.ui.push(
      this.add
        .text(left + 18, top + 18, `World Code: ${code}`, plain({ color: '#3b2133' }))
        .setOrigin(0, 0.5),
      this.add
        .text(left + cardW - 18, top + 18, `Players: ${joined}/${MAX_WORLD_PLAYERS}`, plain({ color: '#1e6f3d' }))
        .setOrigin(1, 0.5),
    );

    const look = LOOKS[player];
    const tex = buildCharacterTexture(this, look, world.players[player]?.outfit);
    const spr = this.add.sprite(left + 38, top + 76, tex, 0).setOrigin(0.5, 1).setScale(2.2);
    spr.play(`${tex}-idle-down`);
    this.ui.push(spr);

    this.ui.push(
      this.add
        .text(left + 68, top + 44, `Playing as: ${look.name}`, plain({ color: '#3b2133' }))
        .setOrigin(0, 0.5),
      this.add
        .text(left + 68, top + 58, 'Our shared world on this device', note({ color: '#6a5560' }))
        .setOrigin(0, 0.5),
      this.add
        .text(left + 68, top + 70, 'Share the code so the other one can join!', note({ color: '#9a5b00' }))
        .setOrigin(0, 0.5),
    );

    if (!fullLocked) {
      const enterBtn = button(this, left + 10, top + 84, cardW - 20, 19, `Enter World (${code})`, () => {
        this.start(player, world);
      }, 0x7de8c8);
      this.ui.push(enterBtn.container);
    }

    const halfW = Math.floor((cardW - 26) / 2);
    const copyBtn = button(this, left + 10, top + 106, halfW, 16, `Copy Code (${code})`, async () => {
      const link = `${window.location.origin}${window.location.pathname}?join=${code}`;
      const ok = await copyToClipboard(link);
      this.setStatus(ok ? `Copied invite link for World ${code}!` : `World Code: ${code}`);
    }, 0xffe066);

    const delBtn = button(this, left + 16 + halfW, top + 106, halfW, 16, 'Delete World', async () => {
      if (await TitleScene.deleteWorld()) {
        this.setStatus('World deleted. You can now create or join a new world.');
        this.showMenu(false);
      }
    }, 0xff6b6b);

    this.ui.push(copyBtn.container, delBtn.container);
  }

  private async newFarm() {
    if (net.boundWorldCode) {
      this.setStatus(`Locked to World ${net.boundWorldCode}. Delete it first to create a new world.`);
      return;
    }
    this.setStatus('Creating your world...');
    const world = newWorld(Date.now());
    const code = await net.createWorld(world);
    if (!code) {
      this.setStatus(`Could not create world: ${net.lastError || 'no connection'}`);
      return;
    }
    this.setStatus(`Your world code is ${code} — share it with each other!`);
    this.showPick(code, { xb: null, qd: null }, world);
  }

  private async joinPrompt() {
    if (net.boundWorldCode) {
      this.setStatus(`Locked to World ${net.boundWorldCode}. Delete it first to join another world.`);
      return;
    }
    const code = await promptText({ title: 'Enter the 6-letter World Code', placeholder: 'ABC123', code: true, maxLength: 6, okLabel: 'Join World' });
    if (!code) return;
    await this.joinWithCode(code.trim().toUpperCase());
  }

  private async joinWithCode(rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    if (net.boundWorldCode && net.boundWorldCode !== code) {
      this.setStatus(`Locked to World ${net.boundWorldCode}. Delete that world first.`);
      return;
    }
    this.setStatus(`Looking for World ${code}...`);
    const w = await net.fetchWorld(code);
    if (!w) {
      this.setStatus(`No world found with code "${code}". Check the 6 letters.`);
      this.showMenu(false);
      return;
    }
    if (isWorldFullForDevice(w.seats, net.deviceId)) {
      this.setStatus(`World ${code} already has both xb & qd.`);
      this.showMenu(false);
      return;
    }
    this.setStatus('');
    this.showPick(code, w.seats, w.state);
  }

  private showPick(code: string | null, seats: Seats | null, world: WorldState | null) {
    this.mode = 'pick';
    this.moveStatus(true);
    this.pickCtx = { code, seats, world };
    this.clearUi();
    const { width: W, height: H } = this.scale;

    const cardW = 264;
    const cardH = 122;
    const cy = H / 2 + 22;
    const left = W / 2 - cardW / 2;
    const top = cy - cardH / 2;

    const g = this.add.graphics();
    panel(g, left, top, cardW, cardH, 0xfff4dc);
    pill(g, left + 10, top + 8, cardW - 20, 18, 0xfff8dc, 0xd8b45e);
    this.ui.push(g);

    const joined = seatCount(seats);
    this.ui.push(
      this.add
        .text(
          W / 2,
          top + 17,
          code ? `World ${code}  ·  ${joined}/${MAX_WORLD_PLAYERS} joined` : 'Who are you?',
          plain({ color: '#3b2133' }),
        )
        .setOrigin(0.5),
      this.add
        .text(W / 2, top + 34, 'Who are you today?', note({ color: '#6a5560' }))
        .setOrigin(0.5),
    );

    PLAYER_IDS.forEach((id, i) => {
      const x = W / 2 + (i === 0 ? -48 : 48);
      const y = top + 84;
      const look = LOOKS[id];
      const seat = seats?.[id];
      const taken = !!seat && seat.device !== net.deviceId;
      const tex = buildCharacterTexture(this, look);
      const spr = this.add.sprite(x, y, tex, 0).setOrigin(0.5, 1).setScale(2);
      spr.play(`${tex}-idle-down`);
      if (taken) spr.setTint(0x888888);
      else this.tweens.add({ targets: spr, y: y - 4, duration: 500 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const name = this.add
        .text(x, y + 4, taken ? `${look.name} (taken)` : look.name, plain({ color: taken ? '#8a7a80' : '#3b2133' }))
        .setOrigin(0.5, 0);
      this.ui.push(spr, name);
      if (taken) return;
      const zone = this.add.zone(x, y - 20, 64, 56).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => spr.setTint(0xffffcc));
      zone.on('pointerout', () => spr.clearTint());
      zone.on('pointerdown', () => void this.choose(id, spr));
      this.ui.push(zone);
    });

    if (code) {
      const copyBtn = button(this, left + 10, top + cardH - 22, 114, 16, `Copy Code: ${code}`, async () => {
        const link = `${window.location.origin}${window.location.pathname}?join=${code}`;
        const ok = await copyToClipboard(link);
        this.setStatus(ok ? `Copied code ${code}!` : `World Code: ${code}`);
      }, 0xffe066);
      this.ui.push(copyBtn.container);

      const isBoundCreator = net.boundWorldCode === code;
      const backBtn = button(
        this,
        left + cardW - 124,
        top + cardH - 22,
        114,
        16,
        isBoundCreator ? 'Delete World' : 'Cancel',
        async () => {
          if (isBoundCreator) {
            if (await TitleScene.deleteWorld()) {
              this.setStatus('World deleted.');
              this.showMenu(false);
            }
          } else {
            this.setStatus('');
            this.showMenu(false);
          }
        },
        isBoundCreator ? 0xff6b6b : 0xe8dcc8,
      );
      this.ui.push(backBtn.container);
    }

    this.input.keyboard?.on('keydown-ONE', () => void this.choose('xb'));
    this.input.keyboard?.on('keydown-TWO', () => void this.choose('qd'));
  }

  private async choose(id: PlayerId, spr?: Phaser.GameObjects.Sprite) {
    if (this.chosen || this.mode !== 'pick') return;
    const { code, seats, world } = this.pickCtx;
    const seat = seats?.[id];
    if (seat && seat.device !== net.deviceId) return;
    this.chosen = true;
    if (spr) this.tweens.add({ targets: spr, scale: 2.4, duration: 120, yoyo: true });
    if (code) {
      this.setStatus('Claiming your seat...');
      const r = await net.claimSeat(code, id);
      if (r !== 'ok') {
        this.chosen = false;
        this.setStatus(
          r === 'taken'
            ? 'That character seat is already taken by the other player.'
            : r === 'full'
              ? `This world is full (${MAX_WORLD_PLAYERS}/${MAX_WORLD_PLAYERS} players max).`
              : `Could not join: ${net.lastError}`,
        );
        const w = await net.fetchWorld(code);
        if (w && !isWorldFullForDevice(w.seats, net.deviceId)) this.showPick(code, w.seats, w.state);
        else this.showMenu(false);
        return;
      }
      if (!net.pairing || !world) {
        this.chosen = false;
        return;
      }
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

  /**
   * Delete the world bound to this device so the user can create or join a new world.
   */
  static async deleteWorld(): Promise<boolean> {
    const code = net.boundWorldCode;
    // This removes the world row from the server, so it goes for both of you,
    // not just this phone. The old wording said it "removes it so you can
    // create or join a new world", which is true and nowhere near enough for
    // a red button sitting one tap from Copy Code.
    const ok = await confirmBox(
      `Delete World ${code ?? ''} for BOTH of you? The farm, everything in it and all your progress are gone for good, on your partner's phone as well as this one. This cannot be undone.`,
      'Delete for both',
      'Keep our world',
    );
    if (!ok) return false;
    await net.deleteWorld();
    eraseLocalData();
    return true;
  }

  /** Alias kept for compatibility with HUD settings calls. */
  static async leaveFarm(): Promise<boolean> {
    return TitleScene.deleteWorld();
  }
}
