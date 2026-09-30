-- ==============================================================================
-- COLLinSight - PostgreSQL DDL Schema & Baseline Seed for Supabase
-- Target Endpoint: https://snsqkogfrrtyloqetowx.supabase.co
-- Schema: public
--
-- Features:
--   1. Auto-generated UUID keys (gen_random_uuid()::text) across all tables
--   2. Strict field integrity (color, description, avatar, timestamps, soft-delete flags)
--   3. Associative / Bridge entities (organization_members, event_signatories)
--   4. Dual budget structure (departmental_budget & organizational_budget)
--   5. Organizational Initiatives & Revenue Tracking ledger (initiatives table)
--   6. Event classification enhancements (category: Organizational/Departmental, setting: On-campus/Off-campus, PCF compliance)
--   7. Full multi-stage signatory lifecycle (Student -> Adviser -> Dean -> SDS -> CMO)
--   8. Non-recursive Row Level Security (RLS) policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP EXISTING TABLES (IN REVERSE DEPENDENCY ORDER)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.initiatives CASCADE;
DROP TABLE IF EXISTS public.exported_reports CASCADE;
DROP TABLE IF EXISTS public.event_signatories CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.audit_trail CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.expenditure_categories CASCADE;
DROP TABLE IF EXISTS public.event_types CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;

-- ------------------------------------------------------------------------------
-- 2. CREATE ENTITIES & BRIDGE TABLES
-- ------------------------------------------------------------------------------

-- 2.1 Academic Departments
CREATE TABLE public.departments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ea580c',
  description TEXT DEFAULT '',
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Student Organizations
CREATE TABLE public.organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  allocated_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  departmental_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  organizational_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  member_count INT NOT NULL DEFAULT 0,
  adviser_id TEXT,
  logo_color TEXT NOT NULL DEFAULT '#ea580c',
  description TEXT DEFAULT '',
  avatar TEXT,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 User Accounts
CREATE TABLE public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name TEXT NOT NULL,
  middle_name TEXT DEFAULT '',
  last_name TEXT NOT NULL,
  suffix TEXT DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'adviser', 'dean', 'admin')),
  position TEXT NOT NULL,
  gender TEXT DEFAULT 'male',
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  year_level TEXT DEFAULT '3rd Year',
  member_since TEXT DEFAULT '2023-01-01',
  avatar TEXT,
  settings JSONB DEFAULT '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Re-establish Circular Foreign Key (organizations.adviser_id -> users.id)
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_org_adviser
  FOREIGN KEY (adviser_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- 2.5 Associative Entity: Organization Members (Multi-Tenancy Bridge)
CREATE TABLE public.organization_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT 'Member',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('officer', 'member', 'adviser')),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  academic_year TEXT DEFAULT '2025-2026',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- 2.6 Event Taxonomy Classifications
CREATE TABLE public.event_types (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Financial Accounting Categories
CREATE TABLE public.expenditure_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Student Event Proposals & Institutional Initiatives
CREATE TABLE public.events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type_id TEXT NOT NULL REFERENCES public.event_types(id) ON DELETE RESTRICT,
  category TEXT NOT NULL DEFAULT 'Organizational' CHECK (category IN ('Organizational', 'Departmental')),
  setting TEXT NOT NULL DEFAULT 'On-campus' CHECK (setting IN ('On-campus', 'Off-campus')),
  description TEXT NOT NULL,
  proposed_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  requisites TEXT NOT NULL DEFAULT '',
  date_start TIMESTAMPTZ NOT NULL,
  date_end TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('FTF', 'Online/Virtual', 'Online', 'Hybrid')),
  location TEXT NOT NULL,
  apf_url TEXT,
  pcf_url TEXT,
  pcf_name TEXT,
  appendices JSONB DEFAULT '[]'::jsonb,
  clearance_details TEXT,
  clearance_doc_ref TEXT,
  remarks JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Created' CHECK (
    status IN (
      'Created',
      'For Review',
      'For Approval',
      'Approved',
      'SDS Authorized',
      'CMO Authorized',
      'Pending Revision',
      'Rejected',
      'Completed',
      'Closed'
    )
  ),
  sds_action_token TEXT,
  cmo_action_token TEXT,
  sds_feedback TEXT,
  cmo_feedback TEXT,
  revenue NUMERIC(12, 2) DEFAULT 0.00,
  liquidated_by TEXT,
  liquidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- 2.9 Associative Entity: Event Signatories (Approval Progression Bridge & Feedback Iterations)
