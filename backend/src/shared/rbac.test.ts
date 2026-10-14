import test from 'node:test';
import assert from 'node:assert/strict';
import { canNgoViewRequirement, schoolVisibleFeedback, schoolVisibleInterventions, schoolVisibleRequirement } from './rbac';

test('NGO can discover an unassigned opportunity across districts when school and assessment are verified', () => {
  assert.equal(canNgoViewRequirement({ status: 'OPEN', assigned_org_id: null, school_verification: 'VERIFIED', assessment_status: 'VERIFIED' }, 'ngo-a', true), true);
});

test('NGO cannot view another organization’s assigned requirement or unverified data', () => {
  const row = { status: 'IN_PROGRESS', assigned_org_id: 'ngo-b', school_verification: 'VERIFIED', assessment_status: 'VERIFIED' };
  assert.equal(canNgoViewRequirement(row, 'ngo-a', true), false);
  assert.equal(canNgoViewRequirement({ ...row, assigned_org_id: null }, 'ngo-a', false), false);
  assert.equal(canNgoViewRequirement({ ...row, school_verification: 'PENDING' }, 'ngo-a', true), false);
});

test('school-facing projections omit NGO private notes, identities, and non-school feedback', () => {
  assert.deepEqual(schoolVisibleInterventions([{ status_at_entry: 'IN_PROGRESS', created_at: 'now', comments: 'private', org_id: 'ngo-b', updated_by: 'user-b' }]), [{ status_at_entry: 'IN_PROGRESS', created_at: 'now' }]);
  assert.deepEqual(schoolVisibleFeedback([{ source: 'SCHOOL', comments: 'confirmed' }, { source: 'NGO', comments: 'private' }]), [{ source: 'SCHOOL', comments: 'confirmed' }]);
  assert.deepEqual(schoolVisibleRequirement({ status: 'IN_PROGRESS', assigned_org_id: 'ngo-b', data_changed_since_acceptance: true, fulfilled_qty: 2 }), { status: 'IN_PROGRESS', fulfilled_qty: 2 });
});

