-- ============================================================
-- EXTENSION FOR MARKETING AGENCY:
-- 1. Department Managers
-- 2. Reimbursable Client Expenses
-- 3. Advanced Chat (DMs, Departments, Attachments)
-- ============================================================

BEGIN;

-- ─── 1. Department Managers ───
ALTER TABLE public.staff_departments 
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

-- ─── 2. Reimbursable Client Expenses ───
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS is_client_reimbursable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revenue_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_customer ON public.expenses(customer_id);

-- ─── 3. Advanced Chat Support ───
ALTER TABLE public.employee_chat_messages 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.staff_departments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT;

CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_dept ON public.employee_chat_messages(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_recipient ON public.employee_chat_messages(recipient_user_id);

COMMIT;
