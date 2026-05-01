-- ============================================================
-- ERP ADVANCED SYSTEM - Clean version without is_active references
-- ============================================================

-- 1. FISCAL PERIODS TABLE
CREATE TABLE IF NOT EXISTS fiscal_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    period_name VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT valid_period_dates CHECK (start_date <= end_date),
    CONSTRAINT unique_period_per_restaurant UNIQUE (restaurant_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_restaurant ON fiscal_periods(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON fiscal_periods(start_date, end_date);

-- 2. ACCOUNT BALANCES TABLE
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL,
    opening_balance DECIMAL(18,4) DEFAULT 0,
    current_balance DECIMAL(18,4) DEFAULT 0,
    total_debit DECIMAL(18,4) DEFAULT 0,
    total_credit DECIMAL(18,4) DEFAULT 0,
    movement_debit DECIMAL(18,4) DEFAULT 0,
    movement_credit DECIMAL(18,4) DEFAULT 0,
    last_entry_id UUID REFERENCES journal_entries(id),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_account_period UNIQUE (restaurant_id, account_id, fiscal_period_id)
);

CREATE INDEX IF NOT EXISTS idx_account_balances_restaurant ON account_balances(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON account_balances(fiscal_period_id);

-- 3. POSTING QUEUE
CREATE TABLE IF NOT EXISTS posting_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'error')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posting_queue_status ON posting_queue(status);
CREATE INDEX IF NOT EXISTS idx_posting_queue_restaurant ON posting_queue(restaurant_id, status);

-- 4. AI CHAT MESSAGES
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(30) DEFAULT 'general' CHECK (message_type IN (
        'general', 'journal_suggestion', 'account_review', 'audit_query', 
        'tax_question', 'period_close', 'error_detection', 'compliance_check'
    )),
    metadata JSONB DEFAULT '{}',
    tokens_used INTEGER,
    model VARCHAR(50) DEFAULT 'gemini-1.5-flash',
    parent_message_id UUID REFERENCES ai_chat_messages(id),
    is_bookmarked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON ai_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_restaurant ON ai_chat_messages(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON ai_chat_messages(user_id, created_at DESC);

-- 5. AI JOURNAL SUGGESTIONS
CREATE TABLE IF NOT EXISTS ai_journal_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_message_id UUID REFERENCES ai_chat_messages(id),
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (source_type IN (
        'manual', 'telegram', 'whatsapp', 'ai_chat', 'audit_detection', 'reconciliation'
    )),
    source_reference VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    suggested_entry JSONB NOT NULL,
    validation_results JSONB DEFAULT '{}',
    detected_errors JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'posted', 'expired')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    posted_entry_id UUID REFERENCES journal_entries(id),
    rejection_reason TEXT,
    suggested_fiscal_period_id UUID REFERENCES fiscal_periods(id),
    suggested_entry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_journal_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_restaurant ON ai_journal_suggestions(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_source ON ai_journal_suggestions(source_type, source_reference);

-- 6. TELEGRAM BOTS
CREATE TABLE IF NOT EXISTS telegram_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    bot_token_hash VARCHAR(255) NOT NULL,
    bot_username VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    webhook_url TEXT,
    allowed_chat_ids JSONB DEFAULT '[]',
    auto_suggest_entries BOOLEAN DEFAULT TRUE,
    require_approval BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_bots_restaurant ON telegram_bots(restaurant_id);

-- 7. TELEGRAM MESSAGES
CREATE TABLE IF NOT EXISTS telegram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    telegram_bot_id UUID REFERENCES telegram_bots(id) ON DELETE CASCADE,
    telegram_message_id BIGINT NOT NULL,
    telegram_chat_id BIGINT NOT NULL,
    telegram_chat_title VARCHAR(255),
    telegram_sender_id BIGINT,
    telegram_sender_name VARCHAR(255),
    message_text TEXT,
    message_type VARCHAR(30) DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'document', 'voice', 'contact')),
    telegram_data JSONB,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'ai_suggested', 'approved', 'rejected', 'error')),
    ai_suggestion_id UUID REFERENCES ai_journal_suggestions(id),
    extracted_entities JSONB DEFAULT '{}',
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat ON telegram_messages(telegram_chat_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_status ON telegram_messages(processing_status);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_restaurant ON telegram_messages(restaurant_id, received_at DESC);

-- 8. ACCOUNTING AUDIT LOG
CREATE TABLE IF NOT EXISTS accounting_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'POST', 'UNPOST')),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record ON accounting_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_restaurant ON accounting_audit_log(restaurant_id, performed_at DESC);

