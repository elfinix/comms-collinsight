-- ==============================================================================
-- COLLinSight - Idempotent Database Reset Script for Supabase
-- Target Endpoint: https://snsqkogfrrtyloqetowx.supabase.co
-- Schema: public
--
-- Purpose:
--   Safely purges existing records across all application and bridge tables,
--   retaining table structures and repopulating the baseline initial state.
-- ==============================================================================

BEGIN;

-- Temporarily drop circular FK on organizations.adviser_id
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
  ('d1000000-0000-0000-0000-000000000001', 'Bachelor of Science in Information Technology', 'BSIT', '#0d9488', 'Department for software development, networking, and cloud computing programs.', false),
  ('d1000000-0000-0000-0000-000000000002', 'Bachelor of Science in Computer Engineering', 'BSCpE', '#0284c7', 'Department for computer architecture, hardware design, and robotics.', false),
  ('d1000000-0000-0000-0000-000000000003', 'Bachelor of Science in Industrial Engineering', 'BSIE', '#7c3aed', 'Department for manufacturing systems, operations research, and logistics.', false);

-- 2. Organizations
INSERT INTO public.organizations (id, name, code, department_id, allocated_budget, logo_color, description, deleted) VALUES
  ('01000000-0000-0000-0000-000000000001', 'IT Student Guild', 'ITSG', 'd1000000-0000-0000-0000-000000000001', 50000.00, '#0d9488', 'Official academic recognized student body of BSIT students.', false),
  ('01000000-0000-0000-0000-000000000002', 'CompE Society', 'CES', 'd1000000-0000-0000-0000-000000000002', 40000.00, '#0284c7', 'Official academic recognized student body of BSCpE students.', false),
  ('01000000-0000-0000-0000-000000000003', 'IE Innovation Club', 'IEIC', 'd1000000-0000-0000-0000-000000000003', 35000.00, '#7c3aed', 'Official academic recognized student body of BSIE students.', false);

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
  ('m1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000007', 'President', 'officer', true),
  ('m1000000-0000-0000-0000-000000000008', '01000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000008', 'Vice President', 'officer', true);

-- 5. Event Types
INSERT INTO public.event_types (id, name, description, deleted) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Academic Seminar', 'Formal talks, guest lectures, and intellectual symposia.', false),
  ('b1000000-0000-0000-0000-000000000002', 'Leadership Training', 'Officer development and team building programs.', false),
  ('b1000000-0000-0000-0000-000000000003', 'Community Outreach', 'Civic engagement and community service initiatives.', false),
  ('b1000000-0000-0000-0000-000000000004', 'Sports Fest', 'Intramural games and athletic tournaments.', false),
  ('b1000000-0000-0000-0000-000000000005', 'Cultural Festival', 'Creative exhibitions, talent presentations, and artistic gatherings.', false),
  ('b1000000-0000-0000-0000-000000000006', 'Technical Workshop', 'Hands-on laboratories, coding hackathons, and technical bootcamps.', false);

-- 6. Expenditure Categories
INSERT INTO public.expenditure_categories (id, name, description, deleted) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Venue & Logistics', 'Audio visual equipment, room reservations, and staging.', false),
  ('c1000000-0000-0000-0000-000000000002', 'Food & Catering', 'Meals, refreshments, and bottled water for participants.', false),
  ('c1000000-0000-0000-0000-000000000003', 'Supplies & Materials', 'Event kits, hardware components, and consumable stationeries.', false),
  ('c1000000-0000-0000-0000-000000000004', 'Transportation', 'Vehicle rentals and fuel allowances for outreach.', false),
  ('c1000000-0000-0000-0000-000000000005', 'Printing & Documentation', 'Tarpaulins, certificates, badges, and program brochures.', false),
  ('c1000000-0000-0000-0000-000000000006', 'Speaker & Honorarium', 'Professional fees and tokens of appreciation for resource persons.', false),
  ('c1000000-0000-0000-0000-000000000007', 'Promotional Materials', 'Social media collateral and marketing merchandise.', false);

