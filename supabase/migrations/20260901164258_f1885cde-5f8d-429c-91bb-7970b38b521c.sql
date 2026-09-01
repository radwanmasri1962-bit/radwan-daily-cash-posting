ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS category_group text NOT NULL DEFAULT 'Other';

CREATE TABLE IF NOT EXISTS public.merchant_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant_key text NOT NULL,
  merchant_name text NOT NULL,
  category text,
  description text,
  payment_method text,
  use_count integer NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, merchant_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_memory TO authenticated;
GRANT ALL ON public.merchant_memory TO service_role;

ALTER TABLE public.merchant_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own merchant_memory" ON public.merchant_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER merchant_memory_touch BEFORE UPDATE ON public.merchant_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();