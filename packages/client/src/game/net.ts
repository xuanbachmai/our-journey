import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { Reward, AreaId, Outfit, PlayerId, WorldState } from '@hh/shared';

/**
 * Pairing + live sync through Supabase. When the site has no Supabase keys the
 * game runs in solo mode and every method here is a harmless no-op.
 *
 * Tables (see supabase/schema.sql): worlds(code, state, version, seats), notes, answers.
 */

export interface Pairing {
  code: string;
  player: PlayerId;
}

export interface Seats {
  xb: { device: string; user?: string } | null;
  qd: { device: string; user?: string } | null;
}

export interface PosMsg {
  player: PlayerId;
  area: AreaId;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  moving: boolean;
  outfit: Outfit;
  pet: { type: string; name: string } | null;
  /** The driver is on a bicycle with a passenger seat and the seat is free. */
  seat?: boolean;
}

export interface NoteRow {
  id: number;
  from_player: PlayerId;
  to_player: PlayerId;
  body: string;
  created_at: string;
  read: boolean;
}

export function shouldDeliverNote(note: Pick<NoteRow, 'to_player'>, player: PlayerId): boolean {
  return note.to_player === player;
}

/**
 * Hosts often prefill the env vars from .env.example. Placeholder values would
 * make the game offer pairing that can never work, so treat them as unset.
 */
export function isRealConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (!/^https:\/\/[^\s.]+\.[^\s]+$/.test(url)) return false;
  if (/your-project|your-url|example\.com/i.test(url)) return false;
  if (/your-anon|your-key|placeholder/i.test(key) || key.length < 30) return false;
  return true;
}

type Handler = (payload: unknown) => void;

const PAIR_KEY = 'oj-pairing';
const PENDING_KEY = 'oj-pending-world';
const DEVICE_KEY = 'oj-device';
const LOCAL_WORLDS_KEY = 'oj-worlds-local';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const MAX_WORLD_PLAYERS = 2;

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function seatCount(seats: Seats | null | undefined): number {
  if (!seats) return 0;
  return (seats.xb ? 1 : 0) + (seats.qd ? 1 : 0);
}

/** True when all 2 seats in the world are already claimed by other devices. */
export function isWorldFullForDevice(seats: Seats | null | undefined, deviceId: string): boolean {
  if (!seats) return false;
  const xbOther = !!seats.xb && seats.xb.device !== deviceId;
  const qdOther = !!seats.qd && seats.qd.device !== deviceId;
  return xbOther && qdOther;
}

interface StoredWorld {
  state: WorldState;
  version: number;
  seats: Seats;
}

export class Net {
  readonly enabled: boolean = true;
  readonly cloudEnabled: boolean;
  readonly client: SupabaseClient | null;
  readonly deviceId: string;
  pairing: Pairing | null = null;
  pendingCode: string | null = null;
  private channel: RealtimeChannel | null = null;
  private bc: BroadcastChannel | null = null;
  private url = '';
  private key = '';
  private handlers = new Map<string, Handler[]>();
  online = new Set<PlayerId>();
  onPresence: ((online: Set<PlayerId>) => void) | null = null;
  private channelGeneration = 0;
  private saveTimer: number | null = null;
  private pendingSave: WorldState | null = null;
  lastError = '';

  constructor() {
    const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
    const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
    this.cloudEnabled = isRealConfig(url, key);
    this.client = this.cloudEnabled ? createClient(url, key, { auth: { persistSession: true } }) : null;
    this.url = url;
    this.key = key;
    let dev = '';
    try {
      dev = localStorage.getItem(DEVICE_KEY) ?? '';
      if (!dev) {
        dev = uuid();
        localStorage.setItem(DEVICE_KEY, dev);
      }
      const p = localStorage.getItem(PAIR_KEY);
      if (p) this.pairing = JSON.parse(p) as Pairing;
      const pend = localStorage.getItem(PENDING_KEY);
      if (pend) this.pendingCode = pend;
    } catch {
      dev = dev || uuid();
    }
    this.deviceId = dev;
  }

  /** Returns the single world code this device is currently bound to (if any). */
  get boundWorldCode(): string | null {
    return this.pairing?.code ?? this.pendingCode;
  }

