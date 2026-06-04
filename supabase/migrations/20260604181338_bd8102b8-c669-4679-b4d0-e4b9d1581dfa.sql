CREATE OR REPLACE VIEW public.restaurants_public
WITH (security_invoker=on) AS
SELECT id, name, logo_url, currency, status, business_type
FROM public.restaurants
WHERE status IN ('active','trial');

GRANT SELECT ON public.restaurants_public TO anon, authenticated;