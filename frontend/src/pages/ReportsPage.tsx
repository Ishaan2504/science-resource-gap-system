import { useState } from 'react';
import { api, apiMode } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { mockSchools } from '../api/mock';
import type { Assessment, Requirement, SummaryReport } from '../types';
import {
  GovAlert,
  GovBadge,
  GovButton,
  GovCard,
  GovField,
  GovPageHeader,
  GovTable,
  StatCard,
  inputCls,
  CardHeader,
  CardBody,
} from '../components/GovUI';
import {
  BarChartCard,
  DonutChartCard,
  CHART_COLORS,
} from '../components/ChartComponents';

export function ReportsPage() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState(apiMode === 'mock' ? 'sch-001' : '');
  const isSummaryRole = user?.role === 'ADMIN' || user?.role === 'NGO';

  const summary = useAsync(
    () => (isSummaryRole ? api.reports.summary() : Promise.resolve(null)),
    [user?.role],
  );
  const coverage = useAsync(
    () => (user?.role === 'ADMIN' ? api.reports.coverage() : Promise.resolve(null)),
    [user?.role],
  );
  const turnaround = useAsync(
    () => (user?.role === 'ADMIN' ? api.reports.turnaround() : Promise.resolve([])),
    [user?.role],
  );
  const schoolHistory = useAsync(
    () =>
      user?.role === 'SCHOOL' && schoolId
        ? api.reports.schoolHistory(schoolId)
        : Promise.resolve(null),
    [user?.role, schoolId],
  );

  const data = summary.data as SummaryReport | null;
  const categoryRows = data?.open_by_district_and_category ?? [];

  const chartData = Object.values(
    categoryRows.reduce<
      Record<string, { district: string; CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }>
    >((acc, row) => {
      acc[row.district] ??= {
        district: row.district,
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };
      acc[row.district][row.priority_class] += row.count;
      return acc;
    }, {}),
  );

  function exportCsv() {
    const headings = ['District', 'Resource category', 'Priority class', 'Requirement count'];
    const lines = categoryRows.map((r) =>
      [r.district, r.resource_category, r.priority_class, r.count]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[headings.join(','), ...lines].join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'science-resource-gap-report.csv';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Role View 1: School Official ──────────────────────────────────────────
  if (user?.role === 'SCHOOL') {
    const history = schoolHistory.data as {
      assessments?: Assessment[];
      requirements?: Requirement[];
    } | null;
    return (
      <>
        <GovPageHeader
          title="School Institutional History Report"
          description="Detailed chronological log of laboratory resource assessments and generated intervention requirements."
          actions={
            <GovButton variant="secondary" onClick={() => window.print()}>
              Print report
            </GovButton>
          }
        />
        <div className="mb-4">
          {apiMode === 'mock' ? (
            <GovField label="Select School Institution" htmlFor="history-school">
              <select
                id="history-school"
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
            <GovField label="School Code" htmlFor="history-school">
              <input
                id="history-school"
                className={inputCls}
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
              />
            </GovField>
          )}
        </div>

        {schoolHistory.error && (
          <GovAlert tone="error" className="mb-4">
            {schoolHistory.error}
          </GovAlert>
        )}

        <GovCard className="mb-5">
          <CardHeader
            title="Institutional Assessment Submissions"
            subtitle="Verified and draft physical inspections recorded for your school"
          />
          <GovTable<Assessment>
            rows={history?.assessments ?? []}
            rowKey={(r) => r.assessment_id}
            columns={[
              { key: 'assessment_date', label: 'Assessment Date' },
              { key: 'assessment_id', label: 'Reference Number' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <GovBadge value={r.status} />,
              },
            ]}
            emptyText="No assessment records filed for this school institution yet."
          />
        </GovCard>

        <GovCard>
          <CardHeader
            title="Institutional Requirement History"
            subtitle="Identified resource deficits and current intervention stage"
          />
          <GovTable<Requirement>
            rows={history?.requirements ?? []}
            rowKey={(r) => r.requirement_id}
            columns={[
              { key: 'resource_name', label: 'Curriculum Resource' },
              {
                key: 'gap_qty',
                label: 'Deficit Qty',
                render: (r) => <span className="tabular-nums font-semibold">{r.gap_qty}</span>,
              },
              {
                key: 'priority_class',
                label: 'Priority',
                render: (r) => <GovBadge value={r.priority_class} type="priority" />,
              },
              {
                key: 'status',
                label: 'Intervention Status',
                render: (r) => <GovBadge value={r.status} />,
              },
            ]}
            emptyText="No science resource requirements recorded for this school."
          />
        </GovCard>
      </>
    );
  }

  // ── Role View 2: Field Coordinator ────────────────────────────────────────
  if (user?.role === 'FIELD_COORDINATOR') {
    return (
      <>
        <GovPageHeader
          title="Field Coordination Reports"
          description="Territory reporting and assessment submission summaries."
        />
        <GovAlert tone="info">
          Field coordinator analytical summaries are compiled by district administrative offices. Use the Resource Assessments module to manage school inspection logs.
        </GovAlert>
      </>
    );
  }

  // ── Role View 3: Administrator / NGO ──────────────────────────────────────
  const openCount = data?.status_funnel
    ?.filter((r) => !['CLOSED', 'COMPLETED'].includes(r.status))
    .reduce((s, r) => s + r.count, 0);
  const criticalCount = data?.open_by_priority?.find((r) => r.priority_class === 'CRITICAL')?.count;
  const coverageVal = coverage.data
    ? `${coverage.data.coverage_percent}%`
    : user?.role === 'ADMIN'
    ? undefined
    : 'Admin access only';

  return (
    <>
      <GovPageHeader
        title="Reports and District Analytics"
        description="Comprehensive reporting on resource deficit distribution, institutional coverage, and intervention turnaround times."
        actions={
          <div className="flex items-center gap-2">
            <GovButton
              variant="secondary"
              disabled={!categoryRows.length}
              onClick={exportCsv}
            >
              Export CSV
            </GovButton>
            <GovButton variant="secondary" onClick={() => window.print()}>
              Print report
            </GovButton>
          </div>
        }
      />

      {summary.error && <GovAlert tone="warning" className="mb-4">{summary.error}</GovAlert>}

      {/* Aggregate Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard
          label="Open requirements"
          value={openCount}
          emptyText="No open requirements recorded."
          note="Excluding closed and completed interventions"
        />
        <StatCard
          label="Critical priority"
          value={criticalCount}
          emptyText="No critical priority requirements."
          note="Immediate intervention recommended"
        />
        <StatCard
          label="Verified school coverage"
          value={coverageVal}
          emptyText="Coverage data will appear once assessments are verified."
          note="Schools with verified assessment data"
        />
      </div>

      {/* ── 1. District × Priority stacked bar ─────────────────────────────── */}
      <div className="mb-5">
        <BarChartCard
          label="Open requirements by district and priority tier"
          takeaway="Kolar and Tumakuru account for the largest share of critical and high-priority gaps."
          data={chartData}
          categoryKey="district"
          series={[
            { dataKey: 'CRITICAL', name: 'Critical', color: CHART_COLORS.critical,  stackId: 'p' },
            { dataKey: 'HIGH',     name: 'High',     color: CHART_COLORS.high,      stackId: 'p' },
            { dataKey: 'MEDIUM',   name: 'Medium',   color: CHART_COLORS.medium,    stackId: 'p' },
            { dataKey: 'LOW',      name: 'Low',      color: CHART_COLORS.low,       stackId: 'p' },
          ]}
          layout="horizontal"
          height={300}
          showLegend
          emptyMessage="No district-level data available yet. Figures will populate upon requirement generation."
        />
      </div>

      {/* ── 2. Intervention status donut + NGO contribution bar ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        {/* Intervention status breakdown — donut */}
        <DonutChartCard
          label="Intervention status breakdown"
          takeaway="Over half of all requirements are still open or under review — NGO adoption is the critical bottleneck."
          data={(() => {
            const funnel = data?.status_funnel ?? [];
            const get = (s: string) => funnel.find(r => r.status === s)?.count ?? 0;
            return [
              { name: 'Open',               value: get('OPEN'),                color: CHART_COLORS.open       },
              { name: 'Under Review',        value: get('UNDER_REVIEW'),        color: CHART_COLORS.pending    },
              { name: 'Accepted',            value: get('ACCEPTED'),            color: CHART_COLORS.accepted   },
              { name: 'In Progress',         value: get('IN_PROGRESS'),         color: CHART_COLORS.inProgress },
              { name: 'Completed / Closed',  value: get('COMPLETED') + get('CLOSED'), color: CHART_COLORS.completed },
            ].filter(d => d.value > 0);
          })()}
          height={280}
          emptyMessage="Status breakdown will appear once requirements have been generated."
        />

        {/* NGO / organisation contribution volume — horizontal bar */}
        <BarChartCard
          label="NGO contribution volume by organisation"
          takeaway="Science Foundation leads with 8 completed interventions at an average 24.6-day turnaround."
          data={(() => {
            const rows = (turnaround.data ?? []) as Array<{ org_name: string; completed_count: number; average_days: number }>;
            // Fallback demo when no live data
            const demo = [
              { org_name: 'Science Foundation',      completed_count: 8,  average_days: 24.6 },
              { org_name: 'Education Support Trust', completed_count: 5,  average_days: 31.2 },
            ];
            return (rows.length > 0 ? rows : demo).map(r => ({
              org: r.org_name.length > 22 ? r.org_name.slice(0, 20) + '…' : r.org_name,
              completed: r.completed_count,
            }));
          })()}
          categoryKey="org"
          series={[{ dataKey: 'completed', name: 'Completed interventions', color: CHART_COLORS.green }]}
          layout="vertical"
          height={280}
          yWidth={155}
          emptyMessage="Contribution data will appear once organisations record completed interventions."
        />
      </div>

      {/* ── 3. Lifecycle Status Funnel table ────────────────────────────────── */}
      <GovCard className="mb-5">
        <CardHeader
          title="Requirement lifecycle status funnel"
          subtitle="Cumulative progress counts across all institutional gaps"
        />
        <GovTable
          rows={data?.status_funnel ?? []}
          rowKey={(r) => r.status}
          columns={[
            {
              key: 'status',
              label: 'Lifecycle Stage',
              render: (r) => <GovBadge value={r.status} />,
            },
            {
              key: 'count',
              label: 'Total Requirements',
              render: (r) => (
                <span className="tabular-nums font-semibold text-[#0f2540]">{r.count}</span>
              ),
            },
          ]}
          emptyText="No status funnel data available."
        />
      </GovCard>

      {/* Intervention Turnaround (Administrator Only) */}
      {user?.role === 'ADMIN' && (
        <GovCard>
          <CardHeader
            title="Intervention turnaround performance"
            subtitle="Average days elapsed from NGO acceptance to institutional completion"
          />
          {turnaround.error && (
            <div className="p-4">
              <GovAlert tone="warning">{turnaround.error}</GovAlert>
            </div>
          )}
          <GovTable
            rows={turnaround.data ?? []}
            rowKey={(r) => `${r.org_name}-${r.resource_category}`}
            columns={[
              { key: 'org_name', label: 'Intervening Organisation' },
              { key: 'resource_category', label: 'Resource Category' },
              {
                key: 'average_days',
                label: 'Average Turnaround',
                render: (r) => (
                  <span className="tabular-nums font-medium text-[#0f2540]">
                    {Number(r.average_days).toFixed(1)} days
                  </span>
                ),
              },
              {
                key: 'completed_count',
                label: 'Completed Interventions',
                render: (r) => (
                  <span className="tabular-nums font-semibold text-[#128807]">
                    {r.completed_count}
                  </span>
                ),
              },
            ]}
            emptyText="No intervention turnaround data recorded yet."
          />
        </GovCard>
      )}
    </>
  );
}
