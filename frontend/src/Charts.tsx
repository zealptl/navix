import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { useSimStore } from './store';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function NoTripMessage() {
  return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-[11px]">
      Select a destination to see chart
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12.1 VelocityChart — β vs τ with playhead line
// ---------------------------------------------------------------------------

export function VelocityChart() {
  const keyframes = useSimStore((s) => s.keyframes);
  const playhead = useSimStore((s) => s.playhead);
  const results = useSimStore((s) => s.results);

  if (!results || keyframes.length === 0) {
    return (
      <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3 h-40 md:h-48">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
          Velocity Profile (β = v/c)
        </div>
        <NoTripMessage />
      </div>
    );
  }

  // Downsample to 200 points for performance
  const step = Math.max(1, Math.floor(keyframes.length / 200));
  const data = keyframes
    .filter((_, i) => i % step === 0 || i === keyframes.length - 1)
    .map((kf) => ({ tau: kf.tau, beta: kf.v }));

  return (
    <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
        Velocity Profile (β = v/c)
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="tau"
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fill: '#475569', fontSize: 9 }}
            label={{ value: 'τ (yr)', position: 'insideRight', offset: -4, fill: '#475569', fontSize: 9 }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fill: '#475569', fontSize: 9 }}
            label={{ value: 'β', angle: -90, position: 'insideLeft', offset: 8, fill: '#475569', fontSize: 9 }}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #1e293b', fontSize: 11 }}
            labelFormatter={(v: any) => `τ = ${Number(v).toFixed(2)} yr`}
            formatter={(v: any) => [`${Number(v).toFixed(4)}c`, 'β']}
          />
          <ReferenceLine
            x={playhead.tau}
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            label={{ value: '▶', fill: '#10b981', fontSize: 10, position: 'insideTop' }}
          />
          <Line
            type="monotone"
            dataKey="beta"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12.2 TimeDivergenceChart — τ and t on same axes, shaded area
// ---------------------------------------------------------------------------

export function TimeDivergenceChart() {
  const keyframes = useSimStore((s) => s.keyframes);
  const playhead = useSimStore((s) => s.playhead);
  const results = useSimStore((s) => s.results);

  if (!results || keyframes.length === 0) {
    return (
      <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3 h-40 md:h-48">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
          Time Divergence (τ vs t)
        </div>
        <NoTripMessage />
      </div>
    );
  }

  const step = Math.max(1, Math.floor(keyframes.length / 200));
  const data = keyframes
    .filter((_, i) => i % step === 0 || i === keyframes.length - 1)
    .map((kf) => ({
      tau: kf.tau,
      earthTime: kf.t,
      shipTime: kf.tau, // reference line (y = x)
    }));

  return (
    <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
        Time Divergence (τ vs t)
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="timeDivGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="tau"
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fill: '#475569', fontSize: 9 }}
            label={{ value: 'τ (yr)', position: 'insideRight', offset: -4, fill: '#475569', fontSize: 9 }}
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fill: '#475569', fontSize: 9 }}
            label={{ value: 'yr', angle: -90, position: 'insideLeft', offset: 8, fill: '#475569', fontSize: 9 }}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #1e293b', fontSize: 11 }}
            labelFormatter={(v: any) => `τ = ${Number(v).toFixed(2)} yr`}
            formatter={(v: any, name: any) => [
              `${Number(v).toFixed(2)} yr`,
              name === 'earthTime' ? 'Earth t' : 'Ship τ',
            ]}
          />
          <Legend
            formatter={(value) => (value === 'earthTime' ? 'Earth t' : 'Ship τ')}
            wrapperStyle={{ fontSize: 9, paddingTop: 2 }}
          />
          <ReferenceLine
            x={playhead.tau}
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
          {/* Shaded area between ship and earth time */}
          <Area
            type="monotone"
            dataKey="earthTime"
            stroke="#3b82f6"
            strokeWidth={1.5}
            fill="url(#timeDivGrad)"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="shipTime"
            stroke="#10b981"
            strokeWidth={1}
            fill="none"
            strokeDasharray="4 2"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12.3 PhaseBar — horizontal segmented bar
// ---------------------------------------------------------------------------

const PHASE_COLORS: Record<string, string> = {
  accelerating: '#10b981', // green
  coasting: '#3b82f6',     // blue
  decelerating: '#f97316', // orange-red
};

const PHASE_LABELS: Record<string, string> = {
  accelerating: 'Accel',
  coasting: 'Coast',
  decelerating: 'Decel',
};

export function PhaseBar() {
  const results = useSimStore((s) => s.results);

  if (!results) {
    return (
      <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
          Phase Breakdown
        </div>
        <div className="h-6 rounded bg-[var(--space-border)] flex items-center justify-center">
          <span className="text-[10px] text-[var(--text-muted)]">No trip computed</span>
        </div>
      </div>
    );
  }

  const totalTau = results.totalTau;

  return (
    <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
        Phase Breakdown
      </div>
      <div className="flex h-7 rounded overflow-hidden border border-[var(--space-border)]">
        {results.phases.map((phase, i) => {
          const pct = (phase.tauDuration / totalTau) * 100;
          const color = PHASE_COLORS[phase.type] ?? '#6b7280';
          return (
            <div
              key={i}
              className="relative flex items-center justify-center overflow-hidden"
              style={{ width: `${pct}%`, background: color + '33', borderRight: i < results.phases.length - 1 ? `1px solid ${color}44` : 'none' }}
              title={`${PHASE_LABELS[phase.type]}: τ=${phase.tauDuration.toFixed(2)} yr, ${phase.distance.toFixed(2)} ly`}
            >
              <div
                className="absolute inset-y-0 left-0 w-0.5"
                style={{ background: color }}
              />
              {pct > 12 && (
                <span className="text-[9px] font-medium px-1 truncate" style={{ color }}>
                  {PHASE_LABELS[phase.type]}
                  <br />
                  <span className="opacity-70">{phase.tauDuration.toFixed(1)}yr · {phase.distance.toFixed(1)}ly</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-1.5 flex-wrap">
        {results.phases.map((phase, i) => (
          <span key={i} className="text-[9px] flex items-center gap-1" style={{ color: PHASE_COLORS[phase.type] }}>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: PHASE_COLORS[phase.type] }} />
            {PHASE_LABELS[phase.type]}: {phase.tauDuration.toFixed(2)} yr · {phase.distance.toFixed(2)} ly
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12.4 Summary stat cards
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
}

function StatCard({ label, value, color = 'var(--text-primary)' }: StatCardProps) {
  return (
    <div className="flex-1 min-w-[90px] rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-3">
      <div className="text-[9px] uppercase tracking-widest text-[var(--text-secondary)] mb-1">{label}</div>
      <div className="text-sm font-bold tabular-nums leading-tight" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function SummaryStats() {
  const results = useSimStore((s) => s.results);

  const shipTime = results ? `${results.totalTau.toFixed(2)} yr` : '—';
  const earthTime = results ? `${results.totalT.toFixed(2)} yr` : '—';
  const maxVelocity = results ? `${(results.maxVelocity * 100).toFixed(2)}% c` : '—';
  const maxGamma = results ? results.maxGamma.toFixed(3) : '—';

  return (
    <div className="flex gap-2 flex-wrap">
      <StatCard label="Ship Time" value={shipTime} color="var(--orbit-green)" />
      <StatCard label="Earth Time" value={earthTime} color="var(--nebula-blue)" />
      <StatCard label="Max Velocity" value={maxVelocity} color="var(--star-gold)" />
      <StatCard label="Lorentz γ" value={maxGamma} color="var(--nebula-purple)" />
    </div>
  );
}
