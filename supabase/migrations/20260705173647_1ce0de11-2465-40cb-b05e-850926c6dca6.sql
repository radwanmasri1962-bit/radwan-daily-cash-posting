
-- user_settings: single row per user holding balances & config
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chase_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  cap1_owed NUMERIC(12,2) NOT NULL DEFAULT 0,
  cap1_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  cap1_min_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  cap1_due_day INT NOT NULL DEFAULT 1,
  cash_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  snap_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  snap_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 285,
  snap_deposit_day INT NOT NULL DEFAULT 12,
  seeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  merchant TEXT DEFAULT '',
  category TEXT DEFAULT 'Miscellaneous',
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL,
  adjust_account TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_user_date ON public.transactions(user_id, tx_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- daily snapshots
CREATE TABLE public.daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chase_balance NUMERIC(12,2) NOT NULL,
  cap1_owed NUMERIC(12,2) NOT NULL,
  cap1_available NUMERIC(12,2) NOT NULL,
  cash_balance NUMERIC(12,2) NOT NULL,
  snap_balance NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snap_user_date ON public.daily_snapshots(user_id, snapshot_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_snapshots TO authenticated;
GRANT ALL ON public.daily_snapshots TO service_role;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snap" ON public.daily_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pay_method TEXT NOT NULL DEFAULT 'Chase',
  pay_day INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT DEFAULT '',
  last_paid_ym TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_user ON public.subscriptions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs" ON public.subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_user_settings_updated
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
