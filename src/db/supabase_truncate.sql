-- ==============================================================================
-- COLLinSight - Fresh State Database Truncate / Reset Script for Supabase
-- Target Endpoint: https://snsqkogfrrtyloqetowx.supabase.co
-- Schema: public
--
-- Purpose:
--   Performs a genuine fresh reset by truncating all application data rows
--   (departments, organizations, student accounts, events, transactions,
--   audit trails, reports, etc.) while retaining only:
--     1. System Administrator account (Team COLLinSight CITE)
--     2. College Dean account (Dr. Marilou Villanueva)
--     3. One Faculty Adviser account (Prof. Eduardo Reyes)
--     4. Standard baseline Event Types and Expenditure Categories
-- ==============================================================================

BEGIN;

-- Temporarily drop circular FK on organizations.adviser_id if present
ALTER TABLE IF EXISTS public.organizations DROP CONSTRAINT IF EXISTS fk_org_adviser;

-- Truncate all tables in public schema
TRUNCATE TABLE
  public.exported_reports,
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

-- Re-establish FK on organizations
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_org_adviser
  FOREIGN KEY (adviser_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 1. BASELINE EVENT TYPES
-- ------------------------------------------------------------------------------
INSERT INTO public.event_types (id, name, description, deleted) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Academic Seminar', 'Formal talks, guest lectures, and intellectual symposia.', false),
  ('b1000000-0000-0000-0000-000000000002', 'Leadership Training', 'Officer development and team building programs.', false),
  ('b1000000-0000-0000-0000-000000000003', 'Community Outreach', 'Civic engagement and community service initiatives.', false),
  ('b1000000-0000-0000-0000-000000000004', 'Sports Fest', 'Intramural games and athletic tournaments.', false),
  ('b1000000-0000-0000-0000-000000000005', 'Cultural Festival', 'Creative exhibitions, talent presentations, and artistic gatherings.', false),
  ('b1000000-0000-0000-0000-000000000006', 'Technical Workshop', 'Hands-on laboratories, coding hackathons, and technical bootcamps.', false);

-- ------------------------------------------------------------------------------
-- 2. BASELINE EXPENDITURE CATEGORIES
-- ------------------------------------------------------------------------------
INSERT INTO public.expenditure_categories (id, name, description, deleted) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Venue & Logistics', 'Audio visual equipment, room reservations, and staging.', false),
  ('c1000000-0000-0000-0000-000000000002', 'Food & Catering', 'Meals, refreshments, and bottled water for participants.', false),
  ('c1000000-0000-0000-0000-000000000003', 'Supplies & Materials', 'Event kits, hardware components, and consumable stationeries.', false),
  ('c1000000-0000-0000-0000-000000000004', 'Transportation', 'Vehicle rentals and fuel allowances for outreach.', false),
  ('c1000000-0000-0000-0000-000000000005', 'Printing & Documentation', 'Tarpaulins, certificates, badges, and program brochures.', false),
  ('c1000000-0000-0000-0000-000000000006', 'Speaker & Honorarium', 'Professional fees and tokens of appreciation for resource persons.', false),
  ('c1000000-0000-0000-0000-000000000007', 'Promotional Materials', 'Social media collateral and marketing merchandise.', false);

-- ------------------------------------------------------------------------------
-- 3. CORE INSTITUTIONAL ACCOUNTS (Admin, Dean, 1 Adviser)
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
-- 4. INITIAL AUDIT RECORD
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
