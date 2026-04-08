-- Optional: split-bucket setup only. The app defaults to a single bucket (`community-documents`) for all community materials;
-- use this migration only if you intentionally store client-only files in a separate bucket named `client_documents`.
-- Apply via Supabase SQL editor or `supabase db push` when using the Supabase CLI.

INSERT INTO storage.buckets (id, name, public)
VALUES ('client_documents', 'client_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow signed-in users to read objects (downloads use the authenticated Supabase client).
DROP POLICY IF EXISTS "client_documents_select_authenticated" ON storage.objects;
CREATE POLICY "client_documents_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client_documents');
