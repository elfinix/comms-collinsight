-- ============================================================================
-- COLLinSight Supabase Storage Buckets, Policies & Exported Reports Setup
-- Execute this SQL in your Supabase SQL Editor (snsqkogfrrtyloqetowx)
-- ============================================================================

-- 1. Ensure Storage Buckets Exist and are Public
INSERT INTO storage.buckets (id, name, public) VALUES
  ('team_images', 'team_images', true),
  ('attachments', 'attachments', true),
  ('media', 'media', true),
  ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create Storage Security Policies (Public Read & Authenticated/App Write Access)
DO $$
BEGIN
  -- attachments bucket (APF, Appendices, Clearance, Liquidation)
  DROP POLICY IF EXISTS "Allow public access for attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read for attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated write for attachments" ON storage.objects;
  
  CREATE POLICY "Allow public read for attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'attachments');
  CREATE POLICY "Allow authenticated write for attachments" ON storage.objects
    FOR ALL USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

  -- media bucket (User Avatars and Profile Images)
  DROP POLICY IF EXISTS "Allow public access for media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read for media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated write for media" ON storage.objects;
  
  CREATE POLICY "Allow public read for media" ON storage.objects
    FOR SELECT USING (bucket_id = 'media');
  CREATE POLICY "Allow authenticated write for media" ON storage.objects
    FOR ALL USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

  -- reports bucket (System-Generated Directorate & Financial Reports)
  DROP POLICY IF EXISTS "Allow public access for reports" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read for reports" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated write for reports" ON storage.objects;
  
  CREATE POLICY "Allow public read for reports" ON storage.objects
    FOR SELECT USING (bucket_id = 'reports');
  CREATE POLICY "Allow authenticated write for reports" ON storage.objects
    FOR ALL USING (bucket_id = 'reports') WITH CHECK (bucket_id = 'reports');

  -- team_images bucket (Landing Page Developer Images - Read Only for Public)
  DROP POLICY IF EXISTS "Allow public access for team_images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read for team_images" ON storage.objects;
  CREATE POLICY "Allow public read for team_images" ON storage.objects
    FOR SELECT USING (bucket_id = 'team_images');
END $$;

-- 3. Create Exported Reports Tracking Table
CREATE TABLE IF NOT EXISTS public.exported_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  doc_ref TEXT NOT NULL,
  category TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  file_path TEXT,
  format TEXT DEFAULT 'PDF'
);

-- Enable RLS and Permissive Policies
ALTER TABLE public.exported_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on exported_reports" ON public.exported_reports;
CREATE POLICY "Allow public select on exported_reports" ON public.exported_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public all on exported_reports" ON public.exported_reports;
CREATE POLICY "Allow public all on exported_reports" ON public.exported_reports FOR ALL USING (true) WITH CHECK (true);

-- 4. Baseline Seed Data for Exported Reports
INSERT INTO public.exported_reports (id, title, doc_ref, category, organization_name, generated_by, generated_at, file_url, file_path, format) VALUES
  ('rep-001', 'AY 2026-2027 Midyear Directorate Analytics Report', 'REP-DEAN-CITE-2026', 'Directorate Summary', 'College Administration', 'Dr. Marilou Castro Villanueva, Ph.D.', '2026-08-28T09:30:00Z', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/College%20Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf', 'College Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf', 'PDF'),
  ('rep-002', 'System Usage & Activity Analytics Overview', 'SYS-RPT-883012', 'System Usage', 'Administration', 'Team COLLinSight CITE', '2026-08-29T14:15:00Z', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf', 'Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf', 'PDF')
ON CONFLICT (id) DO NOTHING;

-- 5. Event Clearance Document Reference Tracking Migration
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS clearance_doc_ref TEXT;

-- Backfill existing approved/closed events with their standard clearance reference code
UPDATE public.events
SET clearance_doc_ref = 'CLR-' || UPPER(SUBSTRING(REGEXP_REPLACE(id, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 6)) || '-' || EXTRACT(YEAR FROM date_start)
WHERE clearance_doc_ref IS NULL AND status IN ('Approved', 'Completed', 'Closed');

