import { create } from 'zustand';
import {
  tripProfile,
  generateKeyframes,
  type TripParams,
  type TripProfile,
  type Keyframe,
  type CoastMode,
  type TripMode,
} from './physics';

// ---------------------------------------------------------------------------
// Star type (minimal, full type lives with the star map feature)
// ---------------------------------------------------------------------------

export interface Star {
  id: number;
  proper_name: string | null;
  bayer_name: string | null;
  distance_ly: number;
  x: number;
  y: number;
  z: number;
  spectral_type: string | null;
  magnitude: number | null;
  is_famous: boolean;
  famous_rank: number | null;
  blurb: string | null;
}

// ---------------------------------------------------------------------------
// Playhead — pointer into the keyframes array
// ---------------------------------------------------------------------------

export interface Playhead {
  tau: number;   // current ship proper time (yr)
  index: number; // index into keyframes array
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface SimState {
  // Selection
  origin: Star | null;
  destination: Star | null;

  // Trip parameters (all user-controlled)
  params: TripParams;

  // Computed results (null when no valid destination distance)
  results: TripProfile | null;
  keyframes: Keyframe[];

  // Playback
  playhead: Playhead;
  isPlaying: boolean;

  // Actions — selection
  setOrigin: (star: Star | null) => void;
  setDestination: (star: Star | null) => void;
  swapOriginDestination: () => void;

  // Actions — params (partial update; recomputes profile automatically)
  setParams: (patch: Partial<TripParams>) => void;

  // Actions — playback
  seek: (tau: number) => void;
  play: () => void;
  pause: () => void;
  advanceTick: (deltaMs: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS: TripParams = {
  distance: 0,
  acceleration: 1,   // 1g
  mode: 'stop' as TripMode,
  coastMode: 'none' as CoastMode,
  coastFraction: 0,
  targetSpeed: 0.5,
};

/** Find the keyframe index closest to a given tau value. */
function tauToIndex(keyframes: Keyframe[], tau: number): number {
  if (keyframes.length === 0) return 0;
  let lo = 0;
  let hi = keyframes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keyframes[mid].tau < tau) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Compute trip results from current params + the distance between origin and destination. */
function recompute(
  params: TripParams,
  origin: Star | null,
  destination: Star | null,
): { results: TripProfile | null; keyframes: Keyframe[] } {
  // Compute distance from star positions. HYG catalog x/y/z are in parsecs,
  // so convert the Euclidean separation to light-years (1 pc = 3.26156 ly).
  const PC_TO_LY = 3.26156;
  const distance =
    origin && destination
      ? Math.sqrt(
          (destination.x - origin.x) ** 2 +
          (destination.y - origin.y) ** 2 +
          (destination.z - origin.z) ** 2,
        ) * PC_TO_LY
      : params.distance;

  if (distance <= 0) return { results: null, keyframes: [] };

  const outcome = tripProfile({ ...params, distance });
  if (!outcome.ok) return { results: null, keyframes: [] };

  const kf = generateKeyframes(outcome.value, 500);
  return { results: outcome.value, keyframes: kf };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSimStore = create<SimState>((set, get) => ({
  origin: null,
  destination: null,
  params: DEFAULT_PARAMS,
  results: null,
  keyframes: [],
  playhead: { tau: 0, index: 0 },
  isPlaying: false,

  // --- Selection ---

  setOrigin(star) {
    const { destination, params } = get();
    const { results, keyframes } = recompute(params, star, destination);
    set({ origin: star, results, keyframes, playhead: { tau: 0, index: 0 }, isPlaying: false });
  },

  setDestination(star) {
    const { origin, params } = get();
    const { results, keyframes } = recompute(params, origin, star);
    set({ destination: star, results, keyframes, playhead: { tau: 0, index: 0 }, isPlaying: false });
  },

  swapOriginDestination() {
    const { origin, destination, params } = get();
    const { results, keyframes } = recompute(params, destination, origin);
    set({
      origin: destination,
      destination: origin,
      results,
      keyframes,
      playhead: { tau: 0, index: 0 },
      isPlaying: false,
    });
  },

  // --- Params ---

  setParams(patch) {
    const { origin, destination, params } = get();
    const newParams = { ...params, ...patch };
    const { results, keyframes } = recompute(newParams, origin, destination);
    set({ params: newParams, results, keyframes, playhead: { tau: 0, index: 0 }, isPlaying: false });
  },

  // --- Playback ---

  seek(tau) {
    const { keyframes, results } = get();
    if (!results) return;
    const clamped = Math.max(0, Math.min(tau, results.totalTau));
    const index = tauToIndex(keyframes, clamped);
    set({ playhead: { tau: clamped, index } });
  },

  play() {
    const { results, playhead } = get();
    if (!results) return;
    // If already at the end, reset to start first
    if (playhead.tau >= results.totalTau) {
      set({ playhead: { tau: 0, index: 0 }, isPlaying: true });
    } else {
      set({ isPlaying: true });
    }
  },

  pause() {
    set({ isPlaying: false });
  },

  advanceTick(deltaMs) {
    const { results, keyframes, playhead, isPlaying } = get();
    if (!isPlaying || !results) return;

    // Default rate: 1 real second = 1 ship month (1/12 year per second)
    const SHIP_YEARS_PER_REAL_SECOND = 1 / 12;
    const deltaTau = (deltaMs / 1000) * SHIP_YEARS_PER_REAL_SECOND;

    const newTau = playhead.tau + deltaTau;

    if (newTau >= results.totalTau) {
      // Auto-pause at journey end
      const index = keyframes.length - 1;
      set({ playhead: { tau: results.totalTau, index }, isPlaying: false });
    } else {
      const index = tauToIndex(keyframes, newTau);
      set({ playhead: { tau: newTau, index } });
    }
  },
}));
