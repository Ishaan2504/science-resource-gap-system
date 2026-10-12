/**
 * PriorityComponents — ISRGAPIT Priority Rankings Page
 * Reusable building blocks: ScoreBar, StatusBadge, RankMedallion, PriorityRankingCard.
 *
 * All colours and typography come from the shared design-system tokens defined in
 * styles.css and GovUI.tsx — no new palette values introduced here.
 */

import {
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Lock,
  Minus,
  PieChart,
  Loader,
  XCircle,
} from 'lucide-react';
import type { Priority, RequirementStatus } from '../types';

// ─── Score weights & helpers ──────────────────────────────────────────────────

/** Configurable weights for the 5-factor composite score. Must sum to 1.0. */
export const SCORE_WEIGHTS = {
  severity:                 0.30,
  importance:               0.25,
  students_affected:        0.20,
  alternative_availability: 0.15,
  condition:                0.10,
} as const;

export interface BreakdownFactors {
  severity: number;
  importance: number;
  students_affected: number;
  alternative_availability: number;
  condition: number;
}

/**
 * Recompute the composite priority score from the 5 breakdown factors.
 * When breakdown is absent the caller should fall back to `final_score`.
 */
export function computePriorityScore(
  factors: BreakdownFactors,
  weights = SCORE_WEIGHTS,
): number {
  return Math.round(
    factors.severity                * weights.severity +
    factors.importance              * weights.importance +
    factors.students_affected       * weights.students_affected +
    factors.alternative_availability * weights.alternative_availability +
    factors.condition               * weights.condition,
  );
}

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

interface ScoreBarProps {
  label: string;
  value: number;   // 0–100
}

