// ============================================================
// ACCOUNTING AI TYPES
// Type definitions for AI Assistant and Telegram Integration
// ============================================================

export type MessageType = 
  | 'general' 
  | 'journal_suggestion' 
  | 'account_review' 
  | 'audit_query' 
  | 'tax_question' 
  | 'period_close' 
  | 'error_detection' 
  | 'compliance_check';

export interface ChatMessage {
  id: string;
  restaurant_id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: MessageType;
  metadata?: {
    structured_data?: any;
    validation_results?: any;
    detected_errors?: any[];
    suggestion_id?: string;
    context?: any;
  };
  tokens_used?: number;
  model?: string;
  parent_message_id?: string;
  is_bookmarked: boolean;
  created_at: string;
}

export interface AiJournalSuggestion {
  id: string;
  restaurant_id: string;
  user_id: string;
  chat_message_id?: string;
  
  // Source
  source_type: 'manual' | 'telegram' | 'whatsapp' | 'ai_chat' | 'audit_detection' | 'reconciliation';
  source_reference?: string;
  
  // Content
  title: string;
  description: string;
  suggested_entry: {
    title: string;
    description: string;
    suggested_date?: string;
    currency: string;
    lines: Array<{
      account_id?: string;
      account_code: string;
      account_name?: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
    validation?: {
      is_balanced: boolean;
      total_debit: number;
      total_credit: number;
    };
  };
  
  // Validation
  validation_results?: {
    is_balanced: boolean;
    total_debit: number;
    total_credit: number;
    compliance_score: number;
  };
  detected_errors: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    account_code?: string;
  }>;
  confidence_score: number;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'posted' | 'expired';
  reviewed_by?: string;
  reviewed_at?: string;
  posted_entry_id?: string;
  rejection_reason?: string;
  
  // Context
  suggested_fiscal_period_id?: string;
  suggested_entry_date?: string;
  
  // Timestamps
  created_at: string;
  expires_at: string;
}

export interface FiscalPeriod {
  id: string;
  restaurant_id: string;
  period_name: string;
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string;
  closed_by?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export interface AccountBalance {
  id: string;
  restaurant_id: string;
  account_id: string;
  fiscal_period_id?: string;
  opening_balance: number;
  current_balance: number;
  total_debit: number;
  total_credit: number;
  movement_debit: number;
  movement_credit: number;
  last_entry_id?: string;
  last_updated_at: string;
  created_at: string;
}

export interface TelegramBot {
  id: string;
  restaurant_id: string;
  bot_token_hash: string;
  bot_username?: string;
  is_active: boolean;
  webhook_url?: string;
  allowed_chat_ids: string[];
  auto_suggest_entries: boolean;
  require_approval: boolean;
  created_at: string;
  created_by?: string;
}

export interface TelegramMessage {
  id: string;
  restaurant_id: string;
  telegram_bot_id?: string;
  telegram_message_id: bigint;
  telegram_chat_id: bigint;
  telegram_chat_title?: string;
  telegram_sender_id?: bigint;
  telegram_sender_name?: string;
  message_text?: string;
  message_type: 'text' | 'photo' | 'document' | 'voice' | 'contact';
  telegram_data?: any;
  processing_status: 'pending' | 'processing' | 'ai_suggested' | 'approved' | 'rejected' | 'error';
  ai_suggestion_id?: string;
  extracted_entities?: {
    amount?: number;
    vendor?: string;
    vat_included?: boolean;
    payment_method?: string;
    detected_accounts?: string[];
  };
  received_at: string;
  processed_at?: string;
  created_at: string;
}

export interface BankReconciliation {
  id: string;
  restaurant_id: string;
  account_id: string;
  fiscal_period_id?: string;
  statement_date: string;
  statement_balance: number;
  system_balance: number;
  difference: number;
  is_reconciled: boolean;
  reconciled_by?: string;
  reconciled_at?: string;
  notes?: string;
  created_at: string;
}

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  debit_movement: number;
  credit_movement: number;
  net_movement: number;
  closing_balance: number;
}

export interface ProfitLossRow {
  category: string;
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

export interface BalanceSheetRow {
  section: string;
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

// API Request/Response types
export interface AiChatRequest {
  restaurant_id: string;
  user_id: string;
  message: string;
  message_type?: MessageType;
  context?: {
    fiscal_period_id?: string;
    account_id?: string;
    entry_id?: string;
    previous_messages?: Array<{ role: string; content: string }>;
  };
}

export interface AiChatResponse {
  ok: boolean;
  response: string;
  structured_data?: any;
  validation_results?: {
    is_balanced: boolean;
    total_debit: number;
    total_credit: number;
    compliance_score: number;
  };
  detected_errors?: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
  chat_message_id: string;
  suggestion_id?: string;
  session_id: string;
  error?: string;
}
