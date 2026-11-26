-- Sprint 13B: Content-Addressed Binary Evidence Vault (Supabase Storage + Metadata Columns)

-- 1. Provision public read / append-only upload bucket for site captures (5 MB cap, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-evidence',
  'field-evidence',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Object RLS Policies (append-only: SELECT + INSERT; UPDATE/DELETE omitted)
DROP POLICY IF EXISTS "field_evidence_public_read" ON storage.objects;
CREATE POLICY "field_evidence_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'field-evidence');

DROP POLICY IF EXISTS "field_evidence_append_insert" ON storage.objects;
CREATE POLICY "field_evidence_append_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'field-evidence');

-- 3. Add optional binary vault metadata columns to field_evidence_packets
ALTER TABLE IF EXISTS public.field_evidence_packets
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_object_path TEXT,
  ADD COLUMN IF NOT EXISTS media_bytes INTEGER;

NOTIFY pgrst, 'reload schema';
