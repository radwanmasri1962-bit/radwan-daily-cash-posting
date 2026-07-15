
-- ============ Subscriptions: add end_date ============
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============ Transactions: link fields ============
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS monthly_expense_id uuid,
  ADD COLUMN IF NOT EXISTS emergency_fund_id uuid,
  ADD COLUMN IF NOT EXISTS fund_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS budget_ym text;

-- ============ Budget lines ============
CREATE TABLE IF NOT EXISTS public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ym text NOT NULL, -- 'YYYY-MM'
  category_group text NOT NULL DEFAULT 'Other',
  category text NOT NULL,
  planned_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ym, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_lines TO authenticated;
GRANT ALL ON public.budget_lines TO service_role;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budget_lines" ON public.budget_lines FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_user_ym ON public.budget_lines(user_id, ym);
CREATE TRIGGER trg_budget_lines_updated BEFORE UPDATE ON public.budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Monthly expenses ============
CREATE TABLE IF NOT EXISTS public.monthly_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category_group text NOT NULL DEFAULT 'Other',
  category text NOT NULL,
  expected_amount numeric(12,2) NOT NULL DEFAULT 0,
  due_day int NOT NULL DEFAULT 1,
  payment_account text NOT NULL DEFAULT 'Chase Checking',
  frequency text NOT NULL DEFAULT 'Monthly', -- Monthly|Quarterly|Semiannual|Annual|One-time
  is_fixed boolean NOT NULL DEFAULT true,
  autopay boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT (now()::date),
  end_date date,
  notes text,
  linked_subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_expenses TO authenticated;
GRANT ALL ON public.monthly_expenses TO service_role;
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own monthly_expenses" ON public.monthly_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_expenses_user ON public.monthly_expenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_monthly_expenses_due ON public.monthly_expenses(user_id, due_day);
CREATE TRIGGER trg_monthly_expenses_updated BEFORE UPDATE ON public.monthly_expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Monthly expense payments ============
CREATE TABLE IF NOT EXISTS public.monthly_expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  monthly_expense_id uuid NOT NULL REFERENCES public.monthly_expenses(id) ON DELETE CASCADE,
  ym text NOT NULL,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  paid_date date,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, monthly_expense_id, ym)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_expense_payments TO authenticated;
GRANT ALL ON public.monthly_expense_payments TO service_role;
ALTER TABLE public.monthly_expense_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own monthly_expense_payments" ON public.monthly_expense_payments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_mep_user_ym ON public.monthly_expense_payments(user_id, ym);
CREATE TRIGGER trg_mep_updated BEFORE UPDATE ON public.monthly_expense_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Emergency funds ============
CREATE TABLE IF NOT EXISTS public.emergency_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  target_amount numeric(12,2) NOT NULL DEFAULT 0,
  reserved_amount numeric(12,2) NOT NULL DEFAULT 0,
  planned_monthly_contribution numeric(12,2) NOT NULL DEFAULT 0,
  target_date date,
  linked_account text,
  notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_funds TO authenticated;
GRANT ALL ON public.emergency_funds TO service_role;
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emergency_funds" ON public.emergency_funds FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_funds_user ON public.emergency_funds(user_id, is_archived);
CREATE TRIGGER trg_emergency_funds_updated BEFORE UPDATE ON public.emergency_funds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Emergency fund activity ============
CREATE TABLE IF NOT EXISTS public.emergency_fund_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fund_id uuid NOT NULL REFERENCES public.emergency_funds(id) ON DELETE CASCADE,
  kind text NOT NULL, -- contribution|withdrawal
  amount numeric(12,2) NOT NULL,
  activity_date date NOT NULL DEFAULT (now()::date),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_fund_activity TO authenticated;
GRANT ALL ON public.emergency_fund_activity TO service_role;
ALTER TABLE public.emergency_fund_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emergency_fund_activity" ON public.emergency_fund_activity FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_efa_user_fund ON public.emergency_fund_activity(user_id, fund_id);

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_expense_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_funds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_fund_activity;

-- ============ Fubo TV cancellation ============
UPDATE public.subscriptions
SET status = 'canceled',
    notes = COALESCE(NULLIF(notes,''), '') ||
            CASE WHEN COALESCE(notes,'') = '' THEN '' ELSE E'\n' END ||
            'Temporary two-month subscription for the FIFA World Cup',
    end_date = COALESCE(end_date,
      CASE
        WHEN last_paid_ym ~ '^\d{4}-\d{2}$'
          THEN (last_paid_ym || '-01')::date + interval '1 month' - interval '1 day'
        ELSE (now()::date)
      END)
WHERE lower(name) = 'fubo tv';

-- ============ Categories additions ============
INSERT INTO public.categories (user_id, name)
SELECT DISTINCT s.user_id, v.name
FROM public.subscriptions s
CROSS JOIN (VALUES
  ('Renters Insurance'),
  ('Office Space'),
  ('Emergency Car Repair'),
  ('Emergency Fund Contribution')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = s.user_id AND lower(c.name) = lower(v.name)
);
