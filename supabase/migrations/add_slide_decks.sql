-- Create slide_decks table
CREATE TABLE IF NOT EXISTS slide_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slides JSONB NOT NULL,
  theme TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slide_decks_lesson_plan ON slide_decks(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_slide_decks_teacher ON slide_decks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_slide_decks_created ON slide_decks(created_at DESC);

-- RLS policies
ALTER TABLE slide_decks ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own slide decks
CREATE POLICY "Teachers can view own slide decks"
  ON slide_decks FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can create slide decks
CREATE POLICY "Teachers can create slide decks"
  ON slide_decks FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own slide decks
CREATE POLICY "Teachers can update own slide decks"
  ON slide_decks FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can delete their own slide decks
CREATE POLICY "Teachers can delete own slide decks"
  ON slide_decks FOR DELETE
  USING (auth.uid() = teacher_id);

COMMENT ON TABLE slide_decks IS 'AI-generated slide decks for lesson plans';
COMMENT ON COLUMN slide_decks.slides IS 'Array of slide objects with content, notes, and metadata';
