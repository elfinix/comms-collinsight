-- ============================================================================
-- COLLinSight Database Migration: Step 2 - Admin Institutional Events
-- ============================================================================
-- Purpose:
-- 1. Allow 'events.organization_id' to be NULL for university-wide/institutional events
-- 2. Allow 'events.type_id' to be NULL (flexible categorization)
-- 3. Add 'is_institutional' boolean column for fast indexing and query filtering
-- 4. Expand 'category' check constraint to include 'Institutional'
-- 5. Seed default 'Institutional Event' type in 'event_types'
-- ============================================================================

BEGIN;

-- 1. Make organization_id nullable in public.events
-- Institutional events do not belong to an individual student organization.
ALTER TABLE public.events 
  ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Make type_id nullable in public.events for flexibility
ALTER TABLE public.events 
  ALTER COLUMN type_id DROP NOT NULL;

-- 3. Add is_institutional and is_all_day columns
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS is_institutional BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT false;

-- 4. Update category CHECK constraint to permit 'Institutional'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.events'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%category%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.events DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.events 
  ADD CONSTRAINT events_category_check 
  CHECK (category IN ('Organizational', 'Departmental', 'Institutional'));

-- 5. Insert 'Institutional Event' into public.event_types if not present
INSERT INTO public.event_types (id, name, description)
VALUES (
  'b1000000-0000-0000-0000-000000000007',
  'Institutional Event',
  'University-wide ceremonies, examinations, assemblies, and official campus events.'
)
ON CONFLICT (id) DO NOTHING;

-- 6. Also update any existing institutional events if they were previously categorized
UPDATE public.events
SET is_institutional = true
WHERE category = 'Institutional';

COMMIT;

