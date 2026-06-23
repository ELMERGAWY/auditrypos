
-- Allow public to read restaurant name (needed for QR menu header)
CREATE POLICY "Public reads restaurant name" ON public.restaurants FOR SELECT USING (true);
-- Drop the old policy that restricted to authenticated only
DROP POLICY "Owner reads own restaurant" ON public.restaurants;
