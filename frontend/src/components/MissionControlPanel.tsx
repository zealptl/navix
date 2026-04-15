import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimStore, type Star } from '../store';

// ---------------------------------------------------------------------------
// StarSelectInput — combined display + search input for origin/destination
// ---------------------------------------------------------------------------

interface StarSelectInputProps {
  label: string;
  star: Star | null;
  color: 'green' | 'orange';
  onSelect: (star: Star) => void;
}

function StarSelectInput({ label, star, color, onSelect }: StarSelectInputProps) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Star[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ringColor = color === 'green' ? 'border-green-400' : 'border-orange-400';
  const dotColor = color === 'green' ? 'bg-green-400' : 'bg-orange-400';
  const accentClass = color === 'green' ? 'focus:border-green-500' : 'focus:border-orange-500';

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/stars/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: Star[]) => {
        setResults(data.slice(0, 10));
        setOpen(data.length > 0);
      })
      .catch(() => {
        setResults([]);
        setOpen(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (s: Star) => {
    onSelect(s);
    setQuery('');
    setResults([]);
    setOpen(false);
    setEditing(false);
  };

  const startEditing = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (star) {
          setEditing(false);
          setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [star]);

  const showInput = editing || !star;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <div ref={containerRef} className="relative">
        {showInput ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={`Search ${label.toLowerCase()}…`}
            className={`w-full bg-slate-900/50 border ${ringColor} rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none ${accentClass} transition-colors min-h-[44px]`}
          />
        ) : (
          <button
            onClick={startEditing}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded border ${ringColor} bg-slate-900/50 min-h-[44px] text-left hover:bg-slate-800/70 transition-colors`}
          >
            <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-slate-100 truncate">
                {star!.proper_name ?? star!.bayer_name ?? `HIP ${star!.id}`}
              </span>
              <span className="text-xs text-slate-400">{star!.distance_ly.toFixed(2)} ly</span>
            </div>
            <span className="text-xs text-slate-600 shrink-0">✎</span>
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-600 rounded shadow-xl max-h-60 overflow-y-auto">
            {results.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex justify-between items-center"
              >
                <span className="text-slate-100">{s.proper_name ?? s.bayer_name ?? `HIP ${s.id}`}</span>
                <span className="text-slate-400 text-xs ml-2 shrink-0">{s.distance_ly.toFixed(2)} ly</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FamousStarRow — scrollable row of quick-select buttons (10.2)
// ---------------------------------------------------------------------------

interface FamousStarRowProps {
  onSelect: (star: Star) => void;
  selectedOrigin: Star | null;
  selectedDestination: Star | null;
}

function FamousStarRow({ onSelect, selectedOrigin, selectedDestination }: FamousStarRowProps) {
  const [stars, setStars] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/stars/famous`)
      .then((r) => r.json())
      .then((data: Star[]) => {
        setStars(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded bg-slate-700/50 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-600">
      {stars.map((star) => {
        const isOrigin = selectedOrigin?.id === star.id;
        const isDest = selectedDestination?.id === star.id;
        const highlight = isOrigin
          ? 'border-green-500 text-green-400 bg-green-950/30'
          : isDest
          ? 'border-orange-500 text-orange-400 bg-orange-950/30'
          : 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-slate-100';
        return (
          <button
            key={star.id}
            onClick={() => onSelect(star)}
            className={`shrink-0 px-3 py-1 text-xs rounded border transition-colors ${highlight}`}
          >
            {star.proper_name ?? star.bayer_name ?? `HIP ${star.id}`}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccelerationInput — 0.001–100g with presets (10.4)
// ---------------------------------------------------------------------------

const ACCEL_PRESETS = [0.1, 0.5, 1, 2] as const;

interface AccelerationInputProps {
  value: number;
  onChange: (v: number) => void;
}

function AccelerationInput({ value, onChange }: AccelerationInputProps) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  // Keep raw in sync when value changes externally (preset click)
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = (str: string) => {
    const n = parseFloat(str);
    if (!Number.isFinite(n) || n < 0.001 || n > 100) {
      setError('Must be between 0.001g and 100g');
      return;
    }
    setError(null);
    onChange(n);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-slate-500 uppercase tracking-wider">Acceleration</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          min="0.001"
          max="100"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => commit(raw)}
          onKeyDown={(e) => e.key === 'Enter' && commit(raw)}
          className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors"
        />
        <span className="text-sm text-slate-400">g</span>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
      <div className="flex gap-1">
        {ACCEL_PRESETS.map((g) => (
          <button
            key={g}
            onClick={() => {
              setRaw(String(g));
              setError(null);
              onChange(g);
            }}
            className={`flex-1 px-2 py-2 min-h-[44px] text-xs rounded border transition-colors ${
              value === g
                ? 'border-blue-500 text-blue-400 bg-blue-950/30'
                : 'border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            {g}g
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CoastControls — mode toggle + conditional inputs (10.5, 10.6, 10.7)
// ---------------------------------------------------------------------------

interface CoastControlsProps {
  coastMode: 'none' | 'fraction' | 'targetSpeed';
  coastFraction: number;
  targetSpeed: number;
  validationMessage: string | undefined;
  onChange: (patch: { coastMode?: 'none' | 'fraction' | 'targetSpeed'; coastFraction?: number; targetSpeed?: number }) => void;
}

function CoastControls({ coastMode, coastFraction, targetSpeed, validationMessage, onChange }: CoastControlsProps) {
  const [speedRaw, setSpeedRaw] = useState(String(targetSpeed));

  useEffect(() => {
    setSpeedRaw(String(targetSpeed));
  }, [targetSpeed]);

  const commitSpeed = (str: string) => {
    const n = parseFloat(str);
    if (Number.isFinite(n) && n > 0 && n < 1) {
      onChange({ targetSpeed: n });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-slate-500 uppercase tracking-wider">Coasting Mode</label>
      {/* Mode toggle buttons */}
      <div className="flex rounded overflow-hidden border border-slate-600 w-full sm:w-fit">
        {(['none', 'fraction', 'targetSpeed'] as const).map((m) => {
          const label = m === 'none' ? 'None' : m === 'fraction' ? 'Percentage' : 'Target Speed';
          const active = coastMode === m;
          return (
            <button
              key={m}
              onClick={() => onChange({ coastMode: m })}
              className={`flex-1 sm:flex-none px-3 py-2.5 text-xs transition-colors min-h-[44px] ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Percentage slider (10.6) */}
      {coastMode === 'fraction' && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Coast fraction</span>
            <span>{Math.round(coastFraction * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={99}
            step={1}
            value={Math.round(coastFraction * 100)}
            onChange={(e) => onChange({ coastFraction: Number(e.target.value) / 100 })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0%</span>
            <span>99%</span>
          </div>
        </div>
      )}

      {/* Target speed input (10.7) */}
      {coastMode === 'targetSpeed' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.9999"
              value={speedRaw}
              onChange={(e) => setSpeedRaw(e.target.value)}
              onBlur={() => commitSpeed(speedRaw)}
              onKeyDown={(e) => e.key === 'Enter' && commitSpeed(speedRaw)}
              className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500 transition-colors"
            />
            <span className="text-sm text-slate-400">c</span>
          </div>
          {validationMessage && (
            <p className="text-xs text-yellow-400 mt-1">{validationMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StopFlybyToggle (10.8)
// ---------------------------------------------------------------------------

interface StopFlybyToggleProps {
  mode: 'stop' | 'flyby';
  onChange: (mode: 'stop' | 'flyby') => void;
}

function StopFlybyToggle({ mode, onChange }: StopFlybyToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-slate-500 uppercase tracking-wider">Mission Mode</label>
      <div className="flex rounded overflow-hidden border border-slate-600 w-full sm:w-fit">
        {(['stop', 'flyby'] as const).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => onChange(m)}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs capitalize transition-colors min-h-[44px] ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MissionControlPanel — main export (10.1)
// ---------------------------------------------------------------------------

export function MissionControlPanel() {
  const origin = useSimStore((s) => s.origin);
  const destination = useSimStore((s) => s.destination);
  const params = useSimStore((s) => s.params);
  const results = useSimStore((s) => s.results);
  const setOrigin = useSimStore((s) => s.setOrigin);
  const setDestination = useSimStore((s) => s.setDestination);
  const swapOriginDestination = useSimStore((s) => s.swapOriginDestination);
  const setParams = useSimStore((s) => s.setParams);

  // Famous star quick-select: set as origin first, then destination
  const handleFamousSelect = (star: Star) => {
    if (!origin) {
      setOrigin(star);
    } else {
      setDestination(star);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 bg-slate-900 border border-slate-700 rounded-lg w-full xl:h-full">
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Mission Control</h2>

      {/* Origin / Destination inputs + swap */}
      <div className="flex flex-col gap-2">
        <StarSelectInput label="Origin" star={origin} color="green" onSelect={setOrigin} />
        <div className="flex justify-center">
          <button
            onClick={swapOriginDestination}
            title="Swap origin and destination"
            className="p-1.5 rounded border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-colors text-xs"
          >
            ⇅
          </button>
        </div>
        <StarSelectInput label="Destination" star={destination} color="orange" onSelect={setDestination} />
      </div>

      {/* Famous star quick-select */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-500 uppercase tracking-wider">Quick Select</label>
        <FamousStarRow
          onSelect={handleFamousSelect}
          selectedOrigin={origin}
          selectedDestination={destination}
        />
      </div>

      {/* Acceleration */}
      <AccelerationInput
        value={params.acceleration}
        onChange={(v) => setParams({ acceleration: v })}
      />

      {/* Coasting mode */}
      <CoastControls
        coastMode={params.coastMode}
        coastFraction={params.coastFraction ?? 0}
        targetSpeed={params.targetSpeed ?? 0.5}
        validationMessage={results?.validationMessage}
        onChange={(patch) => {
          const p: Parameters<typeof setParams>[0] = {};
          if (patch.coastMode !== undefined) p.coastMode = patch.coastMode;
          if (patch.coastFraction !== undefined) p.coastFraction = patch.coastFraction;
          if (patch.targetSpeed !== undefined) p.targetSpeed = patch.targetSpeed;
          setParams(p);
        }}
      />

      {/* Stop / Flyby */}
      <StopFlybyToggle
        mode={params.mode}
        onChange={(mode) => setParams({ mode })}
      />
    </div>
  );
}
