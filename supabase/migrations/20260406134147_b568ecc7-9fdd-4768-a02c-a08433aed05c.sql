-- Allow owners to delete their own orders
CREATE POLICY "Owner deletes orders"
ON public.orders
FOR DELETE
TO authenticated
USING (is_restaurant_owner(auth.uid(), restaurant_id));

-- Allow owners to delete order items
CREATE POLICY "Owner deletes order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = order_items.order_id
  AND is_restaurant_owner(auth.uid(), o.restaurant_id)
));

-- Allow owners to update order items
CREATE POLICY "Owner updates order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = order_items.order_id
  AND is_restaurant_owner(auth.uid(), o.restaurant_id)
));