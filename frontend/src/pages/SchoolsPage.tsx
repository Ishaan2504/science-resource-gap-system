import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiMode } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { mockSchools } from '../api/mock';
import type { School } from '../types';
import {
  GovAlert,
  GovBadge,
  GovButton,
  GovCard,
  GovField,
  GovFilterPanel,
  GovPageHeader,
  GovPagination,
  GovTable,
  inputCls,
  CardHeader,
  CardBody,
} from '../components/GovUI';

// ─── Schools Register Page ───────────────────────────────────────────────────

export function SchoolsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState('');

  const result = useAsync(
    () =>
      api.schools.list({
        page,
        page_size: 10,
        search,
        district,
        verification_status: status,
      }),
    [page, search, district, status],
  );

  let rows = result.data?.data ?? [];
  if (apiMode === 'mock' && user?.role === 'SCHOOL') {
    rows = rows.filter((r) => r.school_id === 'sch-001');
  }
  const maharashtraDistricts = ['Nagpur', 'Amravati', 'Bhandara', 'Yavatmal', 'Akola', 'Chandrapur', 'Buldhana', 'Gondia', 'Wardha', 'Washim', 'Gadchiroli'];
  const districts = [...new Set([...maharashtraDistricts, ...mockSchools.map((s) => s.district), ...rows.map((s) => s.district)])].filter(Boolean).sort();

  return (
    <>
      <GovPageHeader
        title="Schools Directory"
        description="Search registered school profiles, view infrastructure details, and verify institutional status."
        actions={
          apiMode === 'mock' || user?.role === 'ADMIN' ? (
            <GovButton variant="primary" onClick={() => navigate('/schools/new')}>
              + Register school profile
            </GovButton>
          ) : undefined
        }
      />

      <GovFilterPanel>
        <GovField label="Search school or UDISE+ code" htmlFor="school-search">
          <input
            id="school-search"
            className={inputCls}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. Government Higher Primary School or 09040204601"
          />
        </GovField>
        <GovField label="District" htmlFor="district-filter">
          <select
            id="district-filter"
            className={inputCls}
            value={district}
            onChange={(e) => {
              setDistrict(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </GovField>
        <GovField label="Verification status" htmlFor="school-status">
          <select
            id="school-status"
            className={inputCls}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All verification statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending verification</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </GovField>
      </GovFilterPanel>

      {result.error && apiMode === 'live' ? (
        <GovAlert tone="error">{result.error}</GovAlert>
      ) : (
        <GovCard>
          <GovTable<School>
            rows={rows}
            rowKey={(r) => r.school_id}
            columns={[
              {
                key: 'school_name',
                label: 'School Name',
                render: (r) => (
                  <button
                    type="button"
                    onClick={() => navigate(`/schools/${r.school_id}`)}
                    className="text-left font-medium text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
                  >
                    {r.school_name}
                  </button>
                ),
              },
              { key: 'udise_code', label: 'UDISE+ Code' },
              { key: 'district', label: 'District' },
              {
                key: 'school_type',
                label: 'Type',
                render: (r) => (
                  <span className="capitalize text-xs font-medium text-[#4b6077]">
                    {r.school_type.toLowerCase()}
                  </span>
                ),
              },
              {
                key: 'student_strength_total',
                label: 'Student Strength',
                render: (r) => (
                  <span className="tabular-nums font-medium text-[#0f2540]">
                    {r.student_strength_total.toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                key: 'verification_status',
                label: 'Status',
                render: (r) => <GovBadge value={r.verification_status} />,
              },
            ]}
            emptyText="No school profiles match the selected filter criteria."
          />
          <GovPagination
            page={page}
            pageSize={10}
            total={result.data?.total_count ?? rows.length}
            onChange={setPage}
          />
        </GovCard>
      )}
    </>
  );
}

// ─── School Detail Page ──────────────────────────────────────────────────────

export function SchoolDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const school = useAsync(() => api.schools.detail(id), [id]);
  const history = useAsync(
    () =>
      apiMode === 'mock'
        ? api.assessments.list(id).then((p) => ({ assessments: p.data }))
        : api.reports.schoolHistory(id),
    [id],
  );

  if (school.loading) {
    return <p className="text-sm text-[#6b7c93] py-6 text-center italic">Loading school profile…</p>;
  }
  if (school.error) {
    return <GovAlert tone="error">{school.error}</GovAlert>;
  }

  const row = school.data!;
  const assessments =
    (
      history.data as {
        assessments?: Array<{ assessment_id: string; assessment_date: string; status: string }>;
      } | null
    )?.assessments ?? [];

  return (
    <>
      <GovPageHeader
        title={row.school_name}
        description={`UDISE+: ${row.udise_code || 'Not assigned'} · ${row.district}, ${row.state}`}
        actions={
          <div className="flex items-center gap-2">
            <GovButton variant="secondary" onClick={() => navigate('/schools')}>
              ← Back to directory
            </GovButton>
            {apiMode === 'mock' && (
              <GovButton variant="secondary" onClick={() => navigate(`/schools/${id}/edit`)}>
                Edit profile
              </GovButton>
            )}
            {user?.role !== 'ADMIN' && (user?.role === 'SCHOOL' || user?.role === 'FIELD_COORDINATOR') && (
              <GovButton variant="primary" onClick={() => navigate(`/assessments/new?school=${id}`)}>
                Record assessment
              </GovButton>
            )}
          </div>
        }
      />

      {apiMode === 'live' && (
        <GovAlert tone="info" className="mb-4">
          Viewing verified school profile. Profile modifications are reserved for school administrative officers.
        </GovAlert>
      )}

      {/* Institutional Details Panel */}
      <GovCard className="mb-5">
        <CardHeader
          title="Institutional profile details"
          subtitle="Official records filed with the Department of School Education"
        />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">
                UDISE+ Code
              </p>
              <p className="text-sm font-semibold text-[#0f2540]">
                {row.udise_code || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">
                School Category
              </p>
              <p className="text-sm font-semibold text-[#0f2540] capitalize">
                {row.school_type.toLowerCase()} School
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">
                Total Enrolled Students
              </p>
              <p className="text-sm font-semibold text-[#0f2540] tabular-nums">
                {row.student_strength_total.toLocaleString('en-IN')} students
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">
                Verification Status
              </p>
              <GovBadge value={row.verification_status} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 border-t border-[#e5e7eb] pt-3 mt-1">
              <p className="text-xs text-[#6b7c93] uppercase font-semibold tracking-wide mb-1">
                Official Campus Address
              </p>
              <p className="text-sm text-[#1e3a5f] leading-relaxed">
                {row.address || 'Campus address not specified.'}
              </p>
            </div>
          </div>
        </CardBody>
      </GovCard>

      {history.error && apiMode === 'live' && (
        <GovAlert tone="warning" className="mb-4">
          {history.error}
        </GovAlert>
      )}

      {/* Assessment History */}
      <GovCard>
        <CardHeader
          title="Submitted science resource assessments"
          subtitle="Chronological assessment snapshots for gap identification"
          actions={
            <button
              type="button"
              onClick={() => navigate(`/gap-analysis?school=${id}`)}
              className="text-xs font-semibold text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
            >
              Analyze resource gaps →
            </button>
          }
        />
        <GovTable
          rows={assessments}
          rowKey={(a) => a.assessment_id}
          columns={[
            { key: 'assessment_date', label: 'Assessment Date' },
            { key: 'assessment_id', label: 'Reference ID' },
            {
              key: 'status',
              label: 'Verification Status',
              render: (a) => <GovBadge value={a.status} />,
            },
          ]}
          emptyText="No science resource assessments recorded for this school yet."
        />
      </GovCard>
    </>
  );
}

// ─── School Form Page ────────────────────────────────────────────────────────

export function SchoolFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [name, setName] = useState('');
  const [udise, setUdise] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Karnataka');
  const [schoolType, setSchoolType] = useState<School['school_type']>('GOVERNMENT');
  const [strength, setStrength] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.schools
      .detail(id)
      .then((s) => {
        setName(s.school_name);
        setUdise(s.udise_code ?? '');
        setDistrict(s.district);
        setState(s.state);
        setSchoolType(s.school_type);
        setStrength(String(s.student_strength_total));
        setAddress(s.address ?? '');
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'School profile could not be loaded.'),
      );
  }, [id]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const payload = {
      school_name: name,
      udise_code: udise || undefined,
      district,
      state,
      school_type: schoolType,
      student_strength_total: Number(strength),
      address: address || undefined,
    };
    try {
      const result = editing 
        ? await api.schools.update(id!, payload)
        : await api.schools.create(payload);
      
      // Navigate to the school detail page after successful creation/update
      navigate(`/schools/${result.school_id || id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The school profile could not be saved.');
    }
  }

  return (
    <>
      <GovPageHeader
        title={editing ? 'Edit School Profile' : 'Register New School Profile'}
        description="Official institutional registration form for science resource gap evaluation and allocation."
      />

      {apiMode === 'live' && editing && (
        <GovAlert tone="warning" className="mb-4">
          Live backend enforces role authentication for institutional profile modifications.
        </GovAlert>
      )}
      {error && <GovAlert tone="error" className="mb-4">{error}</GovAlert>}

      <GovCard className="max-w-3xl" as="div">
        <CardHeader
          title="Institutional Information"
          subtitle="All fields marked with an asterisk are required under GIGW guidelines."
        />
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <GovField label="Official School Name" htmlFor="school-name" required>
              <input
                id="school-name"
                required
                maxLength={255}
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Government Higher Primary School, Channapatna"
              />
            </GovField>

            <GovField
              label="UDISE+ School Code"
              htmlFor="udise"
              hint="Enter the official 11-digit Unified District Information System for Education code."
            >
              <input
                id="udise"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
                className={inputCls}
                value={udise}
                onChange={(e) => setUdise(e.target.value)}
                placeholder="11 digits (e.g. 29200401201)"
              />
            </GovField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GovField label="District" htmlFor="school-district" required>
                <input
                  id="school-district"
                  required
                  className={inputCls}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Ramanagara"
                />
              </GovField>
              <GovField label="State / UT" htmlFor="school-state" required>
                <input
                  id="school-state"
                  required
                  className={inputCls}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </GovField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GovField label="Management Type" htmlFor="school-type" required>
                <select
                  id="school-type"
                  className={inputCls}
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value as School['school_type'])}
                >
                  <option value="GOVERNMENT">Government</option>
                  <option value="AIDED">Government-Aided</option>
                  <option value="PRIVATE">Private Un-aided</option>
                </select>
              </GovField>
              <GovField label="Total Student Strength" htmlFor="student-strength" required>
                <input
                  id="student-strength"
                  type="number"
                  min="0"
                  required
                  className={inputCls}
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="Total enrolled students"
                />
              </GovField>
            </div>

            <GovField
              label="Full Postal Address"
              htmlFor="school-address"
              hint="Include postal pin code and landmark."
            >
              <textarea
                id="school-address"
                rows={3}
                className={`${inputCls} min-h-[80px] resize-y`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete institutional address"
              />
            </GovField>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#e5e7eb]">
              <GovButton variant="secondary" type="button" onClick={() => navigate('/schools')}>
                Cancel
              </GovButton>
              <GovButton variant="primary" type="submit">
                {editing ? 'Save Profile Changes' : 'Register School Profile'}
              </GovButton>
            </div>
          </form>
        </CardBody>
      </GovCard>
    </>
  );
}