-- 9. BANK RECONCILIATIONS
CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    fiscal_period_id UUID REFERENCES fiscal_periods(id),
    statement_date DATE NOT NULL,
    statement_balance DECIMAL(18,4) NOT NULL,
    system_balance DECIMAL(18,4) NOT NULL,
    difference DECIMAL(18,4) GENERATED ALWAYS AS (statement_balance - system_balance) STORED,
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_by UUID REFERENCES auth.users(id),
    reconciled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
    journal_entry_line_id UUID REFERENCES journal_entry_lines(id),
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('system', 'manual', 'ai_suggested')),
    transaction_date DATE,
    description TEXT,
    amount DECIMAL(18,4),
    is_reconciled BOOLEAN DEFAULT FALSE,
    matched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS (Simplified without is_active references)
-- ============================================================

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_default_fiscal_periods CASCADE;
DROP FUNCTION IF EXISTS get_current_fiscal_period CASCADE;
DROP FUNCTION IF EXISTS post_journal_entry CASCADE;
DROP FUNCTION IF EXISTS get_trial_balance CASCADE;
DROP FUNCTION IF EXISTS get_profit_and_loss CASCADE;
DROP FUNCTION IF EXISTS get_balance_sheet CASCADE;

CREATE OR REPLACE FUNCTION create_default_fiscal_periods(p_restaurant_id UUID, p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE))
RETURNS void AS $$
DECLARE
    month_counter INTEGER;
    start_dt DATE;
    end_dt DATE;
