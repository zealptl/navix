/**
 * Relativistic physics engine — Rindler constant-acceleration equations.
 *
 * Units: distance in light-years (ly), time in years (yr), c = 1 ly/yr.
 * Acceleration inputs are in units of ly/yr²; 1 standard gravity ≈ 1.03 ly/yr².
 */

export const G_LY_PER_YR2 = 1.03156; // 1 standard gravity in ly/yr²

// ---------------------------------------------------------------------------
// Rindler primitives (all assume c = 1)
// ---------------------------------------------------------------------------

/** Coordinate velocity v/c at proper time τ under constant acceleration a. */
export function rindlerVelocity(a: number, tau: number): number {
  return Math.tanh(a * tau);
}

/** Lorentz factor γ at proper time τ. */
export function rindlerGamma(a: number, tau: number): number {
  return Math.cosh(a * tau);
}

/** Coordinate distance (ly) travelled at proper time τ. */
export function rindlerDistance(a: number, tau: number): number {
  return (Math.cosh(a * tau) - 1) / a;
}

/** Coordinate (Earth) time elapsed at proper time τ. */
export function rindlerCoordTime(a: number, tau: number): number {
  return Math.sinh(a * tau) / a;
}

/** Proper time τ to reach coordinate distance x under acceleration a. */
export function rindlerTauFromDist(a: number, x: number): number {
  return Math.acosh(a * x + 1) / a;
}

