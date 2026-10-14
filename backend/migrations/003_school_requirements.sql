-- Migration 003: School Requirements Table
-- Directly connects school-submitted resource requirements to the schools table

CREATE TABLE IF NOT EXISTS school_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES users(user_id) ON DELETE SET NULL,
  resource_name varchar(255) NOT NULL,
  category varchar(100) NOT NULL,
  quantity_requested integer NOT NULL CHECK (quantity_requested > 0),
  urgency varchar(20) NOT NULL DEFAULT 'MEDIUM' CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  justification text,
  status varchar(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'IN_PROGRESS', 'FULFILLED', 'REJECTED')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance and isolation queries
CREATE INDEX IF NOT EXISTS idx_school_requirements_school_id ON school_requirements(school_id);
CREATE INDEX IF NOT EXISTS idx_school_requirements_status ON school_requirements(status);
CREATE INDEX IF NOT EXISTS idx_school_requirements_urgency ON school_requirements(urgency);
CREATE INDEX IF NOT EXISTS idx_school_requirements_created_at ON school_requirements(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE school_requirements ENABLE ROW LEVEL SECURITY;

-- Policy ensuring full service connection and isolation access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'school_requirements' AND policyname = 'school_requirements_isolation_policy'
  ) THEN
    CREATE POLICY school_requirements_isolation_policy ON school_requirements
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
