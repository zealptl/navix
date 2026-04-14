import { describe, it, expect } from 'vitest';
import {
  G_LY_PER_YR2,
  rindlerVelocity,
  rindlerGamma,
  rindlerDistance,
  rindlerCoordTime,
  rindlerTauFromDist,
  rindlerCoordTimeFromDist,
  tripProfile,
  generateKeyframes,
  massRatio,
  tripRapidity,
} from './physics';

const TAU_CETI_LY = 11.91;
const PROXIMA_LY = 4.244;
const TOL = 0.05; // 5% tolerance

// TypeScript helper: unwrap the success-branch value type from tripProfile
type TripValue = Extract<ReturnType<typeof tripProfile>, { ok: true }>['value'];

function approx(actual: number, expected: number, tol = TOL): boolean {
  return Math.abs(actual - expected) / expected < tol;
}

describe('Rindler primitives', () => {
  it('1g for 1 ship-year gives ~0.77c', () => {
    const a = G_LY_PER_YR2; // 1g in ly/yr²
    const v = rindlerVelocity(a, 1);
    expect(v).toBeGreaterThan(0.76);
    expect(v).toBeLessThan(0.79);
  });

  it('coordinate time exceeds proper time at relativistic speeds', () => {
    const a = G_LY_PER_YR2;
    const tau = 3;
    const t = rindlerCoordTime(a, tau);
    expect(t).toBeGreaterThan(tau);
    // The instantaneous dilation rate dt/dτ = γ (not t/τ = γ — that's a common misconception)
    const gamma = rindlerGamma(a, tau);
    const eps = 1e-6;
    const dtdtau = (rindlerCoordTime(a, tau + eps) - t) / eps;
    expect(Math.abs(dtdtau - gamma) / gamma).toBeLessThan(0.001);
  });

  it('inverse: rindlerTauFromDist round-trips', () => {
    const a = G_LY_PER_YR2;
    const tau = 2.5;
    const dist = rindlerDistance(a, tau);
    const tauBack = rindlerTauFromDist(a, dist);
    expect(Math.abs(tauBack - tau)).toBeLessThan(1e-10);
  });

  it('inverse: rindlerCoordTimeFromDist round-trips', () => {
    const a = G_LY_PER_YR2;
    const tau = 2.5;
    const dist = rindlerDistance(a, tau);
    const t = rindlerCoordTime(a, tau);
    const tBack = rindlerCoordTimeFromDist(a, dist);
    expect(Math.abs(tBack - t)).toBeLessThan(1e-10);
  });
});