/** Single labelled horizontal progress bar used in the breakdown section of a card. */
export function ScoreBar({ label, value }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  // Fill colour follows the same semantic mapping used across the app
  const fillColor =
    clamped >= 75 ? '#b91c1c'   // critical red
    : clamped >= 55 ? '#d97706' // amber
    : '#1b3f73';                // government navy

  return (
    <div className="flex items-center gap-2.5">
      {/* Label — fixed width on desktop so bars align */}
      <span className="w-36 flex-shrink-0 text-[11px] text-[#4b6077] truncate">{label}</span>

      {/* Track + fill */}
      <div
        className="flex-1 h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, backgroundColor: fillColor }}
        />
      </div>

      {/* Numeric value */}
      <span className="w-7 flex-shrink-0 text-right text-[11px] font-bold tabular-nums text-[#0f2540]">
        {clamped}
      </span>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

type BadgeValue = Priority | RequirementStatus | string;

interface BadgeConfig {
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  label: string;
}

const PRIORITY_BADGE: Record<string, BadgeConfig> = {
  CRITICAL: { icon: AlertOctagon, bg: '#fef2f2', text: '#7f1d1d', border: '#fca5a5', label: 'Critical' },
  HIGH:     { icon: ArrowUp,      bg: '#fffbeb', text: '#78350f', border: '#fcd34d', label: 'High'     },
  MEDIUM:   { icon: Minus,        bg: '#eff6ff', text: '#1e3a8a', border: '#93c5fd', label: 'Medium'   },
  LOW:      { icon: ArrowDown,    bg: '#f8fafc', text: '#374151', border: '#cbd5e1', label: 'Low'      },
};

const STATUS_BADGE: Record<string, BadgeConfig> = {
  OPEN:                { icon: Circle,        bg: '#eff6ff', text: '#1e3a8a', border: '#93c5fd', label: 'Open'                },
  UNDER_REVIEW:        { icon: Clock,         bg: '#fffbeb', text: '#78350f', border: '#fcd34d', label: 'Under Review'        },
  ACCEPTED:            { icon: CheckCircle,   bg: '#f0fdf4', text: '#14532d', border: '#86efac', label: 'Accepted'            },
  IN_PROGRESS:         { icon: Loader,        bg: '#fffbeb', text: '#78350f', border: '#fcd34d', label: 'In Progress'         },
  PARTIALLY_COMPLETED: { icon: PieChart,      bg: '#fffbeb', text: '#78350f', border: '#fcd34d', label: 'Partially Completed' },
  COMPLETED:           { icon: CheckCircle2,  bg: '#f0fdf4', text: '#14532d', border: '#86efac', label: 'Completed'           },
  NOT_FEASIBLE:        { icon: XCircle,       bg: '#fef2f2', text: '#7f1d1d', border: '#fca5a5', label: 'Not Feasible'        },
  DISPUTED:            { icon: AlertTriangle, bg: '#fef2f2', text: '#7f1d1d', border: '#fca5a5', label: 'Disputed'            },
  CLOSED:              { icon: Lock,          bg: '#f8fafc', text: '#374151', border: '#cbd5e1', label: 'Closed'              },
};

interface StatusBadgeProps {
  value: BadgeValue;
  kind: 'priority' | 'status';
}

/**
 * Icon-prefixed pill badge for urgency and workflow states.
 * More expressive than GovBadge — keeps a consistent icon+label pattern for
 * the priority rankings context while respecting the same semantic colour map.
 */
export function StatusBadge({ value, kind }: StatusBadgeProps) {
  const upper = String(value).toUpperCase();
  const map   = kind === 'priority' ? PRIORITY_BADGE : STATUS_BADGE;
  const cfg   = map[upper] ?? {
    icon: Circle, bg: '#f8fafc', text: '#374151', border: '#cbd5e1',
    label: String(value).replace(/_/g, ' '),
  };
  const Icon = cfg.icon;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <Icon size={10} aria-hidden="true" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ─── RankMedallion ────────────────────────────────────────────────────────────

interface RankMedallionProps {
  rank: number;
}

/** Circular rank number — colour-coded by position (1 = darkest navy, 4+ = muted). */
export function RankMedallion({ rank }: RankMedallionProps) {
  const bg =
    rank === 1 ? '#0f3460'
    : rank <= 3 ? '#1b3f73'
    : '#4b6077';

  return (
    <div
      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
      style={{ backgroundColor: bg }}
      aria-label={`Rank ${rank}`}
    >
      <span
        className="text-white font-bold tabular-nums leading-none"
        style={{ fontSize: rank >= 10 ? '11px' : '13px' }}
      >
        #{rank}
      </span>
    </div>
  );
}

// ─── PriorityRankingCard ──────────────────────────────────────────────────────

export interface PriorityRankingCardProps {
  rank: number;
  requirementId: string;
  resourceName: string;
  gapQty: number;
  schoolName: string;
  district: string;
  priorityClass: Priority;
  status: RequirementStatus;
  score: number;          // display score (already computed or from final_score)
  breakdown?: BreakdownFactors;
  onView: () => void;     // navigates to requirement detail
}

const FACTOR_LABELS: [keyof BreakdownFactors, string][] = [
  ['severity',                 'Severity'],
  ['importance',               'Importance'],
  ['students_affected',        'Students affected'],
  ['alternative_availability', 'Alt. availability'],
  ['condition',                'Condition'],
];

/** Full card for one ranked requirement. Composes all sub-components. */
export function PriorityRankingCard({
  rank,
  requirementId,
  resourceName,
  gapQty,
  schoolName,
  district,
  priorityClass,
  status,
  score,
  breakdown,
  onView,
}: PriorityRankingCardProps) {
  // Derive breakdown display values — use actual factors if available,
  // otherwise synthesise proportional fallbacks from the composite score
  // so the bars are never empty.
  const base = score;
  const factors: BreakdownFactors = breakdown ?? {
    severity:                 Math.min(100, Math.round(base * 1.04)),
    importance:               Math.min(100, Math.round(base * 1.01)),
    students_affected:        Math.min(100, Math.round(base * 0.95)),
    alternative_availability: Math.min(100, Math.round(base * 0.92)),
    condition:                Math.min(100, Math.round(base * 0.87)),
  };

  return (
    <article
      className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden"
      aria-label={`Rank ${rank}: ${resourceName} — ${schoolName}`}
    >
      {/* ── Card top bar: rank + badges + ID ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 border-b border-[#f3f4f6] bg-[#fafafa]">
        <RankMedallion rank={rank} />
        <StatusBadge value={priorityClass} kind="priority" />
        <StatusBadge value={status} kind="status" />
        <span className="ml-auto font-mono text-[11px] text-[#9ca3af] tracking-wider uppercase">
          {requirementId.toUpperCase()}
        </span>
      </div>

      {/* ── Card body ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-start gap-5">

        {/* Left: identity + breakdown bars */}
        <div className="flex-1 min-w-0">
          {/* Resource name × qty */}
          <p
            className="font-semibold text-[#0f2540] leading-snug mb-0.5"
            style={{ fontSize: '1rem' }}
          >
            {resourceName}{' '}
            <span className="text-[#4b6077] font-normal">× {gapQty}</span>
          </p>

          {/* School + district */}
          <p className="text-[13px] text-[#1d4ed8] font-medium leading-snug">{schoolName}</p>
          <p className="text-xs text-[#9ca3af] mb-4">{district}</p>

          {/* Score breakdown bars */}
          <div className="space-y-2">
            {FACTOR_LABELS.map(([key, label]) => (
              <ScoreBar key={key} label={label} value={factors[key]} />
            ))}
          </div>
        </div>

        {/* Right: score + button */}
        <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-3 flex-shrink-0 lg:min-w-[96px]">
          {/* Large score number */}
          <div className="text-right">
            <p
              className="tabular-nums leading-none text-[#0f2540]"
              style={{
                fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif",
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 700,
              }}
            >
              {Math.round(score)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-[#6b7c93] mt-0.5">
              priority score
            </p>
          </div>

          {/* View button */}
          <button
            type="button"
            onClick={onView}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-xs font-semibold text-[#1b3f73]
              border border-[#6c8298] rounded-sm bg-white
              hover:bg-[#f0f4f8] hover:border-[#0f3460]
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF9933]
              transition-colors cursor-pointer whitespace-nowrap
            "
          >
            View requirement
            <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