/** Coordinate time elapsed to reach coordinate distance x under acceleration a. */
export function rindlerCoordTimeFromDist(a: number, x: number): number {
  const gamma = a * x + 1;
  return Math.sqrt(gamma * gamma - 1) / a;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export type PhysicsErrorCode =
  | 'INVALID_ACCELERATION'
  | 'INVALID_DISTANCE'
  | 'INVALID_COAST_FRACTION'
  | 'INVALID_TARGET_SPEED';

export interface PhysicsError {
  code: PhysicsErrorCode;
  message: string;
}

export interface PhysicsResult<T> {
  ok: true;
  value: T;
}

export interface PhysicsFailure {
  ok: false;
  error: PhysicsError;
}

export type PhysicsOutcome<T> = PhysicsResult<T> | PhysicsFailure;

function fail(code: PhysicsErrorCode, message: string): PhysicsFailure {
  return { ok: false, error: { code, message } };
}

// ---------------------------------------------------------------------------
// Trip profile types
// ---------------------------------------------------------------------------

export type PhaseType = 'accelerating' | 'coasting' | 'decelerating';

export interface TripPhase {
  type: PhaseType;
  tauDuration: number;  // ship time for this phase
  tDuration: number;    // Earth time for this phase
  distance: number;     // coordinate distance for this phase
  velocityStart: number; // v/c at start
  velocityEnd: number;   // v/c at end
}

export interface TripProfile {
  phases: TripPhase[];
  totalTau: number;    // total ship proper time (yr)
  totalT: number;      // total Earth coordinate time (yr)
  totalDistance: number; // light-years
  maxVelocity: number;   // peak v/c
  maxGamma: number;      // peak Lorentz factor
  cappedSpeed?: number;  // set when target speed was auto-capped
  validationMessage?: string;
}

export type CoastMode = 'none' | 'fraction' | 'targetSpeed';
export type TripMode = 'stop' | 'flyby';

export interface TripParams {
  distance: number;        // light-years, > 0
  acceleration: number;    // in units of G (1 G = G_LY_PER_YR2 ly/yr²), 0.001–100
  mode: TripMode;
  coastMode: CoastMode;
  coastFraction?: number;  // 0–0.99, used when coastMode = 'fraction'
  targetSpeed?: number;    // 0–0.9999 as fraction of c, used when coastMode = 'targetSpeed'
}

// ---------------------------------------------------------------------------
// Core profile builders
// ---------------------------------------------------------------------------

function validateCommon(params: TripParams): PhysicsFailure | null {
  if (!Number.isFinite(params.acceleration) || params.acceleration < 0.001 || params.acceleration > 100) {
    return fail('INVALID_ACCELERATION', `Acceleration must be between 0.001g and 100g, got ${params.acceleration}g`);
  }
  if (!Number.isFinite(params.distance) || params.distance <= 0) {
    return fail('INVALID_DISTANCE', `Distance must be greater than 0 ly, got ${params.distance} ly`);
  }
  return null;
}

function coastingPhase(distance: number, beta: number): TripPhase {
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const tauDuration = distance * Math.sqrt(1 - beta * beta) / beta;
  const tDuration = distance / beta;
  return {
    type: 'coasting',
    tauDuration,
    tDuration,
    distance,
    velocityStart: beta,
    velocityEnd: beta,
  };
}

function accelPhase(a: number, distance: number): TripPhase {
  const tau = rindlerTauFromDist(a, distance);
  const t = rindlerCoordTimeFromDist(a, distance);
  const vEnd = rindlerVelocity(a, tau);
  return {
    type: 'accelerating',
    tauDuration: tau,
    tDuration: t,
    distance,
    velocityStart: 0,
    velocityEnd: vEnd,
  };
}

function decelPhase(a: number, distance: number, vStart: number): TripPhase {
  const tau = rindlerTauFromDist(a, distance);
  const t = rindlerCoordTimeFromDist(a, distance);
  return {
    type: 'decelerating',
    tauDuration: tau,
    tDuration: t,
    distance,
    velocityStart: vStart,
    velocityEnd: 0,
  };
}

function assembleProfile(phases: TripPhase[]): TripProfile {
  let totalTau = 0;
  let totalT = 0;
  let totalDistance = 0;
  let maxVelocity = 0;
  for (const p of phases) {
    totalTau += p.tauDuration;
    totalT += p.tDuration;
    totalDistance += p.distance;
    maxVelocity = Math.max(maxVelocity, p.velocityEnd, p.velocityStart);
  }
  const maxGamma = 1 / Math.sqrt(1 - maxVelocity * maxVelocity);
  return { phases, totalTau, totalT, totalDistance, maxVelocity, maxGamma };
}

// ---------------------------------------------------------------------------
// tripProfile() — main entry point
// ---------------------------------------------------------------------------

export function tripProfile(params: TripParams): PhysicsOutcome<TripProfile> {
  const err = validateCommon(params);
  if (err) return err;

  const a = params.acceleration * G_LY_PER_YR2; // convert g to ly/yr²
  const D = params.distance;
  const { mode, coastMode } = params;

  if (mode === 'stop') {
    return tripProfileStop(a, D, coastMode, params.coastFraction, params.targetSpeed);
  } else {
    return tripProfileFlyby(a, D, coastMode, params.coastFraction, params.targetSpeed);
  }
}

function tripProfileStop(
  a: number,
  D: number,
  coastMode: CoastMode,
  coastFraction?: number,
  targetSpeed?: number,
): PhysicsOutcome<TripProfile> {
  if (coastMode === 'none') {
    // Symmetric: accelerate D/2, decelerate D/2
    const dHalf = D / 2;
    const acc = accelPhase(a, dHalf);
    const dec = decelPhase(a, dHalf, acc.velocityEnd);
    return { ok: true, value: assembleProfile([acc, dec]) };
  }

  if (coastMode === 'fraction') {
    const cf = coastFraction ?? 0;
    if (cf < 0 || cf >= 1) {
      return fail('INVALID_COAST_FRACTION', 'Coast fraction must be in range [0, 1) for stop mode');
    }
    const dAcc = D * (1 - cf) / 2;
    const dCoast = D * cf;
    const gammaAtCruise = a * dAcc + 1;
    const beta = Math.sqrt(1 - 1 / (gammaAtCruise * gammaAtCruise));
    const acc = accelPhase(a, dAcc);
    const coast = coastingPhase(dCoast, beta);
    const dec = decelPhase(a, dAcc, beta);
    return { ok: true, value: assembleProfile([acc, coast, dec]) };
  }

  if (coastMode === 'targetSpeed') {
    const S = targetSpeed ?? 0;
    if (S <= 0 || S >= 1) {
      return fail('INVALID_TARGET_SPEED', 'Target speed must be in range (0, 1) as a fraction of c');
    }
    const gamma = 1 / Math.sqrt(1 - S * S);
    const dAcc = (gamma - 1) / a;  // x = (cosh(aτ)-1)/a = (γ-1)/a
    let profile: TripProfile;

    if (dAcc > D / 2) {
      // Auto-cap: cannot reach target speed in this trip distance
      const cappedGamma = a * (D / 2) + 1;
      const cappedSpeed = Math.sqrt(1 - 1 / (cappedGamma * cappedGamma));
      const acc = accelPhase(a, D / 2);
      const dec = decelPhase(a, D / 2, acc.velocityEnd);
      profile = assembleProfile([acc, dec]);
      profile.cappedSpeed = cappedSpeed;
      profile.validationMessage =
        `Target speed ${(S * 100).toFixed(1)}% c is unachievable in ${D.toFixed(2)} ly at this acceleration. ` +
        `Speed auto-capped to ${(cappedSpeed * 100).toFixed(1)}% c (the maximum reachable at D/2).`;
    } else {
      const dCoast = D - 2 * dAcc;
      const acc = accelPhase(a, dAcc);
      const coast = coastingPhase(dCoast, S);
      const dec = decelPhase(a, dAcc, S);
      profile = assembleProfile([acc, coast, dec]);
    }
    return { ok: true, value: profile };
  }

  return fail('INVALID_ACCELERATION', 'Unknown coast mode');
}

function tripProfileFlyby(
  a: number,
  D: number,
  coastMode: CoastMode,
  coastFraction?: number,
  targetSpeed?: number,
): PhysicsOutcome<TripProfile> {
  if (coastMode === 'none') {
    const acc = accelPhase(a, D);
    return { ok: true, value: assembleProfile([acc]) };
  }

  if (coastMode === 'fraction') {
    const cf = coastFraction ?? 0;
    if (cf < 0 || cf >= 1) {
      return fail('INVALID_COAST_FRACTION', 'Coast fraction must be in range [0, 1)');
    }
    const dAcc = D * (1 - cf);
    const dCoast = D * cf;
    const acc = accelPhase(a, dAcc);
    const beta = acc.velocityEnd;
    const coast = coastingPhase(dCoast, beta);
    return { ok: true, value: assembleProfile([acc, coast]) };
  }

  if (coastMode === 'targetSpeed') {
    const S = targetSpeed ?? 0;
    if (S <= 0 || S >= 1) {
      return fail('INVALID_TARGET_SPEED', 'Target speed must be in range (0, 1) as a fraction of c');
    }
    const gamma = 1 / Math.sqrt(1 - S * S);
    const dAcc = (gamma - 1) / a;
    let profile: TripProfile;

    if (dAcc >= D) {
      // Can't reach target speed, just accelerate the whole way
      const cappedAcc = accelPhase(a, D);
      const cappedSpeed = cappedAcc.velocityEnd;
      profile = assembleProfile([cappedAcc]);
      profile.cappedSpeed = cappedSpeed;
      profile.validationMessage =
        `Target speed ${(S * 100).toFixed(1)}% c is unachievable in ${D.toFixed(2)} ly. ` +
        `Speed auto-capped to ${(cappedSpeed * 100).toFixed(1)}% c.`;
    } else {
      const dCoast = D - dAcc;
      const acc = accelPhase(a, dAcc);
      const coast = coastingPhase(dCoast, S);
      profile = assembleProfile([acc, coast]);
    }
    return { ok: true, value: profile };
  }

  return fail('INVALID_ACCELERATION', 'Unknown coast mode');
}

// ---------------------------------------------------------------------------
// generateKeyframes()
// ---------------------------------------------------------------------------

export interface Keyframe {
  tau: number;   // ship proper time (yr)
  t: number;     // Earth coordinate time (yr)
  x: number;     // coordinate distance from origin (ly)
  v: number;     // velocity as fraction of c
  gamma: number; // Lorentz factor
  phase: PhaseType;
}

export function generateKeyframes(profile: TripProfile, N = 500): Keyframe[] {
  const { phases, totalTau } = profile;
  if (totalTau <= 0 || phases.length === 0) return [];

  // Build phase boundary lookup by cumulative tau
  interface PhaseBoundary {
    tauStart: number;
    tauEnd: number;
    tStart: number;
    xStart: number;
    phase: TripPhase;
  }

  const boundaries: PhaseBoundary[] = [];
  let cumTau = 0;
  let cumT = 0;
  let cumX = 0;
  for (const phase of phases) {
    boundaries.push({ tauStart: cumTau, tauEnd: cumTau + phase.tauDuration, tStart: cumT, xStart: cumX, phase });
    cumTau += phase.tauDuration;
    cumT += phase.tDuration;
    cumX += phase.distance;
  }

  const a = (profile.phases[0].type === 'accelerating' || profile.phases[0].type === 'decelerating')
    ? undefined
    : undefined;
  // We'll re-derive a from the phase data using rindler inverses
  // For now extract acceleration from first accelerating phase by matching distance→tau
  // Actually we don't store 'a' in the profile — reconstruct from first phase
  // accelPhase: tauDuration = acosh(a*dist+1)/a → solve for a numerically is complex
  // Better: store a in the profile, or pass it in separately.
  // Since we don't have it here, reconstruct from first acc phase:
  // tau = acosh(a*x+1)/a and we know tau and x so a is implicit.
  // Use the simpler approach: parametrize each phase directly.

  const frames: Keyframe[] = [];

  for (let i = 0; i < N; i++) {
    const tau = (i / (N - 1)) * totalTau;

    // Find which phase this tau falls in
    let boundary = boundaries[boundaries.length - 1];
    for (const b of boundaries) {
      if (tau <= b.tauEnd + 1e-12) {
        boundary = b;
        break;
      }
    }

    const { tauStart, tStart, xStart, phase } = boundary;
    const localTau = tau - tauStart;

    let t: number;
    let x: number;
    let v: number;
    let gamma: number;

    if (phase.type === 'coasting') {
      const beta = phase.velocityStart;
      gamma = 1 / Math.sqrt(1 - beta * beta);
      const localX = beta * localTau * gamma; // x = beta * t_local; tau = t/gamma → t = tau*gamma
      const localT = localTau * gamma;
      t = tStart + localT;
      x = xStart + localX;
      v = beta;
    } else {
      // Accelerating or decelerating — reconstruct 'a' from phase data
      // phase.tauDuration = acosh(a*phase.distance+1)/a
      // Numerically solve for a, or use the relation: tau_phase = tauDuration, dist_phase = distance
      // Since tauDuration = acosh(a*d+1)/a and we have both:
      // We'll binary-search for a. But that's expensive per frame.
      // Better: derive a from phase boundary values.
      // At end of accel phase: v_end = tanh(a*tauDuration) and x_end = (cosh(a*tauDuration)-1)/a
      // From v_end we get: a*tauDuration = atanh(v_end) → a = atanh(v_end)/tauDuration
      const vEnd = phase.velocityEnd;
      const vStart = phase.velocityStart;
      let effA: number;

      if (phase.type === 'accelerating') {
        effA = Math.atanh(vEnd) / phase.tauDuration;
        const localV = Math.tanh(effA * localTau);
        const localGamma = Math.cosh(effA * localTau);
        const localX = (localGamma - 1) / effA;
        const localT = Math.sinh(effA * localTau) / effA;
        t = tStart + localT;
        x = xStart + localX;
        v = localV;
        gamma = localGamma;
      } else {
        // Decelerating: mirror of acceleration — counts down from vStart to 0
        effA = Math.atanh(vStart) / phase.tauDuration;
        const tauFromEnd = phase.tauDuration - localTau;
        const localV = Math.tanh(effA * tauFromEnd);
        const localGamma = Math.cosh(effA * tauFromEnd);
        // Distance from end of decel phase = rindlerDistance(effA, tauFromEnd)
        const distFromEnd = (localGamma - 1) / effA;
        const localX = phase.distance - distFromEnd;
        const coordTimeFromEnd = Math.sinh(effA * tauFromEnd) / effA;
        const localT = phase.tDuration - coordTimeFromEnd;
        t = tStart + localT;
        x = xStart + localX;
        v = localV;
        gamma = localGamma;
      }
    }

    frames.push({ tau, t, x, v, gamma, phase: phase.type });
  }

  return frames;
}

// ---------------------------------------------------------------------------
// Mass ratio (for section 13, defined here for cohesion)
// ---------------------------------------------------------------------------

/**
 * Tsiolkovsky rocket equation for relativistic travel.
 * deltaV_rapidity is the total rapidity (sum of all acceleration phases' atanh(v_final)).
 * exhaustVelocity is the exhaust velocity as a fraction of c.
 * Returns the mass ratio (initial / final mass).
 */
export function massRatio(deltaV_rapidity: number, exhaustVelocity: number): number {
  return Math.exp(deltaV_rapidity / exhaustVelocity);
}

/**
 * Compute total rapidity for a trip profile.
 * For stop mode: rapidity = 2 * atanh(v_max) (accel + decel)
 * For flyby mode: rapidity = atanh(v_max)
 */
export function tripRapidity(profile: TripProfile): number {
  let rapidity = 0;
  for (const phase of profile.phases) {
    if (phase.type === 'accelerating') {
      rapidity += Math.atanh(phase.velocityEnd);
    } else if (phase.type === 'decelerating') {
      rapidity += Math.atanh(phase.velocityStart);
    }
  }
  return rapidity;
}
