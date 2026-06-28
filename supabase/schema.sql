-- ============================================================
-- EBaja Expense Tracker — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────
-- Mirrors auth.users; populated by admin via invite flow
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BUDGETS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  year        TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FUNDS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.funds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id         UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  contributor_name  TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EXPENSES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id                 UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  amount                    NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date                      DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by                   TEXT NOT NULL,
  description               TEXT NOT NULL,
  department                TEXT NOT NULL,
  category                  TEXT NOT NULL,
  payment_mode              TEXT NOT NULL CHECK (payment_mode IN ('Cash','UPI','Card','Online')),
  notes                     TEXT,
  bill_url                  TEXT,
  is_reimbursement_pending  BOOLEAN NOT NULL DEFAULT FALSE,
  is_reimbursed             BOOLEAN NOT NULL DEFAULT FALSE,
  is_split                  BOOLEAN NOT NULL DEFAULT FALSE,
  split_mode                TEXT CHECK (split_mode IN ('department','member','equal')),
  created_by                UUID REFERENCES public.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EXPENSE SPLITS ──────────────────────────────────────────
-- Supports three split modes:
--   'department' → split by department (department field filled)
--   'member'     → split by named member (member_name filled)
--   'equal'      → split equally across N people (people_count filled)
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  split_type    TEXT NOT NULL CHECK (split_type IN ('department','member','equal')),
  department    TEXT,
  member_name   TEXT,
  people_count  INTEGER,
  amount        NUMERIC(12,2) NOT NULL
);

-- ─── DEPARTMENT LIMITS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.department_limits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id       UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  department      TEXT NOT NULL,
  limit_amount    NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
  UNIQUE (budget_id, department)
);

-- ─── TEMPLATES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  payload     JSONB NOT NULL,   -- serialized expense fields
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EXPENSE EDITS (Audit Trail) ─────────────────────────────
-- Every time an admin edits an expense, the previous state is stored here.
CREATE TABLE IF NOT EXISTS public.expense_edits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id      UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  edited_by       UUID REFERENCES public.users(id),
  edited_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_data   JSONB NOT NULL   -- snapshot of the expense row before edit
);

-- ─── TRIGGER: auto-stamp updated_at on expenses ──────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expenses_updated_at ON public.expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── TRIGGER: capture audit trail before expense update ──────
CREATE OR REPLACE FUNCTION capture_expense_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.expense_edits (expense_id, edited_by, previous_data)
  VALUES (
    OLD.id,
    auth.uid(),
    to_jsonb(OLD)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expense_audit_trigger ON public.expenses;
CREATE TRIGGER expense_audit_trigger
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION capture_expense_edit();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_edits    ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── USERS table ──────────────────────────────────────────────
CREATE POLICY "Users: authenticated read"
  ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users: admin insert"
  ON public.users FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Users: admin update"
  ON public.users FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Users: admin delete"
  ON public.users FOR DELETE TO authenticated USING (is_admin());

-- ── BUDGETS ──────────────────────────────────────────────────
CREATE POLICY "Budgets: authenticated read"
  ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Budgets: admin write"
  ON public.budgets FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Budgets: admin update"
  ON public.budgets FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Budgets: admin delete"
  ON public.budgets FOR DELETE TO authenticated USING (is_admin());

-- ── FUNDS ────────────────────────────────────────────────────
CREATE POLICY "Funds: authenticated read"
  ON public.funds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Funds: admin insert"
  ON public.funds FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Funds: admin update"
  ON public.funds FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Funds: admin delete"
  ON public.funds FOR DELETE TO authenticated USING (is_admin());

-- ── EXPENSES ─────────────────────────────────────────────────
CREATE POLICY "Expenses: authenticated read"
  ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Expenses: admin insert"
  ON public.expenses FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Expenses: admin update"
  ON public.expenses FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Expenses: admin delete"
  ON public.expenses FOR DELETE TO authenticated USING (is_admin());

-- ── EXPENSE SPLITS ───────────────────────────────────────────
CREATE POLICY "Splits: authenticated read"
  ON public.expense_splits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Splits: admin insert"
  ON public.expense_splits FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Splits: admin update"
  ON public.expense_splits FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Splits: admin delete"
  ON public.expense_splits FOR DELETE TO authenticated USING (is_admin());

-- ── DEPARTMENT LIMITS ────────────────────────────────────────
CREATE POLICY "DeptLimits: authenticated read"
  ON public.department_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "DeptLimits: admin insert"
  ON public.department_limits FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "DeptLimits: admin update"
  ON public.department_limits FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "DeptLimits: admin delete"
  ON public.department_limits FOR DELETE TO authenticated USING (is_admin());

-- ── TEMPLATES ────────────────────────────────────────────────
CREATE POLICY "Templates: authenticated read"
  ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Templates: admin insert"
  ON public.templates FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Templates: admin update"
  ON public.templates FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Templates: admin delete"
  ON public.templates FOR DELETE TO authenticated USING (is_admin());

-- ── EXPENSE EDITS (audit trail) ──────────────────────────────
-- Everyone can read audit history; inserts happen via SECURITY DEFINER trigger
CREATE POLICY "ExpenseEdits: authenticated read"
  ON public.expense_edits FOR SELECT TO authenticated USING (true);
-- No direct INSERT policy — only the trigger function inserts (SECURITY DEFINER)

-- ═══════════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════════
-- Run these in Supabase Dashboard → Storage → New Bucket
-- OR via the Storage API. The SQL below creates the bucket policies.

-- Create the bills bucket (public=false for security)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bills', 'bills', false);

-- Allow authenticated users to read bill images
CREATE POLICY "Bills: authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bills');

-- Allow admins to upload bill images
CREATE POLICY "Bills: admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bills' AND is_admin());

-- Allow admins to delete bill images
CREATE POLICY "Bills: admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bills' AND is_admin());

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- NOTE: Create your first admin user through Supabase Auth dashboard
-- (Authentication → Users → Invite User), then run:
--
-- INSERT INTO public.users (id, name, email, role)
-- VALUES ('<auth-user-uuid>', 'Admin Name', 'admin@example.com', 'admin');
--
-- After that, the admin can add other users through the app.

-- Create a default budget to get started
-- INSERT INTO public.budgets (name, year) VALUES ('Budget 2025', '2025');
