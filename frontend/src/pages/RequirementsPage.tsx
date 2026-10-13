import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpDown, Search } from 'lucide-react';
import { api, apiMode } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import type { Requirement, RequirementStatus } from '../types';
import {
  GovAlert,
  GovBadge,
  GovButton,
  GovCard,
  GovField,
  GovPageHeader,
  CardHeader,
  CardBody,
  inputCls,
  RequirementDrawer,
} from '../components/GovUI';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return iso.slice(0, 10); // YYYY-MM-DD
}

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};

// Priority badge that matches the screenshot: amber pill with up-arrow prefix
function PriorityChip({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]', border: 'border-[#fca5a5]' },
    HIGH:     { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', border: 'border-[#fcd34d]' },
    MEDIUM:   { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', border: 'border-[#93c5fd]' },
    LOW:      { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', border: 'border-[#86efac]' },
  };
  const c = colorMap[upper] ?? colorMap.LOW;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide ${c.bg} ${c.text} ${c.border}`}>
      ↑ {upper}
    </span>
  );
}

// Status badge matching the screenshot style
function StatusChip({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    OPEN:                { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', border: 'border-[#93c5fd]' },
    UNDER_REVIEW:        { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', border: 'border-[#fcd34d]' },
    ACCEPTED:            { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', border: 'border-[#93c5fd]' },
    IN_PROGRESS:         { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', border: 'border-[#93c5fd]' },
    PARTIALLY_COMPLETED: { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', border: 'border-[#fcd34d]' },
    COMPLETED:           { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', border: 'border-[#86efac]' },
    NOT_FEASIBLE:        { bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]', border: 'border-[#fca5a5]' },
    DISPUTED:            { bg: 'bg-[#fef2f2]', text: 'text-[#b91c1c]', border: 'border-[#fca5a5]' },
    CLOSED:              { bg: 'bg-[#f9fafb]', text: 'text-[#6b7280]', border: 'border-[#d1d5db]' },
  };
  const c = colorMap[upper] ?? colorMap.CLOSED;
  const label = upper.replace(/_/g, ' ');
  // icon prefix: circle-check for accepted/completed, circle-clock for in-progress/partial, circle-x for issues
  const icon =
    ['ACCEPTED', 'COMPLETED'].includes(upper) ? '⊙' :
    ['IN_PROGRESS', 'PARTIALLY_COMPLETED', 'UNDER_REVIEW'].includes(upper) ? '⊙' :
    ['NOT_FEASIBLE', 'DISPUTED'].includes(upper) ? '⊘' : '';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${c.bg} ${c.text} ${c.border}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}

// Score cell: number + amber progress bar
function ScoreCell({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <span className="tabular-nums font-semibold text-[#374151] text-sm w-7 flex-shrink-0">{pct}</span>
      <div className="flex-1 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#b45309]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type SortKey = 'requirement_id' | 'resource_name' | 'school_name' | 'priority_class' | 'final_score' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

// ─── Requirements Directory Page ─────────────────────────────────────────────

export function RequirementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [priority, setPriority] = useState('');
  const [sortKey, setSortKey]   = useState<SortKey>('final_score');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Requirement | null>(null);

  const PAGE_SIZE = 10;

  const result = useAsync(
    () =>
      api.requirements.list({
        page: 1,
        page_size: 200, // fetch all, sort/filter client-side for the compact view
        priority_class: priority,
        status,
      }),
    [priority, status],
  );

  // apply role-based filter
  let rows = result.data?.data ?? [];
  if (apiMode === 'mock' && user?.role === 'SCHOOL') {
    rows = rows.filter((r) => r.school_id === 'sch-001');
  }
  if (apiMode === 'mock' && user?.role === 'FIELD_COORDINATOR') {
    rows = rows.filter((r) => ['Kolar', 'Tumakuru'].includes(r.district));
  }

  // search filter
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) =>
      r.requirement_id.toLowerCase().includes(q) ||
      r.resource_name.toLowerCase().includes(q) ||
      r.school_name.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.category_name.toLowerCase().includes(q),
    );
  }

  // sort
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'priority_class') {
        cmp = (PRIORITY_ORDER[a.priority_class] ?? 9) - (PRIORITY_ORDER[b.priority_class] ?? 9);
      } else if (sortKey === 'final_score') {
        cmp = a.final_score - b.final_score;
      } else {
        const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? '');
        const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? '');
        cmp = av.localeCompare(bv);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  // paginate
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortTh({ colKey, label, className = '' }: { colKey: SortKey; label: string; className?: string }) {
    const active = sortKey === colKey;
    return (
      <th
        scope="col"
        className={`px-4 py-2.5 text-left text-xs font-semibold text-[#b45309] bg-white border-b border-[#e5e7eb] whitespace-nowrap cursor-pointer select-none hover:text-[#92400e] ${className}`}
        onClick={() => toggleSort(colKey)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown
            size={11}
            className={active ? 'text-[#b45309]' : 'text-[#d1d5db]'}
            aria-hidden="true"
          />
        </span>
      </th>
    );
  }

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111827]">Requirements</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">
          Select a row to see details and the{' '}
          <button
            type="button"
            className="text-[#1d4ed8] underline underline-offset-2 hover:text-[#1e40af] focus-visible:outline-none"
            onClick={() => setSelected(pageRows[0] ?? null)}
          >
            priority
          </button>{' '}
          score breakdown.
        </p>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#e5e7eb] rounded-md px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            aria-label="Search requirements"
            className="pl-8 pr-3 py-1.5 text-sm border border-[#d1d5db] rounded bg-white text-[#374151] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] w-40"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter by status"
            className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-[#d1d5db] rounded bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] cursor-pointer"
          >
            <option value="">All statuses</option>
            {['OPEN','UNDER_REVIEW','ACCEPTED','IN_PROGRESS','PARTIALLY_COMPLETED','COMPLETED','NOT_FEASIBLE','DISPUTED','CLOSED'].map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280]" width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
        </div>

        {/* Priority filter */}
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            aria-label="Filter by priority"
            className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-[#d1d5db] rounded bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] cursor-pointer"
          >
            <option value="">All priorities</option>
            {['CRITICAL','HIGH','MEDIUM','LOW'].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#6b7280]" width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
        </div>
      </div>

      {/* ── Table card ────────────────────────────────────────────────── */}
      {result.error ? (
        <GovAlert tone="error">{result.error}</GovAlert>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <SortTh colKey="requirement_id" label="ID" />
                  <SortTh colKey="resource_name"  label="Resource" />
                  <SortTh colKey="school_name"    label="School" />
                  <SortTh colKey="priority_class" label="Priority" />
                  <SortTh colKey="final_score"    label="Score" />
                  <SortTh colKey="status"         label="Status" />
                  <SortTh colKey="created_at"     label="Updated" />
                </tr>
              </thead>
              <tbody>
                {result.loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#9ca3af] italic">
                      Loading…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#9ca3af] italic">
                      No requirements match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr
                      key={row.requirement_id}
                      onClick={() => setSelected(row)}
                      className="border-t border-[#f3f4f6] hover:bg-[#f9fafb] cursor-pointer transition-colors"
                    >
                      {/* ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-[#9ca3af]">
                          {row.requirement_id.toUpperCase()}
                        </span>
                      </td>

                      {/* Resource: bold name + category · qty */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#111827] leading-snug">{row.resource_name}</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">
                          {row.category_name} · Qty {row.gap_qty}
                        </p>
                      </td>

                      {/* School: blue name + district */}
                      <td className="px-4 py-3">
                        <p className="text-[#1d4ed8] font-medium leading-snug">{row.school_name}</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">{row.district}</p>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityChip value={row.priority_class} />
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        <ScoreCell score={Number(row.final_score)} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusChip value={row.status} />
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#6b7280] tabular-nums">
                        {fmtDate(row.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Table footer: record count + pagination ──────────────── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#f3f4f6] text-xs text-[#6b7280]">
            <span>{totalCount} record{totalCount !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
                className="px-1.5 py-0.5 rounded hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>
              <span className="px-2 tabular-nums">Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
                className="px-1.5 py-0.5 rounded hover:bg-[#f3f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer ────────────────────────────────────────────────────── */}
      <RequirementDrawer
        req={selected}
        onClose={() => setSelected(null)}
        onNavigateFull={(id) => navigate(`/requirements/${id}`)}
      />
    </>
  );
}

// ─── Requirement Detail & Progression Page ───────────────────────────────────

const nextByStatus: Record<string, RequirementStatus[]> = {
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['PARTIALLY_COMPLETED', 'COMPLETED', 'NOT_FEASIBLE'],
  PARTIALLY_COMPLETED: ['IN_PROGRESS', 'COMPLETED', 'NOT_FEASIBLE'],
  NOT_FEASIBLE: ['OPEN'],
  DISPUTED: ['IN_PROGRESS', 'CLOSED'],
};

export function RequirementDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const result = useAsync(() => api.requirements.detail(id), [id]);

  const [newStatus, setNewStatus] = useState('');
  const [fulfilledQty, setFulfilledQty] = useState('');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  type ExtReq = Requirement & {
    fulfilled_qty?: number;
    accepted_gap_qty?: number;
    interventions?: unknown[];
    feedback?: unknown[];
  };
  const row = result.data as ExtReq | null;

  async function accept() {
    if (!row) return;
    setError(''); setMsg('');
    try {
      await api.requirements.accept(row.requirement_id, row.version);
      setMsg('The requirement was assigned to your organisation.');
      result.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The action could not be completed.');
    }
  }

  async function saveStatus() {
    if (!row || !newStatus) return;
    setError(''); setMsg('');
    try {
      await api.requirements.updateStatus(row.requirement_id, {
        new_status: newStatus,
        expected_version: row.version,
        ...(fulfilledQty ? { fulfilled_qty: Number(fulfilledQty) } : {}),
        ...(reason ? { reason } : {}),
        ...(comments ? { comments, action_description: comments } : {}),
      });
      setMsg('The requirement status was updated.');
      setNewStatus('');
      result.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The status could not be updated.');
    }
  }

  async function acknowledge() {
    if (!row) return;
    try {
      await api.requirements.acknowledgeChange(row.requirement_id, row.version);
      setMsg('The latest verified assessment data was acknowledged.');
      result.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The change could not be acknowledged.');
    }
  }

  async function confirm(confirmation: 'CONFIRMED' | 'DISPUTED') {
    if (!row) return;
    try {
      await api.requirements.feedback(row.requirement_id, {
        confirmation,
        expected_version: row.version,
        comments,
      });
      setMsg(
        confirmation === 'CONFIRMED'
          ? 'Institutional receipt confirmed.'
          : 'Dispute recorded for administrative review.',
      );
      result.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback could not be recorded.');
    }
  }

  if (result.loading) {
    return <p className="text-sm text-[#6b7c93] py-6 text-center italic">Loading requirement details…</p>;
  }
  if (result.error || !row) {
    return <GovAlert tone="error">{result.error || 'Requirement record not found.'}</GovAlert>;
  }

  const options = [...(nextByStatus[row.status] ?? [])];
  if (user?.role === 'ADMIN' && row.status === 'UNDER_REVIEW') options.push('OPEN' as RequirementStatus);
  const canAccept = user?.role === 'NGO' && ['OPEN', 'UNDER_REVIEW'].includes(row.status);

  return (
    <>
      <GovPageHeader
        title="Requirement Details"
        description={`${row.school_name} · ${row.district}, Karnataka`}
        actions={
          <GovButton variant="secondary" onClick={() => navigate('/requirements')}>
            ← Back to requirements
          </GovButton>
        }
      />

      {error && <GovAlert tone="error" className="mb-4">{error}</GovAlert>}
      {msg && <GovAlert tone="success" className="mb-4">{msg}</GovAlert>}
      {row.data_changed_since_acceptance && (
        <GovAlert tone="warning" className="mb-4">
          A newer physical assessment was verified for this school and resource. Please review the updated figures below.
        </GovAlert>
      )}

      {/* Requirement Info Card */}
      <GovCard className="mb-5">
        <CardHeader
          title="Verified Curriculum Gap Information"
          subtitle={`Reference ID: ${row.requirement_id}`}
        />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Resource Name</p>
              <p className="text-sm font-semibold text-[#0f2540]">{row.resource_name}</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Subject Category</p>
              <p className="text-sm font-semibold text-[#0f2540]">{row.category_name}</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Deficit Quantity</p>
              <p className="text-sm font-semibold text-[#0f2540] tabular-nums">{row.gap_qty} units</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Deficit Ratio</p>
              <p className="text-sm font-semibold text-[#0f2540] tabular-nums">
                {(Number(row.gap_ratio) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Priority Score</p>
              <p className="text-sm font-semibold text-[#0f2540] tabular-nums">
                {Number(row.final_score).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Priority Class</p>
              <GovBadge value={row.priority_class} type="priority" />
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">Current Status</p>
              <GovBadge value={row.status} />
            </div>
          </div>
        </CardBody>
      </GovCard>

      {/* Role-Specific Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {canAccept && (
          <GovCard as="div">
            <CardHeader
              title="Accept Requirement"
              subtitle="Commit your organisation to fulfill this science resource gap"
            />
            <CardBody>
              <p className="text-xs text-[#4b6077] mb-4 leading-relaxed">
                Accepting this item formally reserves the allocation and prevents duplicate CSR/NGO intervention.
              </p>
              <GovButton variant="primary" onClick={accept}>
                Accept for Intervention
              </GovButton>
            </CardBody>
          </GovCard>
        )}

        {row.data_changed_since_acceptance && user?.role === 'NGO' && (
          <GovCard as="div">
            <CardHeader
              title="Acknowledge Updated Data"
              subtitle="Synchronize your intervention with recent verification"
            />
            <CardBody>
              <p className="text-xs text-[#4b6077] mb-4 leading-relaxed">
                Confirm receipt of the latest school assessment figures to update your delivery target.
              </p>
              <GovButton variant="secondary" onClick={acknowledge}>
                Acknowledge Updated Target
              </GovButton>
            </CardBody>
          </GovCard>
        )}

        {options.length > 0 && (user?.role === 'NGO' || user?.role === 'ADMIN') && (
          <GovCard as="div">
            <CardHeader
              title="Update Progress Status"
              subtitle="Report procurement, delivery, or field readiness"
            />
            <CardBody>
              <form
                onSubmit={(e) => { e.preventDefault(); void saveStatus(); }}
                className="space-y-3"
              >
                <GovField label="Select Next Permitted Stage" htmlFor="next-status" required>
                  <select
                    id="next-status"
                    className={inputCls}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="">Choose status transition...</option>
                    {options.map((v) => (
                      <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </GovField>
                {newStatus === 'PARTIALLY_COMPLETED' && (
                  <GovField label="Units Successfully Delivered" htmlFor="fulfilled-qty" required>
                    <input
                      id="fulfilled-qty"
                      type="number"
                      min="1"
                      max={row.accepted_gap_qty ?? row.gap_qty}
                      className={inputCls}
                      value={fulfilledQty}
                      onChange={(e) => setFulfilledQty(e.target.value)}
                    />
                  </GovField>
                )}
                {['NOT_FEASIBLE', 'OPEN'].includes(newStatus) && (
                  <GovField label="Justification Reason (Mandatory)" htmlFor="transition-reason" required>
                    <textarea
                      id="transition-reason"
                      minLength={10}
                      required
                      rows={3}
                      className={`${inputCls} resize-y min-h-[70px]`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain procurement or access impediments..."
                    />
                  </GovField>
                )}
                <GovField label="Official Note / Tracking Remarks" htmlFor="transition-comments">
                  <textarea
                    id="transition-comments"
                    rows={2}
                    className={`${inputCls} resize-y min-h-[60px]`}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter consignment tracking number, delivery date, or remarks..."
                  />
                </GovField>
                <div className="pt-1">
                  <GovButton variant="primary" type="submit" disabled={!newStatus}>
                    Record Status Update
                  </GovButton>
                </div>
              </form>
            </CardBody>
          </GovCard>
        )}

        {row.status === 'COMPLETED' && user?.role === 'SCHOOL' && (
          <GovCard as="div">
            <CardHeader
              title="Institutional Receipt Verification"
              subtitle="Acknowledge delivery and physical functionality"
            />
            <CardBody>
              <GovField label="School Head / Science Teacher Comments" htmlFor="school-comments">
                <textarea
                  id="school-comments"
                  rows={3}
                  className={`${inputCls} resize-y min-h-[70px]`}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Note equipment condition, serial numbers, or calibration..."
                />
              </GovField>
              <div className="flex gap-3 pt-1">
                <GovButton variant="primary" onClick={() => confirm('CONFIRMED')}>
                  Confirm Delivery & Close
                </GovButton>
                <GovButton variant="danger" onClick={() => confirm('DISPUTED')}>
                  Raise Dispute / Discrepancy
                </GovButton>
              </div>
            </CardBody>
          </GovCard>
        )}
      </div>

      {/* History Summary Footer */}
      <GovCard>
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6b7c93]">
            <span>
              Recorded audit trail:{' '}
              <strong className="text-[#0f2540]">{row.interventions?.length ?? 0}</strong> intervention log entries ·{' '}
              <strong className="text-[#0f2540]">{row.feedback?.length ?? 0}</strong> institutional feedback submissions.
            </span>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="text-[#1b3f73] underline hover:text-[#0f3460] font-semibold cursor-pointer"
            >
              View consolidated school reports →
            </button>
          </div>
        </CardBody>
      </GovCard>
    </>
  );
}
