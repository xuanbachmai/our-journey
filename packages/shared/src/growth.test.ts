import { describe, expect, it } from 'vitest';
import { emptyPlot, isRipe, simulatePlot, WATER_DURATION_MS, type PlotState } from './growth';
import { CROPS } from './crops';

const T0 = 1_700_000_000_000;

function planted(): PlotState {
  return { ...emptyPlot(), tilled: true, crop: 'tomato', wateredUntil: T0 + WATER_DURATION_MS };
}

describe('simulatePlot', () => {
  it('does nothing without a crop', () => {
    const p = emptyPlot();
    expect(simulatePlot(p, T0, T0 + 60_000)).toEqual(p);
  });

  it('only grows while watered', () => {
    const p = { ...planted(), wateredUntil: 0 };
    expect(simulatePlot(p, T0, T0 + 60_000)).toEqual(p);
  });

  it('advances stages using watered seconds', () => {
    const p = planted();
    const after = simulatePlot(p, T0, T0 + 20_000);
    expect(after.stage).toBe(1);
    expect(after.progress).toBe(0);
  });

  it('stops growing when water runs out', () => {
    const p = planted();
    const total = CROPS.tomato.stageSeconds.reduce((a, b) => a + b, 0) * 1000;
    const after = simulatePlot(p, T0, T0 + total + 100_000);
    // Only WATER_DURATION_MS (90 s) of watered time was available; tomato needs 75 s.
    expect(after.stage).toBe(3);
    expect(after.progress).toBe(0);
    expect(isRipe(after)).toBe(true);
  });

  it('one big catch-up equals many small ticks', () => {
    const p = planted();
    const end = T0 + 200_000;
    const oneShot = simulatePlot(p, T0, end);
    let stepped = p;
    for (let t = T0; t < end; t += 1_000) stepped = simulatePlot(stepped, t, Math.min(end, t + 1_000));
    expect(stepped.stage).toBe(oneShot.stage);
    expect(stepped.progress).toBeCloseTo(oneShot.progress, 6);
  });
});