  /** Forgets the pairing and this device's id, for 'erase my data'. */
  forgetDevice() {
    this.setPairing(null);
    this.setPendingCode(null);
    try {
      localStorage.removeItem(DEVICE_KEY);
    } catch {
      /* private mode */
    }
  }

  private setPairing(p: Pairing | null) {
    if (this.pairing?.code !== p?.code) this.cancelScheduledSave();
    this.pairing = p;
    try {
      if (p) localStorage.setItem(PAIR_KEY, JSON.stringify(p));
      else localStorage.removeItem(PAIR_KEY);
    } catch {
      /* ignore */
    }
  }

  private setPendingCode(code: string | null) {
    this.pendingCode = code;
    try {
      if (code) localStorage.setItem(PENDING_KEY, code);
      else localStorage.removeItem(PENDING_KEY);
    } catch {
      /* ignore */
    }
  }

  private loadLocalWorlds(): Record<string, StoredWorld> {
    try {
      const raw = localStorage.getItem(LOCAL_WORLDS_KEY);
      return raw ? (JSON.parse(raw) as Record<string, StoredWorld>) : {};
    } catch {
      return {};
    }
  }

  private saveLocalWorlds(all: Record<string, StoredWorld>) {
    try {
      localStorage.setItem(LOCAL_WORLDS_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }

  private saveLocalWorld(code: string, w: StoredWorld) {
    const all = this.loadLocalWorlds();
    all[code] = w;
    this.saveLocalWorlds(all);
  }

  // ---------------- worlds ----------------

  async createWorld(state: WorldState): Promise<string | null> {
    // Enforce 1 world per device: cannot create a new world if already bound to one
    const bound = this.boundWorldCode;
    if (bound) {
      this.lastError = `This device already has a world (${bound}). Delete it first to create a new one.`;
      return null;
    }

    const initialSeats: Seats = { xb: null, qd: null };
    if (this.client) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const { error } = await this.client.from('worlds').insert({ code, state, version: 1, seats: initialSeats });
        if (!error) {
          this.saveLocalWorld(code, { state, version: 1, seats: initialSeats });
          this.setPendingCode(code);
          return code;
        }
        if (!/duplicate|unique/i.test(error.message)) {
          this.lastError = error.message;
          break;
        }
      }
    }

    // Local / BroadcastChannel fallback so world codes always work even without a cloud backend
    const all = this.loadLocalWorlds();
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = makeCode();
      if (!all[code]) {
        this.saveLocalWorld(code, { state, version: 1, seats: initialSeats });
        this.setPendingCode(code);
        return code;
      }
    }
    this.lastError = 'Could not generate a unique world code.';
    return null;
  }

  async fetchWorld(rawCode: string): Promise<{ state: WorldState; version: number; seats: Seats } | null> {
    const code = rawCode.trim().toUpperCase();
    if (!code) return null;
    if (this.client) {
      const { data, error } = await this.client.from('worlds').select('state, version, seats').eq('code', code).maybeSingle();
      if (!error && data) {
        const w = { state: data.state as WorldState, version: data.version as number, seats: data.seats as Seats };
        this.saveLocalWorld(code, w);
        return w;
      }
      if (error) this.lastError = error.message;
    }
    const local = this.loadLocalWorlds()[code];
    if (!local) return null;
    return { state: local.state, version: local.version, seats: local.seats };
  }

  /**
   * Claim a character seat for this device (max 2 seats per world: xb & qd, and max 1 world per device).
   */
  async claimSeat(rawCode: string, player: PlayerId): Promise<'ok' | 'taken' | 'full' | 'locked' | 'error'> {
    const code = rawCode.trim().toUpperCase();
    const bound = this.boundWorldCode;
    if (bound && bound !== code) {
      this.lastError = `This device is locked to world ${bound}. Delete that world first.`;
      return 'locked';
    }

    const uid = await this.userId();
    for (let attempt = 0; attempt < 3; attempt++) {
      const w = await this.fetchWorld(code);
      if (!w) {
        this.lastError = 'World not found.';
        return 'error';
      }
      if (isWorldFullForDevice(w.seats, this.deviceId)) {
        this.lastError = 'This world is full (max 2 players).';
        return 'full';
      }
      const seat = w.seats[player];
      if (seat && seat.device !== this.deviceId && !(uid && seat.user === uid)) {
        this.lastError = 'That character seat is already taken by your partner.';
        return 'taken';
      }
      const other: PlayerId = player === 'xb' ? 'qd' : 'xb';
      const cleanedOther = w.seats[other]?.device === this.deviceId ? null : w.seats[other];
      const seats: Seats = {
        ...w.seats,
        [other]: cleanedOther,
        [player]: { device: this.deviceId, ...(uid ? { user: uid } : seat?.user ? { user: seat.user } : {}) },
      };

      if (this.client) {
        const { data, error } = await this.client.from('worlds').update({ seats, version: w.version + 1 }).eq('code', code).eq('version', w.version).select('code').maybeSingle();
        if (error) {
          this.lastError = error.message;
          return 'error';
        }
        if (!data) continue;
      }

      this.saveLocalWorld(code, { state: w.state, version: w.version + 1, seats });
      this.setPendingCode(null);
      this.setPairing({ code, player });
      return 'ok';
    }
    this.lastError = 'The world changed while claiming the seat. Please try again.';
    return 'error';
  }

  /**
   * Delete the current world bound to this device so the device can create or join a new world.
   */
  async deleteWorld(): Promise<boolean> {
    const code = this.boundWorldCode;
    const p = this.pairing;
    this.cancelScheduledSave();
    this.setPairing(null);
    this.setPendingCode(null);
    await this.disconnect();

    if (code) {
      const all = this.loadLocalWorlds();
      delete all[code];
      this.saveLocalWorlds(all);
    }

    if (this.client && code) {
      // Try deleting the world row; if RLS only permits update, free the seat/world
      const { error } = await this.client.from('worlds').delete().eq('code', code);
      if (error && p) {
        const w = await this.fetchWorld(code);
        if (w && w.seats[p.player]?.device === this.deviceId) {
          const seats: Seats = { ...w.seats, [p.player]: null };
          await this.client.from('worlds').update({ seats, version: w.version + 1 }).eq('code', code);
        }
      }
    }
    return true;
  }

  /** Release this device's seat and delete the world binding on this device. */
  async leaveFarm(): Promise<void> {
    await this.deleteWorld();
  }

  /** Creator can free the partner's seat (lost phone). */
  async resetPartnerSeat(): Promise<boolean> {
    const p = this.pairing;
    if (!p) return false;
    const other: PlayerId = p.player === 'xb' ? 'qd' : 'xb';
    for (let attempt = 0; attempt < 3; attempt++) {
      const w = await this.fetchWorld(p.code);
      if (!w) return false;
      const seats: Seats = { ...w.seats, [other]: null };
      if (this.client) {
        const { data, error } = await this.client.from('worlds').update({ seats, version: w.version + 1 }).eq('code', p.code).eq('version', w.version).select('code').maybeSingle();
        if (error) {
          this.lastError = error.message;
          return false;
        }
        if (!data) continue;
      }
      this.saveLocalWorld(p.code, { state: w.state, version: w.version + 1, seats });
      return true;
    }
    return false;
  }

  /** Debounced save. The freshest copy (higher changeCounter) wins. */
  scheduleSave(state: WorldState, delayMs = 1500) {
    if (!this.pairing) return;
    this.pendingSave = state;
    if (this.saveTimer !== null) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      const s = this.pendingSave;
      this.pendingSave = null;
      if (s) void this.saveNow(s);
    }, delayMs);
  }

  private cancelScheduledSave() {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.pendingSave = null;
  }

  private async flushScheduledSave() {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const state = this.pendingSave;
    this.pendingSave = null;
    if (state) await this.saveNow(state);
  }

  async saveNow(state: WorldState): Promise<void> {
    if (!this.pairing) return;
    const code = this.pairing.code;
    const all = this.loadLocalWorlds();
    const existingLocal = all[code];
    if (!existingLocal || existingLocal.state.changeCounter <= state.changeCounter) {
      this.saveLocalWorld(code, {
        state,
        version: (existingLocal?.version ?? 1) + 1,
        seats: existingLocal?.seats ?? { xb: null, qd: null, [this.pairing.player]: { device: this.deviceId } },
      });
    }
    if (!this.client) return;
    const { data } = await this.client.from('worlds').select('state').eq('code', code).maybeSingle();
    const remote = data?.state as WorldState | undefined;
    // Simulation timestamps advance even when no player does anything. They must
    // never let a stale snapshot overwrite a farm with more real player changes.
    if (remote && remote.changeCounter > state.changeCounter) return;
    const { error } = await this.client.from('worlds').update({ state, updated_at: new Date().toISOString() }).eq('code', code);
    if (error) this.lastError = error.message;
  }

  // ---------------- realtime ----------------

  /**
   * One quick request when Supabase is configured; local world mode is always reachable.
   */
  async reachable(timeoutMs = 6000): Promise<boolean> {
    if (!this.cloudEnabled) return true;
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), timeoutMs);
    try {
      const r = await fetch(`${this.url.replace(/\/$/, '')}/rest/v1/`, { headers: { apikey: this.key }, signal: c.signal });
      return r.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async connect(player: PlayerId): Promise<boolean> {
    if (!this.pairing) return false;
    const generation = ++this.channelGeneration;
    const code = this.pairing.code;

    if (!this.client) {
      if (this.bc) {
        this.bc.close();
        this.bc = null;
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`oj-world:${code}`);
        this.bc = bc;
        bc.onmessage = (ev) => {
          const msg = ev.data as { event?: string; payload?: unknown; player?: PlayerId } | null;
          if (!msg || !msg.event) return;
          if (msg.event === '__presence' && msg.player) {
            this.online.add(msg.player);
            this.onPresence?.(this.online);
            return;
          }
          this.emit(msg.event, msg.payload);
        };
        this.online.add(player);
        bc.postMessage({ event: '__presence', player });
        this.onPresence?.(this.online);
      }
      return true;
    }

    const previous = this.channel;
    this.channel = null;
    if (previous) await this.client.removeChannel(previous);
    if (generation !== this.channelGeneration || !this.pairing) return false;
    const ch = this.client.channel(`world:${code}`, { config: { presence: { key: player }, broadcast: { self: false } } });
    this.channel = ch;
    ch.on('presence', { event: 'sync' }, () => {
      if (this.channel !== ch) return;
      const st = ch.presenceState<{ player: PlayerId }>();
      this.online = new Set(Object.keys(st) as PlayerId[]);
      this.onPresence?.(this.online);
    });
    for (const ev of ['pos', 'state', 'emote', 'coop', 'ping', 'note']) {
      ch.on('broadcast', { event: ev }, ({ payload }) => this.emit(ev, payload));
    }
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter: `code=eq.${code}` }, (p) => {
      const note = p.new as NoteRow;
      if (shouldDeliverNote(note, player)) this.emit('note', note);
    });
    const subscribed = await new Promise<boolean>((resolve) => {
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (generation === this.channelGeneration && this.channel === ch) await ch.track({ player, at: Date.now() });
          resolve(true);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') resolve(false);
      });
    });
    if (!subscribed || generation !== this.channelGeneration || this.channel !== ch) {
      if (this.channel === ch) this.channel = null;
      await this.client.removeChannel(ch);
      return false;
    }
    return true;
  }

  async disconnect() {
    this.channelGeneration++;
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    const channel = this.channel;
    this.channel = null;
    if (channel && this.client) await this.client.removeChannel(channel);
    this.online = new Set();
    this.onPresence?.(this.online);
  }

  send(event: string, payload: unknown) {
    if (this.bc) {
      this.bc.postMessage({ event, payload });
    }
    void this.channel?.send({ type: 'broadcast', event, payload });
  }

  on(event: string, h: Handler) {
    const list = this.handlers.get(event) ?? [];
    list.push(h);
    this.handlers.set(event, list);
  }

  off(event: string, h: Handler) {
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      list.filter((x) => x !== h),
    );
  }

  private emit(event: string, payload: unknown) {
    for (const h of this.handlers.get(event) ?? []) h(payload);
  }

  // ---------------- gift codes ----------------

  /**
   * Spend a gift code for this farm. The codes table is invisible to the anon
   * key; this goes through a function on the server that can see it, so a
   * player can spend a code they were given but cannot go looking for others.
   */
  async redeemGift(code: string): Promise<{ ok: true; reward: Reward; message: string | null } | { ok: false; why: string }> {
    if (!this.client || !this.pairing) return { ok: false, why: 'you are playing on your own' };
    const { data, error } = await this.client.rpc('redeem_gift', { p_code: code, p_farm: this.pairing.code, p_player: this.pairing.player });
    if (error) return { ok: false, why: error.message };
    const r = data as { ok: boolean; why?: string; reward?: Reward; message?: string | null } | null;
    if (!r || !r.ok) return { ok: false, why: r?.why ?? 'unknown' };
    return { ok: true, reward: (r.reward ?? {}) as Reward, message: r.message ?? null };
  }

  // ---------------- notes & answers ----------------

  async sendNote(to: PlayerId, body: string): Promise<boolean> {
    if (!this.client || !this.pairing) return false;
    const { error } = await this.client.from('notes').insert({ code: this.pairing.code, from_player: this.pairing.player, to_player: to, body });
    return !error;
  }

  async fetchNotes(): Promise<NoteRow[]> {
    if (!this.client || !this.pairing) return [];
    const { data } = await this.client.from('notes').select('*').eq('code', this.pairing.code).order('created_at', { ascending: false }).limit(30);
    return (data ?? []) as NoteRow[];
  }

  async markNotesRead(): Promise<void> {
    if (!this.client || !this.pairing) return;
    await this.client.from('notes').update({ read: true }).eq('code', this.pairing.code).eq('to_player', this.pairing.player).eq('read', false);
  }

  async unreadCount(): Promise<number> {
    if (!this.client || !this.pairing) return 0;
    const { count } = await this.client.from('notes').select('*', { count: 'exact', head: true }).eq('code', this.pairing.code).eq('to_player', this.pairing.player).eq('read', false);
    return count ?? 0;
  }

  async answerQuestion(day: string, answer: string): Promise<boolean> {
    if (!this.client || !this.pairing) return false;
    const { error } = await this.client.from('answers').upsert({ code: this.pairing.code, day, player: this.pairing.player, answer });
    if (!error) this.send('ping', { kind: 'answer', day });
    return !error;
  }

  async fetchAnswers(day: string): Promise<Partial<Record<PlayerId, string>>> {
    if (!this.client || !this.pairing) return {};
    const { data } = await this.client.from('answers').select('player, answer').eq('code', this.pairing.code).eq('day', day);
    const out: Partial<Record<PlayerId, string>> = {};
    for (const r of data ?? []) out[r.player as PlayerId] = r.answer as string;
    return out;
  }

  // ---------------- optional email (keep my seat on a new phone) ----------------

  async userId(): Promise<string | null> {
    if (!this.client) return null;
    const { data } = await this.client.auth.getUser();
    return data.user?.id ?? null;
  }

  async userEmail(): Promise<string | null> {
    if (!this.client) return null;
    const { data } = await this.client.auth.getUser();
    return data.user?.email ?? null;
  }

  async linkEmail(email: string): Promise<boolean> {
    if (!this.client) return false;
    const { error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (error) this.lastError = error.message;
    return !error;
  }

  /** After a magic-link sign-in: attach the user to my seat, or find the world I belong to on a new phone. */
  async restoreFromUser(): Promise<Pairing | null> {
    if (!this.client) return null;
    const uid = await this.userId();
    if (!uid) return null;
    if (this.pairing) {
      // attach to the seat I already hold
      const w = await this.fetchWorld(this.pairing.code);
      if (w) {
        const seat = w.seats[this.pairing.player];
        if (seat && (seat.device === this.deviceId || seat.user === uid)) await this.claimSeat(this.pairing.code, this.pairing.player);
      }
      return this.pairing;
    }
    for (const player of ['xb', 'qd'] as PlayerId[]) {
      const { data } = await this.client.from('worlds').select('code, seats').eq(`seats->${player}->>user`, uid).limit(1);
      const row = data?.[0];
      if (row) {
        const code = row.code as string;
        const claimed = await this.claimSeat(code, player);
        if (claimed === 'ok') return this.pairing;
      }
    }
    return null;
  }

  async signOut() {
    await this.client?.auth.signOut();
  }
}

export const net = new Net();
