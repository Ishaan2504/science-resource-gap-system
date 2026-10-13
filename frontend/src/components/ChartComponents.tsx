/**
 * ChartComponents — ISRGAPIT Design System
 * Reusable chart wrappers built on Recharts.
 * All colours, fonts and card chrome come from the shared design token set.
 *
 * Exports:
 *   CHART_COLORS          — semantic colour map for series data
 *   BarChartCard          — horizontal or vertical bar chart in a card
 *   DonutChartCard        — donut / pie chart in a card
 *   LineChartCard         — line / area chart in a card
 *   ChartEmptyState       — shared quiet empty-state used by all chart cards
 *   ChartLoadingState     — shared loading skeleton used by all chart cards
 */

import { type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ─── Design token colours ─────────────────────────────────────────────────────
// Mirror the CSS custom properties defined in styles.css so TypeScript code
// can reference them without duplicating strings per-component.

export const CHART_COLORS = {
  primary:    '#0f3460',   // dominant / first series — government blue
  secondary:  '#1b3f73',   // second series — navy
  green:      '#128807',   // verified / completed / positive
  saffron:    '#FF9933',   // pending / in-progress / attention
  red:        '#b91c1c',   // critical / rejected / overdue
  neutral:    '#94a3b8',   // low-priority / inactive
  neutralLt:  '#cbd5e1',   // lightest neutral — zero-value / empty

  // Semantic aliases
  critical:   '#b91c1c',
  high:       '#d97706',   // slightly warmer than saffron for bar legibility
  medium:     '#1b3f73',
  low:        '#94a3b8',
  verified:   '#128807',
  pending:    '#d97706',
  rejected:   '#b91c1c',
  completed:  '#128807',
  open:       '#0f3460',
  inProgress: '#d97706',
  accepted:   '#1b3f73',
} as const;

// Ordered palette for categorical series (max 6 used at once)
export const CATEGORICAL_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.green,
  CHART_COLORS.saffron,
  CHART_COLORS.red,
  CHART_COLORS.secondary,
  CHART_COLORS.neutral,
] as const;

// ─── Shared Tooltip style ─────────────────────────────────────────────────────
export const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '2px',
  boxShadow: 'none',
  color: '#0f2540',
  fontSize: '12px',
  fontFamily: 'Inter, Noto Sans, sans-serif',
  padding: '8px 12px',
};

export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: '#0f2540',
  fontWeight: 600,
  marginBottom: 4,
};

export const AXIS_TICK_STYLE = {
  fill: '#4b6077',
  fontSize: 11,
  fontFamily: 'Inter, Noto Sans, sans-serif',
};

// ─── Card chrome helpers ──────────────────────────────────────────────────────

function ChartCard({
  label,
  takeaway,
  height = 260,
  children,
}: {
  label: string;
  takeaway?: string;
  height?: number;
  children: ReactNode;
}) {
  return (
    <div className="bg-white border border-[#d1d5db] rounded-sm overflow-hidden">
      {/* Label above chart — uppercase tracked, small Inter */}
      <div className="px-5 pt-4 pb-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4b6077]">{label}</p>
      </div>

      {/* Chart area */}
      <div style={{ height }} className="px-2 pb-2">
        {children}
      </div>

      {/* One-line takeaway note below */}
      {takeaway && (
        <p className="px-5 pb-3.5 text-[11px] text-[#6b7c93] leading-snug border-t border-[#e5e7eb] pt-2 mt-1">
          {takeaway}
        </p>
      )}
    </div>
  );
}

// ─── Shared empty / loading states ───────────────────────────────────────────

export function ChartEmptyState({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[120px]">
      <p className="text-xs text-[#6b7c93] italic text-center max-w-[240px] leading-relaxed">
        {message ?? 'Data will appear once assessments are verified and requirements are generated.'}
      </p>
    </div>
  );
}

export function ChartLoadingState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[120px]">
      <p className="text-xs text-[#9ca3af] italic">Loading chart data…</p>
    </div>
  );
}

// ─── Legend formatter ─────────────────────────────────────────────────────────
function legendFormatter(value: string) {
  return (
    <span style={{ color: '#0f2540', fontSize: 11, fontFamily: 'Inter, Noto Sans, sans-serif' }}>
      {value}
    </span>
  );
}

// ─── 1. BarChartCard ──────────────────────────────────────────────────────────

export interface BarSeries {
  dataKey: string;
  name: string;
  color: string;
  stackId?: string;   // set to the same string to stack
}

export interface BarChartCardProps {
  /** Uppercase-tracked label shown above the chart */
  label: string;
  /** One-line analytical note shown below */
  takeaway?: string;
  data: Record<string, unknown>[];
  /** Key in each data item used for the category axis */
  categoryKey: string;
  series: BarSeries[];
  /** 'vertical' renders horizontal bars (category on Y axis) */
  layout?: 'horizontal' | 'vertical';
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  showLegend?: boolean;
  /** Max width for long category labels on horizontal bar charts */
  yWidth?: number;
}

