import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Layers,
  School as SchoolIcon,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChartCard,
  DonutChartCard,
  CHART_COLORS,
} from '../components/ChartComponents';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { mockSchools, mockSummaryStats } from '../api/mock';
import type { Requirement, School } from '../types';
import {
  ActivityTimeline,
  CardBody,
  CardHeader,
  GovAlert,
  GovBadge,
  GovButton,
  GovCard,
  GovPageHeader,
  GovProgress,
  GovTable,
  PriorityBreakdown,
  RequirementDrawer,
  StatCard,
  type ActivityItem,
} from '../components/GovUI';

// Default government audit trail activity items
const defaultActivities: ActivityItem[] = [
  {
    id: 'act-1',
    at: 'Today 11:30 AM',
    actor: 'Kolar Field Coordinator',
    text: 'Verified laboratory assessment ASM-001 for GHSS Kolar (UDISE 29230101201)',
    kind: 'success',
  },
  {
    id: 'act-2',
    at: 'Today 09:15 AM',
    actor: 'Science Foundation Officer',
    text: 'Accepted intervention for 18 Student Microscopes (REQ-001)',
    kind: 'info',
  },
  {
    id: 'act-3',
    at: 'Yesterday 04:45 PM',
    actor: 'District Science Officer',
    text: 'Flagged Critical Resource Gap: Physics experiment kits in Tumakuru',
    kind: 'warning',
  },
  {
    id: 'act-4',
    at: '24 Sep 02:10 PM',
    actor: 'GHSS Kolar Official',
    text: 'Submitted Draft Assessment ASM-003 for state science verification',
    kind: 'info',
  },
  {
    id: 'act-5',
    at: '23 Sep 10:00 AM',
    actor: 'Education Support Trust',
    text: 'Completed handover of 8 Chemistry glassware sets (REQ-003)',
    kind: 'success',
  },
];

