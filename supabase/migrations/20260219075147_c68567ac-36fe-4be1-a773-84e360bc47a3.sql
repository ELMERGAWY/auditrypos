
-- Storage bucket for restaurant logos and menu imports
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public reads assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Owner uploads assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Owner updates assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Owner deletes assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-assets' AND auth.role() = 'authenticated');
