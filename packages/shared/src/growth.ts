import { CROPS, type CropId } from './crops';

/** How long one watering keeps the soil moist (demo speed). */
export const WATER_DURATION_MS = 90_000;
/** Cap for catch-up simulation so a very long absence stays sane. */
export const MAX_CATCHUP_MS = 7 * 24 * 60 * 60 * 1000;

export interface PlotState {
  tilled: boolean;
  crop: CropId | null;
  /** 0..stages-1 while growing, === stages when ripe. */
  stage: number;
  /** Watered seconds accumulated inside the current stage. */
  progress: number;
  /** Epoch ms until which the plot counts as watered. 0 = dry. */
  wateredUntil: number;
}

export function emptyPlot(): PlotState {
  return { tilled: false, crop: null, stage: 0, progress: 0, wateredUntil: 0 };
}

export function isRipe(p: PlotState): boolean {
  return p.crop !== null && p.stage >= CROPS[p.crop].stageSeconds.length;
}

export function isWatered(p: PlotState, now: number): boolean {
  return p.wateredUntil > now;
}

/**
 * Pure, deterministic growth. Advancing from `from` to `to` in one call gives
 * exactly the same result as advancing in many small steps, which is what lets
 * the server catch a dormant world up in a single pass.
 */
export function simulatePlot(p: PlotState, from: number, to: number): PlotState {
  if (!p.crop || to <= from) return p;
  const def = CROPS[p.crop];
  const stages = def.stageSeconds.length;
  if (p.stage >= stages) return p;

  const wateredEnd = Math.min(to, p.wateredUntil);
  if (wateredEnd <= from) return p;

  let seconds = (wateredEnd - from) / 1000;
  let stage = p.stage;
  let progress = p.progress;
  while (stage < stages && seconds > 0) {
    const need = def.stageSeconds[stage] - progress;
    if (seconds >= need) {
      seconds -= need;
      progress = 0;
      stage++;
    } else {
      progress += seconds;
      seconds = 0;
    }
  }
  return { ...p, stage, progress };
}

export function simulatePlots<K extends string>(
  plots: Record<K, PlotState>,
  from: number,
  to: number,
): Record<K, PlotState> {
  const start = Math.max(from, to - MAX_CATCHUP_MS);
  const out = {} as Record<K, PlotState>;
  for (const k in plots) out[k] = simulatePlot(plots[k], start, to);
  return out;
}

/** Fraction 0..1 of total growth completed, for progress bars. */
export function growthFraction(p: PlotState): number {
  if (!p.crop) return 0;
  const s = CROPS[p.crop].stageSeconds;
  const total = s.reduce((a, b) => a + b, 0);
  let done = 0;
  for (let i = 0; i < p.stage; i++) done += s[i];
  done += p.progress;
  return Math.min(1, done / total);
}
