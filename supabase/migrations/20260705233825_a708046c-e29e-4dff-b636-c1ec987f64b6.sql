
-- Categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed categories for the existing authenticated user
INSERT INTO public.categories (user_id, name)
SELECT 'd98adb4d-fb82-4cae-9803-4727795e468e'::uuid, n
FROM unnest(ARRAY[
  'Alcohol','Amazon','Bank Fees','Beverages','Business','Business Income',
  'Cannabis','Car Insurance','Car Maintenance','Car Payment','Car Registration','Car Wash',
  'Cash Deposit','Cash Withdrawal','Charity','Child Expenses','Cigarettes','Cleaning Supplies',
  'Clothing','Coffee','Credit Card Payment','Debt Payment','Dental','Dining Out','Doctor',
  'Electricity','Electronics','Entertainment','Family','Fast Food','Freelance','Furniture',
  'Gas Utility','Gasoline','General Shopping','Gift Received','Gifts','Gifts Given','Groceries',
  'Gym','Health','Household Items','Household Supplies','Interest Charges','Interest Income',
  'Internet','JARA AI','Laundry','Loan Payment','Marketing','Miscellaneous','Office Supplies',
  'Other Income','Parking','Personal Care','Pharmacy','Prescriptions','Professional Services',
  'Refund','Rent','Restaurants','Ride Share (Uber/Lyft)','Salary','SNAP Food','Snacks',
  'Software & AI','Streaming','Subscriptions','Tolls','Transfer Between Accounts','Travel',
  'Uber / Taxi','Utilities','Vape / Tobacco','Vitamins & Supplements','Water'
]) AS n
ON CONFLICT (user_id, name) DO NOTHING;