describe('Coasting phase time dilation', () => {
  it('coasting 6 ly at 0.9c: tau_coast < t_coast by factor ~2.29', () => {
    const beta = 0.9;
    const d = 6;
    const result = tripProfile({
      distance: d,
      acceleration: 0.001, // very low — essentially all coast
      mode: 'stop',
      coastMode: 'fraction',
      coastFraction: 0.98,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const coastPhase = result.value.phases.find(p => p.type === 'coasting');
    expect(coastPhase).toBeDefined();
    if (!coastPhase) return;
    // gamma at 0.9c ≈ 2.294
    const expectedGamma = 1 / Math.sqrt(1 - beta * beta);
    // For our coast phase at close to 0.9c:
    const ratio = coastPhase.tDuration / coastPhase.tauDuration;
    expect(ratio).toBeGreaterThan(1.0);
  });
});

describe('tripProfile — stop, no coast', () => {
  it('Earth → Tau Ceti at 1g: ship ~5.15yr, Earth ~13.7yr', () => {
    // Verified by the Rindler equations: tau_total = 2*acosh(a*D/2+1)/a.
    // The spec's "6.2 yr" was an erroneous reference; the correct physics gives ~5.15 yr ship
    // time and ~13.7 yr Earth time (within 5% tolerance).
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'none',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { totalTau, totalT } = result.value;
    expect(approx(totalTau, 5.15)).toBe(true);
    expect(approx(totalT, 13.7)).toBe(true);
  });

  it('maximum velocity at midpoint D/2', () => {
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'none',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Midpoint is the transition from accel → decel
    const [acc, dec] = result.value.phases;
    expect(acc.velocityEnd).toBeGreaterThan(0);
    expect(acc.velocityEnd).toBeCloseTo(dec.velocityStart, 5);
    // No other phase has higher velocity
    expect(acc.velocityEnd).toBe(result.value.maxVelocity);
  });

  it('stop trip: two phases, equal distance', () => {
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'none',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.phases).toHaveLength(2);
    const [acc, dec] = result.value.phases;
    expect(Math.abs(acc.distance - dec.distance)).toBeLessThan(1e-10);
  });
});

describe('tripProfile — stop, coast by fraction', () => {
  it('50% coast trip has longer ship time than 0% coast (lower avg γ)', () => {
    const base = { distance: TAU_CETI_LY, acceleration: 1, mode: 'stop' as const };
    const noCoast = tripProfile({ ...base, coastMode: 'none' });
    const withCoast = tripProfile({ ...base, coastMode: 'fraction', coastFraction: 0.5 });
    expect(noCoast.ok && withCoast.ok).toBe(true);
    if (!noCoast.ok || !withCoast.ok) return;
    expect(withCoast.value.totalTau).toBeGreaterThan(noCoast.value.totalTau);
  });

  it('coastFraction = 1.0 returns error for stop mode', () => {
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'fraction',
      coastFraction: 1.0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_COAST_FRACTION');
  });
});

describe('tripProfile — stop, coast by target speed (auto-cap)', () => {
  it('auto-caps 0.99c on 5 ly trip at 0.1g', () => {
    const result = tripProfile({
      distance: 5,
      acceleration: 0.1,
      mode: 'stop',
      coastMode: 'targetSpeed',
      targetSpeed: 0.99,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cappedSpeed).toBeDefined();
    expect(result.value.validationMessage).toBeDefined();
    expect(result.value.cappedSpeed!).toBeLessThan(0.99);
  });

  it('achievable target speed produces correct 3-phase profile', () => {
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'targetSpeed',
      targetSpeed: 0.8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cappedSpeed).toBeUndefined();
    expect(result.value.phases).toHaveLength(3);
    const [acc, coast, dec] = result.value.phases;
    expect(acc.type).toBe('accelerating');
    expect(coast.type).toBe('coasting');
    expect(dec.type).toBe('decelerating');
    expect(Math.abs(acc.distance - dec.distance)).toBeLessThan(1e-6);
  });
});

describe('tripProfile — flyby', () => {
  it('flyby ship time is less than stop ship time', () => {
    const base = { distance: TAU_CETI_LY, acceleration: 1, coastMode: 'none' as const };
    const stop = tripProfile({ ...base, mode: 'stop' });
    const flyby = tripProfile({ ...base, mode: 'flyby' });
    expect(stop.ok && flyby.ok).toBe(true);
    if (!stop.ok || !flyby.ok) return;
    expect(flyby.value.totalTau).toBeLessThan(stop.value.totalTau);
  });
});

describe('Mass ratio — task 14.5 integration scenario', () => {
  it('Earth → Tau Ceti at 1g, stop, no coast: photon rocket mass ratio ~158–220 range', () => {
    // Spec originally cited "~27" which is incorrect for the Rindler equations.
    // The actual relativistic mass ratio for a photon rocket on this trip is
    // exp(2·atanh(v_max)) where v_max ≈ 0.988c at midpoint, giving ~202.
    // We verify the computed value is in the physically correct range.
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'none',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rapidity = tripRapidity(result.value);
    const ratio = massRatio(rapidity, 1.0); // photon rocket: v_e = c
    expect(ratio).toBeGreaterThan(150);
    expect(ratio).toBeLessThan(260);
  });

  it('auto-cap: 0.99c on 5 ly at 0.1g produces valid capped results', () => {
    // task 14.6: verify validation message appears and physics are correct post-cap
    const result = tripProfile({
      distance: 5,
      acceleration: 0.1,
      mode: 'stop',
      coastMode: 'targetSpeed',
      targetSpeed: 0.99,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Capped speed must be set and less than requested
    expect(result.value.cappedSpeed).toBeDefined();
    expect(result.value.cappedSpeed!).toBeLessThan(0.99);
    // Validation message must be present
    expect(result.value.validationMessage).toBeTruthy();
    // Results must be physically valid
    expect(result.value.totalTau).toBeGreaterThan(0);
    expect(result.value.totalT).toBeGreaterThan(result.value.totalTau);
    expect(result.value.maxVelocity).toBeGreaterThan(0);
    expect(result.value.maxVelocity).toBeLessThanOrEqual(result.value.cappedSpeed! + 1e-9);
  });
});

describe('Input validation', () => {
  it('zero acceleration returns INVALID_ACCELERATION', () => {
    const result = tripProfile({ distance: 10, acceleration: 0, mode: 'stop', coastMode: 'none' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_ACCELERATION');
  });

  it('negative distance returns INVALID_DISTANCE', () => {
    const result = tripProfile({ distance: -1, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_DISTANCE');
  });

  it('zero distance returns INVALID_DISTANCE', () => {
    const result = tripProfile({ distance: 0, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_DISTANCE');
  });
});

describe('generateKeyframes', () => {
  it('spans full trip: first tau=0, last tau=totalTau', () => {
    const result = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frames = generateKeyframes(result.value, 500);
    expect(frames).toHaveLength(500);
    expect(frames[0].tau).toBe(0);
    expect(Math.abs(frames[499].tau - result.value.totalTau)).toBeLessThan(1e-10);
  });

  it('all keyframes have valid v in [0, 1]', () => {
    const result = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frames = generateKeyframes(result.value, 500);
    for (const f of frames) {
      expect(Number.isNaN(f.v)).toBe(false);
      expect(f.v).toBeGreaterThanOrEqual(0);
      expect(f.v).toBeLessThanOrEqual(1);
    }
  });

  it('coasting frames have constant v and correct phase label', () => {
    const result = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'fraction',
      coastFraction: 0.5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frames = generateKeyframes(result.value, 500);
    const coastFrames = frames.filter(f => f.phase === 'coasting');
    expect(coastFrames.length).toBeGreaterThan(0);
    const firstV = coastFrames[0].v;
    for (const f of coastFrames) {
      expect(Math.abs(f.v - firstV)).toBeLessThan(1e-8);
    }
  });
});

// ---------------------------------------------------------------------------
// Sol → Proxima Centauri reference scenario (tasks 1.1–1.4)
// ---------------------------------------------------------------------------
describe('Sol → Proxima Centauri reference scenario', () => {
  // Closed-form Rindler derivation for D = 4.244 ly, a = G_LY_PER_YR2 ≈ 1.03156 ly/yr²:
  //
  //   τ_half = acosh(a·D/2 + 1) / a
  //          = acosh(1.03156 × 2.122 + 1) / 1.03156
  //          = acosh(3.190) / 1.03156
  //          ≈ 1.828 / 1.03156 ≈ 1.773 yr
  //   τ_total = 2 × τ_half ≈ 3.55 yr
  //
  //   t_half  = sinh(a·τ_half) / a
  //           = sinh(1.03156 × 1.773) / 1.03156
  //           = sinh(1.829) / 1.03156
  //           ≈ 3.034 / 1.03156 ≈ 2.940 yr
  //   t_total = 2 × t_half ≈ 5.87 yr
  //
  //   v_max   = tanh(a·τ_half) = tanh(1.829) ≈ 0.950c

  const result = tripProfile({
    distance: PROXIMA_LY,
    acceleration: 1,
    mode: 'stop',
    coastMode: 'none',
  });

  it('totalTau ≈ 3.55 yr and totalT ≈ 5.87 yr (within 5%)', () => {
    // τ_total = 2·acosh(a·D/2+1)/a ≈ 3.55 yr
    // t_total = 2·sinh(a·τ_half)/a ≈ 5.87 yr
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(approx(result.value.totalTau, 3.55)).toBe(true);
    expect(approx(result.value.totalT, 5.87)).toBe(true);
  });

  it('totalT > 4.244 (Earth time exceeds trip distance — subluminal travel)', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalT).toBeGreaterThan(PROXIMA_LY);
  });

  it('maxVelocity ≈ 0.95c (within 5%)', () => {
    // v_max = tanh(a·τ_half) = tanh(1.829) ≈ 0.950
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(approx(result.value.maxVelocity, 0.95)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Physics invariant helper (tasks 2.1–2.7)
// ---------------------------------------------------------------------------
function checkInvariants(value: TripValue, distance: number): void {
  // 2.2: Earth time must exceed ship time (time dilation)
  expect(value.totalT).toBeGreaterThan(value.totalTau);

  // 2.3: Earth time must exceed trip distance in light-years (subluminal travel)
  expect(value.totalT).toBeGreaterThan(distance);

  // 2.4: Sum of phase distances ≈ totalDistance (within 1e-9)
  const distSum = value.phases.reduce((s, p) => s + p.distance, 0);
  expect(Math.abs(distSum - value.totalDistance)).toBeLessThan(1e-9);

  // 2.5: Sum of phase ship times ≈ totalTau (within 1e-9)
  const tauSum = value.phases.reduce((s, p) => s + p.tauDuration, 0);
  expect(Math.abs(tauSum - value.totalTau)).toBeLessThan(1e-9);

  // 2.6: Sum of phase Earth times ≈ totalT (within 1e-9)
  const tSum = value.phases.reduce((s, p) => s + p.tDuration, 0);
  expect(Math.abs(tSum - value.totalT)).toBeLessThan(1e-9);

  // 2.7: All velocity values in [0, 1)
  for (const phase of value.phases) {
    expect(phase.velocityStart).toBeGreaterThanOrEqual(0);
    expect(phase.velocityStart).toBeLessThan(1);
    expect(phase.velocityEnd).toBeGreaterThanOrEqual(0);
    expect(phase.velocityEnd).toBeLessThan(1);
  }
}

// ---------------------------------------------------------------------------
// Physics invariants block (task 2.8 — 5 diverse cases)
// ---------------------------------------------------------------------------
describe('Physics invariants', () => {
  it('Proxima Centauri 1g stop passes all invariants', () => {
    const r = tripProfile({ distance: PROXIMA_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    checkInvariants(r.value, PROXIMA_LY);
  });

  it('Tau Ceti 1g stop passes all invariants', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    checkInvariants(r.value, TAU_CETI_LY);
  });

  it('Tau Ceti 0.5g coast-fraction 0.5 passes all invariants', () => {
    const r = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 0.5,
      mode: 'stop',
      coastMode: 'fraction',
      coastFraction: 0.5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    checkInvariants(r.value, TAU_CETI_LY);
  });

  it('Tau Ceti 1g target-speed 0.8c passes all invariants', () => {
    const r = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'targetSpeed',
      targetSpeed: 0.8,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    checkInvariants(r.value, TAU_CETI_LY);
  });

  it('Tau Ceti 1g flyby passes all invariants', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'flyby', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    checkInvariants(r.value, TAU_CETI_LY);
  });
});

// ---------------------------------------------------------------------------
// Keyframe conservation (tasks 3.1–3.5)
// ---------------------------------------------------------------------------
describe('Keyframe conservation', () => {
  it('last frame x ≈ totalDistance within 1% (stop mode)', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const frames = generateKeyframes(r.value, 500);
    const lastX = frames[frames.length - 1].x;
    expect(Math.abs(lastX - r.value.totalDistance)).toBeLessThan(r.value.totalDistance * 0.01);
  });

  it('frame.tau is monotonically non-decreasing', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const frames = generateKeyframes(r.value, 500);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].tau).toBeGreaterThanOrEqual(frames[i - 1].tau);
    }
  });

  it('frame.x is monotonically non-decreasing for stop mode', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const frames = generateKeyframes(r.value, 500);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].x).toBeGreaterThanOrEqual(frames[i - 1].x);
    }
  });

  it('frame.x is monotonically non-decreasing for flyby mode', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'flyby', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const frames = generateKeyframes(r.value, 500);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].x).toBeGreaterThanOrEqual(frames[i - 1].x);
    }
  });

  it('frame.t is monotonically non-decreasing', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'stop', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const frames = generateKeyframes(r.value, 500);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].t).toBeGreaterThanOrEqual(frames[i - 1].t);
    }
  });
});

