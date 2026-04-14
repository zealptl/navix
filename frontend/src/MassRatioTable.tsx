import { useSimStore } from './store';
import { massRatio, tripRapidity } from './physics';

// ---------------------------------------------------------------------------
// 13.2 Propulsion types table
// ---------------------------------------------------------------------------

interface PropulsionType {
  name: string;
  exhaustVelocity: number; // as fraction of c
  vLabel: string;
}

const PROPULSION_TYPES: PropulsionType[] = [
  { name: 'Chemical',       exhaustVelocity: 0.000013, vLabel: '0.0013% c' },
  { name: 'Ion Thruster',   exhaustVelocity: 0.00021,  vLabel: '0.021% c'  },
  { name: 'Nuclear Pulse',  exhaustVelocity: 0.033,    vLabel: '3.3% c'    },
  { name: 'Fusion',         exhaustVelocity: 0.1,      vLabel: '10% c'     },
  { name: 'Antimatter',     exhaustVelocity: 0.5,      vLabel: '50% c'     },
  { name: 'Photon Rocket',  exhaustVelocity: 1.0,      vLabel: '100% c'    },
];

// ---------------------------------------------------------------------------
// 13.4 Format mass ratio
// ---------------------------------------------------------------------------

function formatMassRatio(ratio: number): string {
  if (!isFinite(ratio) || ratio > 1e15) return '> 10¹⁵';
  if (ratio > 10000) {
    const exp = Math.floor(Math.log10(ratio));
    const mantissa = ratio / Math.pow(10, exp);
    return `${mantissa.toFixed(2)} × 10${toSuperscript(exp)}`;
  }
  return ratio.toFixed(0) + ':1';
}

function toSuperscript(n: number): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻',
  };
  return String(n).split('').map((c) => superscripts[c] ?? c).join('');
}

function feasibilityLabel(ratio: number): { label: string; color: string } {
  if (!isFinite(ratio) || ratio > 1e15) return { label: 'Physically impossible', color: '#ef4444' };
  if (ratio > 1e6)  return { label: 'Speculative',          color: '#f97316' };
  if (ratio > 1000) return { label: 'Near-future',          color: '#f59e0b' };
  if (ratio > 100)  return { label: 'Advanced',             color: '#eab308' };
  return { label: 'Feasible', color: '#10b981' };
}

// ---------------------------------------------------------------------------
// 13.3 MassRatioTable component
// ---------------------------------------------------------------------------

export function MassRatioTable() {
  const results = useSimStore((s) => s.results);

  if (!results) {
    return (
      <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-4">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-2">
          Propulsion Mass Ratios
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">Select a destination to compute mass ratios.</p>
      </div>
    );
  }

  const rapidity = tripRapidity(results);

  const rows = PROPULSION_TYPES.map((p) => {
    const ratio = massRatio(rapidity, p.exhaustVelocity);
    const formatted = formatMassRatio(ratio);
    const feasibility = feasibilityLabel(ratio);
    return { ...p, ratio, formatted, feasibility };
  });

  // 13.5 Astrophage callout
  const photonRow = rows.find((r) => r.name === 'Photon Rocket');
  const showAstrophage = photonRow !== undefined && photonRow.ratio > 10;

  return (
    <div className="rounded border border-[var(--space-border)] bg-[var(--space-panel)] p-4 flex flex-col gap-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
        Propulsion Mass Ratios
      </div>

      <div className="text-[10px] text-[var(--text-muted)]">
        Rocket mass needed per unit of dry mass (initial/final). Lower = better.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--space-border)]">
              <th className="text-left py-1.5 pr-3 text-[var(--text-secondary)] font-medium">Engine</th>
              <th className="text-right py-1.5 pr-3 text-[var(--text-secondary)] font-medium">v_e</th>
              <th className="text-right py-1.5 pr-3 text-[var(--text-secondary)] font-medium">Mass Ratio</th>
              <th className="text-right py-1.5 text-[var(--text-secondary)] font-medium">Feasibility</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-[var(--space-border)] border-opacity-50">
                <td className="py-1.5 pr-3 text-[var(--text-primary)] font-medium">{row.name}</td>
                <td className="py-1.5 pr-3 text-right text-[var(--text-muted)] tabular-nums">{row.vLabel}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: row.feasibility.color }}>
                  {row.formatted}
                </td>
                <td className="py-1.5 text-right">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium"
                    style={{ color: row.feasibility.color, background: row.feasibility.color + '22' }}
                  >
                    {row.feasibility.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 13.5 Astrophage callout */}
      {showAstrophage && photonRow && (
        <div className="rounded border border-[#8b5cf644] bg-[#8b5cf611] p-3 text-[11px] text-[var(--nebula-purple)]">
          <span className="font-bold">Why Andy Weir invented Astrophage:</span>{' '}
          Even the theoretical best engine (photon rocket) requires{' '}
          <span className="font-bold">{photonRow.formatted}</span> its own mass in fuel.
          That's why the Hail Mary needed an exotic propellant that generates thrust from nothing.
        </div>
      )}
    </div>
  );
}
