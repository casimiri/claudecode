-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for legal documents bucket
-- Allow authenticated users to read legal documents
CREATE POLICY "Authenticated users can read legal documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'legal-documents');

-- Allow admins to insert legal documents
CREATE POLICY "Admins can upload legal documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'legal-documents' AND
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE email = auth.email()
    )
  );

-- Allow admins to update legal documents
CREATE POLICY "Admins can update legal documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'legal-documents' AND
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE email = auth.email()
    )
  );

-- Allow admins to delete legal documents
CREATE POLICY "Admins can delete legal documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'legal-documents' AND
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE email = auth.email()
    )
  );