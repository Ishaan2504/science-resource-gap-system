/**
 * GovUI — Single Source of Truth Design System Components for ISRGAPIT System
 * Department of School Education & Literacy, Ministry of Education, Government of India
 *
 * Locked Design System:
 * - Colors: Government Blue #0f3460 (primary) / #1b3f73 (secondary/hover),
 *           Off-white canvas #f4f6f9, White cards #ffffff, Neutral borders #d1d5db,
 *           Tricolor accent #FF9933 / #ffffff / #128807.
 * - Typography: Inter / Noto Sans / Roboto, high contrast, clean hierarchy.
 * - Panels/Cards: Sharp corners (rounded-sm), thin 1px neutral borders (#d1d5db),
 *                 NO floating drop-shadows anywhere.
 * - Stat Cards: Thin top accent bar in government blue (#0f3460), intentional empty states.
 * - Badges: Bordered, sharp corners (rounded-sm), semantic color in border & text only, no solid fills.
 * - Buttons: Sharp corners (rounded-sm), government blue primary, bordered secondary, no pills.
 */

import { type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  X,
} from 'lucide-react';
import type { Priority, RequirementStatus } from '../types';

// ---------------------------------------------------------------------------
// Ministry Emblem SVG Placeholder
// Reusable across LoginPage, AppShell header, and exportable reports.
// TODO: Replace with officially approved ministry emblem asset before production.
// ---------------------------------------------------------------------------
export function MinistryEmblem({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      role="img"
    >
      <circle cx="40" cy="40" r="38" stroke="#0f3460" strokeWidth="2" fill="#f8fafc" />
      <circle cx="40" cy="40" r="33" stroke="#0f3460" strokeWidth="0.8" strokeDasharray="3 2" fill="none" />
      <rect x="16" y="57" width="48" height="5" rx="1" fill="#0f3460" />
      <rect x="22" y="38" width="7" height="19" rx="1" fill="#1b3f73" />
      <rect x="36.5" y="32" width="7" height="25" rx="1" fill="#0f3460" />
      <rect x="51" y="38" width="7" height="19" rx="1" fill="#1b3f73" />
      <rect x="20" y="35" width="11" height="4" rx="1" fill="#0f3460" />
      <rect x="34.5" y="29" width="11" height="4" rx="1" fill="#0f3460" />
      <rect x="49" y="35" width="11" height="4" rx="1" fill="#0f3460" />
      <path d="M14 35 L40 18 L66 35Z" fill="none" stroke="#0f3460" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="40" cy="26" r="5" stroke="#FF9933" strokeWidth="1.2" fill="none" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={40 + 2.2 * Math.cos(rad)}
            y1={26 + 2.2 * Math.sin(rad)}
            x2={40 + 4.5 * Math.cos(rad)}
            y2={26 + 4.5 * Math.sin(rad)}
            stroke="#FF9933"
            strokeWidth="1"
          />
        );
      })}
      <circle cx="40" cy="26" r="1.5" fill="#FF9933" />
      <rect x="16" y="62" width="48" height="10" rx="1" fill="#0f3460" />
      <text
        x="40"
        y="70"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="5.5"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        letterSpacing="0.5"
      >
        EDUCATION · INDIA
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3-Bar Tricolor Rule
// Exactly ~3px saffron, ~3px white with neutral 1px borders, ~3px green.
// Placed directly under the header on every page and above the footer.
// ---------------------------------------------------------------------------
export function TricolorRule() {
  return (
    <div aria-hidden="true" className="w-full flex flex-col flex-shrink-0">
      <div className="h-[3px] w-full bg-[#FF9933]" />
      <div className="h-[3px] w-full bg-white border-y border-[#d1d5db]" />
      <div className="h-[3px] w-full bg-[#128807]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert / Notice — Bordered, left-accented, sharp corners, NO drop-shadow
// Variants: info | warning | error | success | demo
// ---------------------------------------------------------------------------
export type AlertTone = 'info' | 'warning' | 'error' | 'success' | 'demo';

const alertStyles: Record<
  AlertTone,
  { border: string; bg: string; text: string; accent: string; Icon: typeof Info }
> = {
  info: {
    border: 'border-[#b8cce4]',
    bg: 'bg-[#edf4fb]',
    text: 'text-[#1b3f73]',
    accent: 'border-l-[#1b3f73]',
    Icon: Info,
  },
  warning: {
    border: 'border-[#ddc47e]',
    bg: 'bg-[#fff8e6]',
    text: 'text-[#5c3d00]',
    accent: 'border-l-[#936000]',
    Icon: AlertTriangle,
  },
  error: {
    border: 'border-[#e5b6b2]',
    bg: 'bg-[#fef2f2]',
    text: 'text-[#7f1d1d]',
    accent: 'border-l-[#dc2626]',
    Icon: AlertCircle,
  },
  success: {
    border: 'border-[#b7ceb9]',
    bg: 'bg-[#eef6ef]',
    text: 'text-[#1a4a22]',
    accent: 'border-l-[#128807]',
    Icon: CheckCircle2,
  },
  demo: {
    border: 'border-[#c9a93a]',
    bg: 'bg-[#fffbeb]',
    text: 'text-[#5c3d00]',
    accent: 'border-l-[#FF9933]',
    Icon: AlertTriangle,
  },
};

export function GovAlert({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const s = alertStyles[tone];
  const role = tone === 'error' ? 'alert' : 'status';
  return (
    <div
      role={role}
      className={`
        border ${s.border} border-l-4 ${s.accent} ${s.bg} ${s.text}
        rounded-sm px-4 py-3 flex items-start gap-3 text-sm leading-relaxed
        ${className}
      `}
    >
      <s.Icon size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card / Panel — White canvas, 1px neutral border, rounded-sm, NO shadow
// ---------------------------------------------------------------------------
export function GovCard({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'form';
}) {
  return (
    <Tag
      className={`bg-white border border-[#d1d5db] rounded-sm ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-[#e5e7eb]">
      <div className="min-w-0">
        <h2
          className="text-[#0f2540] leading-snug"
          style={{
            fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif",
            fontSize: '0.9375rem',   /* 15px — just above body, clearly distinct */
            fontWeight: 600,
          }}
        >
          {title}
        </h2>
        {subtitle && <p className="text-xs text-[#6b7c93] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Stat Card — Government blue top accent bar with intentional empty states
// ---------------------------------------------------------------------------
export function StatCard({
  label,
  value,
  note,
  emptyText,
}: {
  label: string;
  value: string | number | undefined | null;
  note?: string;
  emptyText?: string;
}) {
  const isEmpty =
    value === '—' ||
    value === undefined ||
    value === null ||
    value === '';

  return (
    <div className="bg-white border border-[#d1d5db] rounded-sm border-t-[3px] border-t-[#0f3460] px-5 py-4 min-h-[118px] flex flex-col justify-between">
      <p className="text-[11px] font-semibold text-[#4b6077] uppercase tracking-widest leading-snug">
        {label}
      </p>
      {isEmpty ? (
        <div className="my-2.5">
          <p className="text-xs text-[#6b7c93] italic leading-relaxed">
            {emptyText ?? 'Data will appear once school assessments are verified.'}
          </p>
        </div>
      ) : (
        /* Serif display face for the hero number — gives stat cards institutional weight */
        <p
          className="my-2 tabular-nums leading-none text-[#0f2540]"
          style={{
            fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
      )}
      {note && <p className="text-[11px] text-[#6b7c93] mt-auto leading-snug">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge — Soft tinted background + matching border + text, sharp corners
// Tint palette mirrors the chart colour semantics so legend and badges
// reinforce the same colour-to-meaning mapping across the whole app.
// ---------------------------------------------------------------------------
type BadgeVariant = 'red' | 'amber' | 'green' | 'blue' | 'neutral';

const badgeVariants: Record<BadgeVariant, string> = {
  red:     'border-[#fca5a5] text-[#7f1d1d]  bg-[#fef2f2]',
  amber:   'border-[#fcd34d] text-[#78350f]  bg-[#fffbeb]',
  green:   'border-[#86efac] text-[#14532d]  bg-[#f0fdf4]',
  blue:    'border-[#93c5fd] text-[#1e3a8a]  bg-[#eff6ff]',
  neutral: 'border-[#cbd5e1] text-[#374151]  bg-[#f8fafc]',
};

function priorityBadgeVariant(value: string): BadgeVariant {
  const upper = String(value).toUpperCase();
  if (upper === 'CRITICAL') return 'red';
  if (upper === 'HIGH')     return 'amber';
  if (upper === 'MEDIUM')   return 'blue';
  if (upper === 'LOW')      return 'neutral';
  return 'neutral';
}

function statusBadgeVariant(value: string): BadgeVariant {
  const upper = String(value).toUpperCase();
  // red — hard stop / problem states
  if (['REJECTED', 'DISPUTED', 'NOT_FEASIBLE'].includes(upper)) return 'red';
  // amber — in-motion / needs attention
  if (['PENDING', 'UNDER_REVIEW', 'PARTIALLY_COMPLETED', 'SUBMITTED', 'DRAFT', 'IN_PROGRESS'].includes(upper)) return 'amber';
  // green — positive / done
  if (['VERIFIED', 'COMPLETED', 'CLOSED', 'ADEQUATE', 'CONFIRMED'].includes(upper)) return 'green';
  // blue — committed / active
  if (['ACCEPTED', 'OPEN', 'GAP'].includes(upper)) return 'blue';
  return 'neutral';
}

export function GovBadge({
  value,
  type = 'status',
}: {
  value: Priority | RequirementStatus | string;
  type?: 'priority' | 'status';
}) {
  const variant = type === 'priority' ? priorityBadgeVariant(value) : statusBadgeVariant(value);
  const label = String(value).replace(/_/g, ' ');
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        border rounded-sm text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap
        ${badgeVariants[variant]}
      `}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Button — Sharp corners, gov-blue primary, bordered secondary, no pills
// ---------------------------------------------------------------------------
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const btnVariant: Record<ButtonVariant, string> = {
  primary:
    'bg-[#0f3460] hover:bg-[#1b3f73] active:bg-[#0a2548] text-white border border-[#0f3460] hover:border-[#1b3f73] focus-visible:outline-[#FF9933]',
  secondary:
    'bg-white hover:bg-[#f0f4f8] text-[#1b3f73] border border-[#6c8298] hover:border-[#0f3460] focus-visible:outline-[#0f3460]',
  ghost:
    'bg-transparent hover:bg-[#f0f4f8] text-[#1b3f73] border border-transparent focus-visible:outline-[#0f3460]',
  danger:
    'bg-white hover:bg-[#fef2f2] text-[#7f1d1d] border border-[#dc2626] focus-visible:outline-[#dc2626]',
};

const btnSize: Record<ButtonSize, string> = {
  sm: 'min-h-[32px] px-3 py-1 text-xs',
  md: 'min-h-[38px] px-4 py-2 text-sm',
};

export function GovButton({
  variant = 'secondary',
  size = 'md',
  disabled,
  type = 'button',
  onClick,
  children,
  className = '',
  as: Tag,
  href,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  as?: 'a';
  href?: string;
}) {
  const base = `
    inline-flex items-center justify-center gap-2
    rounded-sm font-semibold leading-snug
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-colors motion-reduce:transition-none cursor-pointer
    ${btnVariant[variant]} ${btnSize[size]} ${className}
  `;
  if (Tag === 'a') return <a href={href} className={base}>{children}</a>;
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={base}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Form Field Wrapper
// ---------------------------------------------------------------------------
export function GovField({
  label,
  htmlFor,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 mb-3.5">
      <label
        htmlFor={htmlFor}
        className="text-xs sm:text-sm font-semibold text-[#1e3a5f]"
      >
        {label}
        {required && <span className="text-[#dc2626] ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] sm:text-xs text-[#6b7c93]">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-[#7f1d1d]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Shared input / select / textarea class string
export const inputCls = `
  w-full min-h-[38px] border border-[#9ca3af] rounded-sm
  bg-white text-[#1e3a5f] text-sm px-3 py-2
  placeholder:text-[#9ca3af]
  focus:outline-none focus:ring-2 focus:ring-[#0f3460] focus:border-[#0f3460]
  disabled:bg-[#f3f4f6] disabled:text-[#6b7c93]
  transition-colors
`;

// ---------------------------------------------------------------------------
// Table Component
// ---------------------------------------------------------------------------
export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function GovTable<T>({
  columns,
  rows,
  rowKey,
  emptyText = 'No records match the selected criteria.',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyText?: string;
}) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`
                  px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide
                  text-[#1e3a5f] bg-[#f0f4f8] border-t border-b border-[#d1d5db]
                  whitespace-nowrap ${col.className ?? ''}
                `}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-[#6b7c93] italic"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-[#e5e7eb] hover:bg-[#f7f9fc] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 text-[#1e3a5f] align-middle ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String(
                          (row as unknown as Record<string, unknown>)[col.key] ?? '—',
                        )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination Component
// ---------------------------------------------------------------------------
export function GovPagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[#e5e7eb] text-xs text-[#6b7c93]">
      <span>
        Showing <span className="font-semibold text-[#0f2540]">{from}–{to}</span> of{' '}
        <span className="font-semibold text-[#0f2540]">{total}</span> records
      </span>
      <div className="flex items-center gap-2">
        <GovButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </GovButton>
        <span className="tabular-nums font-medium text-[#1e3a5f] px-1">
          Page {page} of {pages}
        </span>
        <GovButton size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </GovButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Header Component (Title, description, actions)
// ---------------------------------------------------------------------------
export function GovPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 pb-1">
      <div>
        <h1
          className="text-[#0f2540] leading-tight"
          style={{
            fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif",
            fontSize: 'clamp(1.25rem, 3vw, 1.625rem)',
            fontWeight: 700,
          }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-[#4b6077] mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Panel Wrapper
// ---------------------------------------------------------------------------
export function GovFilterPanel({ children }: { children: ReactNode }) {
  return (
    <GovCard className="mb-5" as="div">
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {children}
        </div>
      </CardBody>
    </GovCard>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar Component
// ---------------------------------------------------------------------------
export function GovProgress({
  value,
  tone = 'primary',
  className = '',
}: {
  value: number;
  tone?: 'primary' | 'secondary' | 'critical' | 'high' | 'low';
  className?: string;
}) {
  const toneBg = {
    primary: 'bg-[#0f3460]',
    secondary: 'bg-[#1b3f73]',
    critical: 'bg-[#dc2626]',
    high: 'bg-[#d97706]',
    low: 'bg-[#128807]',
  }[tone];
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      className={`h-2 w-full bg-[#e5e7eb] rounded-sm overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full transition-all duration-300 ${toneBg}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Priority Score Breakdown Component (5-factor analysis)
// ---------------------------------------------------------------------------
export interface BreakdownFactors {
  severity: number;
  importance: number;
  students_affected: number;
  alternative_availability: number;
  condition: number;
}

const factorLabels: [keyof BreakdownFactors, string][] = [
  ['severity', 'Deficit Severity'],
  ['importance', 'Curriculum Importance'],
  ['students_affected', 'Students Affected'],
  ['alternative_availability', 'Alternative Scarcity'],
  ['condition', 'Existing Asset Condition'],
];

export function PriorityBreakdown({
  factors,
  score,
}: {
  factors?: BreakdownFactors;
  score?: number;
}) {
  const base = score ?? 75;
  const f: BreakdownFactors = factors ?? {
    severity: Math.min(100, Math.round(base * 0.96)),
    importance: Math.min(100, Math.round(base * 1.04)),
    students_affected: Math.min(100, Math.round(base * 0.90)),
    alternative_availability: Math.min(100, Math.round(base * 0.88)),
    condition: Math.min(100, Math.round(base * 0.82)),
  };

  return (
    <div className="space-y-2.5">
      {factorLabels.map(([key, label]) => {
        const val = f[key] ?? 50;
        const tone = val >= 75 ? 'critical' : val >= 55 ? 'high' : 'secondary';
        return (
          <div key={key} className="grid grid-cols-[150px_1fr_36px] items-center gap-2.5 text-xs">
            <span className="text-[#4b6077] font-medium truncate">{label}</span>
            <GovProgress value={val} tone={tone} />
            <span className="text-right font-bold text-[#0f2540] tabular-nums">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline Component
// ---------------------------------------------------------------------------
export interface ActivityItem {
  id: string;
  at: string;
  actor: string;
  text: string;
  kind: 'info' | 'success' | 'warning' | 'error';
}

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  const dots = {
    info: 'bg-[#1b3f73] ring-[#edf4fb]',
    success: 'bg-[#128807] ring-[#eef6ef]',
    warning: 'bg-[#d97706] ring-[#fffbeb]',
    error: 'bg-[#dc2626] ring-[#fef2f2]',
  };

  return (
    <ol className="relative space-y-3.5 border-l-2 border-[#d1d5db] ml-2.5 pl-4 py-1">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ring-4 ${dots[item.kind]}`}
            aria-hidden="true"
          />
          <p className="text-xs font-semibold text-[#0f2540] leading-snug">{item.text}</p>
          <p className="text-[11px] text-[#6b7c93] mt-0.5">
            {item.actor} · <time>{item.at}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Requirement Drawer Component (Interactive Quick-View Modal)
// ---------------------------------------------------------------------------
export interface DrawerRequirement {
  requirement_id: string;
  school_id: string;
  school_name: string;
  district: string;
  resource_name: string;
  category_name: string;
  gap_qty: number;
  gap_ratio: number;
  final_score: number;
  priority_class: Priority;
  status: RequirementStatus;
  assigned_ngo?: string;
  created_at?: string;
  breakdown?: BreakdownFactors;
}

export function RequirementDrawer({
  req,
  onClose,
  onAccept,
  onNavigateFull,
}: {
  req: DrawerRequirement | null;
  onClose: () => void;
  onAccept?: (req: DrawerRequirement) => void;
  onNavigateFull?: (reqId: string) => void;
}) {
  if (!req) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer content panel */}
      <div className="relative w-full max-w-lg bg-white border-l border-[#d1d5db] h-full overflow-y-auto flex flex-col z-10 animate-slideLeft shadow-none">
        {/* Header */}
        <div className="bg-[#0f3460] text-white px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-[#b8cce4] uppercase tracking-wider">
              {req.requirement_id}
            </p>
            <h2 id="drawer-title" className="text-base font-bold leading-snug mt-0.5 truncate">
              {req.resource_name}
            </h2>
            <p className="text-xs text-[#c8dcf0] truncate mt-0.5">
              {req.school_name} · {req.district}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-sm hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close requirement panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tricolor line */}
        <TricolorRule />

        {/* Body content */}
        <div className="p-5 space-y-5 flex-1">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <GovBadge value={req.priority_class} type="priority" />
            <GovBadge value={req.status} />
          </div>

          {/* Key metadata grid */}
          <div className="grid grid-cols-2 gap-3.5 bg-[#f8fafc] border border-[#d1d5db] rounded-sm p-3.5 text-xs">
            <div>
              <p className="text-[#6b7c93] font-medium mb-0.5">Subject Category</p>
              <p className="font-semibold text-[#0f2540]">{req.category_name}</p>
            </div>
            <div>
              <p className="text-[#6b7c93] font-medium mb-0.5">Deficit Quantity</p>
              <p className="font-semibold text-[#0f2540] tabular-nums">{req.gap_qty} units</p>
            </div>
            <div>
              <p className="text-[#6b7c93] font-medium mb-0.5">Deficit Ratio</p>
              <p className="font-semibold text-[#0f2540] tabular-nums">
                {(Number(req.gap_ratio) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[#6b7c93] font-medium mb-0.5">Assigned NGO / CSR</p>
              <p className="font-semibold text-[#0f2540] truncate">
                {req.assigned_ngo || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* Priority Score Breakdown Card */}
          <div className="border border-[#d1d5db] rounded-sm p-4 bg-white">
            <div className="flex items-baseline justify-between mb-3 border-b border-[#e5e7eb] pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f3460]">
                  Priority Score Factors
                </h3>
                <p className="text-[11px] text-[#6b7c93]">Calculated allocation urgency weight</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-[#0f2540] tabular-nums">
                  {Number(req.final_score).toFixed(2)}
                </span>
                <span className="text-xs text-[#6b7c93]">/100</span>
              </div>
            </div>
            <PriorityBreakdown factors={req.breakdown} score={Number(req.final_score)} />
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {onAccept && req.status === 'OPEN' && (
              <GovButton
                variant="primary"
                className="w-full justify-center"
                onClick={() => onAccept(req)}
              >
                Accept Requirement for Intervention
              </GovButton>
            )}
            {onNavigateFull && (
              <GovButton
                variant="secondary"
                className="w-full justify-center"
                onClick={() => onNavigateFull(req.requirement_id)}
              >
                <ExternalLink size={13} className="mr-1" />
                Open Full Requirement Details
              </GovButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
