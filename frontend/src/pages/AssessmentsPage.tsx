import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [schoolId, setSchoolId] = useState(apiMode === 'mock' ? 'sch-001' : '');
  const [msg, setMsg] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const emptyList = { data: [] as Assessment[], page: 1, page_size: 100, total_count: 0 };
  const list = useAsync(
    () =>
      !schoolId
        ? Promise.resolve(emptyList)
        : apiMode === 'mock' || user?.role === 'ADMIN' || user?.role === 'SCHOOL'
        ? api.reports.schoolHistory(schoolId).then((h) => ({
            data: (h as { assessments: Assessment[] }).assessments,
            page: 1,
            page_size: 100,
            total_count: (h as { assessments: Assessment[] }).assessments.length,
          }))
        : api.assessments.list(schoolId),
    [schoolId, user?.role],
  );

  async function submitAssessment(row: Assessment) {
    setMsg('');
    try {
      await api.assessments.submit(row.assessment_id, row.version);
      setMsg(`Assessment ${row.assessment_id} was submitted for verification.`);
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
      setMsg(`Assessment ${row.assessment_id} was ${status.toLowerCase()}.`);
      setRejectingId('');
      setRejectionReason('');
      list.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'The assessment could not be verified.');
    }
  }

  return (
    <>
      <GovPageHeader
        title="Science Resource Assessments"
        description="Review lab infrastructure snapshots, track verification lifecycle, and record new field assessments."
        actions={
          user?.role === 'SCHOOL' || user?.role === 'FIELD_COORDINATOR' || apiMode === 'mock' ? (
            <GovButton
              variant="primary"
              onClick={() => navigate(`/assessments/new?school=${schoolId}`)}
            >
              + Record an assessment
            </GovButton>
          ) : undefined
        }
      />

      {apiMode === 'live' && (
        <GovAlert tone="info" className="mb-4">
          Assessment history is loaded per institution. Select or enter a valid School ID to view recorded submissions.
        </GovAlert>
      )}

      <GovFilterPanel>
        {apiMode === 'mock' ? (
          <GovField label="Select School Institution" htmlFor="assessment-school">
            <select
              id="assessment-school"
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
          <GovField label="Enter School Identification Code" htmlFor="assessment-school">
            <input
              id="assessment-school"
              className={inputCls}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              placeholder="e.g. sch-001 or UDISE code"
            />
          </GovField>
        )}
      </GovFilterPanel>

      {/* Admin Rejection Modal / Card */}
      {user?.role === 'ADMIN' && rejectingId && (
        <GovCard className="mb-4" as="div">
          <CardHeader
            title={`Reject Assessment (${rejectingId})`}
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
                  const row = list.data?.data.find((a) => a.assessment_id === rejectingId);
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

      <GovCard>
        <GovTable<Assessment>
          rows={list.data?.data ?? []}
          rowKey={(r) => r.assessment_id}
          columns={[
            { key: 'assessment_date', label: 'Assessment Date' },
            { key: 'assessment_id', label: 'Reference Number' },
            {
              key: 'status',
              label: 'Verification Status',
              render: (r) => <GovBadge value={r.status} />,
            },
            {
              key: 'resources',
              label: 'Resource Rows',
              render: (r) => (
                <span className="tabular-nums text-xs font-semibold text-[#4b6077]">
                  {r.resources?.length ?? '—'} items
                </span>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) =>
                r.status === 'DRAFT' && user?.role !== 'ADMIN' ? (
                  <GovButton size="sm" variant="secondary" onClick={() => submitAssessment(r)}>
                    Submit for verification
                  </GovButton>
                ) : r.status === 'SUBMITTED' && user?.role === 'ADMIN' ? (
                  <div className="flex items-center gap-2">
                    <GovButton size="sm" variant="primary" onClick={() => void verifyAssessment(r, 'VERIFIED')}>
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
                  </div>
                ) : (
                  <span className="text-xs text-[#9ca3af] italic">Completed</span>
                ),
            },
          ]}
          emptyText="No assessment records found. Select an institution to view submitted evaluations."
        />
      </GovCard>
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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState(params.get('school') ?? 'sch-001');
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
