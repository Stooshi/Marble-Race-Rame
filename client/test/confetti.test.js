import { describe, expect, it } from 'vitest';
import { piecesAt } from '../src/utils/confetti';
import { GOLD_LAND_MS, finishPlan, showerFor } from '../src/utils/finishShow';

describe('ceremony confetti', () => {
  const plan = finishPlan({ 0: 50000, 1: 51000, 2: 60000 }, 3);
  const shower = showerFor(plan);

  it('bursts as the winner crosses, keeps drifting all through, and bursts again as first place lands', () => {
    expect(piecesAt(49999, shower)).toHaveLength(0);
    const burst = piecesAt(50600, shower).length;
    expect(burst).toBeGreaterThan(150);
    // Long after the burst has settled, pieces are still falling: the field coming home, then the podium.
    for (const t of [53000, 57000, plan.podiumAt + 500]) expect(piecesAt(t, shower).length).toBeGreaterThan(15);
    expect(piecesAt(plan.podiumAt + GOLD_LAND_MS + 400, shower).length).toBeGreaterThan(piecesAt(plan.podiumAt + GOLD_LAND_MS - 100, shower).length + 100);
    expect(piecesAt(plan.podiumAt + 1500, shower).some((p) => p.glitter)).toBe(true);
  });

  it('is the same shower every time at the same moment (live and replays), only thinner on weaker devices', () => {
    expect(piecesAt(51234, shower)).toEqual(piecesAt(51234, shower));
    const full = piecesAt(51234, shower, 1).length;
    const thin = piecesAt(51234, shower, 0.4).length;
    expect(thin).toBeGreaterThan(full * 0.25);
    expect(thin).toBeLessThan(full * 0.6);
  });
});