BEGIN
    FOR month_counter IN 1..12 LOOP
        start_dt := make_date(p_year, month_counter, 1);
        end_dt := (start_dt + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        
        INSERT INTO fiscal_periods (
            restaurant_id, period_name, period_type, start_date, end_date
        ) VALUES (
            p_restaurant_id,
            p_year || '-M' || LPAD(month_counter::TEXT, 2, '0'),
            'monthly',
            start_dt,
            end_dt
        )
        ON CONFLICT (restaurant_id, start_date, end_date) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_fiscal_period(p_restaurant_id UUID)
RETURNS UUID AS $$
DECLARE
    v_period_id UUID;
BEGIN
    SELECT id INTO v_period_id
    FROM fiscal_periods
    WHERE restaurant_id = p_restaurant_id
      AND CURRENT_DATE BETWEEN start_date AND end_date
    LIMIT 1;
    
    IF v_period_id IS NULL THEN
        PERFORM create_default_fiscal_periods(p_restaurant_id);
        
        SELECT id INTO v_period_id
        FROM fiscal_periods
        WHERE restaurant_id = p_restaurant_id
          AND CURRENT_DATE BETWEEN start_date AND end_date
        LIMIT 1;
    END IF;
    
    RETURN v_period_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION post_journal_entry(p_entry_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_entry RECORD;
    v_line RECORD;
    v_fiscal_period_id UUID;
    v_balance_record RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;
    
    IF v_entry IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entry not found');
    END IF;
    
    IF v_entry.is_posted THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entry already posted');
    END IF;
    
    v_fiscal_period_id := get_current_fiscal_period(v_entry.restaurant_id);
    
    FOR v_line IN SELECT * FROM journal_entry_lines WHERE entry_id = p_entry_id
    LOOP
        SELECT * INTO v_balance_record
        FROM account_balances
        WHERE restaurant_id = v_entry.restaurant_id
          AND account_id = v_line.account_id
          AND fiscal_period_id = v_fiscal_period_id;
        
        IF v_balance_record IS NULL THEN
            INSERT INTO account_balances (
                restaurant_id, account_id, fiscal_period_id,
                opening_balance, current_balance, total_debit, total_credit
            ) VALUES (
                v_entry.restaurant_id, v_line.account_id, v_fiscal_period_id, 0, 0, 0, 0
            )
            RETURNING * INTO v_balance_record;
        END IF;
        
        UPDATE account_balances
        SET 
            current_balance = current_balance + COALESCE(v_line.debit, 0) - COALESCE(v_line.credit, 0),
            total_debit = total_debit + COALESCE(v_line.debit, 0),
            total_credit = total_credit + COALESCE(v_line.credit, 0),
            movement_debit = movement_debit + COALESCE(v_line.debit, 0),
            movement_credit = movement_credit + COALESCE(v_line.credit, 0),
            last_entry_id = p_entry_id,
            last_updated_at = NOW()
        WHERE id = v_balance_record.id;
    END LOOP;
    
    UPDATE journal_entries
    SET is_posted = TRUE
    WHERE id = p_entry_id;
    
    RETURN jsonb_build_object('success', true, 'fiscal_period_id', v_fiscal_period_id);
END;
$$ LANGUAGE plpgsql;

-- Report Functions without is_active filter
CREATE OR REPLACE FUNCTION get_trial_balance(
    p_restaurant_id UUID,
    p_fiscal_period_id UUID DEFAULT NULL,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    account_id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    account_type VARCHAR,
    opening_balance DECIMAL,
    debit_movement DECIMAL,
    credit_movement DECIMAL,
    net_movement DECIMAL,
    closing_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id as account_id,
        coa.code as account_code,
        coa.name as account_name,
        coa.account_type::VARCHAR,
        COALESCE(ab.opening_balance, 0) as opening_balance,
        COALESCE(ab.movement_debit, 0) as debit_movement,
        COALESCE(ab.movement_credit, 0) as credit_movement,
        COALESCE(ab.movement_debit, 0) - COALESCE(ab.movement_credit, 0) as net_movement,
        COALESCE(ab.current_balance, 0) as closing_balance
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON ab.account_id = coa.id 
        AND ab.fiscal_period_id = COALESCE(p_fiscal_period_id, get_current_fiscal_period(p_restaurant_id))
    WHERE coa.restaurant_id = p_restaurant_id
    ORDER BY coa.code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_profit_and_loss(
    p_restaurant_id UUID,
    p_fiscal_period_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    category VARCHAR,
    account_id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    amount DECIMAL
) AS $$
DECLARE
    v_period_id UUID;
    v_start DATE;
    v_end DATE;
BEGIN
    v_period_id := COALESCE(p_fiscal_period_id, get_current_fiscal_period(p_restaurant_id));
    
    SELECT start_date, end_date INTO v_start, v_end
    FROM fiscal_periods WHERE id = v_period_id;
    
    v_start := COALESCE(p_start_date, v_start);
    v_end := COALESCE(p_end_date, v_end);
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN coa.account_type = 'revenue' THEN 'الإيرادات'
            WHEN coa.account_type = 'cogs' THEN 'تكلفة البضاعة المباعة'
            WHEN coa.account_type = 'expense' THEN 'المصروفات'
            ELSE 'أخرى'
        END::VARCHAR as category,
        coa.id as account_id,
        coa.code as account_code,
        coa.name as account_name,
        CASE 
            WHEN coa.account_type = 'revenue' THEN COALESCE(ab.movement_credit, 0) - COALESCE(ab.movement_debit, 0)
            ELSE COALESCE(ab.movement_debit, 0) - COALESCE(ab.movement_credit, 0)
        END as amount
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON ab.account_id = coa.id AND ab.fiscal_period_id = v_period_id
    WHERE coa.restaurant_id = p_restaurant_id
      AND coa.account_type IN ('revenue', 'cogs', 'expense')
    ORDER BY 
        CASE coa.account_type 
            WHEN 'revenue' THEN 1 
            WHEN 'cogs' THEN 2 
            WHEN 'expense' THEN 3 
        END,
        coa.code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_balance_sheet(
    p_restaurant_id UUID,
    p_fiscal_period_id UUID DEFAULT NULL,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    section VARCHAR,
    account_id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    amount DECIMAL
) AS $$
DECLARE
    v_period_id UUID;
BEGIN
    v_period_id := COALESCE(p_fiscal_period_id, get_current_fiscal_period(p_restaurant_id));
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN coa.account_type IN ('asset') THEN 'الأصول'
            WHEN coa.account_type IN ('liability') THEN 'الخصوم'
            WHEN coa.account_type IN ('equity') THEN 'حقوق الملكية'
            ELSE 'أخرى'
        END::VARCHAR as section,
        coa.id as account_id,
        coa.code as account_code,
        coa.name as account_name,
        COALESCE(ab.current_balance, 0) as amount
    FROM chart_of_accounts coa
    LEFT JOIN account_balances ab ON ab.account_id = coa.id AND ab.fiscal_period_id = v_period_id
    WHERE coa.restaurant_id = p_restaurant_id
      AND coa.account_type IN ('asset', 'liability', 'equity')
    ORDER BY 
        CASE coa.account_type 
            WHEN 'asset' THEN 1 
            WHEN 'liability' THEN 2 
            WHEN 'equity' THEN 3 
        END,
        coa.code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE posting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_journal_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY fiscal_periods_restaurant_isolation ON fiscal_periods
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY account_balances_restaurant_isolation ON account_balances
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY ai_chat_messages_restaurant_isolation ON ai_chat_messages
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY ai_suggestions_restaurant_isolation ON ai_journal_suggestions
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY telegram_bots_restaurant_isolation ON telegram_bots
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY telegram_messages_restaurant_isolation ON telegram_messages
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY accounting_audit_log_restaurant_isolation ON accounting_audit_log
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

-- ============================================================
-- INITIAL DATA SETUP
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM restaurants LOOP
        PERFORM create_default_fiscal_periods(r.id);
    END LOOP;
END $$;
