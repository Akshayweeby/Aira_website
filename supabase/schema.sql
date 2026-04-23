-- ═══════════════════════════════════════════════════════
-- AIRA Study Centre — Supabase PostgreSQL Schema
-- Module 4.1 — Primary Datastore
-- ═══════════════════════════════════════════════════════
--
-- DEPLOYMENT:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste and run this entire file
-- 4. Verify tables in Table Editor
-- 5. Enable RLS in Authentication → Policies
-- ═══════════════════════════════════════════════════════

-- ──────────────── LEADS TABLE ────────────────

CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    form_type       TEXT NOT NULL CHECK (form_type IN ('demo', 'diagnostic')),
    student_name    TEXT NOT NULL,
    grade           INTEGER NOT NULL CHECK (grade BETWEEN 7 AND 10),
    subject         TEXT NOT NULL CHECK (subject IN ('Maths', 'Science', 'Both')),
    phone           TEXT NOT NULL,
    page_url        TEXT,
    utm_source      TEXT,
    recaptcha_score NUMERIC(3,2),
    status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'enrolled', 'duplicate', 'spam')),
    notes           TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE leads IS 'AIRA Study Centre lead submissions from website forms';

-- ──────────────── AUDIT LOG TABLE ────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    changed_by  TEXT,
    changed_at  TIMESTAMPTZ DEFAULT now(),
    old_values  JSONB,
    new_values  JSONB
);

COMMENT ON TABLE audit_log IS 'Tracks all changes to leads table for auditing';

-- ──────────────── INTEGRITY CHECKS TABLE ────────────────

CREATE TABLE IF NOT EXISTS integrity_checks (
    id          BIGSERIAL PRIMARY KEY,
    run_at      TIMESTAMPTZ DEFAULT now(),
    check_name  TEXT,
    result      TEXT,
    details     JSONB
);

COMMENT ON TABLE integrity_checks IS 'Results of daily integrity checks from Apps Script';

-- ──────────────── DEDUPLICATION INDEX ────────────────
-- Unique partial index on (phone, form_type, day) to enforce
-- the deduplication rule: same phone + form_type can only submit
-- once per calendar day

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_dedup
    ON leads (phone, form_type, (created_at::date))
    WHERE status != 'duplicate';

-- ──────────────── PERFORMANCE INDEXES ────────────────

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_form_type ON leads (form_type);

-- ──────────────── AUTO-UPDATE updated_at ────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ──────────────── AUDIT LOG TRIGGER ────────────────
-- Populates audit_log on every UPDATE to leads

CREATE OR REPLACE FUNCTION log_lead_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (lead_id, action, changed_by, old_values, new_values)
    VALUES (
        NEW.id,
        'UPDATE',
        current_user,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_audit ON leads;
CREATE TRIGGER trigger_leads_audit
    AFTER UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_update();

-- Also log inserts for full audit trail
CREATE OR REPLACE FUNCTION log_lead_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (lead_id, action, changed_by, new_values)
    VALUES (
        NEW.id,
        'INSERT',
        current_user,
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_audit_insert ON leads;
CREATE TRIGGER trigger_leads_audit_insert
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_insert();

-- ══════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_checks ENABLE ROW LEVEL SECURITY;

-- ── Leads Policies ──

-- Public (anon) can INSERT leads (from website forms)
CREATE POLICY "Allow public insert" ON leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Only authenticated admin can SELECT
CREATE POLICY "Admin can read all leads" ON leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated admin can UPDATE
CREATE POLICY "Admin can update leads" ON leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Only authenticated admin can DELETE
CREATE POLICY "Admin can delete leads" ON leads
    FOR DELETE
    TO authenticated
    USING (true);

-- ── Audit Log Policies ──

-- Public can INSERT (edge function writes audit logs)
CREATE POLICY "Allow insert audit" ON audit_log
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Only admin can SELECT
CREATE POLICY "Admin can read audit" ON audit_log
    FOR SELECT
    TO authenticated
    USING (true);

-- ── Integrity Checks Policies ──

-- Apps Script service can INSERT
CREATE POLICY "Allow insert integrity" ON integrity_checks
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Admin can SELECT
CREATE POLICY "Admin can read integrity" ON integrity_checks
    FOR SELECT
    TO authenticated
    USING (true);

-- ══════════════════════════════════════════════
-- SUPABASE BACKUP DOCUMENTATION
-- ══════════════════════════════════════════════
--
-- Point-in-Time Recovery (PITR):
-- ─────────────────────────────
-- Supabase Pro plans include PITR. To enable:
-- 1. Go to Supabase Dashboard → Database → Backups
-- 2. Enable "Point in Time Recovery"
-- 3. This allows restoring to any second within the retention window
-- 4. Default retention: 7 days (Pro), 28 days (Enterprise)
--
-- Daily Backups:
-- ─────────────
-- Supabase automatically takes daily backups.
-- These can be downloaded from Dashboard → Database → Backups
--
-- Additional GCS Backup:
-- ─────────────────────
-- See Dashboard.gs exportToGCS() function for the Apps Script
-- approach that exports leads to Google Cloud Storage daily.
