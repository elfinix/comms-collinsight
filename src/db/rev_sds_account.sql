-- ============================================================================
-- Step 3: Dedicated Account & Infrastructure for Student Development & Services (SDS)
-- ============================================================================

-- 1. Extend Users Role Check Constraint to include 'sds' (and 'cmo')
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'adviser', 'dean', 'admin', 'sds', 'cmo'));

-- 2. Insert or Update Dedicated SDS Account
INSERT INTO public.users (
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  email,
  password,
  role,
  position,
  gender,
  organization_id,
  year_level,
  member_since,
  settings,
  deleted,
  created_at
) VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'Student Development & Services',
  'Office',
  '(SDS)',
  'LCUP',
  'sds@cite.edu.ph',
  'collinsight_sds',
  'sds',
  'Director of Student Development & Services',
  'non-binary',
  NULL,
  'Faculty/Staff',
  '2022-01-01',
  '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb,
  false,
  now()
) ON CONFLICT (email) DO UPDATE SET
  role = 'sds',
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  position = EXCLUDED.position,
  password = EXCLUDED.password;

-- 3. Link existing token-based SDS signatories to the dedicated SDS user ID
UPDATE public.event_signatories
SET user_id = 'd1000000-0000-0000-0000-000000000001'
WHERE role = 'sds' AND (user_id = 'sds-external-token' OR user_id IS NULL);