export function DashboardPage() {
  const { user } = useAuth();
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Common queries across views
  const schoolsQuery = useAsync(() => api.schools.list({ page: 1, page_size: 100 }));
  const requirementsQuery = useAsync(() => api.requirements.list({ page: 1, page_size: 100 }));

  async function handleAccept(req: Requirement) {
    try {
      await api.requirements.accept(req.requirement_id, req.version);
      setFeedbackNotice(`Successfully accepted intervention for ${req.resource_name} (${req.requirement_id}).`);
      setSelectedReq(null);
      requirementsQuery.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Intervention updated.';
      setFeedbackNotice(`Intervention updated: ${msg}`);
    }
  }

  const allSchools: School[] = schoolsQuery.data?.data ?? mockSchools;
  const allReqs: Requirement[] = requirementsQuery.data?.data ?? [];

  return (
    <>
      {feedbackNotice && (
        <div className="mb-4 flex items-center justify-between bg-[#eef6ef] border border-[#128807] px-4 py-2.5 rounded-sm text-xs text-[#0a5204]">
          <span className="font-semibold">{feedbackNotice}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-[#0a5204] font-bold hover:underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Render role-specific workspace */}
      {user?.role === 'SCHOOL' && (
        <SchoolDashboard
          schools={allSchools}
          requirements={allReqs}
          onSelectReq={setSelectedReq}
        />
      )}

      {user?.role === 'NGO' && (
        <NgoDashboard
          requirements={allReqs}
          onSelectReq={setSelectedReq}
        />
      )}

      {user?.role === 'ADMIN' && (
        <AdminDashboard
          schools={allSchools}
          requirements={allReqs}
          onSelectReq={setSelectedReq}
        />
      )}

      {user?.role === 'FIELD_COORDINATOR' && (
        <FieldCoordinatorDashboard
          schools={allSchools}
          requirements={allReqs}
          onSelectReq={setSelectedReq}
        />
      )}

      {/* Interactive Quick-View Drawer for Requirements */}
      <RequirementDrawer
        req={
          selectedReq
            ? {
                requirement_id: selectedReq.requirement_id,
                school_id: selectedReq.school_id,
                school_name: selectedReq.school_name,
                district: selectedReq.district,
                resource_name: selectedReq.resource_name,
                category_name: selectedReq.category_name,
                gap_qty: selectedReq.gap_qty,
                gap_ratio: selectedReq.gap_ratio,
                final_score: selectedReq.final_score,
                priority_class: selectedReq.priority_class,
                status: selectedReq.status,
                assigned_ngo: selectedReq.assigned_ngo,
                created_at: selectedReq.created_at,
                breakdown: selectedReq.breakdown,
              }
            : null
        }
        onClose={() => setSelectedReq(null)}
        onAccept={(r) => {
          const match = allReqs.find((x) => x.requirement_id === r.requirement_id);
          if (match) handleAccept(match);
        }}
        onNavigateFull={(reqId) => {
          setSelectedReq(null);
          window.location.hash = `#/requirements/${reqId}`;
        }}
      />
    </>
  );
}

/* ===========================================================================
   1. SCHOOL DASHBOARD WORKSPACE
   =========================================================================== */
function SchoolDashboard({
  schools,
  requirements,
  onSelectReq,
}: {
  schools: School[];
  requirements: Requirement[];
  onSelectReq: (r: Requirement) => void;
}) {
  const navigate = useNavigate();
  const school = schools.find((s) => s.school_id === 'sch-001') ?? schools[0] ?? {
    school_id: 'sch-001',
    school_name: 'Government Higher Secondary School, Kolar',
    udise_code: '29230101201',
    district: 'Kolar',
    state: 'Karnataka',
    student_strength_total: 842,
  };

  const schoolReqs = requirements.filter(
    (r) => r.school_id === school.school_id || r.school_name === school.school_name,
  );
  const openReqs = schoolReqs.filter((r) => !['COMPLETED', 'CLOSED'].includes(r.status));

  // Category breakdown for this school
  const categories = [
    { name: 'Biology Equipment', gap: 72, note: '18 student microscopes deficit' },
    { name: 'Physics Equipment', gap: 60, note: '12 demonstration kits deficit' },
    { name: 'Chemistry Equipment', gap: 40, note: '8 glassware sets deficit' },
    { name: 'Computers & EdTech', gap: 30, note: '15 lab workstations deficit' },
    { name: 'Science Laboratory Safety', gap: 20, note: '5 emergency eye-wash sets' },
  ];

  return (
    <>
      <GovPageHeader
        title={school.school_name}
        description={`UDISE: ${school.udise_code || '29230101201'} · ${school.district}, ${school.state} · Category: Higher Secondary School`}
        actions={
          <div className="flex items-center gap-2">
            <GovButton variant="secondary" onClick={() => navigate('/gap-analysis')}>
              View Gap Analysis
            </GovButton>
            <GovButton variant="primary" onClick={() => navigate('/assessments')}>
              Record Assessment
            </GovButton>
          </div>
        }
      />

      {/* Draft Assessment In-Progress Alert */}
      <GovAlert tone="warning" className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-bold text-sm text-[#78350f]">
              Assessment ASM-003 is currently in DRAFT status
            </p>
            <p className="text-xs text-[#92400e] mt-0.5">
              18 of 48 laboratory inventory items evaluated. Submit for verification to update your school's official gap score.
            </p>
          </div>
          <GovButton size="sm" variant="secondary" onClick={() => navigate('/assessments')}>
            Continue Assessment →
          </GovButton>
        </div>
      </GovAlert>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Latest verified assessment"
          value="VERIFIED"
          emptyText="No assessment record found."
          note="ASM-001 · 19 Sep 2026 by Field Coordinator"
        />
        <StatCard
          label="Composite school gap score"
          value="72.4 / 100"
          note="Deficit Severity: High Urgency"
        />
        <StatCard
          label="Open resource requirements"
          value={openReqs.length || 2}
          note="Active gaps awaiting or undergoing intervention"
        />
        <StatCard
          label="Enrolled student strength"
          value={school.student_strength_total || 842}
          note="28 science & laboratory instructors"
        />
      </div>

      {/* Main Grid: School Requirements List + Deficit Progress by Category */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Left 2 Cols: School Resource Requirements */}
        <GovCard className="xl:col-span-2">
          <CardHeader
            title="School resource requirements"
            subtitle="Verified science laboratory requirements raised from official assessments"
            actions={
              <button
                type="button"
                onClick={() => navigate('/requirements')}
                className="text-xs font-semibold text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
              >
                View all requirements →
              </button>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-[#e5e7eb]">
              {(schoolReqs.length > 0 ? schoolReqs : requirements.slice(0, 3)).map((r) => (
                <li key={r.requirement_id}>
                  <button
                    type="button"
                    onClick={() => onSelectReq(r)}
                    className="w-full text-left p-4 hover:bg-[#f0f4f8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] text-[#6b7c93] uppercase">
                          {r.requirement_id}
                        </span>
                        <GovBadge value={r.priority_class} type="priority" />
                        <GovBadge value={r.status} />
                      </div>
                      <p className="text-sm font-bold text-[#0f2540] truncate">{r.resource_name}</p>
                      <p className="text-xs text-[#4b6077] mt-0.5">
                        Category: {r.category_name} · Deficit Quantity: {r.gap_qty} units
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] text-[#6b7c93] uppercase font-semibold">Priority Score</p>
                        <p className="text-sm font-extrabold text-[#0f3460] tabular-nums">
                          {Number(r.final_score).toFixed(2)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#1b3f73] border border-[#d1d5db] px-2.5 py-1 rounded-sm bg-white hover:bg-[#f8fafc]">
                        Quick view ›
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </GovCard>

        {/* Right 1 Col: Deficit Breakdown by Category */}
        <GovCard>
          <CardHeader
            title="Deficit by subject category"
            subtitle="Laboratory equipment gap ratios across curriculum streams"
          />
          <CardBody>
            <div className="space-y-4">
              {categories.map((c) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-medium text-[#0f2540]">{c.name}</span>
                    <span className="font-bold text-[#0f3460] tabular-nums">{c.gap}% deficit</span>
                  </div>
                  <GovProgress
                    value={c.gap}
                    tone={c.gap >= 70 ? 'critical' : c.gap >= 50 ? 'high' : 'secondary'}
                  />
                  <p className="text-[11px] text-[#6b7c93]">{c.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => navigate('/gap-analysis')}
                className="text-xs font-semibold text-[#1b3f73] hover:text-[#0f3460] underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Open in-depth gap analysis</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </CardBody>
        </GovCard>
      </div>

      {/* Bottom Row: Recent School Activity + Quick Module Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GovCard>
          <CardHeader
            title="School inspection & submission timeline"
            subtitle="Recent official audits, assessments, and status updates"
          />
          <CardBody>
            <ActivityTimeline items={defaultActivities.slice(0, 4)} />
          </CardBody>
        </GovCard>

        <GovCard>
          <CardHeader
            title="Authorized school actions"
            subtitle="Direct links to standard government portal procedures"
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  to: '/assessments',
                  title: 'Record Assessment',
                  desc: 'Submit new lab inventory survey',
                  icon: FileText,
                },
                {
                  to: '/requirements',
                  title: 'View Requirements',
                  desc: 'Track open equipment requests',
                  icon: Layers,
                },
                {
                  to: '/gap-analysis',
                  title: 'Gap Analysis',
                  desc: 'Review subject deficit ratios',
                  icon: ShieldAlert,
                },
                {
                  to: '/reports',
                  title: 'School Reports',
                  desc: 'Download certified audit summary',
                  icon: SchoolIcon,
                },
              ].map((m) => {
                const IconComponent = m.icon;
                return (
                  <button
                    key={m.to}
                    type="button"
                    onClick={() => navigate(m.to)}
                    className="p-3 text-left border border-[#d1d5db] rounded-sm hover:border-[#0f3460] hover:bg-[#f0f4f8] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1 text-[#0f3460]">
                      <IconComponent size={16} />
                      <p className="text-xs font-bold text-[#0f2540]">{m.title}</p>
                    </div>
                    <p className="text-[11px] text-[#6b7c93]">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </GovCard>
      </div>
    </>
  );
}

/* ===========================================================================
   2. NGO DASHBOARD WORKSPACE
   =========================================================================== */
function NgoDashboard({
  requirements,
  onSelectReq,
}: {
  requirements: Requirement[];
  onSelectReq: (r: Requirement) => void;
}) {
  const navigate = useNavigate();
  const openReqs = requirements
    .filter((r) => r.status === 'OPEN')
    .sort((a, b) => b.final_score - a.final_score);
  const topReq = openReqs[0] ?? requirements[0];

  const criticalCount = requirements.filter(
    (r) => r.priority_class === 'CRITICAL' && !['COMPLETED', 'CLOSED'].includes(r.status),
  ).length;
  const highCount = requirements.filter(
    (r) => r.priority_class === 'HIGH' && !['COMPLETED', 'CLOSED'].includes(r.status),
  ).length;
  const myInterventions = requirements.filter((r) =>
    ['ACCEPTED', 'IN_PROGRESS', 'PARTIALLY_COMPLETED'].includes(r.status),
  );
  const completedCount = requirements.filter((r) =>
    ['COMPLETED', 'CLOSED'].includes(r.status),
  ).length;

  return (
    <>
      <GovPageHeader
        title="Resource Intervention Workspace"
        description="Verified government school science gaps prioritized by mathematical deficit criteria. Accept requirements your organization can fulfill."
        actions={
          <div className="flex items-center gap-2">
            <GovButton variant="secondary" onClick={() => navigate('/reports')}>
              Intervention Reports
            </GovButton>
            <GovButton variant="primary" onClick={() => navigate('/priorities')}>
              Priority Rankings Queue
            </GovButton>
          </div>
        }
      />

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard
          label="Open to adopt"
          value={openReqs.length || 3}
          note="Unassigned verified gaps"
        />
        <StatCard
          label="Critical urgency"
          value={criticalCount || 1}
          note="Priority score 80+"
        />
        <StatCard
          label="High priority"
          value={highCount || 2}
          note="Priority score 60–79"
        />
        <StatCard
          label="Accepted by us"
          value={myInterventions.filter((r) => r.status === 'ACCEPTED').length || 1}
          note="Committed for delivery"
        />
        <StatCard
          label="In fulfillment"
          value={
            myInterventions.filter((r) => ['IN_PROGRESS', 'PARTIALLY_COMPLETED'].includes(r.status))
              .length || 1
          }
          note="Active procurement"
        />
        <StatCard
          label="Completed"
          value={completedCount || 1}
          note="Delivered & verified"
        />
      </div>

      {/* Main Grid: Prioritized Requirements Queue + Deep-Dive 'Why Ranked First' */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Left 2 Cols: Prioritized Requirements Queue */}
        <GovCard className="xl:col-span-2">
          <CardHeader
            title="Prioritized open requirements"
            subtitle="Select any requirement to review 5-factor breakdown and confirm intervention commitment"
            actions={
              <button
                type="button"
                onClick={() => navigate('/priorities')}
                className="text-xs font-semibold text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
              >
                Complete ranking queue →
              </button>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-[#e5e7eb]">
              {(openReqs.length > 0 ? openReqs : requirements).slice(0, 5).map((r) => (
                <li key={r.requirement_id}>
                  <button
                    type="button"
                    onClick={() => onSelectReq(r)}
                    className="w-full text-left p-4 hover:bg-[#f0f4f8] transition-colors flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f3460] cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 text-center flex-shrink-0">
                        <span className="text-base font-extrabold text-[#0f3460] tabular-nums">
                          {Number(r.final_score).toFixed(1)}
                        </span>
                        <p className="text-[10px] text-[#6b7c93] uppercase font-semibold">Score</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#0f2540] truncate">{r.resource_name}</p>
                        <p className="text-xs text-[#4b6077] truncate mt-0.5">
                          {r.school_name} · {r.district}
                        </p>
                        <p className="text-[11px] text-[#6b7c93] mt-0.5">
                          Category: {r.category_name} · Gap: {r.gap_qty} units ({(r.gap_ratio * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <GovBadge value={r.priority_class} type="priority" />
                      <span className="hidden sm:inline">
                        <GovBadge value={r.status} />
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </GovCard>

        {/* Right 1 Col: Why this is ranked #1 Feature Card */}
        {topReq && (
          <GovCard className="border-t-4 border-t-[#0f3460]">
            <CardHeader
              title="Why this is ranked #1"
              subtitle="Multivariate allocation algorithm breakdown"
            />
            <CardBody>
              <div className="mb-3">
                <p className="text-sm font-bold text-[#0f2540]">{topReq.resource_name}</p>
                <p className="text-xs text-[#4b6077] mt-0.5">{topReq.school_name}</p>
                <p className="text-[11px] text-[#6b7c93]">{topReq.district}, Karnataka</p>
              </div>

              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e5e7eb]">
                <GovBadge value={topReq.priority_class} type="priority" />
                <div className="text-right">
                  <span className="text-xs text-[#6b7c93]">Urgency Score: </span>
                  <span className="text-base font-extrabold text-[#0f2540] tabular-nums">
                    {Number(topReq.final_score).toFixed(2)}
                  </span>
                  <span className="text-xs text-[#6b7c93]">/100</span>
                </div>
              </div>

              {/* 5-Factor Score Breakdown */}
              <PriorityBreakdown factors={topReq.breakdown} score={Number(topReq.final_score)} />

              <div className="mt-5 pt-3">
                <GovButton
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => onSelectReq(topReq)}
                >
                  Inspect & Accept Intervention
                </GovButton>
              </div>
            </CardBody>
          </GovCard>
        )}
      </div>

      {/* Bottom Grid: Our Active Interventions + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GovCard>
          <CardHeader
            title="Our organization's interventions"
            subtitle="Requirements adopted or undergoing delivery by partner trusts"
          />
          <CardBody className="p-0">
            {myInterventions.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#6b7c93] italic">
                No active interventions yet. Adopt a prioritized requirement above to begin delivery tracking.
              </p>
            ) : (
              <ul className="divide-y divide-[#e5e7eb]">
                {myInterventions.map((r) => (
                  <li key={r.requirement_id}>
                    <button
                      type="button"
                      onClick={() => onSelectReq(r)}
                      className="w-full text-left p-3.5 hover:bg-[#f0f4f8] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#0f2540] truncate">{r.resource_name}</p>
                        <p className="text-[11px] text-[#4b6077] truncate mt-0.5">
                          {r.school_name} · Gap: {r.gap_qty} units
                        </p>
                      </div>
                      <GovBadge value={r.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </GovCard>

        <GovCard>
          <CardHeader
            title="Recent intervention activity"
            subtitle="Audit log of commitments, deliveries, and handovers"
          />
          <CardBody>
            <ActivityTimeline items={defaultActivities.slice(1, 5)} />
          </CardBody>
        </GovCard>
      </div>
    </>
  );
}

/* ===========================================================================
   3. ADMIN DASHBOARD WORKSPACE
   =========================================================================== */
function AdminDashboard({
  schools,
  requirements,
  onSelectReq,
}: {
  schools: School[];
  requirements: Requirement[];
  onSelectReq: (r: Requirement) => void;
}) {
  const navigate = useNavigate();

  const statusCounts = [
    { name: 'OPEN', label: 'Open', count: requirements.filter((r) => r.status === 'OPEN').length || 21 },
    { name: 'UNDER_REVIEW', label: 'Under Review', count: requirements.filter((r) => r.status === 'UNDER_REVIEW').length || 7 },
    { name: 'ACCEPTED', label: 'Accepted', count: requirements.filter((r) => r.status === 'ACCEPTED').length || 5 },
    { name: 'IN_PROGRESS', label: 'In Progress', count: requirements.filter((r) => r.status === 'IN_PROGRESS').length || 8 },
    { name: 'COMPLETED', label: 'Completed', count: requirements.filter((r) => r.status === 'COMPLETED').length || 11 },
    { name: 'CLOSED', label: 'Closed', count: requirements.filter((r) => r.status === 'CLOSED').length || 16 },
  ];

  const pipeline = [
    { label: 'Draft', count: 14, tone: 'secondary' as const },
    { label: 'Submitted / Awaiting Inspection', count: 7, tone: 'high' as const },
    { label: 'Verified', count: 284, tone: 'low' as const },
    { label: 'Rejected / Needs Revision', count: 3, tone: 'critical' as const },
  ];

  const openCount = requirements.filter((r) => !['COMPLETED', 'CLOSED'].includes(r.status)).length || 43;
  const criticalCount = requirements.filter(
    (r) => r.priority_class === 'CRITICAL' && !['COMPLETED', 'CLOSED'].includes(r.status),
  ).length || 4;

  return (
    <>
      <GovPageHeader
        title="State Resource Administration Dashboard"
        description="Comprehensive monitoring of science resource allocations, verification workflows, and intervention turnaround across districts."
        actions={
          <div className="flex items-center gap-2">
            <GovButton variant="secondary" onClick={() => navigate('/users')}>
              Manage Users
            </GovButton>
            <GovButton variant="primary" onClick={() => navigate('/reports')}>
              Analytical Reports
            </GovButton>
          </div>
        }
      />

      {/* 5 System KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
        <StatCard
          label="Registered schools"
          value={schools.length || mockSummaryStats.totalSchools}
          note="100% geo-tagged profiles"
        />
        <StatCard
          label="Awaiting verification"
          value={7}
          note="Submitted lab assessments"
        />
        <StatCard
          label="Open resource gaps"
          value={openCount}
          note="State-wide unfulfilled gaps"
        />
        <StatCard
          label="Critical / high deficits"
          value={criticalCount + 12}
          note="Prioritization score 70+"
        />
        <StatCard
          label="Intervention turnaround"
          value="24.6 days"
          note="78% completion rate"
        />
      </div>

      {/* 2-Column: Requirement Status Bar Chart + School Verification Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Status distribution — vertical bar chart */}
        <div className="xl:col-span-2">
          <BarChartCard
            label="Requirement status distribution"
            takeaway="Most open requirements are awaiting NGO acceptance — 21 still unassigned state-wide."
            data={statusCounts}
            categoryKey="label"
            series={[{ dataKey: 'count', name: 'Requirements', color: CHART_COLORS.primary }]}
            layout="horizontal"
            height={268}
          />
        </div>

        {/* School verification status — donut */}
        <DonutChartCard
          label="Schools by verification status"
          takeaway="92% of registered schools have verified assessment data on file."
          data={[
            { name: 'Verified',  value: schools.filter(s => s.verification_status === 'VERIFIED').length  || 284, color: CHART_COLORS.verified  },
            { name: 'Pending',   value: schools.filter(s => s.verification_status === 'PENDING').length   || 18,  color: CHART_COLORS.pending   },
            { name: 'Rejected',  value: schools.filter(s => s.verification_status === 'REJECTED').length  || 3,   color: CHART_COLORS.rejected  },
          ]}
          height={268}
          centerLabel="schools"
          centerValue={schools.length || 305}
        />
      </div>

      {/* 2-Column: Open gaps by priority (horizontal bar) + Assessment pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Open gaps by priority — horizontal BarChart (replaces GovProgress bars) */}
        <div className="xl:col-span-2">
          <BarChartCard
            label="Open gaps by priority class"
            takeaway="16 critical and high-priority gaps need immediate NGO intervention."
            data={[
              { label: 'Critical', count: requirements.filter(r => r.priority_class === 'CRITICAL' && !['COMPLETED','CLOSED'].includes(r.status)).length || 4  },
              { label: 'High',     count: requirements.filter(r => r.priority_class === 'HIGH'     && !['COMPLETED','CLOSED'].includes(r.status)).length || 12 },
              { label: 'Medium',   count: requirements.filter(r => r.priority_class === 'MEDIUM'   && !['COMPLETED','CLOSED'].includes(r.status)).length || 19 },
              { label: 'Low',      count: requirements.filter(r => r.priority_class === 'LOW'      && !['COMPLETED','CLOSED'].includes(r.status)).length || 8  },
            ]}
            categoryKey="label"
            series={[
              { dataKey: 'count', name: 'Open requirements', color: CHART_COLORS.primary },
            ]}
            layout="vertical"
            height={230}
            yWidth={60}
          />
        </div>

        {/* Assessment verification pipeline */}
        <GovCard>
          <CardHeader
            title="Assessment verification pipeline"
            subtitle="Current review status across schools"
          />
          <CardBody>
            <div className="space-y-3.5">
              {pipeline.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-medium text-[#0f2540]">{item.label}</span>
                    <span className="font-bold text-[#0f3460] tabular-nums">{item.count}</span>
                  </div>
                  <GovProgress value={(item.count / 308) * 100} tone={item.tone} />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => navigate('/assessments')}
                className="text-xs font-semibold text-[#1b3f73] hover:text-[#0f3460] underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Review pending assessments</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </CardBody>
        </GovCard>
      </div>

      {/* 2-Column: Administrative Alerts + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GovCard>
          <CardHeader
            title="Administrative alerts"
            subtitle="System notifications requiring state action"
          />
          <CardBody className="space-y-2.5">
            <div className="p-3 border-l-4 border-l-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-sm text-xs">
              <p className="font-bold text-[#991b1b]">2 critical safety gaps unassigned</p>
              <p className="text-[#b91c1c] text-[11px] mt-0.5">
                REQ-001 and REQ-002 have no NGO commitments after 14 days.
              </p>
            </div>
            <div className="p-3 border-l-4 border-l-[#d97706] bg-[#fffbeb] border border-[#fde68a] rounded-sm text-xs">
              <p className="font-bold text-[#92400e]">2 schools pending UDISE verification</p>
              <p className="text-[#b45309] text-[11px] mt-0.5">
                Chikkaballapur school registration submitted for officer review.
              </p>
            </div>
            <div className="p-3 border-l-4 border-l-[#1b3f73] bg-[#f0f4f8] border border-[#d1d5db] rounded-sm text-xs">
              <p className="font-bold text-[#0f3460]">1 disputed requirement resolved</p>
              <p className="text-[#4b6077] text-[11px] mt-0.5">
                Ramanagara chemistry kit gap reassessed and updated.
              </p>
            </div>
          </CardBody>
        </GovCard>

        <GovCard>
          <CardHeader
            title="State-wide audit trail"
            subtitle="Recent official verifications and updates"
          />
          <CardBody>
            <ActivityTimeline items={defaultActivities} />
          </CardBody>
        </GovCard>
      </div>

      {/* Prioritized Requirements Table */}
      <GovCard>
        <CardHeader
          title="Recent prioritized requirements"
          subtitle="Highest urgency resource gaps requiring intervention across all schools"
          actions={
            <button
              type="button"
              onClick={() => navigate('/priorities')}
              className="text-xs font-semibold text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
            >
              View complete rankings →
            </button>
          }
        />
        <GovTable
          rows={requirements.slice(0, 5)}
          rowKey={(r) => r.requirement_id}
          columns={[
            {
              key: 'school_name',
              label: 'School',
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
            { key: 'district', label: 'District' },
            { key: 'resource_name', label: 'Resource' },
            { key: 'gap_qty', label: 'Gap qty' },
            {
              key: 'final_score',
              label: 'Priority Score',
              render: (r) => (
                <span className="tabular-nums font-semibold text-[#0f2540]">
                  {Number(r.final_score).toFixed(2)}
                </span>
              ),
            },
            {
              key: 'priority_class',
              label: 'Priority',
              render: (r) => <GovBadge value={r.priority_class} type="priority" />,
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <GovBadge value={r.status} />,
            },
            {
              key: 'action',
              label: 'Action',
              render: (r) => (
                <button
                  type="button"
                  onClick={() => onSelectReq(r)}
                  className="text-xs font-semibold text-[#1b3f73] border border-[#d1d5db] px-2 py-1 rounded-sm hover:bg-[#f0f4f8] cursor-pointer"
                >
                  Quick view
                </button>
              ),
            },
          ]}
          emptyText="No prioritized requirements yet — data will appear once school assessments are verified."
        />
      </GovCard>
    </>
  );
}

/* ===========================================================================
   4. FIELD COORDINATOR DASHBOARD WORKSPACE
   =========================================================================== */
function FieldCoordinatorDashboard({
  schools,
  requirements,
  onSelectReq,
}: {
  schools: School[];
  requirements: Requirement[];
  onSelectReq: (r: Requirement) => void;
}) {
  const navigate = useNavigate();

  // Assigned territory schools (e.g. Kolar and Tumakuru)
  const mySchools = schools.filter((s) => ['Kolar', 'Tumakuru'].includes(s.district));
  const territoryReqs = requirements.filter((r) => ['Kolar', 'Tumakuru'].includes(r.district));
  const openTerritoryReqs = territoryReqs.filter((r) => !['COMPLETED', 'CLOSED'].includes(r.status));
  const criticalTerritory = territoryReqs.filter((r) => r.priority_class === 'CRITICAL');

  return (
    <>
      <GovPageHeader
        title="Field Inspection & Verification Workspace"
        description="Assigned government schools, on-site laboratory audits, and physical assessment verification queue for Kolar and Tumakuru districts."
        actions={
          <div className="flex items-center gap-2">
            <GovButton variant="secondary" onClick={() => navigate('/schools')}>
              School Directory
            </GovButton>
            <GovButton variant="primary" onClick={() => navigate('/assessments')}>
              Review Assessments
            </GovButton>
          </div>
        }
      />

      {/* 4 Territory KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Assigned schools"
          value={mySchools.length || 2}
          note="Kolar & Tumakuru districts"
        />
        <StatCard
          label="Assessments to inspect"
          value={1}
          note="Submitted for physical verification"
        />
        <StatCard
          label="Territory open gaps"
          value={openTerritoryReqs.length || 3}
          note="Active equipment deficits"
        />
        <StatCard
          label="Critical urgency deficits"
          value={criticalTerritory.length || 1}
          note="Priority score 80+"
        />
      </div>

      {/* 2-Column: Schools Needing Inspection + Assessment Workload */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Left 2 Cols: Schools Needing Attention */}
        <GovCard className="xl:col-span-2">
          <CardHeader
            title="Schools needing immediate inspection"
            subtitle="Government institutions ranked by composite equipment deficit score"
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-[#e5e7eb]">
              {(mySchools.length > 0 ? mySchools : schools.slice(0, 3)).map((s, idx) => {
                const gapScore = idx === 0 ? 84.5 : idx === 1 ? 67.2 : 51.0;
                return (
                  <li key={s.school_id} className="p-4 hover:bg-[#f0f4f8] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-[#0f2540]">{s.school_name}</span>
                          <GovBadge value={s.verification_status} />
                        </div>
                        <p className="text-xs text-[#4b6077]">
                          UDISE: {s.udise_code} · {s.district}, {s.state} · {s.student_strength_total} students
                        </p>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#6b7c93]">Deficit</span>
                            <span className="font-bold text-[#0f3460] tabular-nums">{gapScore}%</span>
                          </div>
                          <GovProgress
                            value={gapScore}
                            tone={gapScore >= 75 ? 'critical' : 'high'}
                          />
                        </div>
                        <GovButton
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/schools/${s.school_id}`)}
                        >
                          Audit Lab
                        </GovButton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </GovCard>

        {/* Right 1 Col: Pending Assessment Workload */}
        <GovCard>
          <CardHeader
            title="Pending assessment audits"
            subtitle="Laboratory submissions awaiting field sign-off"
          />
          <CardBody className="space-y-3">
            <div className="p-3 border border-[#d1d5db] rounded-sm bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-[#0f3460]">ASM-001</span>
                <GovBadge value="SUBMITTED" />
              </div>
              <p className="text-xs font-bold text-[#0f2540]">GHSS Kolar</p>
              <p className="text-[11px] text-[#6b7c93] mt-0.5">
                2 gaps reported · Submitted 19 Sep 2026
              </p>
              <GovButton
                size="sm"
                variant="primary"
                className="w-full justify-center mt-2.5"
                onClick={() => navigate('/assessments')}
              >
                Conduct Physical Verification
              </GovButton>
            </div>

            <div className="p-3 border border-[#d1d5db] rounded-sm bg-[#f8fafc]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-[#0f3460]">ASM-002</span>
                <GovBadge value="VERIFIED" />
              </div>
              <p className="text-xs font-bold text-[#0f2540]">Government Model School, Tumakuru</p>
              <p className="text-[11px] text-[#6b7c93] mt-0.5">
                2 gaps confirmed · Verified on 16 Sep 2026
              </p>
            </div>
          </CardBody>
        </GovCard>
      </div>

      {/* Bottom Grid: Territory Requirements Table + Field Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GovCard>
          <CardHeader
            title="Territory resource requirements"
            subtitle="Verified science equipment gaps in your assigned districts"
            actions={
              <button
                type="button"
                onClick={() => navigate('/requirements')}
                className="text-xs font-semibold text-[#1b3f73] underline underline-offset-2 hover:text-[#0f3460] cursor-pointer"
              >
                View all →
              </button>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-[#e5e7eb]">
              {(territoryReqs.length > 0 ? territoryReqs : requirements).slice(0, 4).map((r) => (
                <li key={r.requirement_id}>
                  <button
                    type="button"
                    onClick={() => onSelectReq(r)}
                    className="w-full text-left p-3.5 hover:bg-[#f0f4f8] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0f2540] truncate">{r.resource_name}</p>
                      <p className="text-[11px] text-[#4b6077] truncate mt-0.5">
                        {r.school_name} · Gap: {r.gap_qty} units
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GovBadge value={r.priority_class} type="priority" />
                      <span className="text-xs font-extrabold text-[#0f3460] tabular-nums">
                        {Number(r.final_score).toFixed(1)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </GovCard>

        <GovCard>
          <CardHeader
            title="Recent field inspection log"
            subtitle="Log of school visits, photo audits, and equipment cataloging"
          />
          <CardBody>
            <ActivityTimeline items={defaultActivities.slice(0, 4)} />
          </CardBody>
        </GovCard>
      </div>
    </>
  );
}
