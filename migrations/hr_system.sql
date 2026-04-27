-- ====================================================================
-- HR System Migration — لجنة الموارد البشرية في العائلة
-- شغّل هذا في Supabase SQL Editor
-- ====================================================================

-- 1) إضافة أعمدة HR في profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_hr_member BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hr_status    TEXT;
  -- hr_status: NULL | 'active' | 'needs_followup' | 'issue' | 'resolved'

-- 2) ملاحظات HR — خاصة، لا يراها العضو نفسه
CREATE TABLE IF NOT EXISTS hr_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_notes_member ON hr_notes(member_id);

-- 3) سجل التواصل
CREATE TABLE IF NOT EXISTS hr_contact_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  summary      TEXT,
  channel      TEXT, -- 'phone' | 'whatsapp' | 'email' | 'meeting' | 'other'
  contacted_by UUID NOT NULL REFERENCES profiles(id),
  contacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_contact_member ON hr_contact_log(member_id);

-- 4) المستندات (روابط فقط — تخزين فعلي عبر Supabase Storage)
CREATE TABLE IF NOT EXISTS hr_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  doc_type     TEXT, -- 'id' | 'contract' | 'medical' | 'other'
  uploaded_by  UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_docs_member ON hr_documents(member_id);

-- ====================================================================
-- RLS Policies — أعضاء HR فقط + المالك
-- ====================================================================

ALTER TABLE hr_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_contact_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_documents  ENABLE ROW LEVEL SECURITY;

-- helper: هل المستخدم الحالي عضو HR أو owner؟
CREATE OR REPLACE FUNCTION is_hr_or_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (is_hr_member = TRUE OR role = 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- hr_notes
DROP POLICY IF EXISTS hr_notes_read ON hr_notes;
CREATE POLICY hr_notes_read ON hr_notes
  FOR SELECT USING (is_hr_or_owner());

DROP POLICY IF EXISTS hr_notes_write ON hr_notes;
CREATE POLICY hr_notes_write ON hr_notes
  FOR ALL USING (is_hr_or_owner()) WITH CHECK (is_hr_or_owner());

-- hr_contact_log
DROP POLICY IF EXISTS hr_contact_read ON hr_contact_log;
CREATE POLICY hr_contact_read ON hr_contact_log
  FOR SELECT USING (is_hr_or_owner());

DROP POLICY IF EXISTS hr_contact_write ON hr_contact_log;
CREATE POLICY hr_contact_write ON hr_contact_log
  FOR ALL USING (is_hr_or_owner()) WITH CHECK (is_hr_or_owner());

-- hr_documents
DROP POLICY IF EXISTS hr_docs_read ON hr_documents;
CREATE POLICY hr_docs_read ON hr_documents
  FOR SELECT USING (is_hr_or_owner());

DROP POLICY IF EXISTS hr_docs_write ON hr_documents;
CREATE POLICY hr_docs_write ON hr_documents
  FOR ALL USING (is_hr_or_owner()) WITH CHECK (is_hr_or_owner());

-- ملاحظة: تعديل is_hr_member في profiles مقيد بـ RLS الحالي على profiles
-- (المالك فقط — راجع policies الموجودة)
