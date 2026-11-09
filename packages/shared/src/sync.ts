import { PLAYER_IDS, type PlayerId } from './couple';
import type { WorldState } from './world';

/**
 * Reconciling two copies of one shared world.
 *
 * Each client holds the whole world and broadcasts all of it with a counter it
 * bumps itself. That is fine while only one person is doing anything, and goes
 * wrong the moment both are: if she waters while he cooks, both copies reach
 * the same counter, each refuses the other as "not newer", and the two farms
 * disagree from then on. Whoever acts next ships a whole world that overwrites
 * the other's work.
 *
 * Most of the world genuinely has to pick a winner - you cannot hold two
 * versions of an inventory. But the mission list is different: every field it
 * rests on only ever grows. A task is never un-claimed, a counter never goes
 * down, an area never becomes undiscovered. Fields like that can be merged
 * instead of chosen between, and the result is the same whichever side does
 * the merging and in whatever order copies arrive.
 *
 * So: pick a winner for the world, then fold the loser's mission progress back
 * in. Neither player loses credit for what they did, and both machines end up
 * at the same answer.
 */

/** Keys whose values only ever climb, so the higher of the two is the true one. */
function mergeCounters(into: Record<string, number>, from: Record<string, number>) {
  for (const [k, v] of Object.entries(from ?? {})) {
    if (typeof v !== 'number') continue;
    if (!(k in into) || into[k] < v) into[k] = v;
  }
}

/** Items are only ever added to these, so the union is the true one. */
function mergeList<T>(into: T[], from: T[]): T[] {
  const out = into.slice();
  for (const v of from ?? []) if (!out.includes(v)) out.push(v);
  return out;
}

/**
 * Fold every grow-only part of the mission list from one copy into another.
 * Order does not matter and doing it twice changes nothing, so it is safe to
 * run on whichever copy happens to win.
 */
export function mergeMissionProgress(into: WorldState, from: WorldState): WorldState {
  if (!from) return into;
  into.stats = { ...(into.stats ?? {}) };
  mergeCounters(into.stats, from.stats ?? {});
  into.questsClaimed = mergeList(into.questsClaimed ?? [], from.questsClaimed ?? []);
  into.discovered = mergeList(into.discovered ?? [], from.discovered ?? []);

  // The daily list resets each day, so only merge it within the same day -
  // yesterday's ticks must not be folded into today's.
  if (into.daily && from.daily && into.daily.day === from.daily.day) {
    into.daily = { ...into.daily, claimed: mergeList(into.daily.claimed ?? [], from.daily.claimed ?? []) };
  } else if (!into.daily && from.daily) {
    into.daily = from.daily;
  }
  return into;
}

/**
 * Decide which copy of the world to keep. Higher counter wins; on a tie the
 * two clients must not each keep their own, or they stay split for good, so
 * the tie goes to a fixed player. Both sides run the same comparison and reach
 * the same verdict.
 */
export function winnerIsIncoming(mineCounter: number, theirsCounter: number, mine: PlayerId, theirs: PlayerId): boolean {
  if (theirsCounter !== mineCounter) return theirsCounter > mineCounter;
  if (mine === theirs) return false;
  return PLAYER_IDS.indexOf(theirs) < PLAYER_IDS.indexOf(mine);
}

/**
 * Take a copy of the world that arrived from the partner and return the one to
 * keep, with the mission progress of both folded in. Returns the same object
 * reference it was given where nothing had to change, so a caller can tell
 * whether it needs to redraw.
 */
export function receiveWorld(mine: WorldState, theirs: WorldState, me: PlayerId, from: PlayerId): WorldState {
  const takeTheirs = winnerIsIncoming(mine.changeCounter, theirs.changeCounter, me, from);
  const winner = takeTheirs ? theirs : mine;
  const loser = takeTheirs ? mine : theirs;
  mergeMissionProgress(winner, loser);
  // Past both, so the next copy either of them sends is judged against a
  // number no other world has used. Both sides land on the same content and
  // the same number here, which is what ends the split rather than papering
  // over it.
  winner.changeCounter = Math.max(mine.changeCounter, theirs.changeCounter) + 1;
  return winner;
}
