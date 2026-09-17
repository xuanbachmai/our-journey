import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { AreaId, Outfit, PlayerId, WorldState } from '@hh/shared';

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
}

export interface NoteRow {
  id: number;
  from_player: PlayerId;
  to_player: PlayerId;
  body: string;
  created_at: string;
  read: boolean;
}

type Handler = (payload: unknown) => void;

const PAIR_KEY = 'oj-pairing';
const DEVICE_KEY = 'oj-device';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

class Net {
  readonly enabled: boolean;
  readonly client: SupabaseClient | null;
  readonly deviceId: string;
  pairing: Pairing | null = null;
  private channel: RealtimeChannel | null = null;
  private handlers = new Map<string, Handler[]>();
  online = new Set<PlayerId>();
  onPresence: ((online: Set<PlayerId>) => void) | null = null;
  private saveTimer: number | null = null;
  private pendingSave: WorldState | null = null;
  lastError = '';

  constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.enabled = !!url && !!key;
    this.client = this.enabled ? createClient(url as string, key as string, { auth: { persistSession: true } }) : null;
    let dev = '';
    try {
      dev = localStorage.getItem(DEVICE_KEY) ?? '';
      if (!dev) {
        dev = uuid();
        localStorage.setItem(DEVICE_KEY, dev);
      }
      const p = localStorage.getItem(PAIR_KEY);
      if (p) this.pairing = JSON.parse(p) as Pairing;
    } catch {
      dev = dev || uuid();
    }
    this.deviceId = dev;
  }

  private setPairing(p: Pairing | null) {
    this.pairing = p;
    try {
      if (p) localStorage.setItem(PAIR_KEY, JSON.stringify(p));
      else localStorage.removeItem(PAIR_KEY);
    } catch {
      /* ignore */
    }
  }

  // ---------------- worlds ----------------

  async createWorld(state: WorldState): Promise<string | null> {
    if (!this.client) return null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const { error } = await this.client.from('worlds').insert({ code, state, version: 1, seats: { xb: null, qd: null } });
      if (!error) return code;
      if (!/duplicate|unique/i.test(error.message)) {
        this.lastError = error.message;
        return null;
      }
    }
    return null;
  }

  async fetchWorld(code: string): Promise<{ state: WorldState; version: number; seats: Seats } | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.from('worlds').select('state, version, seats').eq('code', code).maybeSingle();
    if (error) {
      this.lastError = error.message;
      return null;
    }
    if (!data) return null;
    return { state: data.state as WorldState, version: data.version as number, seats: data.seats as Seats };
  }

  /** Claim a character seat for this device. Fails if someone else holds it. */
  async claimSeat(code: string, player: PlayerId): Promise<'ok' | 'taken' | 'error'> {
    if (!this.client) return 'error';
    const w = await this.fetchWorld(code);
    if (!w) return 'error';
    const seat = w.seats[player];
    const uid = await this.userId();
    if (seat && seat.device !== this.deviceId && !(uid && seat.user === uid)) return 'taken';
    const seats: Seats = { ...w.seats, [player]: { device: this.deviceId, ...(uid ? { user: uid } : seat?.user ? { user: seat.user } : {}) } };
    const { error } = await this.client.from('worlds').update({ seats }).eq('code', code);
    if (error) {
      this.lastError = error.message;
      return 'error';
    }
    this.setPairing({ code, player });
    return 'ok';
  }

  /** Release this device's seat and forget the pairing. */
  async leaveFarm(): Promise<void> {
    const p = this.pairing;
    this.setPairing(null);
    await this.disconnect();
    if (!this.client || !p) return;
    const w = await this.fetchWorld(p.code);
    if (!w) return;
    const seats: Seats = { ...w.seats, [p.player]: null };
    await this.client.from('worlds').update({ seats }).eq('code', p.code);
  }

  /** Creator can free the partner's seat (lost phone). */
  async resetPartnerSeat(): Promise<boolean> {
    const p = this.pairing;
    if (!this.client || !p) return false;
    const w = await this.fetchWorld(p.code);
    if (!w) return false;
    const other: PlayerId = p.player === 'xb' ? 'qd' : 'xb';
    const seats: Seats = { ...w.seats, [other]: null };
    const { error } = await this.client.from('worlds').update({ seats }).eq('code', p.code);
    return !error;
  }

  /** Debounced save. The freshest copy (higher changeCounter) wins. */
  scheduleSave(state: WorldState, delayMs = 1500) {
    if (!this.client || !this.pairing) return;
    this.pendingSave = state;
    if (this.saveTimer) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      const s = this.pendingSave;
      this.pendingSave = null;
      if (s) void this.saveNow(s);
    }, delayMs);
  }

  async saveNow(state: WorldState): Promise<void> {
    if (!this.client || !this.pairing) return;
    const code = this.pairing.code;
    const { data } = await this.client.from('worlds').select('state').eq('code', code).maybeSingle();
    const remote = data?.state as WorldState | undefined;
    if (remote && remote.changeCounter > state.changeCounter && remote.lastSimulatedAt > state.lastSimulatedAt - 5000) return;
    const { error } = await this.client.from('worlds').update({ state, updated_at: new Date().toISOString() }).eq('code', code);
    if (error) this.lastError = error.message;
  }

  // ---------------- realtime ----------------

  async connect(player: PlayerId): Promise<void> {
    if (!this.client || !this.pairing) return;
    await this.disconnect();
    const ch = this.client.channel(`world:${this.pairing.code}`, { config: { presence: { key: player }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState<{ player: PlayerId }>();
      this.online = new Set(Object.keys(st) as PlayerId[]);
      this.onPresence?.(this.online);
    });
    for (const ev of ['pos', 'state', 'emote', 'coop', 'ping', 'note']) {
      ch.on('broadcast', { event: ev }, ({ payload }) => this.emit(ev, payload));
    }
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter: `code=eq.${this.pairing.code}` }, (p) => this.emit('note', p.new));
    await new Promise<void>((resolve) => {
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ player, at: Date.now() });
          resolve();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve();
      });
    });
    this.channel = ch;
  }

  async disconnect() {
    if (this.channel && this.client) {
      await this.client.removeChannel(this.channel);
      this.channel = null;
    }
    this.online = new Set();
  }

  send(event: string, payload: unknown) {
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

  // ---------------- notes & answers ----------------

  async sendNote(to: PlayerId, body: string): Promise<boolean> {
    if (!this.client || !this.pairing) return false;
    const { error } = await this.client.from('notes').insert({ code: this.pairing.code, from_player: this.pairing.player, to_player: to, body });
    if (!error) this.send('note', { from: this.pairing.player });
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
        if (seat && seat.device === this.deviceId && seat.user !== uid) {
          const seats: Seats = { ...w.seats, [this.pairing.player]: { device: this.deviceId, user: uid } };
          await this.client.from('worlds').update({ seats }).eq('code', this.pairing.code);
        }
      }
      return this.pairing;
    }
    for (const player of ['xb', 'qd'] as PlayerId[]) {
      const { data } = await this.client.from('worlds').select('code, seats').eq(`seats->${player}->>user`, uid).limit(1);
      const row = data?.[0];
      if (row) {
        const seats = row.seats as Seats;
        seats[player] = { device: this.deviceId, user: uid };
        await this.client.from('worlds').update({ seats }).eq('code', row.code as string);
        this.setPairing({ code: row.code as string, player });
        return this.pairing;
      }
    }
    return null;
  }

  async signOut() {
    await this.client?.auth.signOut();
  }
}

export const net = new Net();
