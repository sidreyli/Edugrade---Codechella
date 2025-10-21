-- ============================================
-- COMPLETE DATABASE MIGRATION
-- Run this once to add all pending features
-- ============================================

-- 1. Add insights column to grades table
-- This allows students to see detailed AI feedback with strengths, weaknesses, and recommendations
ALTER TABLE grades ADD COLUMN IF NOT EXISTS insights JSONB;

COMMENT ON COLUMN grades.insights IS 'Structured AI feedback including strengths, weaknesses, and recommendations';

-- Index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_grades_insights ON grades USING GIN (insights);


-- 2. Add grading scale configuration to classrooms table
-- This allows teachers to customize grade thresholds per classroom
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS grading_scale JSONB DEFAULT '{
  "A": 90,
  "B": 80,
  "C": 70,
  "D": 60,
  "F": 0
}'::jsonb;

COMMENT ON COLUMN classrooms.grading_scale IS 'Custom grade thresholds for the classroom. Each key is a grade letter, value is the minimum percentage.';


-- 3. Add helper function to get letter grade based on classroom's scale
CREATE OR REPLACE FUNCTION get_letter_grade(score NUMERIC, classroom_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  grading_scale JSONB;
  grade_entry RECORD;
  letter_grade TEXT := 'F';
BEGIN
  -- Get the grading scale for the classroom
  SELECT c.grading_scale INTO grading_scale
  FROM classrooms c
  WHERE c.id = classroom_id_param;
  
  -- If no classroom found or no scale, use default
  IF grading_scale IS NULL THEN
    grading_scale := '{"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}'::jsonb;
  END IF;
  
  -- Find the appropriate letter grade
  FOR grade_entry IN 
    SELECT key as letter, value::numeric as threshold
    FROM jsonb_each(grading_scale)
    ORDER BY value::numeric DESC
  LOOP
    IF score >= grade_entry.threshold THEN
      letter_grade := grade_entry.letter;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN letter_grade;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_letter_grade IS 'Returns the letter grade for a score based on the classroom grading scale';


-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- What this adds:
-- ✅ insights column in grades table (for AI feedback)
-- ✅ grading_scale column in classrooms table (for custom grade thresholds)
-- ✅ get_letter_grade() function (for calculating letter grades)
--
-- Example: To set a custom grading scale for a classroom:
-- UPDATE classrooms 
-- SET grading_scale = '{"A": 95, "B": 85, "C": 75, "D": 65, "F": 0}'::jsonb 
-- WHERE id = 'your-classroom-id';
--
-- Example: To get a letter grade:
-- SELECT get_letter_grade(85, 'your-classroom-id');
-- ============================================