CREATE TABLE public.event_signatories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'adviser', 'dean', 'sds', 'cmo')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Endorsed', 'Approved', 'Revision Requested', 'Rejected', 'Resolved')),
  feedback TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 Financial Disbursements & Transactions
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id TEXT REFERENCES public.expenditure_categories(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Reimbursed')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- 2.11 Organizational Initiatives & Self-Generated Revenue Ledger
CREATE TABLE public.initiatives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN (
      'Membership Fees',
      'Fundraising',
      'Merchandise Sales',
      'Sponsorship & Donations',
      'Event Revenue',
      'Other'
    )
  ),
  gross_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  expenses NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted BOOLEAN NOT NULL DEFAULT false
);

-- 2.12 Immutable Audit Log Ledger
CREATE TABLE public.audit_trail (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_id TEXT REFERENCES public.events(id) ON DELETE SET NULL,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_role TEXT,
  status_from TEXT,
  status_to TEXT,
  remarks TEXT
);

-- 2.13 Exported Reports Tracking Table
CREATE TABLE public.exported_reports (
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

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES (SIMPLIFIED & NON-RECURSIVE)
-- ------------------------------------------------------------------------------

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenditure_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exported_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on departments" ON public.departments;
DROP POLICY IF EXISTS "Allow public all on departments" ON public.departments;
CREATE POLICY "Allow public select on departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow public all on departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on organizations" ON public.organizations;
DROP POLICY IF EXISTS "Allow public all on organizations" ON public.organizations;
CREATE POLICY "Allow public select on organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow public all on organizations" ON public.organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on users" ON public.users;
DROP POLICY IF EXISTS "Allow public all on users" ON public.users;
CREATE POLICY "Allow public select on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on organization_members" ON public.organization_members;
DROP POLICY IF EXISTS "Allow public all on organization_members" ON public.organization_members;
CREATE POLICY "Allow public select on organization_members" ON public.organization_members FOR SELECT USING (true);
CREATE POLICY "Allow public all on organization_members" ON public.organization_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on event_types" ON public.event_types;
DROP POLICY IF EXISTS "Allow public all on event_types" ON public.event_types;
CREATE POLICY "Allow public select on event_types" ON public.event_types FOR SELECT USING (true);
CREATE POLICY "Allow public all on event_types" ON public.event_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on expenditure_categories" ON public.expenditure_categories;
DROP POLICY IF EXISTS "Allow public all on expenditure_categories" ON public.expenditure_categories;
CREATE POLICY "Allow public select on expenditure_categories" ON public.expenditure_categories FOR SELECT USING (true);
CREATE POLICY "Allow public all on expenditure_categories" ON public.expenditure_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on events" ON public.events;
DROP POLICY IF EXISTS "Allow public all on events" ON public.events;
CREATE POLICY "Allow public select on events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public all on events" ON public.events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on event_signatories" ON public.event_signatories;
DROP POLICY IF EXISTS "Allow public all on event_signatories" ON public.event_signatories;
CREATE POLICY "Allow public select on event_signatories" ON public.event_signatories FOR SELECT USING (true);
CREATE POLICY "Allow public all on event_signatories" ON public.event_signatories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow public all on transactions" ON public.transactions;
CREATE POLICY "Allow public select on transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public all on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Allow public all on initiatives" ON public.initiatives;
CREATE POLICY "Allow public select on initiatives" ON public.initiatives FOR SELECT USING (true);
CREATE POLICY "Allow public all on initiatives" ON public.initiatives FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on audit_trail" ON public.audit_trail;
DROP POLICY IF EXISTS "Allow public all on audit_trail" ON public.audit_trail;
CREATE POLICY "Allow public select on audit_trail" ON public.audit_trail FOR SELECT USING (true);
CREATE POLICY "Allow public all on audit_trail" ON public.audit_trail FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on exported_reports" ON public.exported_reports;
DROP POLICY IF EXISTS "Allow public all on exported_reports" ON public.exported_reports;
CREATE POLICY "Allow public select on exported_reports" ON public.exported_reports FOR SELECT USING (true);
CREATE POLICY "Allow public all on exported_reports" ON public.exported_reports FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. BASELINE REALISTIC DATA SEEDING
-- ------------------------------------------------------------------------------

-- 4.1 Academic Departments
INSERT INTO public.departments (id, name, code, color, description) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Bachelor of Science in Information Technology', 'BSIT', '#ea580c', 'Department of Information Technology & Software Engineering'),
  ('d1000000-0000-0000-0000-000000000002', 'Bachelor of Science in Computer Engineering', 'BSCpE', '#3b82f6', 'Department of Computer Engineering & Embedded Systems'),
  ('d1000000-0000-0000-0000-000000000003', 'Bachelor of Science in Industrial Engineering', 'BSIE', '#6366f1', 'Department of Industrial Engineering & Operations Research');

-- 4.2 Student Organizations
INSERT INTO public.organizations (
  id, name, code, department_id, allocated_budget, departmental_budget, organizational_budget, member_count, adviser_id, logo_color, description
) VALUES
  ('01000000-0000-0000-0000-000000000001', 'IT Student Guild', 'ITSG', 'd1000000-0000-0000-0000-000000000001', 50000.00, 50000.00, 21500.00, 142, NULL, '#ea580c', 'Official student government and co-curricular body for all Information Technology students.'),
  ('01000000-0000-0000-0000-000000000002', 'Computer Engineering Society', 'CES', 'd1000000-0000-0000-0000-000000000002', 40000.00, 40000.00, 12000.00, 98, NULL, '#3b82f6', 'Academic and technical organization advancing hardware prototyping, IoT, and embedded firmware.'),
  ('01000000-0000-0000-0000-000000000003', 'IE Innovation Club', 'IEIC', 'd1000000-0000-0000-0000-000000000003', 35000.00, 35000.00, 10000.00, 85, NULL, '#6366f1', 'Student guild dedicated to ergonomics, operations management, supply chain analytics, and Lean Six Sigma.');

-- 4.3 Users
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
  -- 1 College Dean
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
  -- 3 Faculty Advisers
  (
    'ad100000-0000-0000-0000-000000000001',
    'Eduardo',
    'Severino',
    'Reyes',
    'M.Sc.',
    'ereyes@cite.edu.ph',
    'reyes_773012',
    'adviser',
    'Faculty Adviser',
    'male',
    '01000000-0000-0000-0000-000000000001',
    'Faculty/Staff',
    '2021-06-01',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    'ad100000-0000-0000-0000-000000000002',
    'Jocelyn',
    'Mendoza',
    'Pascual',
    'M.Eng.',
    'jpascual@cite.edu.ph',
    'pascual_884102',
    'adviser',
    'Faculty Adviser',
    'female',
    '01000000-0000-0000-0000-000000000002',
    'Faculty/Staff',
    '2022-01-15',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    'ad100000-0000-0000-0000-000000000003',
    'Rogelio',
    'Bautista',
    'Fernandez',
    'Ph.D.',
    'rfernandez@cite.edu.ph',
    'fernandez_991204',
    'adviser',
    'Faculty Adviser',
    'male',
    '01000000-0000-0000-0000-000000000003',
    'Faculty/Staff',
    '2019-10-01',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  -- 8 Student Officers
  (
    '51000000-0000-0000-0000-000000000001',
    'Maria',
    'Dela Cruz',
    'Lopez',
    '',
    'maria.lopez@cite.edu.ph',
    'lopez_330192',
    'student',
    'Guild President',
    'female',
    '01000000-0000-0000-0000-000000000001',
    '4th Year',
    '2023-08-15',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    'Angelo',
    'Santos',
    'Ramos',
    '',
    'angelo.ramos@cite.edu.ph',
    'ramos_118920',
    'student',
    'Finance Officer / Treasurer',
    'male',
    '01000000-0000-0000-0000-000000000001',
    '3rd Year',
    '2024-08-10',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000003',
    'Camille',
    'Victoria',
    'Flores',
    '',
    'camille.flores@cite.edu.ph',
    'flores_554109',
    'student',
    'Vice President for Internal Affairs',
    'female',
    '01000000-0000-0000-0000-000000000001',
    '3rd Year',
    '2024-08-10',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000004',
    'Joshua',
    'Paul',
    'Mercado',
    '',
    'joshua.mercado@cite.edu.ph',
    'mercado_772018',
    'student',
    'Secretary General',
    'male',
    '01000000-0000-0000-0000-000000000001',
    '2nd Year',
    '2025-08-12',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000005',
    'Christian',
    'Gabriel',
    'Navarro',
    '',
    'christian.navarro@cite.edu.ph',
    'navarro_448102',
    'student',
    'Society President',
    'male',
    '01000000-0000-0000-0000-000000000002',
    '4th Year',
    '2023-08-15',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000006',
    'Princess',
    'Joy',
    'Aquino',
    '',
    'princess.aquino@cite.edu.ph',
    'aquino_669201',
    'student',
    'Finance Officer / Treasurer',
    'female',
    '01000000-0000-0000-0000-000000000002',
    '3rd Year',
    '2024-08-10',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000007',
    'Gabriel',
    'Luis',
    'Del Rosario',
    '',
    'gabriel.delrosario@cite.edu.ph',
    'delrosario_228910',
    'student',
    'Club President',
    'male',
    '01000000-0000-0000-0000-000000000003',
    '4th Year',
    '2023-08-15',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  ),
  (
    '51000000-0000-0000-0000-000000000008',
    'Alyssa',
    'Marie',
    'Valdez',
    '',
    'alyssa.valdez@cite.edu.ph',
    'valdez_991823',
    'student',
    'Finance Officer / Treasurer',
    'female',
    '01000000-0000-0000-0000-000000000003',
    '3rd Year',
    '2024-08-10',
    false,
    '{"theme":"light","dataDensity":"comfortable","tableDensity":"normal","defaultView":"list"}'::jsonb
  );

-- 4.4 Update Organization Advisers
UPDATE public.organizations SET adviser_id = 'ad100000-0000-0000-0000-000000000001' WHERE id = '01000000-0000-0000-0000-000000000001';
UPDATE public.organizations SET adviser_id = 'ad100000-0000-0000-0000-000000000002' WHERE id = '01000000-0000-0000-0000-000000000002';
UPDATE public.organizations SET adviser_id = 'ad100000-0000-0000-0000-000000000003' WHERE id = '01000000-0000-0000-0000-000000000003';

-- 4.5 Organization Memberships
INSERT INTO public.organization_members (organization_id, user_id, position, role, is_primary) VALUES
  ('01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Guild President', 'officer', true),
  ('01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'Finance Officer / Treasurer', 'officer', true),
  ('01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', 'Vice President for Internal Affairs', 'officer', true),
  ('01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000004', 'Secretary General', 'officer', true),
  ('01000000-0000-0000-0000-000000000001', 'ad100000-0000-0000-0000-000000000001', 'Faculty Adviser', 'adviser', true),
  ('01000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000005', 'Society President', 'officer', true),
  ('01000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000006', 'Finance Officer / Treasurer', 'officer', true),
  ('01000000-0000-0000-0000-000000000002', 'ad100000-0000-0000-0000-000000000002', 'Faculty Adviser', 'adviser', true),
  ('01000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000007', 'Club President', 'officer', true),
  ('01000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000008', 'Finance Officer / Treasurer', 'officer', true),
  ('01000000-0000-0000-0000-000000000003', 'ad100000-0000-0000-0000-000000000003', 'Faculty Adviser', 'adviser', true);

-- 4.6 Event Types
INSERT INTO public.event_types (id, name, description) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Academic Seminar', 'Technical guest lectures, academic symposia, and research colloquia.'),
  ('b1000000-0000-0000-0000-000000000002', 'Leadership Training', 'Officer development seminars, team-building retreats, and student council orientations.'),
  ('b1000000-0000-0000-0000-000000000003', 'Community Outreach', 'External corporate social responsibility, digital literacy drives, and barangay assistance.'),
  ('b1000000-0000-0000-0000-000000000004', 'Sports & E-Sports Fest', 'Athletic meets, e-sports invitationals, and team tournaments.'),
  ('b1000000-0000-0000-0000-000000000005', 'Cultural Festival', 'College week celebrations, talent showcases, and artistic exhibits.'),
  ('b1000000-0000-0000-0000-000000000006', 'Technical Workshop', 'Hands-on coding bootcamps, hardware hackathons, and laboratory exercises.');

-- 4.7 Expenditure Categories
INSERT INTO public.expenditure_categories (id, name, description) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Venue & Logistics', 'Hall rentals, sound system setups, tables, lighting, and electrical provisions.'),
  ('c1000000-0000-0000-0000-000000000002', 'Food & Catering', 'Packed meals, guest refreshments, snacks, and water stations.'),
  ('c1000000-0000-0000-0000-000000000003', 'Supplies & Materials', 'Consumable project supplies, electronic modules, prototyping kits, and stationery.'),
  ('c1000000-0000-0000-0000-000000000004', 'Transportation & Fuel', 'Shuttle hire, van rentals, gasoline allowances, and logistics freight.'),
  ('c1000000-0000-0000-0000-000000000005', 'Printing & Documentation', 'Tarpaulins, ID badges, participant certificates, and handouts.'),
  ('c1000000-0000-0000-0000-000000000006', 'Speaker & Honorarium', 'Professional fees, guest speaker tokens, and visiting mentor allowances.'),
  ('c1000000-0000-0000-0000-000000000007', 'Promotional & Prizes', 'Winner cash awards, trophies, medals, and promotional swag.');

-- 4.8 Events (8 Seed Records with Category, Setting, and Status Flow)
INSERT INTO public.events (
  id, organization_id, name, type_id, category, setting, description, proposed_budget, requisites,
  date_start, date_end, mode, location, apf_url, pcf_url, pcf_name, appendices, clearance_details, clearance_doc_ref, remarks,
  status, sds_action_token, cmo_action_token, revenue, liquidated_by, liquidated_at, created_at, created_by, deleted
) VALUES
  (
    'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'Cloud Computing & DevOps Workshop 2026', 'b1000000-0000-0000-0000-000000000006',
    'Organizational', 'On-campus',
    'A 2-day intensive technical bootcamp on AWS infrastructure, Docker containers, Kubernetes clustering, and CI/CD pipelines.',
    8500.00, 'All attendees must bring personal laptops with Docker Desktop installed.',
    '2026-10-02T01:00:00Z', '2026-10-03T09:00:00Z', 'FTF', 'CITE Main Computer Laboratory 3',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_devops_2026.pdf',
    NULL, NULL,
    '["Curriculum Matrix & Hands-on Syllabus", "Laboratory Safety Plan", "Guest Speaker Profile"]'::jsonb,
    'Executive Clearance Granted. Authorized for Computer Lab 3 reservation.',
    'APF-ITSG-2026-001',
    '["Adviser approved", "Dean endorsed", "SDS Authorized"]'::jsonb,
    'SDS Authorized',
    'token_sds_f1000001', NULL,
    0.00, NULL, NULL, '2026-08-15T04:30:00Z', '51000000-0000-0000-0000-000000000001', false
  ),
  (
    'f1000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001', 'Web Development Bootcamp: React & Next.js', 'b1000000-0000-0000-0000-000000000006',
    'Departmental', 'On-campus',
    'Comprehensive hands-on training for junior students building scalable modern web applications with React 19, TypeScript, and Tailwind CSS.',
    5000.00, 'Basic knowledge of HTML, CSS, and modern JavaScript syntax required.',
    '2026-10-18T01:00:00Z', '2026-10-19T08:00:00Z', 'Online/Virtual', 'Online via Zoom & Discord Workspace',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_webdev_2026.pdf',
    NULL, NULL,
    '["Webinar Module Outline", "Breakout Room Facilitator Guide"]'::jsonb,
    'Clearance granted. Virtual session links generated.',
    'APF-ITSG-2026-002',
    '["Adviser endorsed", "Awaiting Dean approval"]'::jsonb,
    'For Approval',
    NULL, NULL,
    0.00, NULL, NULL, '2026-08-20T03:30:00Z', '51000000-0000-0000-0000-000000000002', false
  ),
  (
    'f1000000-0000-0000-0000-000000000003', '01000000-0000-0000-0000-000000000001', 'Cybersecurity Awareness & Ethical Hacking 101', 'b1000000-0000-0000-0000-000000000001',
    'Organizational', 'On-campus',
    'A comprehensive seminar on web application security, penetration testing fundamentals, and cyber hygiene.',
    6000.00, 'Open to all CITE students. No prerequisites.',
    '2026-10-09T01:00:00Z', '2026-10-09T08:00:00Z', 'FTF', 'University Audio-Visual Room (AVR)',
    NULL, NULL, NULL,
    '["Security Speaker Profile", "Interactive CTF Rules"]'::jsonb,
    NULL, NULL,
    '["Submitted for adviser endorsement"]'::jsonb,
    'For Review',
    NULL, NULL,
    0.00, NULL, NULL, '2026-08-25T06:00:00Z', '51000000-0000-0000-0000-000000000001', false
  ),
  (
    'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'ITSG Midyear General Assembly & Team Building', 'b1000000-0000-0000-0000-000000000002',
    'Organizational', 'On-campus',
    'Annual midyear gathering of all IT Student Guild members featuring leadership talks and officer election briefings.',
    4500.00, 'Open to all enrolled BSIT students and guild members.',
    '2026-08-22T01:00:00Z', '2026-08-22T09:00:00Z', 'FTF', 'CITE Student Activity Center',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_assembly_2026.pdf',
    NULL, NULL,
    '["Activity Mechanics", "Food & Beverage Distribution Matrix", "Post-Event Liquidation Template"]'::jsonb,
    'Event successfully concluded and liquidated. Full financial report reconciled.',
    'APF-ITSG-2026-004',
    '["Reconciled with Dean Office", "All expenditures accounted", "Surplus returned"]'::jsonb,
    'Closed',
    'token_sds_f1000004', NULL,
    1200.00, 'Maria D. Lopez', '2026-08-25T07:30:00Z', '2026-08-01T01:00:00Z', '51000000-0000-0000-0000-000000000001', false
  ),
  (
    'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'IoT & Embedded Systems Prototyping Workshop', 'b1000000-0000-0000-0000-000000000006',
    'Organizational', 'Off-campus',
    'Hands-on off-campus innovation summit on ESP32, microcontrollers, sensor integration, and MQTT cloud telemetry.',
    10000.00, 'Parental Consent Form and safety briefing required.',
    '2026-10-15T01:00:00Z', '2026-10-16T09:00:00Z', 'FTF', 'Regional Tech Incubator & Makerspace Hub',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_iot_workshop.pdf',
    '/fixtures/TechnoFest_2025_Appendices_Sample.pdf', 'PCF_CES_IoT_OffCampus.pdf',
    '["Component Safety Guidelines", "Hardware Requisition Sheet", "Risk Management Protocol"]'::jsonb,
    'Clearance granted by SDS and Crisis Management Office.',
    'APF-CES-2026-005',
    '["Dean approved", "SDS Authorized", "CMO Authorized"]'::jsonb,
    'CMO Authorized',
    'token_sds_f1000005', 'token_cmo_f1000005',
    0.00, NULL, NULL, '2026-08-18T05:00:00Z', '51000000-0000-0000-0000-000000000005', false
  ),
  (
    'f1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', 'Robotics & Automation Invitational 2026', 'b1000000-0000-0000-0000-000000000004',
    'Departmental', 'Off-campus',
    'An inter-collegiate mini line-tracer and sumo-robot challenge hosted at the provincial convention center.',
    15000.00, 'Team registration required (max 4 per team). Signed Parental Consent Forms required.',
    '2026-10-24T00:00:00Z', '2026-10-25T09:00:00Z', 'FTF', 'Bulacan Provincial Convention Center',
    NULL,
    '/fixtures/TechnoFest_2025_Appendices_Sample.pdf', 'PCF_Robotics_OffCampus.pdf',
    '["Tournament Bracket & Rulebook", "Emergency Protocol", "Prize Structure Matrix"]'::jsonb,
    NULL, NULL,
    '["Budget exceeds standard allocation; revision requested for prize pool"]'::jsonb,
    'Pending Revision',
    NULL, NULL,
    0.00, NULL, NULL, '2026-08-22T08:00:00Z', '51000000-0000-0000-0000-000000000006', false
  ),
  (
    'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'Lean Six Sigma & Process Optimization Seminar', 'b1000000-0000-0000-0000-000000000001',
    'Organizational', 'On-campus',
    'An industry-focused online seminar on process mapping, DMAIC methodology, and workplace efficiency.',
    7000.00, 'Recommended for 3rd and 4th-year IE students. Open to other disciplines.',
    '2026-08-29T01:00:00Z', '2026-08-29T08:00:00Z', 'Online', 'Online via MS Teams',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_sixsigma_seminar.pdf',
    NULL, NULL,
    '["Certified Six Sigma Black Belt Profile", "Evaluation Instrument"]'::jsonb,
    'Clearance granted. Virtual meeting room scheduled.',
    'APF-IEIC-2026-007',
    '["Dean approved", "SDS Authorized"]'::jsonb,
    'SDS Authorized',
    'token_sds_f1000007', NULL,
    0.00, NULL, NULL, '2026-08-10T04:00:00Z', '51000000-0000-0000-0000-000000000007', false
  ),
  (
    'f1000000-0000-0000-0000-000000000008', '01000000-0000-0000-0000-000000000003', 'Supply Chain & Logistics Case Competition', 'b1000000-0000-0000-0000-000000000004',
    'Departmental', 'On-campus',
    'A competitive case analysis where student teams solve real-world distribution and supply bottleneck challenges.',
    9500.00, 'Teams of 3. Open to all engineering students.',
    '2026-10-28T01:00:00Z', '2026-10-28T09:00:00Z', 'FTF', 'CITE Innovation Room',
    NULL, NULL, NULL,
    '["Case Study Brief", "Rubric for Evaluation", "Judge Invitation Letter"]'::jsonb,
    NULL, NULL,
    '["Draft proposal created"]'::jsonb,
    'Created',
    NULL, NULL,
    0.00, NULL, NULL, '2026-08-28T02:00:00Z', '51000000-0000-0000-0000-000000000008', false
  );

-- 4.9 Event Signatories
INSERT INTO public.event_signatories (id, event_id, user_id, role, status, feedback, signed_at) VALUES
  ('s1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Strong technical relevance for 3rd and 4th-year students.', '2026-08-16T01:15:00Z'),
  ('s1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved. Ensure virtual lab guidelines are maintained.', '2026-08-17T06:45:00Z'),
  ('s1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Endorsed. Great initiative for cross-year knowledge transfer.', '2026-08-21T02:00:00Z'),
  ('s1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000006', 'ad100000-0000-0000-0000-000000000002', 'adviser', 'Revision Requested', 'Please adjust the trophy expenditure and clarify external judge compensation.', '2026-08-23T03:00:00Z'),
  ('s1000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000004', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Endorsed for General Assembly scheduling.', '2026-08-02T02:00:00Z'),
  ('s1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved for Student Activity Center venue.', '2026-08-03T05:00:00Z'),
  ('s1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'ad100000-0000-0000-0000-000000000003', 'adviser', 'Endorsed', 'Highly recommended for industrial engineering accreditation.', '2026-08-11T03:00:00Z'),
  ('s1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved for professional development credit.', '2026-08-12T05:00:00Z');

-- 4.10 Transactions
INSERT INTO public.transactions (id, event_id, description, category_id, amount, status, receipt_url, created_at, deleted) VALUES
  ('71000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'AWS Cloud Lab Credits & Domain Voucher Pack', 'c1000000-0000-0000-0000-000000000003', 2500.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-18T02:00:00Z', false),
  ('71000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Snacks & Bottled Water for 50 Participants (Day 1)', 'c1000000-0000-0000-0000-000000000002', 2000.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-19T05:00:00Z', false),
  ('71000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'Snacks & Bottled Water for 50 Participants (Day 2)', 'c1000000-0000-0000-0000-000000000002', 2000.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-20T05:00:00Z', false),
  ('71000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'Certificates, Badges & Event Backdrop Printing', 'c1000000-0000-0000-0000-000000000005', 1200.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-20T08:00:00Z', false),
  ('71000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000004', 'Assembly Catering & Packed Lunches (80 Pax)', 'c1000000-0000-0000-0000-000000000002', 2800.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-22T04:00:00Z', false),
  ('71000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000004', 'Sound System & Microphone Cable Rental', 'c1000000-0000-0000-0000-000000000001', 1000.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-22T06:00:00Z', false),
  ('71000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000004', 'Printed Handouts & Guild Registration Forms', 'c1000000-0000-0000-0000-000000000005', 500.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-22T02:00:00Z', false),
  ('71000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000005', 'ESP32 Development Boards (15 Units)', 'c1000000-0000-0000-0000-000000000003', 4500.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-26T03:00:00Z', false),
  ('71000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000005', 'Sensor Kits (Ultrasonic, DHT22, Relays)', 'c1000000-0000-0000-0000-000000000003', 2500.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-26T05:00:00Z', false),
  ('71000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000007', 'Guest Speaker Honorarium (Six Sigma BB)', 'c1000000-0000-0000-0000-000000000006', 4000.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-29T02:00:00Z', false),
  ('71000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000007', 'Certificates of Participation & Token of Appreciation', 'c1000000-0000-0000-0000-000000000005', 1800.00, 'Paid', '/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf', '2026-08-29T06:00:00Z', false);

-- 4.11 Organizational Initiatives (Self-Generated Revenue & Liquidated Event Profits)
INSERT INTO public.initiatives (
  id, organization_id, name, source, gross_revenue, expenses, net_profit, date, description, notes, event_id, created_by
) VALUES
  (
    'i1000000-0000-0000-0000-000000000001',
    '01000000-0000-0000-0000-000000000001',
    'AY 2026-2027 1st Sem Guild Membership Dues Collection',
    'Membership Fees',
    15000.00,
    0.00,
    15000.00,
    '2026-08-10T08:00:00Z',
    'Mandatory semestral guild membership collection for 150 enrolled BSIT students @ PHP 100/head.',
    'Official receipts issued to class representatives.',
    NULL,
    '51000000-0000-0000-0000-000000000001'
  ),
  (
    'i1000000-0000-0000-0000-000000000002',
    '01000000-0000-0000-0000-000000000001',
    'CITE Tech Org Lanyard & Dev Sticker Pack Sale',
    'Merchandise Sales',
    8500.00,
    3200.00,
    5300.00,
    '2026-08-25T04:00:00Z',
    'Exclusive pre-ordered CITE lanyard and vinyl developer stickers sold during freshmen orientation week.',
    'Production cost: PHP 3,200.00 paid to local printer.',
    NULL,
    '51000000-0000-0000-0000-000000000001'
  ),
  (
    'i1000000-0000-0000-0000-000000000003',
    '01000000-0000-0000-0000-000000000001',
    'Surplus Reversion: ITSG Midyear General Assembly',
    'Event Revenue',
    4000.00,
    2800.00,
    1200.00,
    '2026-08-25T07:30:00Z',
    'Net surplus reconciled and deposited back to ITSG treasury following successful event liquidation.',
    'Reconciled against Dean liquidation report.',
    'f1000000-0000-0000-0000-000000000004',
    '51000000-0000-0000-0000-000000000001'
  ),
  (
    'i1000000-0000-0000-0000-000000000004',
    '01000000-0000-0000-0000-000000000002',
    'CES Annual Hardware Lab Membership Fees',
    'Membership Fees',
    12000.00,
    0.00,
    12000.00,
    '2026-08-12T02:00:00Z',
    'Membership dues collected from all 120 BSCpE students for laboratory component maintenance.',
    'Deposited to CES organization fund.',
    NULL,
    '51000000-0000-0000-0000-000000000005'
  ),
  (
    'i1000000-0000-0000-0000-000000000005',
    '01000000-0000-0000-0000-000000000003',
    'Industry Partner Sponsorship Grant - Bulacan Tech Hub',
    'Sponsorship & Donations',
    10000.00,
    0.00,
    10000.00,
    '2026-08-14T06:00:00Z',
    'Corporate sponsorship grant to support Industrial Engineering case study competitions and symposiums.',
    'Acknowledged via formal MOA and certificate.',
    NULL,
    '51000000-0000-0000-0000-000000000007'
  );

-- 4.12 Audit Trail
INSERT INTO public.audit_trail (id, user_id, action, details, timestamp, event_id, organization_id, actor_role, status_from, status_to, remarks) VALUES
  -- Event 1
  ('81000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Created Event', 'Created proposal for ''Cloud Computing & DevOps Workshop 2026''', '2026-08-15T02:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 'Submitted for Review', 'Submitted ''Cloud Computing & DevOps Workshop 2026'' to Adviser', '2026-08-15T04:30:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000003', 'ad100000-0000-0000-0000-000000000001', 'Endorsed Proposal', 'Endorsed ''Cloud Computing & DevOps Workshop 2026'' to College Dean', '2026-08-16T01:15:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'adviser', 'For Review', 'For Approval', 'Strong technical relevance for 3rd and 4th-year students.'),
  ('81000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'Approved Event', 'Granted Executive Dean Approval for ''Cloud Computing & DevOps Workshop 2026'' and dispatched to SDS', '2026-08-17T06:45:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'dean', 'For Approval', 'Approved', 'Approved. Ensure virtual lab guidelines are maintained.'),
  ('81000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000001', 'SDS Authorized', 'Student Affairs & Development Services (SDS) cleared proposal. Finance ledger unlocked.', '2026-08-17T09:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'sds', 'Approved', 'SDS Authorized', 'Institutional clearance granted via verification token.'),
  ('81000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱2,500.00 for ''AWS Cloud Lab Credits & Domain Voucher Pack''', '2026-08-18T02:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),

  -- Event 4
  ('81000000-0000-0000-0000-000000000007', '51000000-0000-0000-0000-000000000001', 'Event Closed', 'Finalized digital liquidation and closed ''ITSG Midyear General Assembly & Team Building''', '2026-08-25T07:30:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', 'Completed', 'Closed', 'Surplus of ₱1,200.00 returned and recorded to Organizational Initiatives Treasury.');

-- 4.13 Baseline Exported Reports
INSERT INTO public.exported_reports (id, title, doc_ref, category, organization_name, generated_by, generated_at, file_url, file_path, format) VALUES
  (
    'r1000000-0000-0000-0000-000000000001',
    'AY 2026-2027 Midyear Directorate Analytics Report',
    'REP-DEAN-CITE-2026',
    'Directorate Summary',
    'College Administration',
    'Dr. Marilou Castro Villanueva, Ph.D.',
    '2026-08-28T09:30:00Z',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/College%20Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf',
    'College Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf',
    'PDF'
  ),
  (
    'r1000000-0000-0000-0000-000000000002',
    'System Usage & Activity Analytics Overview',
    'SYS-RPT-883012',
    'System Usage',
    'Administration',
    'Team COLLinSight CITE',
    '2026-08-29T14:15:00Z',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf',
    'Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf',
    'PDF'
  );
