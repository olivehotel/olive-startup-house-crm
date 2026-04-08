-- Bucket `client-documents` for client audience materials (parallel to `community-documents` for common).
-- Apply via Supabase SQL editor or `supabase db push` when using the Supabase CLI.

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Legacy policy from older migration using bucket id `client_documents`
DROP POLICY IF EXISTS "client_documents_select_authenticated" ON storage.objects;

DROP POLICY IF EXISTS "client_documents_hyphen_select_authenticated" ON storage.objects;
CREATE POLICY "client_documents_hyphen_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');
