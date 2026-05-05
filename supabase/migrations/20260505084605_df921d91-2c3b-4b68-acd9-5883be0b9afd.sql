CREATE POLICY "Public reads available products"
ON public.products
FOR SELECT
USING (available = true);