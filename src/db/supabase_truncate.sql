-- ==============================================================================
-- COLLinSight - Fresh State Database Truncate / Reset Script for Supabase
-- Target Endpoint: https://snsqkogfrrtyloqetowx.supabase.co
-- Schema: public
--
-- Purpose:
--   Performs a genuine fresh reset by truncating all application data rows
--   (departments, organizations, student accounts, event types/classifications,
--   expenditure categories, events, transactions, audit trails, reports, etc.)
--   while retaining ONLY:
--     1. System Administrator account (Team COLLinSight CITE)
--     2. College Dean account (Dr. Marilou Villanueva)
--     3. Dedicated SDS account (Student Development & Services)
--     4. One Faculty Adviser account (Prof. Eduardo Reyes)
-- ==============================================================================

BEGIN;

-- Temporarily drop circular FK on organizations.adviser_id if present
ALTER TABLE IF EXISTS public.organizations DROP CONSTRAINT IF EXISTS fk_org_adviser;

-- Truncate all tables in public schema
TRUNCATE TABLE
  public.exported_reports,
  public.initiatives,
  public.event_signatories,
  public.organization_members,
  public.audit_trail,
  public.transactions,
  public.events,
  public.expenditure_categories,
  public.event_types,
  public.users,
  public.organizations,
  public.departments
RESTART IDENTITY CASCADE;

-- Ensure settings column exists on public.users
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb;

-- Ensure users_role_check constraint allows sds and cmo
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE IF EXISTS public.users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'adviser', 'dean', 'admin', 'sds', 'cmo'));

-- Ensure events_status_check constraint includes 'For Review (SDS)'
ALTER TABLE IF EXISTS public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE IF EXISTS public.events ADD CONSTRAINT events_status_check CHECK (
  status IN (
    'Created',
    'For Review',
    'For Approval',
    'Approved',
    'For Review (SDS)',
    'SDS Authorized',
    'CMO Authorized',
    'Pending Revision',
    'Rejected',
    'Completed',
    'Closed'
  )
);

-- Re-establish FK on organizations
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_org_adviser
  FOREIGN KEY (adviser_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 1. CORE INSTITUTIONAL ACCOUNTS (Admin, Dean, 1 Adviser)
-- ------------------------------------------------------------------------------
INSERT INTO public.users (
  id, first_name, middle_name, last_name, suffix, email, password,
  role, position, gender, organization_id, year_level, member_since, deleted, settings
) VALUES
  -- 1 Sole Administrator
  (
    'a1000000-0000-0000-0000-000000000001',
    'Team COLLinSight',
    '',
    'CITE',
    '',
    'admin@cite.edu.ph',
    'collinsight_admins',
    'admin',
    'System Administrator',
    'non-binary',
    NULL,
    'Faculty/Staff',
    '2022-06-01',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  -- College Dean
  (
    'e1000000-0000-0000-0000-000000000001',
    'Marilou',
    'Castro',
    'Villanueva',
    'Ph.D.',
    'dean@cite.edu.ph',
    'villanueva_441209',
    'dean',
    'College Dean',
    'female',
    NULL,
    'Faculty/Staff',
    '2020-08-01',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  -- Student Development & Services (SDS) Dedicated Account
  (
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
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  -- One Faculty Adviser (unassigned, ready for new organization creation)
  (
    'ad100000-0000-0000-0000-000000000001',
    'Eduardo',
    'Severino',
    'Reyes',
    '',
    'ereyes@cite.edu.ph',
    'reyes_773012',
    'adviser',
    'Faculty Adviser',
    'male',
    NULL,
    'Faculty/Staff',
    '2021-06-01',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  );

-- ------------------------------------------------------------------------------
-- 2. INITIAL AUDIT RECORD
-- ------------------------------------------------------------------------------
INSERT INTO public.audit_trail (
  id, user_id, action, details, timestamp,
  event_id, organization_id, actor_role, status_from, status_to, remarks
) VALUES
  (
    't1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'System Reset',
    'Fresh Database Reset executed. Baseline Administrator, Dean, and Adviser accounts initialized.',
    NOW(),
    NULL,
    NULL,
    'admin',
    NULL,
    NULL,
    'Fresh starting state initialized.'
  );

COMMIT;
