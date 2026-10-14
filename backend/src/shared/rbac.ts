type RequirementAccessRow = {
  status: string;
  assigned_org_id: string | null;
  school_verification?: string;
  assessment_status?: string;
};

/** NGO visibility is global for unassigned, active opportunities and private for assigned work. */
export function canNgoViewRequirement(row: RequirementAccessRow, orgId: string | null, orgVerified: boolean): boolean {
  if (!orgId || !orgVerified || row.school_verification !== 'VERIFIED' || row.assessment_status !== 'VERIFIED') return false;
  if (row.assigned_org_id === orgId) return true;
  return row.assigned_org_id === null && ['OPEN', 'UNDER_REVIEW'].includes(row.status);
}

export function schoolVisibleInterventions(rows: any[] | null | undefined) {
  return (rows ?? []).map(({ status_at_entry, created_at }) => ({ status_at_entry, created_at }));
}

export function schoolVisibleFeedback(rows: any[] | null | undefined) {
  return (rows ?? []).filter((row) => row.source === 'SCHOOL');
}

export function schoolVisibleRequirement(row: Record<string, any>) {
  const { assigned_org_id: _assignedOrg, data_changed_since_acceptance: _ngoWorkflowFlag, ...visible } = row;
  return visible;
}

