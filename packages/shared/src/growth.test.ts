import { describe, expect, it } from 'vitest';
import { emptyPlot, isRipe, simulatePlot, WATER_DURATION_MS, type PlotState } from './growth';
import { CROPS, cropTotalSeconds } from './crops';

const T0 = 1_700_000_000_000;

function planted(): PlotState {
  return { ...emptyPlot(), tilled: true, crop: 'wheat', wateredUntil: T0 + WATER_DURATION_MS };
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
    const after = simulatePlot(p, T0, T0 + CROPS.wheat.stageSeconds[0] * 1000);
    expect(after.stage).toBe(1);
    expect(after.progress).toBe(0);
  });

  it('stops growing when water runs out', () => {
    // pumpkin needs 6 h; one watering lasts 2 h
    const p: PlotState = { ...emptyPlot(), tilled: true, crop: 'pumpkin', wateredUntil: T0 + WATER_DURATION_MS };
    const after = simulatePlot(p, T0, T0 + cropTotalSeconds('pumpkin') * 1000 + 100_000);
    expect(after.stage).toBe(1);
    expect(isRipe(after)).toBe(false);
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