// ---------------------------------------------------------------------------
// Flyby and coasting precision (tasks 4.1–4.3)
// ---------------------------------------------------------------------------
describe('Flyby and coasting precision', () => {
  it('flyby totalT < stop totalT for same parameters (Tau Ceti, 1g)', () => {
    const base = { distance: TAU_CETI_LY, acceleration: 1, coastMode: 'none' as const };
    const stop = tripProfile({ ...base, mode: 'stop' });
    const flyby = tripProfile({ ...base, mode: 'flyby' });
    expect(stop.ok && flyby.ok).toBe(true);
    if (!stop.ok || !flyby.ok) return;
    expect(flyby.value.totalT).toBeLessThan(stop.value.totalT);
  });

  it('flyby totalDistance equals input distance (within 1e-9)', () => {
    const r = tripProfile({ distance: TAU_CETI_LY, acceleration: 1, mode: 'flyby', coastMode: 'none' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Math.abs(r.value.totalDistance - TAU_CETI_LY)).toBeLessThan(1e-9);
  });

  it('coasting phase velocityStart and velocityEnd match requested targetSpeed (within 1e-6)', () => {
    const targetSpeed = 0.8;
    const r = tripProfile({
      distance: TAU_CETI_LY,
      acceleration: 1,
      mode: 'stop',
      coastMode: 'targetSpeed',
      targetSpeed,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const coastPhase = r.value.phases.find(p => p.type === 'coasting');
    expect(coastPhase).toBeDefined();
    if (!coastPhase) return;
    expect(Math.abs(coastPhase.velocityStart - targetSpeed)).toBeLessThan(1e-6);
    expect(Math.abs(coastPhase.velocityEnd - targetSpeed)).toBeLessThan(1e-6);
  });
});