-- 7. Events
INSERT INTO public.events (
  id, organization_id, name, type_id, description, proposed_budget, requisites,
  date_start, date_end, mode, location, apf_url, appendices, clearance_details, remarks,
  status, adviser_feedback, dean_feedback, revenue, liquidated_by, liquidated_at, created_at, created_by, deleted
) VALUES
  (
    'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'Cloud Computing & DevOps Workshop 2026', 'b1000000-0000-0000-0000-000000000006',
    'A 2-day hands-on online workshop covering AWS essentials, containerization with Docker, and CI/CD pipelines for IT students.',
    8500.00, 'Basic knowledge of Linux CLI and Git. Bring your own laptop.',
    '2026-09-18T01:00:00Z', '2026-09-19T09:00:00Z', 'Online', 'Online via Google Meet & AWS Academy',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_cloud_workshop.pdf',
    '["Program Flow & Schedule", "Speaker Profile & Certifications", "Safety & Security Protocol"]'::jsonb,
    'Official Clearance Granted by SDS. Online credentials configured.',
    '["Meeting link generated", "Virtual lab assistant assigned", "Approved by CITE Dean"]'::jsonb,
    'Approved', 'Strong technical relevance for 3rd and 4th-year students.', 'Approved. Ensure virtual lab guidelines are maintained.',
    0.00, NULL, NULL, '2026-08-15T02:00:00Z', '51000000-0000-0000-0000-000000000001', false
  ),
  (
    'f1000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000001', 'Web Development Bootcamp: React & Next.js', 'b1000000-0000-0000-0000-000000000006',
    'An intensive 3-day online bootcamp introducing modern frontend development, state management, and SSR paradigms.',
    12000.00, 'Prerequisite: CS 102 / Web Fundamentals. Laptop required.',
    '2026-09-24T00:00:00Z', '2026-09-26T08:00:00Z', 'Online', 'Online via Zoom Meetings',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_web_bootcamp.pdf',
    '["Syllabus and Project Brief", "Resource Budget Breakdown", "Speaker Endorsement"]'::jsonb,
    NULL,
    '["Webinar stream link and breakout rooms configured"]'::jsonb,
    'For Approval', 'Endorsed. Great initiative for cross-year knowledge transfer.', NULL,
    0.00, NULL, NULL, '2026-08-20T03:30:00Z', '51000000-0000-0000-0000-000000000002', false
  ),
  (
    'f1000000-0000-0000-0000-000000000003', '01000000-0000-0000-0000-000000000001', 'Cybersecurity Awareness & Ethical Hacking 101', 'b1000000-0000-0000-0000-000000000001',
    'A comprehensive seminar on web application security, penetration testing fundamentals, and cyber hygiene.',
    6000.00, 'Open to all CITE students. No prerequisites.',
    '2026-10-09T01:00:00Z', '2026-10-09T08:00:00Z', 'FTF', 'University Audio-Visual Room (AVR)',
    NULL,
    '["Security Speaker Profile", "Interactive CTF Rules"]'::jsonb,
    NULL,
    '[]'::jsonb,
    'For Review', NULL, NULL,
    0.00, NULL, NULL, '2026-08-25T06:00:00Z', '51000000-0000-0000-0000-000000000001', false
  ),
  (
    'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'ITSG Midyear General Assembly & Team Building', 'b1000000-0000-0000-0000-000000000002',
    'Annual midyear gathering of all IT Student Guild members featuring leadership talks and officer election briefings.',
    4500.00, 'Open to all enrolled BSIT students and guild members.',
    '2026-08-22T01:00:00Z', '2026-08-22T09:00:00Z', 'FTF', 'CITE Student Activity Center',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_assembly_2026.pdf',
    '["Activity Mechanics", "Food & Beverage Distribution Matrix", "Post-Event Liquidation Template"]'::jsonb,
    'Event successfully concluded and liquidated. Full financial report reconciled.',
    '["Reconciled with Dean Office", "All expenditures accounted"]'::jsonb,
    'Closed', 'Endorsed.', 'Approved.',
    1200.00, 'Maria D. Lopez', '2026-08-25T07:30:00Z', '2026-08-01T01:00:00Z', '51000000-0000-0000-0000-000000000001', false
  ),
  (
    'f1000000-0000-0000-0000-000000000005', '01000000-0000-0000-0000-000000000002', 'IoT & Embedded Systems Prototyping Workshop', 'b1000000-0000-0000-0000-000000000006',
    'Hands-on workshop on ESP32, microcontrollers, sensor integration, and MQTT cloud telemetry.',
    10000.00, 'Microcontroller starter kits provided. Bring your laptop.',
    '2026-10-15T01:00:00Z', '2026-10-16T09:00:00Z', 'FTF', 'Engineering Hardware Lab 2',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_iot_workshop.pdf',
    '["Component Safety Guidelines", "Hardware Requisition Sheet", "Trainer Portfolio"]'::jsonb,
    'Clearance granted. Lab 2 reserved.',
    '["Hardware components procured", "Lab safety officer assigned"]'::jsonb,
    'Approved', 'Well planned hardware workshop.', 'Approved. Observe electrical safety guidelines.',
    0.00, NULL, NULL, '2026-08-18T05:00:00Z', '51000000-0000-0000-0000-000000000005', false
  ),
  (
    'f1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', 'Robotics & Automation Invitational 2026', 'b1000000-0000-0000-0000-000000000004',
    'An inter-collegiate mini line-tracer and sumo-robot challenge designed to test algorithmic control.',
    15000.00, 'Team registration required (max 4 per team). Standard robot specs apply.',
    '2026-10-24T00:00:00Z', '2026-10-25T09:00:00Z', 'FTF', 'University Gymnasium',
    NULL,
    '["Tournament Bracket & Rulebook", "Emergency Protocol", "Prize Structure Matrix"]'::jsonb,
    NULL,
    '["Budget exceeds standard allocation; revision requested for prize pool"]'::jsonb,
    'Pending Revision', 'Please adjust the trophy expenditure and clarify external judge compensation.', NULL,
    0.00, NULL, NULL, '2026-08-22T08:00:00Z', '51000000-0000-0000-0000-000000000006', false
  ),
  (
    'f1000000-0000-0000-0000-000000000007', '01000000-0000-0000-0000-000000000003', 'Lean Six Sigma & Process Optimization Seminar', 'b1000000-0000-0000-0000-000000000001',
    'An industry-focused online seminar on process mapping, DMAIC methodology, and workplace efficiency.',
    7000.00, 'Recommended for 3rd and 4th-year IE students. Open to other disciplines.',
    '2026-08-29T01:00:00Z', '2026-08-29T08:00:00Z', 'Online', 'Online via MS Teams',
    'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/documents/apf_sixsigma_seminar.pdf',
    '["Certified Six Sigma Black Belt Profile", "Evaluation Instrument"]'::jsonb,
    'Clearance granted. Virtual meeting room scheduled.',
    '["Speaker link confirmed", "Certificate templates ready"]'::jsonb,
    'Approved', 'Highly recommended for industrial engineering accreditation.', 'Approved.',
    0.00, NULL, NULL, '2026-08-10T04:00:00Z', '51000000-0000-0000-0000-000000000007', false
  ),
  (
    'f1000000-0000-0000-0000-000000000008', '01000000-0000-0000-0000-000000000003', 'Supply Chain & Logistics Case Competition', 'b1000000-0000-0000-0000-000000000004',
    'A competitive case analysis where student teams solve real-world distribution and supply bottleneck challenges.',
    9500.00, 'Teams of 3. Open to all engineering students.',
    '2026-10-28T01:00:00Z', '2026-10-28T09:00:00Z', 'FTF', 'CITE Innovation Room',
    NULL,
    '["Case Study Brief", "Rubric for Evaluation", "Judge Invitation Letter"]'::jsonb,
    NULL,
    '[]'::jsonb,
    'Created', NULL, NULL,
    0.00, NULL, NULL, '2026-08-28T02:00:00Z', '51000000-0000-0000-0000-000000000008', false
  );

