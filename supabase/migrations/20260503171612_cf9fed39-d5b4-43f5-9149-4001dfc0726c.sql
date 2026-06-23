-- Restore table privileges removed by prior security migration.
-- RLS is still enforced; without these grants, even owners cannot see their own row.
GRANT SELECT, INSERT, UPDATE ON public.restaurants TO authenticated;
GRANT DELETE ON public.restaurants TO authenticated;