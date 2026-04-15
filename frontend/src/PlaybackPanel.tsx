import { useEffect, useRef } from 'react';
import { useSimStore } from './store';

// ---------------------------------------------------------------------------
// DualClock — Ship Clock (τ) and Earth Clock (t)
// ---------------------------------------------------------------------------

function formatYears(yr: number): string {
  return yr.toFixed(2) + ' yr';
}

export function DualClock() {
  const keyframes = useSimStore((s) => s.keyframes);
  const playhead = useSimStore((s) => s.playhead);
  const results = useSimStore((s) => s.results);

  const shipTime = playhead.tau;
  const earthTime = keyframes[playhead.index]?.t ?? 0;
  const totalTau = results?.totalTau ?? 0;
  const totalT = results?.totalT ?? 0;

  const shipPct = totalTau > 0 ? shipTime / totalTau : 0;
  const earthPct = totalT > 0 ? earthTime / totalT : 0;

  return (
    <div className="flex gap-3">
      {/* Ship Clock */}
      <div className="flex-1 rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
        <div className="text-[10px] uppercase tracking-widest text-[var(--orbit-green)] mb-1">
          Ship Clock (τ)
        </div>
        <div className="text-lg font-bold text-[var(--orbit-green)] tabular-nums leading-none">
          {formatYears(shipTime)}
        </div>
        <div className="mt-1.5 h-0.5 rounded-full bg-[var(--space-border)]">
          <div
            className="h-full rounded-full bg-[var(--orbit-green)] transition-all duration-100"
            style={{ width: `${Math.min(shipPct * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Earth Clock */}
      <div className="flex-1 rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
        <div className="text-[10px] uppercase tracking-widest text-[var(--nebula-blue)] mb-1">
          Earth Clock (t)
        </div>
        <div className="text-lg font-bold text-[var(--nebula-blue)] tabular-nums leading-none">
          {formatYears(earthTime)}
        </div>
        <div className="mt-1.5 h-0.5 rounded-full bg-[var(--space-border)]">
          <div
            className="h-full rounded-full bg-[var(--nebula-blue)] transition-all duration-100"
            style={{ width: `${Math.min(earthPct * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlaybackPanel — scrubber, play/pause, reset
// ---------------------------------------------------------------------------


export function PlaybackPanel() {
  const results = useSimStore((s) => s.results);
  const playhead = useSimStore((s) => s.playhead);
  const isPlaying = useSimStore((s) => s.isPlaying);
  const seek = useSimStore((s) => s.seek);
  const play = useSimStore((s) => s.play);
  const pause = useSimStore((s) => s.pause);
  const advanceTick = useSimStore((s) => s.advanceTick);

  // Play ticker — useInterval equivalent using useEffect + setInterval
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTickRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      advanceTick(delta);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
    };
  }, [isPlaying, advanceTick]);

  const totalTau = results?.totalTau ?? 0;
  const hasTrip = results !== null && totalTau > 0;

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleReset = () => {
    pause();
    seek(0);
  };

  return (
    <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-4 flex flex-col gap-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
        Journey Playback
      </div>

      {/* DualClock */}
      <DualClock />

      {/* Scrubber */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>τ = 0.00 yr</span>
          <span className="text-[var(--orbit-green)] font-bold">
            τ = {playhead.tau.toFixed(2)} yr
          </span>
          <span>τ = {totalTau.toFixed(2)} yr</span>
        </div>
        <input
          type="range"
          min={0}
          max={totalTau || 1}
          step={totalTau > 0 ? totalTau / 1000 : 0.001}
          value={playhead.tau}
          onChange={handleScrub}
          disabled={!hasTrip}
          className="w-full accent-[var(--orbit-green)] disabled:opacity-30 cursor-pointer"
        />
        <div className="text-center text-[10px] text-[var(--text-secondary)]">
          {playhead.tau.toFixed(2)} years ship time
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handlePlayPause}
          disabled={!hasTrip}
          className="flex-1 py-2 min-h-[44px] rounded border text-sm font-medium transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed
            border-[var(--orbit-green)] text-[var(--orbit-green)]
            hover:bg-[var(--orbit-green)] hover:text-black"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={handleReset}
          disabled={!hasTrip}
          className="px-4 py-2 min-h-[44px] rounded border text-sm font-medium transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed
            border-[var(--space-border)] text-[var(--text-secondary)]
            hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ↺ Reset
        </button>
      </div>

      {!hasTrip && (
        <p className="text-center text-[11px] text-[var(--text-muted)]">
          Select origin and destination to enable playback
        </p>
      )}
    </div>
  );
}
