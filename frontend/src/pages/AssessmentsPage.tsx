import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Eye, X } from 'lucide-react';
import { api, apiMode } from '../api/client';
import { mockSchools } from '../api/mock';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import type { Assessment, Resource, ResourceCategory, SchoolResource } from '../types';
import {
  GovAlert,
  GovBadge,
  GovButton,
  GovCard,
  GovField,
  GovFilterPanel,
  GovPageHeader,
  GovTable,
  inputCls,
  CardHeader,
  CardBody,
} from '../components/GovUI';

// ─── Assessments List Page ───────────────────────────────────────────────────

export function AssessmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load available schools for dropdown selection
  const schoolsQuery = useAsync(
    () => (apiMode === 'mock' ? Promise.resolve({ data: mockSchools, page: 1, page_size: 100, total_count: mockSchools.length }) : api.schools.list({ page: 1, page_size: 200 })),
    []
  );
  const availableSchools = schoolsQuery.data?.data ?? [];

  // Determine user's assigned school if role is SCHOOL
  const userAssignedSchool = useMemo(() => {
    if (user?.role !== 'SCHOOL') return null;
    if (user?.school_id) {
      const match = availableSchools.find((s) => s.school_id === user.school_id);
      if (match) return match;
    }
    return availableSchools.find((s) => s.user_id === user?.user_id || s.school_name === user?.full_name) ?? null;
  }, [user, availableSchools]);

  // Selected school filter: for SCHOOL role, lock to their school; for ADMIN, default to 'ALL'
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(() => {
    if (user?.role === 'SCHOOL') return user?.school_id || 'sch-001';
    return 'ALL';
  });

  // Keep selectedSchoolId in sync once userAssignedSchool resolves
  useEffect(() => {
    if (user?.role === 'SCHOOL') {
      const id = user?.school_id || userAssignedSchool?.school_id;
      if (id && selectedSchoolId !== id) {
        setSelectedSchoolId(id);
      }
    }
  }, [user?.role, user?.school_id, userAssignedSchool?.school_id, selectedSchoolId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectingAssessment, setInspectingAssessment] = useState<Assessment | null>(null);

  // Fetch assessments depending on selection
  const list = useAsync(
    async () => {
      if (selectedSchoolId === 'ALL') {
        // Fetch all assessments across all schools
        const res = await api.assessments.listAll({
          search: searchTerm.trim() || undefined,
          status: statusFilter || undefined,
          page: 1,
          page_size: 100,
        });
        return res;
      }

      // Fetch for specific school
      const targetId = selectedSchoolId;
      if (!targetId) {
        return { data: [] as Assessment[], page: 1, page_size: 100, total_count: 0 };
      }

      try {
        const history = await api.reports.schoolHistory(targetId);
        const data = (history as { assessments: Assessment[] }).assessments ?? [];
        return { data, page: 1, page_size: 100, total_count: data.length };
      } catch {
        const pageRes = await api.assessments.list(targetId);
        return pageRes;
      }
    },
    [selectedSchoolId, searchTerm, statusFilter]
  );

  // Filter client side if school history was fetched
  const displayRows = useMemo(() => {
    let rows = list.data?.data ?? [];
    if (selectedSchoolId !== 'ALL') {
      if (statusFilter) {
        rows = rows.filter((r) => r.status === statusFilter);
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        rows = rows.filter(
          (r) =>
            r.assessment_id.toLowerCase().includes(q) ||
            r.assessment_date.toLowerCase().includes(q) ||
            (r.school_name && r.school_name.toLowerCase().includes(q))
        );
      }
    }
    return rows;
  }, [list.data?.data, selectedSchoolId, statusFilter, searchTerm]);

  async function submitAssessment(row: Assessment) {
    setMsg('');
    try {
      await api.assessments.submit(row.assessment_id, row.version);
      setMsg(`Assessment ${row.assessment_id.slice(0, 8)} was submitted for verification.`);
      list.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The assessment could not be submitted.');
    }
  }

  async function verifyAssessment(row: Assessment, status: 'VERIFIED' | 'REJECTED') {
    setMsg('');
    try {
      await api.assessments.verify(row.assessment_id, {
        status,
        expected_version: row.version,
        ...(status === 'REJECTED' ? { reason: rejectionReason } : {}),
      });
      setMsg(`Assessment ${row.assessment_id.slice(0, 8)} was ${status.toLowerCase()}.`);
      setRejectingId('');
      setRejectionReason('');
      list.reload();
      if (inspectingAssessment?.assessment_id === row.assessment_id) {
        setInspectingAssessment(null);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The assessment could not be verified.');
    }
  }

  // Active institution details
  const currentSchool = availableSchools.find((s) => s.school_id === selectedSchoolId);

  return (
    <>
      <GovPageHeader
        title="Science Resource Assessments"
        description={
          user?.role === 'ADMIN'
            ? 'Review lab infrastructure snapshots, verify school audits, and inspect equipment status across all 137 institutions.'
            : 'Review lab infrastructure snapshots, track verification lifecycle, and record new field assessments.'
        }
        actions={
          user?.role !== 'ADMIN' && (user?.role === 'SCHOOL' || user?.role === 'FIELD_COORDINATOR') ? (
            <GovButton
              variant="primary"
              onClick={() =>
                navigate(
                  `/assessments/new?school=${
                    selectedSchoolId !== 'ALL'
                      ? selectedSchoolId
                      : user?.school_id || availableSchools[0]?.school_id || 'sch-001'
                  }`
                )
              }
            >
              + Record an assessment
            </GovButton>
          ) : undefined
        }
      />

      {/* School User Banner */}
      {user?.role === 'SCHOOL' && (
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 text-sm text-[#1e3a8a] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Building2 className="text-blue-600 shrink-0" size={20} />
            <div>
              <span className="font-semibold text-blue-900">
                {userAssignedSchool?.school_name || currentSchool?.school_name || user?.school_name || 'Assigned Institution'}
              </span>
              <div className="text-xs text-blue-700 mt-0.5">
                District: {userAssignedSchool?.district || currentSchool?.district || user?.district || '—'}
                {userAssignedSchool?.udise_code || user?.udise_code ? ` • UDISE: ${userAssignedSchool?.udise_code || user?.udise_code}` : ''}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            Institutional Dashboard
          </span>
        </div>
      )}

      {/* Filter / Selector Bar */}
      <GovFilterPanel>
        {user?.role !== 'SCHOOL' && (
          <GovField label="Select Institution" htmlFor="assessment-school-select">
            <select
              id="assessment-school-select"
              className={inputCls}
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
            >
              <option value="ALL">
                All Institutions ({availableSchools.length > 0 ? `${availableSchools.length} schools` : 'Complete Network'})
              </option>
              {availableSchools.map((s) => (
                <option key={s.school_id} value={s.school_id}>
                  {s.school_name} ({s.district}){s.udise_code ? ` - ${s.udise_code}` : ''}
                </option>
              ))}
            </select>
          </GovField>
        )}

        <GovField label="Search Assessments" htmlFor="assessment-search">
          <div className="relative">
            <input
              id="assessment-search"
              className={inputCls}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by school, district, or ID..."
            />
          </div>
        </GovField>

        <GovField label="Verification Status" htmlFor="assessment-status">
          <select
            id="assessment-status"
            className={inputCls}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="SUBMITTED">Submitted (Pending Review)</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </GovField>
      </GovFilterPanel>

      {/* Admin Rejection Modal / Card */}
      {user?.role === 'ADMIN' && rejectingId && (
        <GovCard className="mb-4" as="div">
          <CardHeader
            title={`Reject Assessment (${rejectingId.slice(0, 8)}...)`}
            subtitle="Please document specific verification shortcomings for school revision."
          />
          <CardBody>
            <GovField label="Formal Rejection Grounds" htmlFor="rejection-reason" required>
              <textarea
                id="rejection-reason"
                required
                rows={3}
                className={`${inputCls} resize-y min-h-[80px]`}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State the audit discrepancy or missing verification document..."
              />
            </GovField>
            <div className="flex gap-3 justify-end pt-2">
              <GovButton
                variant="secondary"
                onClick={() => {
                  setRejectingId('');
                  setRejectionReason('');
                }}
              >
                Cancel
              </GovButton>
              <GovButton
                variant="danger"
                disabled={!rejectionReason.trim()}
                onClick={() => {
                  const row = displayRows.find((a) => a.assessment_id === rejectingId);
                  if (row) void verifyAssessment(row, 'REJECTED');
                }}
              >
                Confirm Rejection
              </GovButton>
            </div>
          </CardBody>
        </GovCard>
      )}

      {msg && (
        <GovAlert tone={msg.includes('could not') ? 'error' : 'success'} className="mb-4">
          {msg}
        </GovAlert>
      )}
      {list.error && apiMode === 'live' && (
        <GovAlert tone="warning" className="mb-4">
          {list.error}
        </GovAlert>
      )}

      {/* Main Table */}
      <GovCard>
        <GovTable<Assessment>
          rows={displayRows}
          rowKey={(r) => r.assessment_id}
          columns={[
            ...(selectedSchoolId === 'ALL'
              ? [
                  {
                    key: 'school_name',
                    label: 'Institution',
                    render: (r: Assessment) => (
                      <div>
                        <div className="font-semibold text-[#111827]">{r.school_name || 'Institution'}</div>
                        <div className="text-xs text-[#6b7280]">
                          {r.district || 'District'}
                          {r.udise_code ? ` • UDISE: ${r.udise_code}` : ''}
                        </div>
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: 'assessment_date',
              label: 'Assessment Date',
              render: (r) => (
                <span className="tabular-nums font-medium text-[#111827]">
                  {String(r.assessment_date).slice(0, 10)}
                </span>
              ),
            },
            {
              key: 'assessment_id',
              label: 'Reference Code',
              render: (r) => (
                <span className="font-mono text-xs text-[#4b5563] bg-slate-100 px-2 py-0.5 rounded">
                  {r.assessment_id.slice(0, 8)}...
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Verification Status',
              render: (r) => <GovBadge value={r.status} />,
            },
            {
              key: 'resources',
              label: 'Evaluated Resources',
              render: (r) => {
                const count = r.resources?.length ?? 0;
                return (
                  <button
                    type="button"
                    onClick={() => setInspectingAssessment(r)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
                  >
                    <Eye size={12} />
                    {count} {count === 1 ? 'item' : 'items'} assessed
                  </button>
                );
              },
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <GovButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setInspectingAssessment(r)}
                  >
                    Inspect
                  </GovButton>
                  {r.status === 'DRAFT' && user?.role !== 'ADMIN' && (
                    <GovButton size="sm" variant="primary" onClick={() => submitAssessment(r)}>
                      Submit
                    </GovButton>
                  )}
                  {r.status === 'SUBMITTED' && user?.role === 'ADMIN' && (
                    <>
                      <GovButton
                        size="sm"
                        variant="primary"
                        onClick={() => void verifyAssessment(r, 'VERIFIED')}
                      >
                        Verify
                      </GovButton>
                      <GovButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRejectingId(r.assessment_id);
                          setRejectionReason('');
                        }}
                      >
                        Reject
                      </GovButton>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          emptyText={
            list.loading
              ? 'Loading institution assessments...'
              : 'No science resource assessments found matching the selected filters.'
          }
        />
      </GovCard>

      {/* Assessment Resource Inspection Modal */}
      {inspectingAssessment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">
                    Resource Assessment Details
                  </h2>
                  <GovBadge value={inspectingAssessment.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Reference: <span className="font-mono text-gray-700">{inspectingAssessment.assessment_id}</span> • Date: {String(inspectingAssessment.assessment_date).slice(0, 10)}
                  {inspectingAssessment.school_name ? ` • School: ${inspectingAssessment.school_name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAssessment(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-200 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Evaluated Resources List */}
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Evaluated Science Lab Infrastructure Snapshot
              </h3>
              {(!inspectingAssessment.resources || inspectingAssessment.resources.length === 0) ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No individual resource rows recorded in this assessment.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-2xs">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-slate-100 text-gray-700 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2.5">Resource Name</th>
                        <th className="px-3 py-2.5">Category</th>
                        <th className="px-2 py-2.5 text-center">Required</th>
                        <th className="px-2 py-2.5 text-center">Available</th>
                        <th className="px-2 py-2.5 text-center">Functional</th>
                        <th className="px-2 py-2.5 text-center">Condition</th>
                        <th className="px-2 py-2.5 text-center">Alternative</th>
                        <th className="px-3 py-2.5 text-right font-bold text-amber-900">Gap Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {inspectingAssessment.resources.map((item: any, idx: number) => {
                        const sr = item.school_resource || item;
                        const resName = item.resource_name || sr.resource_name || `Resource #${idx + 1}`;
                        const catName = item.category_name || sr.category_name || 'Science Laboratory';
                        const reqQty = sr.required_qty ?? item.required_qty ?? 0;
                        const availQty = sr.available_qty ?? item.available_qty ?? 0;
                        const funcQty = sr.functional_qty ?? item.functional_qty ?? 0;
                        const cond = sr.condition_rating ?? item.condition_rating ?? 'GOOD';
                        const alt = sr.has_alternative ?? item.has_alternative ?? 'NONE';
                        const gap = item.gap?.gap_qty ?? item.gap_qty ?? sr.gap_qty ?? Math.max(0, reqQty - funcQty);

                        return (
                          <tr key={sr.school_resource_id || idx} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2.5 font-medium text-gray-900">
                              {resName}
                              {sr.notes && <div className="text-[11px] text-gray-500 font-normal mt-0.5 italic">{sr.notes}</div>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">{catName}</td>
                            <td className="px-2 py-2.5 text-center tabular-nums font-semibold">{reqQty}</td>
                            <td className="px-2 py-2.5 text-center tabular-nums">{availQty}</td>
                            <td className="px-2 py-2.5 text-center tabular-nums text-emerald-700 font-semibold">{funcQty}</td>
                            <td className="px-2 py-2.5 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  cond === 'GOOD'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : cond === 'FAIR'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : cond === 'POOR'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {cond}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <span className="text-[11px] text-gray-600">{alt}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-rose-700 tabular-nums">
                              {gap > 0 ? `-${gap}` : 'Adequate'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Evaluation snapshot verified against Department of School Education STEM criteria.
              </span>
              <div className="flex items-center gap-2">
                {inspectingAssessment.status === 'SUBMITTED' && user?.role === 'ADMIN' && (
                  <>
                    <GovButton
                      size="sm"
                      variant="primary"
                      onClick={() => void verifyAssessment(inspectingAssessment, 'VERIFIED')}
                    >
                      Verify Assessment
                    </GovButton>
                    <GovButton
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRejectingId(inspectingAssessment.assessment_id);
                        setRejectionReason('');
                      }}
                    >
                      Reject Assessment
                    </GovButton>
                  </>
                )}
                <GovButton
                  size="sm"
                  variant="secondary"
                  onClick={() => setInspectingAssessment(null)}
                >
                  Close
                </GovButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Assessment Form Page ───────────────────────────────────────────────────

interface Entry {
  resource_id: string;
  required_qty: string;
  available_qty: string;
  functional_qty: string;
  condition_rating: SchoolResource['condition_rating'];
  has_alternative: SchoolResource['has_alternative'];
  students_affected: string;
}

const emptyEntry = (): Entry => ({
  resource_id: '',
  required_qty: '',
  available_qty: '',
  functional_qty: '',
  condition_rating: 'NOT_APPLICABLE',
  has_alternative: 'NONE',
  students_affected: '',
});

export function AssessmentFormPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  if (user?.role === 'ADMIN') {
    return <Navigate to="/assessments" replace />;
  }
  const [schoolId, setSchoolId] = useState(params.get('school') || user?.school_id || (apiMode === 'mock' ? 'sch-001' : ''));
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<Entry[]>([emptyEntry()]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const categories = useAsync(() => api.resources.categories());
  const categoryRows = categories.data?.data ?? [];
  const effectiveCategory = categoryId || categoryRows[0]?.category_id || '';
  const resources = useAsync(
    () =>
      effectiveCategory
        ? api.resources.list(effectiveCategory)
        : Promise.resolve({ data: [], page: 1, page_size: 100, total_count: 0 }),
    [effectiveCategory],
  );
  const visibleResources = resources.data?.data ?? [];

  function update(i: number, patch: Partial<Entry>) {
    setEntries((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMsg('');
    const clean = entries
      .filter((r) => r.resource_id)
      .map((r) => ({
        resource_id: r.resource_id,
        required_qty: Number(r.required_qty),
        available_qty: Number(r.available_qty),
        functional_qty: Number(r.functional_qty),
        condition_rating: r.condition_rating,
        has_alternative: r.has_alternative,
        ...(r.students_affected ? { students_affected: Number(r.students_affected) } : {}),
      }));

    if (!clean.length) {
      setError('Please add at least one complete science resource entry before saving.');
      return;
    }
    if (clean.some((r) => r.functional_qty > r.available_qty)) {
      setError('Functional quantity cannot exceed available quantity for any resource row.');
      return;
    }

    try {
      const result = await api.assessments.create(schoolId, {
        idempotency_key: crypto.randomUUID(),
        assessment_date: date,
        resources: clean,
      });
      setMsg(`Draft assessment ${result.assessment_id} created successfully. You can now submit it for verification.`);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'The assessment could not be saved.');
    }
  }

  return (
    <>
      <GovPageHeader
        title="Record Science Resource Assessment"
        description="Document institutional science laboratory assets, physical condition, and functional readiness."
      />

      {apiMode === 'live' && (
        <GovAlert tone="info" className="mb-4">
          Only verified assessments contribute to official district gap and priority scoring.
        </GovAlert>
      )}
      {categories.error && <GovAlert tone="warning" className="mb-4">{categories.error}</GovAlert>}
      {error && <GovAlert tone="error" className="mb-4">{error}</GovAlert>}
      {msg && <GovAlert tone="success" className="mb-4">{msg}</GovAlert>}

      <form onSubmit={save} className="space-y-5">
        {/* Assessment Metadata */}
        <GovCard as="div">
          <CardHeader
            title="Institutional Evaluation Details"
            subtitle="Record the date of physical verification and assigned school code"
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GovField label="School ID / Code" htmlFor="a-school-id" required>
                <input
                  id="a-school-id"
                  required
                  className={inputCls}
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                />
              </GovField>
              <GovField label="Date of Physical Assessment" htmlFor="a-date" required>
                <input
                  id="a-date"
                  type="date"
                  required
                  className={inputCls}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </GovField>
            </div>
          </CardBody>
        </GovCard>

        {/* Resource Asset Rows */}
        <GovCard as="div">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[#e5e7eb]">
            <div>
              <h2 className="text-sm font-semibold text-[#0f2540]">Science Resource Inventory Items</h2>
              <p className="text-xs text-[#6b7c93] mt-0.5">
                Quantify required curriculum norms against functional, working equipment.
              </p>
            </div>
            <GovButton
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setEntries((r) => [...r, emptyEntry()])}
            >
              + Add resource row
            </GovButton>
          </div>

          <CardBody>
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <fieldset
                  key={i}
                  className="border border-[#d1d5db] rounded-sm p-4 bg-[#fbfcfd]"
                >
                  <legend className="text-xs font-bold text-[#0f3460] px-2 uppercase tracking-wide">
                    Resource Item {i + 1}
                  </legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <GovField label="Resource Category" htmlFor={`cat-${i}`}>
                      <select
                        id={`cat-${i}`}
                        className={inputCls}
                        value={effectiveCategory}
                        onChange={(e) => {
                          setCategoryId(e.target.value);
                          update(i, { resource_id: '' });
                        }}
                      >
                        {categoryRows.map((c: ResourceCategory) => (
                          <option key={c.category_id} value={c.category_id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </GovField>
                    <GovField label="Resource Name & Specification" htmlFor={`res-${i}`} required>
                      <select
                        id={`res-${i}`}
                        required
                        className={inputCls}
                        value={entry.resource_id}
                        onChange={(e) => update(i, { resource_id: e.target.value })}
                      >
                        <option value="">Select a curriculum resource...</option>
                        {visibleResources.map((r: Resource) => (
                          <option key={r.resource_id} value={r.resource_id}>
                            {r.name} ({r.unit_of_measure})
                          </option>
                        ))}
                      </select>
                    </GovField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                    <GovField label="Required Quantity" htmlFor={`req-${i}`} required>
                      <input
                        id={`req-${i}`}
                        type="number"
                        min="0"
                        required
                        className={inputCls}
                        value={entry.required_qty}
                        onChange={(e) => update(i, { required_qty: e.target.value })}
                      />
                    </GovField>
                    <GovField label="Available Quantity" htmlFor={`avail-${i}`} required>
                      <input
                        id={`avail-${i}`}
                        type="number"
                        min="0"
                        required
                        className={inputCls}
                        value={entry.available_qty}
                        onChange={(e) => {
                          const v = e.target.value;
                          update(i, {
                            available_qty: v,
                            ...(Number(v) === 0
                              ? { condition_rating: 'NOT_APPLICABLE' }
                              : entry.condition_rating === 'NOT_APPLICABLE'
                              ? { condition_rating: 'POOR' }
                              : {}),
                          });
                        }}
                      />
                    </GovField>
                    <GovField label="Functional Quantity" htmlFor={`func-${i}`} required>
                      <input
                        id={`func-${i}`}
                        type="number"
                        min="0"
                        max={entry.available_qty || undefined}
                        required
                        className={inputCls}
                        value={entry.functional_qty}
                        onChange={(e) => update(i, { functional_qty: e.target.value })}
                      />
                    </GovField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <GovField label="Physical Condition Rating" htmlFor={`cond-${i}`}>
                      <select
                        id={`cond-${i}`}
                        className={inputCls}
                        value={entry.condition_rating}
                        onChange={(e) =>
                          update(i, { condition_rating: e.target.value as Entry['condition_rating'] })
                        }
                      >
                        <option value="NOT_APPLICABLE">Not applicable (Zero available)</option>
                        <option value="GOOD">Good condition</option>
                        <option value="FAIR">Fair / Minor repair</option>
                        <option value="POOR">Poor / Non-operational</option>
                      </select>
                    </GovField>
                    <GovField label="Pedagogical Alternative Available" htmlFor={`alt-${i}`}>
                      <select
                        id={`alt-${i}`}
                        className={inputCls}
                        value={entry.has_alternative}
                        onChange={(e) =>
                          update(i, { has_alternative: e.target.value as Entry['has_alternative'] })
                        }
                      >
                        <option value="NONE">None (Essential gap)</option>
                        <option value="PARTIAL">Partial substitute</option>
                        <option value="FULL">Full substitute available</option>
                      </select>
                    </GovField>
                    <GovField label="Students Directly Affected" htmlFor={`aff-${i}`}>
                      <input
                        id={`aff-${i}`}
                        type="number"
                        min="0"
                        className={inputCls}
                        value={entry.students_affected}
                        onChange={(e) => update(i, { students_affected: e.target.value })}
                        placeholder="e.g. 120"
                      />
                    </GovField>
                  </div>

                  {entries.length > 1 && (
                    <div className="pt-2 border-t border-[#e5e7eb] flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#dc2626] hover:underline cursor-pointer"
                        onClick={() => setEntries((r) => r.filter((_, j) => j !== i))}
                      >
                        Remove resource row {i + 1}
                      </button>
                    </div>
                  )}
                </fieldset>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb] mt-4">
              <GovButton variant="secondary" type="button" onClick={() => navigate('/assessments')}>
                Cancel
              </GovButton>
              <GovButton variant="primary" type="submit">
                Save Draft Assessment
              </GovButton>
            </div>
          </CardBody>
        </GovCard>
      </form>
    </>
  );
}
