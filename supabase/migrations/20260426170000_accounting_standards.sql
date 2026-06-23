-- ============================================================
-- AUDITRY POS: Accounting Standards & Inventory Methods
-- ============================================================

BEGIN;

-- 1. Add Accounting & Inventory Settings to Restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS accounting_standard TEXT DEFAULT 'IFRS', -- IFRS, EAS (Egyptian), US_GAAP
ADD COLUMN IF NOT EXISTS inventory_method TEXT DEFAULT 'FIFO',     -- FIFO, LIFO, WEIGHTED_AVG
ADD COLUMN IF NOT EXISTS inventory_system TEXT DEFAULT 'PERPETUAL'; -- PERPETUAL, PERIODIC

-- 2. Add detailed stock logs to support FIFO/LIFO tracking
CREATE TABLE IF NOT EXISTS public.stock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL,
    remaining_quantity DECIMAL(12,3) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_type TEXT, -- purchase, adjustment, return
    source_id UUID
);

-- 3. Comment describing standards logic:
-- IFRS/EAS: Allow FIFO, Weighted Avg. Disallow LIFO.
-- US GAAP: Allow FIFO, Weighted Avg, LIFO.

COMMIT;