export function BarChartCard({
  label,
  takeaway,
  data,
  categoryKey,
  series,
  layout = 'horizontal',
  height = 260,
  loading,
  emptyMessage,
  showLegend = false,
  yWidth = 140,
}: BarChartCardProps) {
  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard label={label} takeaway={takeaway} height={height}>
      {loading ? (
        <ChartLoadingState />
      ) : isEmpty ? (
        <ChartEmptyState message={emptyMessage} />
      ) : layout === 'vertical' ? (
        // ── Horizontal bars (category on Y axis) ──────────────────────────
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
          >
            <CartesianGrid stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey={categoryKey}
              width={yWidth}
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: '#f0f4f8' }} />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                formatter={legendFormatter}
              />
            )}
            {series.map((s) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color}
                stackId={s.stackId}
                radius={s.stackId ? [0, 0, 0, 0] : [0, 2, 2, 0]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        // ── Vertical bars (category on X axis) ────────────────────────────
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 16, left: -8, bottom: 8 }}
          >
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey={categoryKey}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: '#f0f4f8' }} />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                formatter={legendFormatter}
              />
            )}
            {series.map((s) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color}
                stackId={s.stackId}
                radius={s.stackId ? [0, 0, 0, 0] : [2, 2, 0, 0]}
                maxBarSize={36}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ─── 2. DonutChartCard ────────────────────────────────────────────────────────

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartCardProps {
  label: string;
  takeaway?: string;
  data: DonutSlice[];
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  /** Show a centred total figure inside the donut */
  centerLabel?: string;
  centerValue?: string | number;
}

// Custom tooltip for donut — shows name + value + %
function DonutTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const total = payload[0]?.payload?.total as number | undefined;
  const pct = total && entry.value != null ? ((entry.value / total) * 100).toFixed(1) : null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontWeight: 600, color: entry.payload?.fill as string ?? '#0f2540', marginBottom: 2 }}>
        {entry.name}
      </p>
      <p style={{ color: '#0f2540' }}>
        {entry.value}{pct ? ` (${pct}%)` : ''}
      </p>
    </div>
  );
}

export function DonutChartCard({
  label,
  takeaway,
  data,
  height = 240,
  loading,
  emptyMessage,
  centerLabel,
  centerValue,
}: DonutChartCardProps) {
  const isEmpty = !data || data.length === 0 || data.every((d) => d.value === 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  // Attach total to each slice so the tooltip can compute %
  const enriched = data.map((d) => ({ ...d, total }));

  return (
    <ChartCard label={label} takeaway={takeaway} height={height}>
      {loading ? (
        <ChartLoadingState />
      ) : isEmpty ? (
        <ChartEmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-col items-center h-full">
          <ResponsiveContainer width="100%" height="75%">
            <PieChart>
              <Pie
                data={enriched}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                aria-label={label}
              >
                {enriched.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
              {/* Centre label rendered as SVG text via customised label */}
            </PieChart>
          </ResponsiveContainer>

          {/* Centre annotation — rendered below the chart as a styled div
              (avoids SVG foreignObject cross-browser issues) */}
          {(centerLabel || centerValue != null) && (
            <div className="absolute flex flex-col items-center justify-center pointer-events-none"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -65%)', textAlign: 'center' }}>
              {centerValue != null && (
                <span className="tabular-nums font-bold text-[#0f2540]"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 22, lineHeight: 1 }}>
                  {centerValue}
                </span>
              )}
              {centerLabel && (
                <span className="text-[10px] text-[#6b7c93] uppercase tracking-wide mt-0.5">
                  {centerLabel}
                </span>
              )}
            </div>
          )}

          {/* Legend — rendered as inline flex below the chart */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2 mt-1">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-[#4b6077]">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                {entry.name}
                <span className="tabular-nums font-semibold text-[#0f2540] ml-0.5">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

// ─── 3. LineChartCard ─────────────────────────────────────────────────────────

export interface LineSeries {
  dataKey: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export interface LineChartCardProps {
  label: string;
  takeaway?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: LineSeries[];
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  showLegend?: boolean;
  yDomain?: [number | 'auto', number | 'auto'];
}

export function LineChartCard({
  label,
  takeaway,
  data,
  xKey,
  series,
  height = 260,
  loading,
  emptyMessage,
  showLegend = false,
  yDomain,
}: LineChartCardProps) {
  const isEmpty = !data || data.length === 0;

  return (
    <ChartCard label={label} takeaway={takeaway} height={height}>
      {loading ? (
        <ChartLoadingState />
      ) : isEmpty ? (
        <ChartEmptyState message={emptyMessage} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
            <CartesianGrid stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              domain={yDomain}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
            {showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                formatter={legendFormatter}
              />
            )}
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 3' : undefined}
                dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: s.color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
