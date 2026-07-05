-- Servian CRM Schema
-- Run this in the Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  location    text NOT NULL DEFAULT '',
  property_type text NOT NULL CHECK (property_type IN ('villa','apartment','office','other')),
  lead_source text NOT NULL CHECK (lead_source IN ('referral','instagram','other')),
  assigned_to text NOT NULL DEFAULT 'Unassigned',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  budget         integer NOT NULL DEFAULT 0,
  status         text NOT NULL CHECK (status IN ('active','completed','on-hold')),
  pipeline_stage integer NOT NULL CHECK (pipeline_stage BETWEEN 1 AND 8),
  start_date     date NOT NULL,
  end_date       date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- ── Seed data ───────────────────────────────────────────────────────────────

WITH inserted_clients AS (
  INSERT INTO clients (id, name, phone, email, location, property_type, lead_source, assigned_to, notes)
  VALUES
    (
      'a1000000-0000-0000-0000-000000000001',
      'James Harrington',
      '+971 50 234 7890',
      'j.harrington@outlook.com',
      'Dubai Hills Estate, Dubai',
      'villa',
      'referral',
      'Ahmed Al-Rashid',
      'High-value client referred by the Harrington Group. Prefers WhatsApp communication. Available for site visits on weekends only.'
    ),
    (
      'a2000000-0000-0000-0000-000000000002',
      'Sarah Al-Mansouri',
      '+971 55 801 3321',
      'sarah.almansouri@gmail.com',
      'Downtown Dubai, Dubai',
      'apartment',
      'instagram',
      'Layla Hassan',
      'Instagram lead. Very design-conscious with strong preferences for premium Italian finishes. Final sign-off requires approval from her interior designer.'
    ),
    (
      'a3000000-0000-0000-0000-000000000003',
      'Omar Blackwell',
      '+971 52 467 9914',
      'o.blackwell@blackwellcapital.ae',
      'Business Bay, Dubai',
      'office',
      'other',
      'Carlos Mendez',
      'Corporate account — Blackwell Capital Group. Invoices to the company. Main contact is Omar but procurement decisions go through the CFO.'
    )
  RETURNING id, name
)
INSERT INTO projects (client_id, name, description, budget, status, pipeline_stage, start_date, end_date)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Villa Full Renovation',
    'Complete interior and exterior renovation of 6-bedroom villa including pool deck, landscaping, and smart home integration.',
    850000, 'active', 5, '2026-03-10', NULL
  ),
  (
    'a1000000-0000-0000-0000-000000000001',
    'Guest House Construction',
    'New 2-bedroom guest house with private entrance, kitchenette, and en-suite bathrooms on existing plot.',
    320000, 'on-hold', 2, '2026-07-01', NULL
  ),
  (
    'a2000000-0000-0000-0000-000000000002',
    'Luxury Apartment Fit-Out',
    'Full fit-out of 3-bedroom apartment on the 42nd floor: marble flooring, custom joinery, designer kitchen, and home theatre room.',
    275000, 'completed', 8, '2025-10-05', '2026-02-28'
  ),
  (
    'a3000000-0000-0000-0000-000000000003',
    'Corporate HQ Fit-Out',
    'Design and build of 1,800 sqm corporate headquarters across two floors: reception, open-plan workstations, executive suites, and boardroom.',
    1200000, 'active', 6, '2026-01-15', NULL
  ),
  (
    'a3000000-0000-0000-0000-000000000003',
    'Server Room & IT Infrastructure',
    'Purpose-built server room with raised flooring, precision cooling, UPS systems, and structured cabling throughout the office.',
    180000, 'completed', 8, '2026-01-15', '2026-03-30'
  );
