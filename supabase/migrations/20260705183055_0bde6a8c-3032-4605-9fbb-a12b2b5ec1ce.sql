
-- Remove duplicate subscriptions, keeping the oldest per (user_id, name)
DELETE FROM public.subscriptions a
USING public.subscriptions b
WHERE a.user_id = b.user_id
  AND a.name = b.name
  AND a.created_at > b.created_at;

-- Handle any exact-tie duplicates via ctid
DELETE FROM public.subscriptions
WHERE ctid NOT IN (
  SELECT MIN(ctid) FROM public.subscriptions GROUP BY user_id, name
);

-- Prevent future duplicates
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_name_unique UNIQUE (user_id, name);
