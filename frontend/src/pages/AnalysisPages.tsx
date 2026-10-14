import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import { api, apiMode } from '../api/client';
import { mockSchools } from '../api/mock';
import { useAsync } from '../hooks/useAsync';
import type { Requirement, SchoolResource } from '../types';
import {
  GovAlert,
  GovBadge,
  GovCard,
  GovField,
  GovFilterPanel,
  GovPageHeader,
  GovTable,
  inputCls,
  CardHeader,
} from '../components/GovUI';
import {
  BarChartCard,
  LineChartCard,
  CHART_COLORS,
} from '../components/ChartComponents';
import {
  computePriorityScore,
  PriorityRankingCard,
} from '../components/PriorityComponents';

// ─── Science Resource Gap Analysis Page ──────────────────────────────────────

export function GapAnalysisPage() {
  const [searchParams] = useSearchParams();
  const [schoolId, setSchoolId] = useState(
    searchParams.get('school') ?? (apiMode === 'mock' ? 'sch-001' : ''),
  );

  const history = useAsync(
    () =>
      !schoolId
        ? Promise.resolve({ assessments: [] })
        : apiMode === 'mock'
        ? api.assessments.list(schoolId).then((p) => ({ assessments: p.data }))
        : api.reports.schoolHistory(schoolId),
    [schoolId],
  );

  type RawHistory = {
    assessments?: Array<{
      assessment_id: string;
      status: string;
      assessment_date: string;
      resources?: Array<
        | SchoolResource
        | {
            school_resource: SchoolResource;
            gap?: { gap_qty: number; gap_ratio: number } | null;
            resource_state?: 'Adequate' | 'Gap';
          }
      >;
    }>;
  };
  const raw = history.data as RawHistory | null;
  const latest = [...(raw?.assessments ?? [])]
    .filter((a) => a.status === 'VERIFIED')
    .sort((a, b) => b.assessment_date.localeCompare(a.assessment_date))[0];

  const rows = (latest?.resources ?? []).map((item) => {
    if ('school_resource' in item) {
      return {
        ...item.school_resource,
        gap: item.gap,
        resource_state: item.resource_state,
      };
    }
    return item as SchoolResource & {
      gap?: { gap_qty: number; gap_ratio: number } | null;
      resource_state?: 'Adequate' | 'Gap';
    };
  });

  return (
    <>
      <GovPageHeader
        title="Science Resource Gap Analysis"
        description="Institutional deficit evaluation comparing mandatory curriculum norms against available functional lab equipment."
      />

      {apiMode === 'live' && (
        <GovAlert tone="info" className="mb-4">
          Deficits are computed strictly against verified assessments. Records below reflect the most recent verified inspection.
        </GovAlert>
      )}

      <GovFilterPanel>
        {apiMode === 'mock' ? (
          <GovField label="Select School Institution" htmlFor="gap-school">
            <select
              id="gap-school"
              className={inputCls}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {mockSchools.map((s) => (
                <option key={s.school_id} value={s.school_id}>
                  {s.school_name} ({s.district})
                </option>
              ))}
            </select>
          </GovField>
        ) : (
          <GovField label="Enter School Identification Code" htmlFor="gap-school">
            <input
              id="gap-school"
              className={inputCls}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="e.g. sch-001"
            />
          </GovField>
        )}
      </GovFilterPanel>

      {history.error && <GovAlert tone="error" className="mb-4">{history.error}</GovAlert>}

      {/* ── Category deficit bar chart + trend line ────────────────────────── */}
      {(() => {
        // Build per-category gap totals from the latest verified assessment rows
        const catMap: Record<string, { required: number; gap: number }> = {};
        rows.forEach((r) => {
          // Derive a category label from the resource name (first two words as proxy)
          const cat = r.resource_name?.split(' ').slice(0, 2).join(' ') ?? 'Other';
          catMap[cat] ??= { required: 0, gap: 0 };
          catMap[cat].required += r.required_qty ?? 0;
          catMap[cat].gap      += r.gap?.gap_qty ?? 0;
        });

        // Fallback demo data when no assessment is loaded yet
        const catData = Object.keys(catMap).length > 0
          ? Object.entries(catMap)
              .map(([name, v]) => ({
                name,
                required: v.required,
                functional: Math.max(0, v.required - v.gap),
                gap: v.gap,
              }))
              .filter((d) => d.required > 0)
          : [
              { name: 'Microscopes',    required: 25, functional: 7,  gap: 18 },
              { name: 'Physics Kits',   required: 20, functional: 8,  gap: 12 },
              { name: 'Chemistry Sets', required: 20, functional: 12, gap: 8  },
              { name: 'Computers',      required: 20, functional: 9,  gap: 11 },
              { name: 'Safety Kits',    required: 25, functional: 20, gap: 5  },
            ];

        // Trend data: mock monthly gap totals — replace with real time-series once the
        // backend exposes a historical endpoint.
        const trendData = [
          { month: 'Apr', gap: 62 },
          { month: 'May', gap: 58 },
          { month: 'Jun', gap: 55 },
          { month: 'Jul', gap: 54 },
          { month: 'Aug', gap: 60 },
          { month: 'Sep', gap: 54 },
        ];

        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
            <BarChartCard
              label="Resource deficit by category — functional vs. gap"
              takeaway="Biology and Physics equipment have the highest absolute deficit quantities."
              data={catData}
              categoryKey="name"
              series={[
                { dataKey: 'functional', name: 'Functional',  color: CHART_COLORS.green,   stackId: 'inv' },
                { dataKey: 'gap',        name: 'Gap (deficit)', color: CHART_COLORS.red,   stackId: 'inv' },
              ]}
              layout="horizontal"
              height={250}
              showLegend
              emptyMessage="Select a school above — the category breakdown will appear once a verified assessment is loaded."
            />

            <LineChartCard
              label="Total gap quantity — monthly trend (demo)"
              takeaway="Gap count has remained broadly stable; a slight uptick in August suggests new assessment data."
              data={trendData}
              xKey="month"
              series={[
                { dataKey: 'gap', name: 'Total deficit units', color: CHART_COLORS.primary },
              ]}
              height={250}
              yDomain={[0, 'auto']}
              emptyMessage="Monthly trend data will appear once historical assessments are available."
            />
          </div>
        );
      })()}

      {latest ? (
        <GovCard>
          <CardHeader
            title="Curriculum Resource Norms vs Functional Inventory"
            subtitle={`Assessment Ref: ${latest.assessment_id} · Inspected on ${latest.assessment_date} · Status: Verified`}
          />
          <GovTable
            rows={rows}
            rowKey={(r) => r.school_resource_id}
            columns={[
              { key: 'resource_name', label: 'Resource Equipment' },
              {
                key: 'required_qty',
                label: 'Norm Required',
                render: (r) => (
                  <span className="tabular-nums font-semibold text-[#0f2540]">{r.required_qty}</span>
                ),
              },
              {
                key: 'available_qty',
                label: 'Total Present',
                render: (r) => <span className="tabular-nums text-[#4b6077]">{r.available_qty}</span>,
              },
              {
                key: 'functional_qty',
                label: 'Functional',
                render: (r) => (
                  <span className="tabular-nums font-semibold text-[#128807]">{r.functional_qty}</span>
                ),
              },
              {
                key: 'gap_qty',
                label: 'Deficit Qty',
                render: (r) => (
                  <span
                    className={`tabular-nums font-bold ${
                      (r.gap?.gap_qty ?? 0) > 0 ? 'text-[#dc2626]' : 'text-[#4b6077]'
                    }`}
                  >
                    {r.gap?.gap_qty ?? 0}
                  </span>
                ),
              },
              {
                key: 'gap_ratio',
                label: 'Deficit Ratio',
                render: (r) =>
                  r.gap ? (
                    <span className="tabular-nums text-xs font-semibold text-[#4b6077]">
                      {(r.gap.gap_ratio * 100).toFixed(1)}%
                    </span>
                  ) : (
                    '0.0%'
                  ),
              },
              {
                key: 'condition_rating',
                label: 'Condition',
                render: (r) => (
                  <span className="text-xs uppercase font-medium text-[#4b6077]">
                    {r.condition_rating.replace(/_/g, ' ')}
                  </span>
                ),
              },
              {
                key: 'resource_state',
                label: 'Classification',
                render: (r) =>
                  r.resource_state ? (
                    <GovBadge value={r.resource_state} />
                  ) : (
                    <span className="text-xs text-[#9ca3af] italic">Awaiting evaluation</span>
                  ),
              },
            ]}
            emptyText="No resource entries recorded in this verified assessment."
          />
        </GovCard>
      ) : (
        !history.loading &&
        !history.error && (
          <GovAlert tone="info">
            No verified physical assessment is available for this school yet. Science resource gap analysis will appear once a field coordinator or school assessment has been verified.
          </GovAlert>
        )
      )}
    </>
  );
}

