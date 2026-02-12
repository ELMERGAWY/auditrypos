
-- Roles enum and user_roles table (CRITICAL: roles in separate table)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'restaurant_owner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer: check role without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending')),
  subscription_end TIMESTAMPTZ,
  license_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Helper: check if user owns restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_user_id UUID, _restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = _restaurant_id AND owner_id = _user_id)
$$;

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'General',
  image TEXT NOT NULL DEFAULT '🍔',
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed')),
  table_number INT,
  synced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_name TEXT NOT NULL,
  menu_item_image TEXT NOT NULL DEFAULT '🍔',
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- License keys (super admin only)
CREATE TABLE public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  duration_days INT NOT NULL DEFAULT 30,
  used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES public.restaurants(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

-- Payment receipts
CREATE TABLE public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  method TEXT NOT NULL DEFAULT 'Manual Upload',
  amount TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Waiter calls (public can INSERT, restaurant owner can read)
CREATE TABLE public.waiter_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  table_info TEXT NOT NULL DEFAULT 'عميل من قائمة QR',
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'restaurant_owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ RLS POLICIES ============

-- user_roles: users can read own, super admin all
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System inserts profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- restaurants
CREATE POLICY "Owner reads own restaurant" ON public.restaurants FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner creates restaurant" ON public.restaurants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner updates own restaurant" ON public.restaurants FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin deletes restaurant" ON public.restaurants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- menu_items: public can read for QR menu, owner CRUD
CREATE POLICY "Public reads menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Owner manages menu" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner updates menu" ON public.menu_items FOR UPDATE TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner deletes menu" ON public.menu_items FOR DELETE TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'));

-- orders
CREATE POLICY "Owner reads orders" ON public.orders FOR SELECT TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner creates orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id));
CREATE POLICY "Owner updates orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- order_items
CREATE POLICY "Owner reads order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_restaurant_owner(auth.uid(), o.restaurant_id) OR public.has_role(auth.uid(), 'super_admin')))
);
CREATE POLICY "Owner creates order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_restaurant_owner(auth.uid(), o.restaurant_id))
);

-- license_keys: super admin only
CREATE POLICY "Admin manages licenses" ON public.license_keys FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- payment_receipts
CREATE POLICY "Owner reads receipts" ON public.payment_receipts FOR SELECT TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner creates receipts" ON public.payment_receipts FOR INSERT TO authenticated WITH CHECK (public.is_restaurant_owner(auth.uid(), restaurant_id));
CREATE POLICY "Admin updates receipts" ON public.payment_receipts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- waiter_calls: anyone can insert (QR menu), owner reads
CREATE POLICY "Anyone creates waiter call" ON public.waiter_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner reads waiter calls" ON public.waiter_calls FOR SELECT TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner updates waiter calls" ON public.waiter_calls FOR UPDATE TO authenticated USING (public.is_restaurant_owner(auth.uid(), restaurant_id));

-- Enable realtime for waiter_calls and orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
