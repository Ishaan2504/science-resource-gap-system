CREATE TABLE user_feedback (
  feedback_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  category varchar(20) NOT NULL CHECK (category IN ('INSTRUCTOR','SERVICE','EQUIPMENT')),
  target_name varchar(160) NOT NULL CHECK (length(trim(target_name)) > 0),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments varchar(2000) NOT NULL CHECK (length(trim(comments)) >= 10),
  school_id uuid REFERENCES schools(school_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_feedback_submitted_by_created_idx ON user_feedback(submitted_by, created_at DESC);
CREATE INDEX user_feedback_category_created_idx ON user_feedback(category, created_at DESC);
CREATE TRIGGER user_feedback_updated_at BEFORE UPDATE ON user_feedback
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