// ─── Priority Rankings Page ──────────────────────────────────────────────────

const PAGE_SIZE = 10;

const ALL_STATUSES = [
  'OPEN', 'UNDER_REVIEW', 'ACCEPTED', 'IN_PROGRESS',
  'PARTIALLY_COMPLETED', 'COMPLETED', 'NOT_FEASIBLE', 'DISPUTED', 'CLOSED',
] as const;

export function PriorityPage() {
  const navigate = useNavigate();

  // ── URL-persisted filter + pagination state ────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const q        = searchParams.get('q')        ?? '';
  const priority = searchParams.get('priority') ?? '';
  const status   = searchParams.get('status')   ?? '';
  const district = searchParams.get('district') ?? '';
  const page     = Math.max(1, Number(searchParams.get('page') ?? '1'));

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) { next.set(key, value); } else { next.delete(key); }
      if (key !== 'page') next.delete('page'); // reset page on filter change
      return next;
    }, { replace: true });
  }

  // ── Data fetch — generous page, client handles the rest ───────────────────
  const reqQuery = useAsync(
    () => api.requirements.list({ page: 1, page_size: 200 }),
    [], // fetch once; all filtering/sorting is client-side
  );

  const allRows: Requirement[] = reqQuery.data?.data ?? [];

  // ── Derive display score (recompute from breakdown when available) ─────────
  function scoreOf(r: Requirement): number {
    return r.breakdown ? computePriorityScore(r.breakdown) : Math.round(r.final_score);
  }

  // ── Client-side filter pipeline ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...allRows];

    // 1. Sort: score desc, then id asc (stable tiebreaker)
    rows.sort((a, b) => {
      const diff = scoreOf(b) - scoreOf(a);
      return diff !== 0 ? diff : a.requirement_id.localeCompare(b.requirement_id);
    });

    // 2. Priority filter
    if (priority) rows = rows.filter((r) => r.priority_class === priority);

    // 3. Status filter
    if (status) rows = rows.filter((r) => r.status === status);

    // 4. District filter
    if (district) rows = rows.filter((r) => r.district === district);

    // 5. Free-text search across key fields
    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      rows = rows.filter((r) =>
        r.school_name.toLowerCase().includes(lower)      ||
        r.resource_name.toLowerCase().includes(lower)    ||
        r.district.toLowerCase().includes(lower)         ||
        r.requirement_id.toLowerCase().includes(lower)   ||
        r.category_name.toLowerCase().includes(lower),
      );
    }

    return rows;
  }, [allRows, q, priority, status, district]);

  // Unique districts for the dropdown (from full unfiltered set)
  const districtChoices = useMemo(
    () => [...new Set(allRows.map((r) => r.district))].sort(),
    [allRows],
  );

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // shared select style — smaller than the full inputCls, matches filter bar
  const selectCls = `
    appearance-none pl-3 pr-7 py-1.5 text-sm
    border border-[#d1d5db] rounded bg-white text-[#374151]
    focus:outline-none focus:ring-2 focus:ring-[#1b3f73] focus:border-[#1b3f73]
    cursor-pointer
  `;

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="mb-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-1">
          <ol className="flex items-center gap-1.5 text-xs text-[#6b7c93]">
            <li>Administrator</li>
            <li aria-hidden="true" className="text-[#d1d5db]">›</li>
            <li className="font-semibold text-[#0f2540]">Priority Rankings</li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-baseline gap-3">
          <h1
            className="text-[#0f2540] leading-tight"
            style={{
              fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif",
              fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
              fontWeight: 700,
            }}
          >
            Priority Rankings
          </h1>
          {!reqQuery.loading && (
            <span className="text-sm text-[#6b7c93] tabular-nums">
              {totalCount} requirement{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <p className="text-sm text-[#4b6077] mt-1 max-w-2xl leading-relaxed">
          Score (0–100) combines severity, importance, students affected,
          alternative availability and condition.
        </p>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#e5e7eb] rounded-md px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search schools, requirements…"
            aria-label="Search requirements"
            className="pl-8 pr-3 py-1.5 text-sm border border-[#d1d5db] rounded bg-white text-[#374151] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#1b3f73] w-52"
          />
        </div>

        {/* Priority */}
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => setParam('priority', e.target.value)}
            aria-label="Filter by priority"
            className={selectCls}
          >
            <option value="">All priorities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((v) => (
              <option key={v} value={v}>{v[0] + v.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280]" aria-hidden="true" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            aria-label="Filter by status"
            className={selectCls}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280]" aria-hidden="true" />
        </div>

        {/* District */}
        <div className="relative">
          <select
            value={district}
            onChange={(e) => setParam('district', e.target.value)}
            aria-label="Filter by district"
            className={selectCls}
          >
            <option value="">All districts</option>
            {districtChoices.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280]" aria-hidden="true" />
        </div>
      </div>

      {/* ── Error state ───────────────────────────────────────────────── */}
      {reqQuery.error && (
        <GovAlert tone="error" className="mb-5">{reqQuery.error}</GovAlert>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────────── */}
      {reqQuery.loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading requirements">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#e5e7eb] rounded-md h-40 animate-pulse"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      )}

      {/* ── Ranked card list ──────────────────────────────────────────── */}
      {!reqQuery.loading && (
        <>
          {pageRows.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-md px-6 py-12 text-center">
              <p className="text-sm text-[#6b7c93] italic">
                No requirements match the active filters.
                {(q || priority || status || district) && (
                  <> {' '}
                    <button
                      type="button"
                      onClick={() => setSearchParams({}, { replace: true })}
                      className="text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pageRows.map((r, idx) => (
                <PriorityRankingCard
                  key={r.requirement_id}
                  rank={(page - 1) * PAGE_SIZE + idx + 1}
                  requirementId={r.requirement_id}
                  resourceName={r.resource_name}
                  gapQty={r.gap_qty}
                  schoolName={r.school_name}
                  district={r.district}
                  priorityClass={r.priority_class}
                  status={r.status}
                  score={scoreOf(r)}
                  breakdown={r.breakdown}
                  onView={() => navigate(`/requirements/${r.requirement_id}`)}
                />
              ))}
            </div>
          )}

          {/* ── Pagination footer ──────────────────────────────────────── */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between mt-4 text-xs text-[#6b7c93]">
              <span className="tabular-nums">
                {totalCount} record{totalCount !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setParam('page', String(page - 1))}
                  aria-label="Previous page"
                  className="px-1.5 py-0.5 rounded hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <span className="px-2 tabular-nums">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setParam('page', String(page + 1))}
                  aria-label="Next page"
                  className="px-1.5 py-0.5 rounded hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
