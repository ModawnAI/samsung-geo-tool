-- Create playbook_documents table for tracking ingested documents
CREATE TABLE IF NOT EXISTS playbook_documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),
  section TEXT NOT NULL DEFAULT 'other',
  product_category TEXT NOT NULL DEFAULT 'all',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ko')),
  version TEXT NOT NULL DEFAULT '1.0',
  total_chunks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'indexed', 'failed')),
  error_message TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT NOT NULL DEFAULT 'system',
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_playbook_documents_status ON playbook_documents(status);

-- Create index on section for filtering
CREATE INDEX IF NOT EXISTS idx_playbook_documents_section ON playbook_documents(section);

-- Create index on product_category for filtering
CREATE INDEX IF NOT EXISTS idx_playbook_documents_product_category ON playbook_documents(product_category);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_playbook_documents_updated_at ON playbook_documents;
CREATE TRIGGER update_playbook_documents_updated_at
    BEFORE UPDATE ON playbook_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE playbook_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage playbook documents"
  ON playbook_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.email = 'admin@admin.com' OR auth.users.raw_user_meta_data->>'role' = 'admin')
    )
  );

-- Policy: Authenticated users can view indexed documents
CREATE POLICY "Users can view indexed playbook documents"
  ON playbook_documents
  FOR SELECT
  TO authenticated
  USING (status = 'indexed');
