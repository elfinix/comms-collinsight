-- ==============================================================================
-- COLLinSight - Idempotent Database Reset & Mock Seeding Script for Supabase
-- Target Endpoint: https://snsqkogfrrtyloqetowx.supabase.co
-- Schema: public
--
-- Purpose:
--   Safely purges existing records across all application and bridge tables,
--   retaining table structures and repopulating the baseline initial state.
-- ==============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS departmental_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS organizational_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE IF EXISTS public.organizations ADD COLUMN IF NOT EXISTS member_count INT NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Organizational';
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS setting TEXT NOT NULL DEFAULT 'On-campus';
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS pcf_url TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS pcf_name TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS sds_action_token TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS cmo_action_token TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS sds_feedback TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS cmo_feedback TEXT;

-- Temporarily drop circular FK on organizations.adviser_id
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

-- Re-establish FK on organizations
ALTER TABLE public.organizations
  ADD CONSTRAINT fk_org_adviser
  FOREIGN KEY (adviser_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- RE-SEED INITIAL STATE
-- ------------------------------------------------------------------------------

-- 1. Departments
INSERT INTO public.departments (id, name, code, color, description, deleted) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Bachelor of Science in Information Technology', 'BSIT', '#ea580c', 'Department for software development, networking, and cloud computing programs.', false),
  ('d1000000-0000-0000-0000-000000000002', 'Bachelor of Science in Computer Engineering', 'BSCpE', '#3b82f6', 'Department for computer architecture, hardware design, and robotics.', false),
  ('d1000000-0000-0000-0000-000000000003', 'Bachelor of Science in Industrial Engineering', 'BSIE', '#6366f1', 'Department for manufacturing systems, operations research, and logistics.', false);

-- 2. Organizations (with Dual Budget & Member Count)
INSERT INTO public.organizations (
  id, name, code, department_id, allocated_budget, departmental_budget, organizational_budget, member_count, logo_color, description, deleted
) VALUES
  ('01000000-0000-0000-0000-000000000001', 'IT Student Guild', 'ITSG', 'd1000000-0000-0000-0000-000000000001', 50000.00, 50000.00, 21500.00, 142, '#ea580c', 'Official academic recognized student body of BSIT students.', false),
  ('01000000-0000-0000-0000-000000000002', 'CompE Society', 'CES', 'd1000000-0000-0000-0000-000000000002', 40000.00, 40000.00, 12000.00, 98, '#3b82f6', 'Official academic recognized student body of BSCpE students.', false),
  ('01000000-0000-0000-0000-000000000003', 'IE Innovation Club', 'IEIC', 'd1000000-0000-0000-0000-000000000003', 35000.00, 35000.00, 10000.00, 85, '#6366f1', 'Official academic recognized student body of BSIE students.', false);

-- 3. Users (Sole Administrator: "Team COLLinSight CITE")
INSERT INTO public.users (id, first_name, middle_name, last_name, suffix, email, password, role, position, gender, organization_id, year_level, member_since, deleted) VALUES
  -- 1 Sole Administrator
  ('a1000000-0000-0000-0000-000000000001', 'Team COLLinSight', '', 'CITE', '', 'admin@cite.edu.ph', 'collinsight_admins', 'admin', 'System Administrator', 'non-binary', NULL, 'Faculty/Staff', '2022-06-01', false),
  -- College Dean
  ('e1000000-0000-0000-0000-000000000001', 'Marilou', 'Castro', 'Villanueva', 'Ph.D.', 'dean@cite.edu.ph', 'villanueva_441209', 'dean', 'College Dean', 'female', NULL, 'Faculty/Staff', '2020-08-01', false),
  -- Faculty Advisers
  ('ad100000-0000-0000-0000-000000000001', 'Eduardo', 'Severino', 'Reyes', '', 'ereyes@cite.edu.ph', 'reyes_773012', 'adviser', 'Faculty Adviser', 'male', '01000000-0000-0000-0000-000000000001', 'Faculty/Staff', '2021-06-01', false),
  ('ad100000-0000-0000-0000-000000000002', 'Cynthia', 'Lazaro', 'Domingo', '', 'cdomingo@cite.edu.ph', 'domingo_550874', 'adviser', 'Faculty Adviser', 'female', '01000000-0000-0000-0000-000000000002', 'Faculty/Staff', '2021-06-01', false),
  ('ad100000-0000-0000-0000-000000000003', 'Jerome', 'Acapule', 'Santos', '', 'jsantos@cite.edu.ph', 'santos_330928', 'adviser', 'Faculty Adviser', 'male', '01000000-0000-0000-0000-000000000003', 'Faculty/Staff', '2022-01-01', false),
  -- Student Officers: ITSG
  ('51000000-0000-0000-0000-000000000001', 'Maria', 'Denise', 'Lopez', '', 'mlopez@student.cite.edu.ph', 'lopez_124983', 'student', 'President', 'female', '01000000-0000-0000-0000-000000000001', '3rd Year', '2022-08-15', false),
  ('51000000-0000-0000-0000-000000000002', 'Carlo', 'Enrique', 'Mendoza', '', 'cmendoza@student.cite.edu.ph', 'mendoza_875432', 'student', 'Vice President', 'male', '01000000-0000-0000-0000-000000000001', '3rd Year', '2022-08-15', false),
  ('51000000-0000-0000-0000-000000000003', 'Bea', 'Ramona', 'Santos', '', 'bsantos@student.cite.edu.ph', 'santos_654321', 'student', 'Secretary', 'female', '01000000-0000-0000-0000-000000000001', '2nd Year', '2023-08-15', false),
  ('51000000-0000-0000-0000-000000000004', 'Angelo', 'Miguel', 'Bautista', '', 'abautista@student.cite.edu.ph', 'bautista_987654', 'student', 'Treasurer', 'male', '01000000-0000-0000-0000-000000000001', '3rd Year', '2022-08-15', false),
  -- Student Officers: CES
  ('51000000-0000-0000-0000-000000000005', 'Patricia', 'Katrina', 'Ramos', '', 'pramos@student.cite.edu.ph', 'ramos_112233', 'student', 'President', 'female', '01000000-0000-0000-0000-000000000002', '4th Year', '2021-08-15', false),
  ('51000000-0000-0000-0000-000000000006', 'Joshua', 'Vicente', 'Ocampo', '', 'jocampo@student.cite.edu.ph', 'ocampo_445566', 'student', 'Vice President', 'male', '01000000-0000-0000-0000-000000000002', '3rd Year', '2022-08-15', false),
  ('51000000-0000-0000-0000-000000000009', 'Samantha', 'Clarisse', 'Dela Cruz', '', 'sdelacruz@student.cite.edu.ph', 'delacruz_554433', 'student', 'Secretary', 'female', '01000000-0000-0000-0000-000000000002', '2nd Year', '2023-08-15', false),
  -- Student Officers: IEIC
  ('51000000-0000-0000-0000-000000000007', 'Mark', 'Laurence', 'Tan', '', 'mtan@student.cite.edu.ph', 'tan_778899', 'student', 'President', 'male', '01000000-0000-0000-0000-000000000003', '3rd Year', '2022-08-15', false),
  ('51000000-0000-0000-0000-000000000008', 'Andrea', 'Grace', 'Perez', '', 'aperez@student.cite.edu.ph', 'perez_998877', 'student', 'Vice President', 'female', '01000000-0000-0000-0000-000000000003', '2nd Year', '2023-08-15', false);

-- Link Advisers to Orgs
UPDATE public.organizations SET adviser_id = 'ad100000-0000-0000-0000-000000000001' WHERE id = '01000000-0000-0000-0000-000000000001';
UPDATE public.organizations SET adviser_id = 'ad100000-0000-0000-0000-000000000002' WHERE id = '01000000-0000-0000-0000-000000000002';
UPDATE public.organizations SET adviser_id = 'ad100000-0000-0000-0000-000000000003' WHERE id = '01000000-0000-0000-0000-000000000003';

-- 4. Organization Members (Bridge Seeds)
INSERT INTO public.organization_members (id, organization_id, user_id, position, role, is_primary) VALUES
  ('m1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'President', 'officer', true),
  ('m1000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'Vice President', 'officer', true),
  ('m1000000-0000-0000-0000-000000000003', '01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', 'Secretary', 'officer', true),
  ('m1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000004', 'Treasurer', 'officer', true),
  ('m1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000005', 'President', 'officer', true),
  ('m1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000006', 'Vice President', 'officer', true),
  ('m1000000-0000-0000-0000-000000000009', '01000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000009', 'Secretary', 'officer', true),
  ('m1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000007', 'President', 'officer', true),
  ('m1000000-0000-0000-0000-000000000008', '01000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000008', 'Vice President', 'officer', true);

-- 5. Event Types
INSERT INTO public.event_types (id, name, description, deleted) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Academic Seminar', 'Formal talks, guest lectures, and intellectual symposia.', false),
  ('b1000000-0000-0000-0000-000000000002', 'Leadership Training', 'Officer development and team building programs.', false),
  ('b1000000-0000-0000-0000-000000000003', 'Community Outreach', 'External corporate social responsibility and community work.', false),
  ('b1000000-0000-0000-0000-000000000004', 'Sports & E-Sports Fest', 'Athletic and competitive gaming tournaments.', false),
  ('b1000000-0000-0000-0000-000000000005', 'Cultural Festival', 'Arts, music, and university cultural celebrations.', false),
  ('b1000000-0000-0000-0000-000000000006', 'Technical Workshop', 'Hands-on hardware/software development bootcamps.', false);

-- 6. Expenditure Categories
INSERT INTO public.expenditure_categories (id, name, description, deleted) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Venue & Logistics', 'Hall rentals, sound system setups, tables, lighting, and electrical provisions.', false),
  ('c1000000-0000-0000-0000-000000000002', 'Food & Catering', 'Packed meals, guest refreshments, snacks, and water stations.', false),
  ('c1000000-0000-0000-0000-000000000003', 'Supplies & Materials', 'Consumable project supplies, electronic modules, prototyping kits, and stationery.', false),
  ('c1000000-0000-0000-0000-000000000004', 'Transportation & Fuel', 'Shuttle hire, van rentals, gasoline allowances, and logistics freight.', false),
  ('c1000000-0000-0000-0000-000000000005', 'Printing & Documentation', 'Tarpaulins, ID badges, participant certificates, and handouts.', false),
  ('c1000000-0000-0000-0000-000000000006', 'Speaker & Honorarium', 'Professional fees, guest speaker tokens, and visiting mentor allowances.', false),
  ('c1000000-0000-0000-0000-000000000007', 'Promotional & Prizes', 'Winner cash awards, trophies, medals, and promotional swag.', false);

-- 7. Events (with Category, Setting, PCF URL, and Signatory Status Flow)
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
    '[]'::jsonb,
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
    '[]'::jsonb,
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
    '[]'::jsonb,
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
    '["Amendment (Aug 24, 2026): Supplementary honorarium adjustment for keynote speaker [Adjustment: ₱500.00]"]'::jsonb,
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
    '[]'::jsonb,
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
    '[]'::jsonb,
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
    '[]'::jsonb,
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
    '[]'::jsonb,
    'Created',
    NULL, NULL,
    0.00, NULL, NULL, '2026-08-28T02:00:00Z', '51000000-0000-0000-0000-000000000008', false
  );

-- 8. Event Signatories (Approval Bridge Seeds)
INSERT INTO public.event_signatories (id, event_id, user_id, role, status, feedback, signed_at) VALUES
  ('s1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Strong technical relevance for 3rd and 4th-year students.', '2026-08-16T01:15:00Z'),
  ('s1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved. Ensure virtual lab guidelines are maintained.', '2026-08-17T06:45:00Z'),
  ('s1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Endorsed. Great initiative for cross-year knowledge transfer.', '2026-08-21T02:00:00Z'),
  ('s1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000006', 'ad100000-0000-0000-0000-000000000002', 'adviser', 'Revision Requested', 'Please adjust the trophy expenditure and clarify external judge compensation.', '2026-08-23T03:00:00Z'),
  ('s1000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000004', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Endorsed for General Assembly scheduling.', '2026-08-02T02:00:00Z'),
  ('s1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved for Student Activity Center venue.', '2026-08-03T05:00:00Z'),
  ('s1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'ad100000-0000-0000-0000-000000000003', 'adviser', 'Endorsed', 'Highly recommended for industrial engineering accreditation.', '2026-08-11T03:00:00Z'),
  ('s1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000007', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved for professional development credit.', '2026-08-12T05:00:00Z'),
  ('s1000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000005', 'ad100000-0000-0000-0000-000000000002', 'adviser', 'Endorsed', 'Endorsed off-campus IoT summit for provincial makerspace hub.', '2026-08-19T02:00:00Z'),
  ('s1000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved and dispatched to Student Development Services & CMO.', '2026-08-20T04:30:00Z');

-- 9. Transactions
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

-- 10. Organizational Initiatives (Self-Generated Revenue & Liquidated Event Profits)
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

-- 11. Audit Trail (Complete Lifecycle Records for All Mocked Events)
INSERT INTO public.audit_trail (id, user_id, action, details, timestamp, event_id, organization_id, actor_role, status_from, status_to, remarks) VALUES
  -- Event 1: Cloud Computing & DevOps Workshop 2026 (SDS Authorized)
  ('81000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Created Event', 'Created proposal for ''Cloud Computing & DevOps Workshop 2026''', '2026-08-15T02:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 'Submitted for Review', 'Submitted ''Cloud Computing & DevOps Workshop 2026'' to Adviser', '2026-08-15T04:30:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000003', 'ad100000-0000-0000-0000-000000000001', 'Endorsed Proposal', 'Endorsed ''Cloud Computing & DevOps Workshop 2026'' to College Dean', '2026-08-16T01:15:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'adviser', 'For Review', 'For Approval', 'Strong technical relevance for 3rd and 4th-year students.'),
  ('81000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'Approved Event', 'Granted Executive Dean Approval for ''Cloud Computing & DevOps Workshop 2026'' and dispatched to SDS', '2026-08-17T06:45:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'dean', 'For Approval', 'Approved', 'Approved. Ensure virtual lab guidelines are maintained.'),
  ('81000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000001', 'SDS Authorized', 'Student Affairs & Development Services (SDS) cleared proposal. Finance ledger unlocked.', '2026-08-17T09:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'sds', 'Approved', 'SDS Authorized', 'Institutional clearance granted via verification token.'),
  ('81000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱2,500.00 for ''AWS Cloud Lab Credits & Domain Voucher Pack''', '2026-08-18T02:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000007', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱2,000.00 for ''Snacks & Bottled Water for 50 Participants (Day 1)''', '2026-08-19T05:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000008', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱2,000.00 for ''Snacks & Bottled Water for 50 Participants (Day 2)''', '2026-08-20T05:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000009', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱1,200.00 for ''Certificates, Badges & Event Backdrop Printing''', '2026-08-20T08:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),

  -- Event 2: Web Development Bootcamp: React & Next.js (For Approval)
  ('81000000-0000-0000-0000-000000000010', '51000000-0000-0000-0000-000000000002', 'Created Event', 'Created proposal for ''Web Development Bootcamp: React & Next.js''', '2026-08-20T01:00:00Z', 'f1000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000011', '51000000-0000-0000-0000-000000000002', 'Submitted for Review', 'Submitted ''Web Development Bootcamp: React & Next.js'' to Adviser', '2026-08-20T03:30:00Z', 'f1000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000012', 'ad100000-0000-0000-0000-000000000001', 'Endorsed Proposal', 'Endorsed ''Web Development Bootcamp: React & Next.js'' to College Dean', '2026-08-21T02:00:00Z', 'f1000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001', 'adviser', 'For Review', 'For Approval', 'Endorsed. Great initiative for cross-year knowledge transfer.'),

  -- Event 3: Cybersecurity Awareness & Ethical Hacking 101 (For Review)
  ('81000000-0000-0000-0000-000000000013', '51000000-0000-0000-0000-000000000001', 'Created Event', 'Created proposal for ''Cybersecurity Awareness & Ethical Hacking 101''', '2026-08-25T04:00:00Z', 'f1000000-0000-0000-0000-000000000003', '01000000-0000-0000-0000-000000000001', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000014', '51000000-0000-0000-0000-000000000001', 'Submitted for Review', 'Submitted ''Cybersecurity Awareness & Ethical Hacking 101'' to Adviser', '2026-08-25T06:00:00Z', 'f1000000-0000-0000-0000-000000000003', '01000000-0000-0000-0000-000000000001', 'student', 'Created', 'For Review', NULL),

  -- Event 4: ITSG Midyear General Assembly & Team Building (Closed)
  ('81000000-0000-0000-0000-000000000015', '51000000-0000-0000-0000-000000000001', 'Created Event', 'Created proposal for ''ITSG Midyear General Assembly & Team Building''', '2026-08-01T01:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000016', '51000000-0000-0000-0000-000000000001', 'Submitted for Review', 'Submitted ''ITSG Midyear General Assembly & Team Building'' to Adviser', '2026-08-01T03:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000017', 'ad100000-0000-0000-0000-000000000001', 'Endorsed Proposal', 'Endorsed ''ITSG Midyear General Assembly & Team Building'' to College Dean', '2026-08-02T02:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'adviser', 'For Review', 'For Approval', 'Endorsed for General Assembly scheduling.'),
  ('81000000-0000-0000-0000-000000000018', 'e1000000-0000-0000-0000-000000000001', 'Approved Event', 'Granted Executive Dean Approval for ''ITSG Midyear General Assembly & Team Building''', '2026-08-03T05:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'dean', 'For Approval', 'Approved', 'Approved for Student Activity Center venue.'),
  ('81000000-0000-0000-0000-000000000019', '51000000-0000-0000-0000-000000000001', 'SDS Authorized', 'Student Affairs & Development Services cleared proposal. Assembly clearance validated.', '2026-08-03T08:30:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'sds', 'Approved', 'SDS Authorized', 'Venue and assembly clearance validated.'),
  ('81000000-0000-0000-0000-000000000020', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱500.00 for ''Printed Handouts & Guild Registration Forms''', '2026-08-22T02:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000021', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱2,800.00 for ''Assembly Catering & Packed Lunches (80 Pax)''', '2026-08-22T04:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000022', '51000000-0000-0000-0000-000000000001', 'Disbursed Expense', 'Disbursed ₱1,000.00 for ''Sound System & Microphone Cable Rental''', '2026-08-22T06:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000023', '51000000-0000-0000-0000-000000000001', 'Event Completed', 'Concluded assembly proceedings and initiated post-event financial liquidation', '2026-08-23T09:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', 'SDS Authorized', 'Completed', NULL),
  ('81000000-0000-0000-0000-000000000024', '51000000-0000-0000-0000-000000000001', 'Event Closed', 'Finalized digital liquidation and closed ''ITSG Midyear General Assembly & Team Building''', '2026-08-25T07:30:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', 'Completed', 'Closed', 'Surplus of ₱1,200.00 returned and recorded to Organizational Initiatives Treasury.'),
  ('81000000-0000-0000-0000-000000000025', '51000000-0000-0000-0000-000000000001', 'Ledger Amendment', 'Logged financial amendment: Supplementary honorarium adjustment for keynote speaker [Adjustment: ₱500.00]', '2026-08-25T08:00:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),

  -- Event 5: IoT & Embedded Systems Prototyping Workshop (CMO Authorized - Off-campus)
  ('81000000-0000-0000-0000-000000000026', '51000000-0000-0000-0000-000000000005', 'Created Event', 'Created proposal for ''IoT & Embedded Systems Prototyping Workshop''', '2026-08-18T01:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000027', '51000000-0000-0000-0000-000000000005', 'Submitted for Review', 'Submitted ''IoT & Embedded Systems Prototyping Workshop'' to Adviser', '2026-08-18T05:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000028', 'ad100000-0000-0000-0000-000000000002', 'Endorsed Proposal', 'Endorsed off-campus IoT summit for provincial makerspace hub to College Dean', '2026-08-19T02:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'adviser', 'For Review', 'For Approval', 'Endorsed off-campus IoT summit for provincial makerspace hub.'),
  ('81000000-0000-0000-0000-000000000029', 'e1000000-0000-0000-0000-000000000001', 'Approved Event', 'Granted Executive Dean Approval and dispatched to SDS and Crisis Management Office (CMO)', '2026-08-20T04:30:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'dean', 'For Approval', 'Approved', 'Approved and dispatched to Student Development Services & CMO.'),
  ('81000000-0000-0000-0000-000000000030', '51000000-0000-0000-0000-000000000005', 'SDS Authorized', 'Student Affairs & Development Services (SDS) cleared proposal and verified parental consent forms.', '2026-08-20T08:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'sds', 'Approved', 'SDS Authorized', 'SDS clearance and off-campus security protocol verified.'),
  ('81000000-0000-0000-0000-000000000031', '51000000-0000-0000-0000-000000000005', 'CMO Authorized', 'Crisis Management Office travel clearance and off-campus insurance authorization sealed.', '2026-08-21T03:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'cmo', 'SDS Authorized', 'CMO Authorized', 'Crisis Management Office travel clearance and insurance verified for off-campus hub.'),
  ('81000000-0000-0000-0000-000000000032', '51000000-0000-0000-0000-000000000005', 'Disbursed Expense', 'Disbursed ₱4,500.00 for ''ESP32 Development Boards (15 Units)''', '2026-08-26T03:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000033', '51000000-0000-0000-0000-000000000005', 'Disbursed Expense', 'Disbursed ₱2,500.00 for ''Sensor Kits (Ultrasonic, DHT22, Relays)''', '2026-08-26T05:00:00Z', 'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'student', NULL, NULL, NULL),

  -- Event 6: Robotics & Automation Invitational 2026 (Pending Revision - Off-campus)
  ('81000000-0000-0000-0000-000000000034', '51000000-0000-0000-0000-000000000006', 'Created Event', 'Created proposal for ''Robotics & Automation Invitational 2026''', '2026-08-22T03:00:00Z', 'f1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000035', '51000000-0000-0000-0000-000000000006', 'Submitted for Review', 'Submitted ''Robotics & Automation Invitational 2026'' to Adviser', '2026-08-22T08:00:00Z', 'f1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000036', 'ad100000-0000-0000-0000-000000000002', 'Revision Requested', 'Requested changes for ''Robotics & Automation Invitational 2026''', '2026-08-23T03:00:00Z', 'f1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', 'adviser', 'For Review', 'Pending Revision', 'Please adjust the trophy expenditure and clarify external judge compensation.'),

  -- Event 7: Lean Six Sigma & Process Optimization Seminar (SDS Authorized)
  ('81000000-0000-0000-0000-000000000037', '51000000-0000-0000-0000-000000000007', 'Created Event', 'Created proposal for ''Lean Six Sigma & Process Optimization Seminar''', '2026-08-10T01:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000038', '51000000-0000-0000-0000-000000000007', 'Submitted for Review', 'Submitted ''Lean Six Sigma & Process Optimization Seminar'' to Adviser', '2026-08-10T04:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000039', 'ad100000-0000-0000-0000-000000000003', 'Endorsed Proposal', 'Endorsed ''Lean Six Sigma & Process Optimization Seminar'' to College Dean', '2026-08-11T03:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'adviser', 'For Review', 'For Approval', 'Highly recommended for industrial engineering accreditation.'),
  ('81000000-0000-0000-0000-000000000040', 'e1000000-0000-0000-0000-000000000001', 'Approved Event', 'Granted Executive Dean Approval for ''Lean Six Sigma & Process Optimization Seminar'' and dispatched to SDS', '2026-08-12T05:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'dean', 'For Approval', 'Approved', 'Approved for professional development credit.'),
  ('81000000-0000-0000-0000-000000000041', '51000000-0000-0000-0000-000000000007', 'SDS Authorized', 'Student Affairs & Development Services (SDS) approved and registered in institutional academic calendar.', '2026-08-12T08:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'sds', 'Approved', 'SDS Authorized', 'SDS approved and registered in institutional academic calendar.'),
  ('81000000-0000-0000-0000-000000000042', '51000000-0000-0000-0000-000000000007', 'Disbursed Expense', 'Disbursed ₱4,000.00 for ''Guest Speaker Honorarium (Six Sigma BB)''', '2026-08-29T02:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000043', '51000000-0000-0000-0000-000000000007', 'Disbursed Expense', 'Disbursed ₱1,800.00 for ''Certificates of Participation & Token of Appreciation''', '2026-08-29T06:00:00Z', 'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'student', NULL, NULL, NULL),

  -- Event 8: Supply Chain & Logistics Case Competition (Created)
  ('81000000-0000-0000-0000-000000000044', '51000000-0000-0000-0000-000000000008', 'Created Event', 'Created proposal for ''Supply Chain & Logistics Case Competition''', '2026-08-28T02:00:00Z', 'f1000000-0000-0000-0000-000000000008', '01000000-0000-0000-0000-000000000003', 'student', NULL, 'Created', NULL);

-- 12. Exported Reports
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

COMMIT;