-- 8. Event Signatories (Approval Bridge Seeds)
INSERT INTO public.event_signatories (id, event_id, user_id, role, status, feedback, signed_at) VALUES
  ('s1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Strong technical relevance for 3rd and 4th-year students.', '2026-08-16T01:15:00Z'),
  ('s1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'dean', 'Approved', 'Approved. Ensure virtual lab guidelines are maintained.', '2026-08-17T06:45:00Z'),
  ('s1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000002', 'ad100000-0000-0000-0000-000000000001', 'adviser', 'Endorsed', 'Endorsed. Great initiative for cross-year knowledge transfer.', '2026-08-21T02:00:00Z'),
  ('s1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000006', 'ad100000-0000-0000-0000-000000000002', 'adviser', 'Revision Requested', 'Please adjust the trophy expenditure and clarify external judge compensation.', '2026-08-23T03:00:00Z');

-- 9. Transactions
INSERT INTO public.transactions (id, event_id, description, category_id, amount, status, receipt_url, created_at, deleted) VALUES
  ('71000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'AWS Cloud Lab Credits & Domain Voucher Pack', 'c1000000-0000-0000-0000-000000000003', 2500.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_aws_pack.pdf', '2026-08-18T02:00:00Z', false),
  ('71000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Snacks & Bottled Water for 50 Participants (Day 1)', 'c1000000-0000-0000-0000-000000000002', 2000.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_snacks_day1.pdf', '2026-08-19T05:00:00Z', false),
  ('71000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'Snacks & Bottled Water for 50 Participants (Day 2)', 'c1000000-0000-0000-0000-000000000002', 2000.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_snacks_day2.pdf', '2026-08-20T05:00:00Z', false),
  ('71000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'Certificates, Badges & Event Backdrop Printing', 'c1000000-0000-0000-0000-000000000005', 1200.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_badges.pdf', '2026-08-20T08:00:00Z', false),
  ('71000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000004', 'Assembly Catering & Packed Lunches (80 Pax)', 'c1000000-0000-0000-0000-000000000002', 2800.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_catering_assembly.pdf', '2026-08-22T04:00:00Z', false),
  ('71000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000004', 'Sound System & Microphone Cable Rental', 'c1000000-0000-0000-0000-000000000001', 1000.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_sounds.pdf', '2026-08-22T06:00:00Z', false),
  ('71000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000004', 'Printed Handouts & Guild Registration Forms', 'c1000000-0000-0000-0000-000000000005', 500.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_handouts.pdf', '2026-08-22T02:00:00Z', false),
  ('71000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000005', 'ESP32 Development Boards (15 Units)', 'c1000000-0000-0000-0000-000000000003', 4500.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_esp32.pdf', '2026-08-26T03:00:00Z', false),
  ('71000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000005', 'Sensor Kits (Ultrasonic, DHT22, Relays)', 'c1000000-0000-0000-0000-000000000003', 2500.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_sensors.pdf', '2026-08-26T05:00:00Z', false),
  ('71000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000007', 'Guest Speaker Honorarium (Six Sigma BB)', 'c1000000-0000-0000-0000-000000000006', 4000.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_honorarium.pdf', '2026-08-29T02:00:00Z', false),
  ('71000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000007', 'Certificates of Participation & Token of Appreciation', 'c1000000-0000-0000-0000-000000000005', 1800.00, 'Paid', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/receipts/rec_tokens.pdf', '2026-08-29T06:00:00Z', false);

-- 10. Audit Trail
INSERT INTO public.audit_trail (id, user_id, action, details, timestamp, event_id, organization_id, actor_role, status_from, status_to, remarks) VALUES
  ('81000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Created Event', 'Created proposal for ''Cloud Computing & DevOps Workshop 2026''', '2026-08-15T02:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, 'Created', NULL),
  ('81000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 'Submitted for Review', 'Submitted ''Cloud Computing & DevOps Workshop 2026'' to Adviser', '2026-08-15T04:30:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', 'Created', 'For Review', NULL),
  ('81000000-0000-0000-0000-000000000003', 'ad100000-0000-0000-0000-000000000001', 'Endorsed Proposal', 'Endorsed ''Cloud Computing & DevOps Workshop 2026'' to College Dean', '2026-08-16T01:15:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'adviser', 'For Review', 'For Approval', 'Strong technical relevance for 3rd and 4th-year students.'),
  ('81000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'Approved Event', 'Granted Executive Dean Approval for ''Cloud Computing & DevOps Workshop 2026''', '2026-08-17T06:45:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'dean', 'For Approval', 'Approved', 'Approved. Ensure virtual lab guidelines are maintained.'),
  ('81000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000001', 'Recorded Expenditure', 'Disbursed ₱2,500.00 for ''AWS Cloud Lab Credits & Domain Voucher Pack''', '2026-08-18T02:00:00Z', 'f1000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'student', NULL, NULL, NULL),
  ('81000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000001', 'Event Closed', 'Finalized digital liquidation and closed ''ITSG Midyear General Assembly & Team Building''', '2026-08-25T07:30:00Z', 'f1000000-0000-0000-0000-000000000004', '01000000-0000-0000-0000-000000000001', 'student', 'Completed', 'Closed', 'Surplus of ₱1,200.00 returned to Guild Treasury.'),
  ('81000000-0000-0000-0000-000000000007', 'ad100000-0000-0000-0000-000000000002', 'Requested Revision', 'Requested revisions on ''Robotics & Automation Invitational 2026''', '2026-08-23T03:00:00Z', 'f1000000-0000-0000-0000-000000000006', '01000000-0000-0000-0000-000000000002', 'adviser', 'For Review', 'Pending Revision', 'Please adjust the trophy expenditure and clarify external judge compensation.');

-- 11. Exported Reports
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
ALTER TABLE public.exported_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on exported_reports" ON public.exported_reports;
CREATE POLICY "Allow public select on exported_reports" ON public.exported_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public all on exported_reports" ON public.exported_reports;
CREATE POLICY "Allow public all on exported_reports" ON public.exported_reports FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.exported_reports (id, title, doc_ref, category, organization_name, generated_by, generated_at, file_url, file_path, format) VALUES
  ('rep-001', 'AY 2026-2027 Midyear Directorate Analytics Report', 'REP-DEAN-CITE-2026', 'Directorate Summary', 'College Administration', 'Dr. Marilou Castro Villanueva, Ph.D.', '2026-08-28T09:30:00Z', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/College%20Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf', 'College Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf', 'PDF'),
  ('rep-002', 'System Usage & Activity Analytics Overview', 'SYS-RPT-883012', 'System Usage', 'Administration', 'Team COLLinSight CITE', '2026-08-29T14:15:00Z', 'https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf', 'Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf', 'PDF')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  doc_ref = EXCLUDED.doc_ref,
  category = EXCLUDED.category,
  organization_name = EXCLUDED.organization_name,
  generated_by = EXCLUDED.generated_by,
  generated_at = EXCLUDED.generated_at,
  file_url = EXCLUDED.file_url,
  file_path = EXCLUDED.file_path,
  format = EXCLUDED.format;

-- 12. Storage Buckets & Policies
INSERT INTO storage.buckets (id, name, public) VALUES
  ('team_images', 'team_images', true),
  ('attachments', 'attachments', true),
  ('media', 'media', true),
  ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public access for attachments" ON storage.objects;
  CREATE POLICY "Allow public access for attachments" ON storage.objects
    FOR ALL USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

  DROP POLICY IF EXISTS "Allow public access for media" ON storage.objects;
  CREATE POLICY "Allow public access for media" ON storage.objects
    FOR ALL USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

  DROP POLICY IF EXISTS "Allow public access for reports" ON storage.objects;
  CREATE POLICY "Allow public access for reports" ON storage.objects
    FOR ALL USING (bucket_id = 'reports') WITH CHECK (bucket_id = 'reports');

  DROP POLICY IF EXISTS "Allow public access for team_images" ON storage.objects;
  CREATE POLICY "Allow public access for team_images" ON storage.objects
    FOR ALL USING (bucket_id = 'team_images') WITH CHECK (bucket_id = 'team_images');
END $$;

COMMIT;

