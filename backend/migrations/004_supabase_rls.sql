-- Supabase Row Level Security (RLS) Configuration
-- Enables RLS on all operational tables and adds access policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_coordinator_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_status_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically in Supabase.
-- For authenticated/public roles, define read/write policies:

-- 1. Resource Categories & Resources (Read-only for all authenticated/anon; Admin writes)
DROP POLICY IF EXISTS resource_categories_read_policy ON resource_categories;
CREATE POLICY resource_categories_read_policy ON resource_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS resources_read_policy ON resources;
CREATE POLICY resources_read_policy ON resources
  FOR SELECT USING (is_active = true);

-- 2. Schools:
-- Schools can view and edit their own profile.
-- Admins can view and verify all schools.
-- NGOs can view verified schools.
DROP POLICY IF EXISTS schools_read_policy ON schools;
CREATE POLICY schools_read_policy ON schools
  FOR SELECT USING (
    auth.uid() = user_id
    OR verification_status = 'VERIFIED'
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('ADMIN', 'FIELD_COORDINATOR'))
  );

DROP POLICY IF EXISTS schools_update_policy ON schools;
CREATE POLICY schools_update_policy ON schools
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- 3. Organizations:
-- NGOs can view/edit their own organization profile.
-- Admins can view and verify all organizations.
DROP POLICY IF EXISTS org_read_policy ON organizations;
CREATE POLICY org_read_policy ON organizations
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS org_update_policy ON organizations;
CREATE POLICY org_update_policy ON organizations
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- 4. Assessments & School Resources:
-- Schools can manage their own assessments.
-- Admins can view/verify.
DROP POLICY IF EXISTS assessments_read_policy ON assessments;
CREATE POLICY assessments_read_policy ON assessments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM schools s WHERE s.school_id = assessments.school_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role IN ('ADMIN', 'FIELD_COORDINATOR'))
  );

DROP POLICY IF EXISTS assessments_insert_policy ON assessments;
CREATE POLICY assessments_insert_policy ON assessments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM schools s WHERE s.school_id = assessments.school_id AND s.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- 5. Requirements:
-- Verified schools can see their own requirements.
-- NGOs can see verified public OPEN/UNDER_REVIEW requirements and their own assigned requirements.
-- Admins see all requirements.
DROP POLICY IF EXISTS requirements_read_policy ON requirements;
CREATE POLICY requirements_read_policy ON requirements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM schools s WHERE s.school_id = requirements.school_id AND s.user_id = auth.uid())
    OR (
      status IN ('OPEN', 'UNDER_REVIEW')
      AND EXISTS (SELECT 1 FROM schools s WHERE s.school_id = requirements.school_id AND s.verification_status = 'VERIFIED')
    )
    OR EXISTS (SELECT 1 FROM organizations o WHERE o.org_id = requirements.assigned_org_id AND o.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- 6. Interventions:
-- NGOs can only view and update their own intervention records.
-- Schools can view safe progress records on their requirements.
-- Admins can view all interventions.
DROP POLICY IF EXISTS interventions_read_policy ON interventions;
CREATE POLICY interventions_read_policy ON interventions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.org_id = interventions.org_id AND o.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM requirements r
      JOIN schools s ON s.school_id = r.school_id
      WHERE r.requirement_id = interventions.requirement_id AND s.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS interventions_insert_policy ON interventions;
CREATE POLICY interventions_insert_policy ON interventions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organizations o WHERE o.org_id = interventions.org_id AND o.user_id = auth.uid() AND o.verification_status = 'VERIFIED')
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- 7. User Feedback:
-- Users can see their own submitted feedback; Admins can see all feedback.
DROP POLICY IF EXISTS user_feedback_read_policy ON user_feedback;
CREATE POLICY user_feedback_read_policy ON user_feedback
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS user_feedback_insert_policy ON user_feedback;
CREATE POLICY user_feedback_insert_policy ON user_feedback
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
  );
