export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_balances: {
        Row: {
          account_id: string
          created_at: string | null
          current_balance: number | null
          fiscal_period_id: string | null
          id: string
          last_entry_id: string | null
          last_updated_at: string | null
          movement_credit: number | null
          movement_debit: number | null
          opening_balance: number | null
          restaurant_id: string
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          current_balance?: number | null
          fiscal_period_id?: string | null
          id?: string
          last_entry_id?: string | null
          last_updated_at?: string | null
          movement_credit?: number | null
          movement_debit?: number | null
          opening_balance?: number | null
          restaurant_id: string
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          current_balance?: number | null
          fiscal_period_id?: string | null
          id?: string
          last_entry_id?: string | null
          last_updated_at?: string | null
          movement_credit?: number | null
          movement_debit?: number | null
          opening_balance?: number | null
          restaurant_id?: string
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_fiscal_period_id_fkey"
            columns: ["fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_last_entry_id_fkey"
            columns: ["last_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_last_entry_id_fkey"
            columns: ["last_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_last_entry_id_fkey"
            columns: ["last_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "account_balances_last_entry_id_fkey"
            columns: ["last_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      account_budget_freezes: {
        Row: {
          company_id: string
          frozen_at: string
          frozen_by: string | null
          id: string
          is_frozen: boolean
          period_end: string
          period_start: string
          reason: string | null
          workspace_id: string | null
        }
        Insert: {
          company_id: string
          frozen_at?: string
          frozen_by?: string | null
          id?: string
          is_frozen?: boolean
          period_end: string
          period_start: string
          reason?: string | null
          workspace_id?: string | null
        }
        Update: {
          company_id?: string
          frozen_at?: string
          frozen_by?: string | null
          id?: string
          is_frozen?: boolean
          period_end?: string
          period_start?: string
          reason?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_budget_freezes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budget_freezes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      account_budgets: {
        Row: {
          account_id: string
          budget_amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          fiscal_month: number
          fiscal_year: number
          id: string
          notes: string | null
          restaurant_id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          budget_amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_month: number
          fiscal_year: number
          id?: string
          notes?: string | null
          restaurant_id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          budget_amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_month?: number
          fiscal_year?: number
          id?: string
          notes?: string | null
          restaurant_id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_audit_log: {
        Row: {
          action: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          performed_at: string | null
          performed_by: string
          record_id: string
          restaurant_id: string
          session_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string | null
          performed_by: string
          record_id: string
          restaurant_id: string
          session_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string | null
          performed_by?: string
          record_id?: string
          restaurant_id?: string
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_period_closes: {
        Row: {
          closing_journal_entry_id: string | null
          created_at: string
          created_by: string | null
          expense_total: number
          id: string
          net_result: number
          notes: string | null
          period_end: string
          period_start: string
          reopened_at: string | null
          reopened_by: string | null
          restaurant_id: string
          revenue_total: number
          status: string
        }
        Insert: {
          closing_journal_entry_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_total?: number
          id?: string
          net_result?: number
          notes?: string | null
          period_end: string
          period_start: string
          reopened_at?: string | null
          reopened_by?: string | null
          restaurant_id: string
          revenue_total?: number
          status?: string
        }
        Update: {
          closing_journal_entry_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_total?: number
          id?: string
          net_result?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          reopened_at?: string | null
          reopened_by?: string | null
          restaurant_id?: string
          revenue_total?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_period_locks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_locked: boolean
          lock_name: string
          period_end: string
          period_start: string
          reason: string | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          lock_name?: string
          period_end: string
          period_start: string
          reason?: string | null
          restaurant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          lock_name?: string
          period_end?: string
          period_start?: string
          reason?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_locks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_locks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_locks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_posting_rules: {
        Row: {
          amount_source: string
          cr_system_key: string | null
          description_template: string
          dr_system_key: string | null
          event_code: string
          id: string
          is_active: boolean
          line_no: number
          profile_code: string
        }
        Insert: {
          amount_source: string
          cr_system_key?: string | null
          description_template?: string
          dr_system_key?: string | null
          event_code: string
          id?: string
          is_active?: boolean
          line_no: number
          profile_code: string
        }
        Update: {
          amount_source?: string
          cr_system_key?: string | null
          description_template?: string
          dr_system_key?: string | null
          event_code?: string
          id?: string
          is_active?: boolean
          line_no?: number
          profile_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_posting_rules_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_bookmarked: boolean | null
          message_type: string | null
          metadata: Json | null
          model: string | null
          parent_message_id: string | null
          restaurant_id: string
          role: string
          session_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          model?: string | null
          parent_message_id?: string | null
          restaurant_id: string
          role: string
          session_id?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_bookmarked?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          model?: string | null
          parent_message_id?: string | null
          restaurant_id?: string
          role?: string
          session_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_journal_suggestions: {
        Row: {
          chat_message_id: string | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          detected_errors: Json | null
          expires_at: string | null
          id: string
          posted_entry_id: string | null
          rejection_reason: string | null
          restaurant_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_reference: string | null
          source_type: string
          status: string
          suggested_entry: Json
          suggested_entry_date: string | null
          suggested_fiscal_period_id: string | null
          title: string | null
          user_id: string
          validation_results: Json | null
        }
        Insert: {
          chat_message_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          detected_errors?: Json | null
          expires_at?: string | null
          id?: string
          posted_entry_id?: string | null
          rejection_reason?: string | null
          restaurant_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          suggested_entry: Json
          suggested_entry_date?: string | null
          suggested_fiscal_period_id?: string | null
          title?: string | null
          user_id: string
          validation_results?: Json | null
        }
        Update: {
          chat_message_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          detected_errors?: Json | null
          expires_at?: string | null
          id?: string
          posted_entry_id?: string | null
          rejection_reason?: string | null
          restaurant_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          suggested_entry?: Json
          suggested_entry_date?: string | null
          suggested_fiscal_period_id?: string | null
          title?: string | null
          user_id?: string
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_journal_suggestions_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_posted_entry_id_fkey"
            columns: ["posted_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_posted_entry_id_fkey"
            columns: ["posted_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_posted_entry_id_fkey"
            columns: ["posted_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_posted_entry_id_fkey"
            columns: ["posted_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_journal_suggestions_suggested_fiscal_period_id_fkey"
            columns: ["suggested_fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_open_items: {
        Row: {
          balance_amount: number | null
          created_at: string
          doc_date: string
          doc_no: string | null
          due_date: string | null
          id: string
          original_amount: number
          paid_amount: number
          restaurant_id: string
          source_id: string
          source_type: string
          status: string
          supplier_id: string | null
        }
        Insert: {
          balance_amount?: number | null
          created_at?: string
          doc_date: string
          doc_no?: string | null
          due_date?: string | null
          id?: string
          original_amount?: number
          paid_amount?: number
          restaurant_id: string
          source_id: string
          source_type: string
          status?: string
          supplier_id?: string | null
        }
        Update: {
          balance_amount?: number | null
          created_at?: string
          doc_date?: string
          doc_no?: string | null
          due_date?: string | null
          id?: string
          original_amount?: number
          paid_amount?: number
          restaurant_id?: string
          source_id?: string
          source_type?: string
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_open_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_settlements: {
        Row: {
          ap_item_id: string
          created_by: string | null
          id: string
          payment_ref: string | null
          restaurant_id: string
          settled_amount: number
          settled_at: string
        }
        Insert: {
          ap_item_id: string
          created_by?: string | null
          id?: string
          payment_ref?: string | null
          restaurant_id: string
          settled_amount: number
          settled_at?: string
        }
        Update: {
          ap_item_id?: string
          created_by?: string | null
          id?: string
          payment_ref?: string | null
          restaurant_id?: string
          settled_amount?: number
          settled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ap_settlements_ap_item_id_fkey"
            columns: ["ap_item_id"]
            isOneToOne: false
            referencedRelation: "ap_open_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_settlements_ap_item_id_fkey"
            columns: ["ap_item_id"]
            isOneToOne: false
            referencedRelation: "v_ap_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_open_items: {
        Row: {
          balance_amount: number | null
          created_at: string
          customer_id: string | null
          doc_date: string
          doc_no: string | null
          due_date: string | null
          id: string
          original_amount: number
          paid_amount: number
          restaurant_id: string
          source_id: string
          source_type: string
          status: string
        }
        Insert: {
          balance_amount?: number | null
          created_at?: string
          customer_id?: string | null
          doc_date: string
          doc_no?: string | null
          due_date?: string | null
          id?: string
          original_amount?: number
          paid_amount?: number
          restaurant_id: string
          source_id: string
          source_type: string
          status?: string
        }
        Update: {
          balance_amount?: number | null
          created_at?: string
          customer_id?: string | null
          doc_date?: string
          doc_no?: string | null
          due_date?: string | null
          id?: string
          original_amount?: number
          paid_amount?: number
          restaurant_id?: string
          source_id?: string
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_open_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_open_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_settlements: {
        Row: {
          ar_item_id: string
          created_by: string | null
          id: string
          payment_ref: string | null
          restaurant_id: string
          settled_amount: number
          settled_at: string
        }
        Insert: {
          ar_item_id: string
          created_by?: string | null
          id?: string
          payment_ref?: string | null
          restaurant_id: string
          settled_amount: number
          settled_at?: string
        }
        Update: {
          ar_item_id?: string
          created_by?: string | null
          id?: string
          payment_ref?: string | null
          restaurant_id?: string
          settled_amount?: number
          settled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_settlements_ar_item_id_fkey"
            columns: ["ar_item_id"]
            isOneToOne: false
            referencedRelation: "ar_open_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          restaurant_id: string | null
          table_name: string
        }
        Insert: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          restaurant_id?: string | null
          table_name: string
        }
        Update: {
          action?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          restaurant_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string
          created_at: string | null
          currency: string | null
          current_balance: number | null
          iban: string | null
          id: string
          is_active: boolean | null
          ledger_account_id: string | null
          opening_balance: number | null
          restaurant_id: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          ledger_account_id?: string | null
          opening_balance?: number | null
          restaurant_id: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          ledger_account_id?: string | null
          opening_balance?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliation_items: {
        Row: {
          amount: number
          description: string | null
          id: string
          is_cleared: boolean | null
          journal_entry_id: string | null
          reconciliation_id: string | null
          transaction_date: string
          transaction_type: string | null
        }
        Insert: {
          amount: number
          description?: string | null
          id?: string
          is_cleared?: boolean | null
          journal_entry_id?: string | null
          reconciliation_id?: string | null
          transaction_date: string
          transaction_type?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          id?: string
          is_cleared?: boolean | null
          journal_entry_id?: string | null
          reconciliation_id?: string | null
          transaction_date?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_account_id: string
          created_at: string | null
          difference: number | null
          id: string
          is_reconciled: boolean | null
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          statement_balance: number
          statement_date: string
          system_balance: number
        }
        Insert: {
          bank_account_id: string
          created_at?: string | null
          difference?: number | null
          id?: string
          is_reconciled?: boolean | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          statement_balance: number
          statement_date: string
          system_balance: number
        }
        Update: {
          bank_account_id?: string
          created_at?: string | null
          difference?: number | null
          id?: string
          is_reconciled?: boolean | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          statement_balance?: number
          statement_date?: string
          system_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bans: {
        Row: {
          ban_level: string
          banned_at: string
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string
          reason: string
          restaurant_id: string
          target_identifier: string
          target_name: string
          target_type: string
        }
        Insert: {
          ban_level: string
          banned_at?: string
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string
          reason?: string
          restaurant_id: string
          target_identifier: string
          target_name?: string
          target_type: string
        }
        Update: {
          ban_level?: string
          banned_at?: string
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string
          reason?: string
          restaurant_id?: string
          target_identifier?: string
          target_name?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_consumption: {
        Row: {
          batch_id: string | null
          consumed_at: string | null
          consumed_qty: number
          id: string
          sale_line_id: string | null
        }
        Insert: {
          batch_id?: string | null
          consumed_at?: string | null
          consumed_qty: number
          id?: string
          sale_line_id?: string | null
        }
        Update: {
          batch_id?: string | null
          consumed_at?: string | null
          consumed_qty?: number
          id?: string
          sale_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_consumption_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_consumption_sale_line_id_fkey"
            columns: ["sale_line_id"]
            isOneToOne: false
            referencedRelation: "retail_sale_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_of_materials: {
        Row: {
          company_id: string
          created_at: string
          expected_yield_percentage: number
          expected_yield_quantity: number
          id: string
          is_active: boolean
          product_id: string
          standard_labor_cost: number
          standard_overhead_cost: number
          standard_total_cost: number
          updated_at: string
          version: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expected_yield_percentage?: number
          expected_yield_quantity?: number
          id?: string
          is_active?: boolean
          product_id: string
          standard_labor_cost?: number
          standard_overhead_cost?: number
          standard_total_cost?: number
          updated_at?: string
          version?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expected_yield_percentage?: number
          expected_yield_quantity?: number
          id?: string
          is_active?: boolean
          product_id?: string
          standard_labor_cost?: number
          standard_overhead_cost?: number
          standard_total_cost?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      bom_components: {
        Row: {
          bom_id: string
          component_product_id: string
          created_at: string
          id: string
          is_optional: boolean
          notes: string | null
          product_id: string
          quantity_required: number
          scrap_percentage: number
          unit_of_measure: string
        }
        Insert: {
          bom_id: string
          component_product_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          notes?: string | null
          product_id: string
          quantity_required: number
          scrap_percentage?: number
          unit_of_measure?: string
        }
        Update: {
          bom_id?: string
          component_product_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          notes?: string | null
          product_id?: string
          quantity_required?: number
          scrap_percentage?: number
          unit_of_measure?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_components_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_variance_approvals: {
        Row: {
          account_id: string | null
          actual_amount: number
          budget_amount: number
          company_id: string
          fiscal_month: number
          fiscal_year: number
          id: string
          reason: string | null
          requested_at: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          variance_amount: number
          variance_percent: number | null
          workspace_id: string | null
        }
        Insert: {
          account_id?: string | null
          actual_amount?: number
          budget_amount?: number
          company_id: string
          fiscal_month: number
          fiscal_year: number
          id?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          variance_amount?: number
          variance_percent?: number | null
          workspace_id?: string | null
        }
        Update: {
          account_id?: string | null
          actual_amount?: number
          budget_amount?: number
          company_id?: string
          fiscal_month?: number
          fiscal_year?: number
          id?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          variance_amount?: number
          variance_percent?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_variance_approvals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_variance_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_variance_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string | null
          actual_amount: number | null
          budgeted_amount: number
          cost_center_id: string | null
          created_at: string | null
          id: string
          month: number | null
          restaurant_id: string
          variance: number | null
          year: number
        }
        Insert: {
          account_id?: string | null
          actual_amount?: number | null
          budgeted_amount: number
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          month?: number | null
          restaurant_id: string
          variance?: number | null
          year: number
        }
        Update: {
          account_id?: string | null
          actual_amount?: number | null
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          month?: number | null
          restaurant_id?: string
          variance?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_type: string
          code: string
          company_id: string | null
          created_at: string
          default_features: Json
          description: string | null
          features: Json
          is_active: boolean
          is_default: boolean
          name_ar: string
          name_en: string
        }
        Insert: {
          business_type?: string
          code: string
          company_id?: string | null
          created_at?: string
          default_features?: Json
          description?: string | null
          features?: Json
          is_active?: boolean
          is_default?: boolean
          name_ar: string
          name_en: string
        }
        Update: {
          business_type?: string
          code?: string
          company_id?: string | null
          created_at?: string
          default_features?: Json
          description?: string | null
          features?: Json
          is_active?: boolean
          is_default?: boolean
          name_ar?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_class: string | null
          account_type: string
          business_scope: string[]
          code: string
          company_id: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          is_bank_account: boolean | null
          is_cash_account: boolean | null
          name: string
          normal_side: string | null
          notes: string | null
          opening_balance: number | null
          parent_id: string | null
          posting_allowed: boolean
          restaurant_id: string
          subtype: string | null
          system_key: string | null
          workspace_id: string | null
        }
        Insert: {
          account_class?: string | null
          account_type: string
          business_scope?: string[]
          code: string
          company_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_bank_account?: boolean | null
          is_cash_account?: boolean | null
          name: string
          normal_side?: string | null
          notes?: string | null
          opening_balance?: number | null
          parent_id?: string | null
          posting_allowed?: boolean
          restaurant_id: string
          subtype?: string | null
          system_key?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_class?: string | null
          account_type?: string
          business_scope?: string[]
          code?: string
          company_id?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_bank_account?: boolean | null
          is_cash_account?: boolean | null
          name?: string
          normal_side?: string | null
          notes?: string | null
          opening_balance?: number | null
          parent_id?: string | null
          posting_allowed?: boolean
          restaurant_id?: string
          subtype?: string | null
          system_key?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          commercial_registration: string | null
          created_at: string
          currency: string
          id: string
          legal_name: string | null
          name: string
          primary_owner_id: string | null
          settings: Json
          tax_number: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          commercial_registration?: string | null
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name: string
          primary_owner_id?: string | null
          settings?: Json
          tax_number?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          commercial_registration?: string | null
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name?: string
          primary_owner_id?: string | null
          settings?: Json
          tax_number?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_business_profiles: {
        Row: {
          accounting_basis: string
          accounting_rules: Json
          company_id: string
          created_at: string
          default_tax_rate: number
          id: string
          inventory_cost_method: string
          is_active: boolean
          is_default: boolean
          pos_rules: Json
          profile_code: string
          revenue_recognition: string
          tax_enabled: boolean
          tax_included: boolean
          updated_at: string
        }
        Insert: {
          accounting_basis?: string
          accounting_rules?: Json
          company_id: string
          created_at?: string
          default_tax_rate?: number
          id?: string
          inventory_cost_method?: string
          is_active?: boolean
          is_default?: boolean
          pos_rules?: Json
          profile_code: string
          revenue_recognition?: string
          tax_enabled?: boolean
          tax_included?: boolean
          updated_at?: string
        }
        Update: {
          accounting_basis?: string
          accounting_rules?: Json
          company_id?: string
          created_at?: string
          default_tax_rate?: number
          id?: string
          inventory_cost_method?: string
          is_active?: boolean
          is_default?: boolean
          pos_rules?: Json
          profile_code?: string
          revenue_recognition?: string
          tax_enabled?: boolean
          tax_included?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_business_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_business_profiles_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["code"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          budget_amount: number | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          restaurant_id: string
          type: string | null
        }
        Insert: {
          budget_amount?: number | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          restaurant_id: string
          type?: string | null
        }
        Update: {
          budget_amount?: number | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          restaurant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_layers: {
        Row: {
          consumed_at: string | null
          consumed_quantity: number | null
          created_at: string
          id: string
          is_consumed: boolean | null
          item_id: string | null
          layer_date: string
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          remaining_qty: number
          remaining_quantity: number | null
          total_cost: number | null
          unit_cost: number
          warehouse_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          consumed_quantity?: number | null
          created_at?: string
          id?: string
          is_consumed?: boolean | null
          item_id?: string | null
          layer_date: string
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          remaining_qty?: number
          remaining_quantity?: number | null
          total_cost?: number | null
          unit_cost: number
          warehouse_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          consumed_quantity?: number | null
          created_at?: string
          id?: string
          is_consumed?: boolean | null
          item_id?: string | null
          layer_date?: string
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          remaining_qty?: number
          remaining_quantity?: number | null
          total_cost?: number | null
          unit_cost?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_layers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_layers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_communication_logs: {
        Row: {
          contact_date: string | null
          created_at: string | null
          customer_id: string | null
          details: string | null
          id: string
          lead_id: string | null
          restaurant_id: string | null
          summary: string | null
          type: string | null
        }
        Insert: {
          contact_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          details?: string | null
          id?: string
          lead_id?: string | null
          restaurant_id?: string | null
          summary?: string | null
          type?: string | null
        }
        Update: {
          contact_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          details?: string | null
          id?: string
          lead_id?: string | null
          restaurant_id?: string | null
          summary?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_communication_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_communication_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_communication_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_communication_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_communication_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_communication_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          created_at: string | null
          email: string | null
          estimated_value: number | null
          id: string
          name: string
          phone: string | null
          restaurant_id: string | null
          source: string | null
          stage: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          name: string
          phone?: string | null
          restaurant_id?: string | null
          source?: string | null
          stage?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          name?: string
          phone?: string | null
          restaurant_id?: string | null
          source?: string | null
          stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string | null
          restaurant_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          restaurant_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          restaurant_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_transactions: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          payment_method: string | null
          reference_number: string | null
          restaurant_id: string
          type: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          restaurant_id: string
          type?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number
          company_id: string | null
          created_at: string
          credit_limit: number
          customer_type: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          restaurant_id: string
          tax_number: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number
          company_id?: string | null
          created_at?: string
          credit_limit?: number
          customer_type?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string
          restaurant_id: string
          tax_number?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number
          company_id?: string | null
          created_at?: string
          credit_limit?: number
          customer_type?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          restaurant_id?: string
          tax_number?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_overheads: {
        Row: {
          created_at: string | null
          date: string
          electricity_amount: number | null
          id: string
          is_distributed: boolean | null
          notes: string | null
          other_amount: number | null
          rent_amount: number | null
          restaurant_id: string
          salaries_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          electricity_amount?: number | null
          id?: string
          is_distributed?: boolean | null
          notes?: string | null
          other_amount?: number | null
          rent_amount?: number | null
          restaurant_id: string
          salaries_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          electricity_amount?: number | null
          id?: string
          is_distributed?: boolean | null
          notes?: string | null
          other_amount?: number | null
          rent_amount?: number | null
          restaurant_id?: string
          salaries_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_overheads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_overheads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_overheads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_agents: {
        Row: {
          company_id: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          last_location_update: string | null
          name: string
          phone: string
          restaurant_id: string
          session_expires_at: string | null
          session_token: string | null
          status: string
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          last_location_update?: string | null
          name: string
          phone?: string
          restaurant_id: string
          session_expires_at?: string | null
          session_token?: string | null
          status?: string
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          last_location_update?: string | null
          name?: string
          phone?: string
          restaurant_id?: string
          session_expires_at?: string | null
          session_token?: string | null
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_vouchers: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          expense_account_id: string
          id: string
          journal_entry_id: string | null
          payment_method: string | null
          restaurant_id: string
          tax_amount: number | null
          total_amount: number
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_account_id: string
          id?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          restaurant_id: string
          tax_amount?: number | null
          total_amount?: number
          voucher_date?: string
          voucher_number: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_account_id?: string
          id?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          restaurant_id?: string
          tax_amount?: number | null
          total_amount?: number
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_vouchers_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "expense_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_code: string | null
          amount: number
          category: string
          company_id: string | null
          cost_center: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          journal_entry_id: string | null
          payment_account_code: string | null
          restaurant_id: string
          workspace_id: string | null
        }
        Insert: {
          account_code?: string | null
          amount?: number
          category?: string
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          payment_account_code?: string | null
          restaurant_id: string
          workspace_id?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number
          category?: string
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          journal_entry_id?: string | null
          payment_account_code?: string | null
          restaurant_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          company_id: string | null
          created_at: string | null
          end_date: string
          id: string
          is_posting_allowed: boolean | null
          period_name: string
          period_type: string | null
          restaurant_id: string
          start_date: string
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_posting_allowed?: boolean | null
          period_name: string
          period_type?: string | null
          restaurant_id: string
          start_date: string
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_posting_allowed?: boolean | null
          period_name?: string
          period_type?: string | null
          restaurant_id?: string
          start_date?: string
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_account_id: string | null
          category: string
          created_at: string | null
          current_value: number | null
          depreciation_account_id: string | null
          depreciation_method: string | null
          id: string
          name: string
          purchase_date: string
          purchase_value: number
          restaurant_id: string
          salvage_value: number | null
          status: string | null
          useful_life_years: number
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_account_id?: string | null
          category: string
          created_at?: string | null
          current_value?: number | null
          depreciation_account_id?: string | null
          depreciation_method?: string | null
          id?: string
          name: string
          purchase_date: string
          purchase_value: number
          restaurant_id: string
          salvage_value?: number | null
          status?: string | null
          useful_life_years: number
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_account_id?: string | null
          category?: string
          created_at?: string | null
          current_value?: number | null
          depreciation_account_id?: string | null
          depreciation_method?: string | null
          id?: string
          name?: string
          purchase_date?: string
          purchase_value?: number
          restaurant_id?: string
          salvage_value?: number | null
          status?: string | null
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_depreciation_account_id_fkey"
            columns: ["depreciation_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_period_control_policies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          require_budget_freeze_on_close: boolean
          require_no_open_journal_approvals: boolean
          require_no_pending_posting_failures: boolean
          updated_at: string
          variance_threshold_amount: number
          variance_threshold_percent: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          require_budget_freeze_on_close?: boolean
          require_no_open_journal_approvals?: boolean
          require_no_pending_posting_failures?: boolean
          updated_at?: string
          variance_threshold_amount?: number
          variance_threshold_percent?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          require_budget_freeze_on_close?: boolean
          require_no_open_journal_approvals?: boolean
          require_no_pending_posting_failures?: boolean
          updated_at?: string
          variance_threshold_amount?: number
          variance_threshold_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "gl_period_control_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_posting_alert_events: {
        Row: {
          alert_type: string
          company_id: string
          context: Json
          created_at: string
          id: string
          message: string
          metric_value: number | null
          policy_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          threshold_value: number | null
          title: string
        }
        Insert: {
          alert_type: string
          company_id: string
          context?: Json
          created_at?: string
          id?: string
          message: string
          metric_value?: number | null
          policy_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          threshold_value?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          context?: Json
          created_at?: string
          id?: string
          message?: string
          metric_value?: number | null
          policy_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          threshold_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_alert_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_alert_events_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "gl_posting_alert_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_posting_alert_policies: {
        Row: {
          alert_email: boolean
          alert_in_app: boolean
          alert_webhook: boolean
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          max_pending_age_minutes: number
          max_pending_count: number
          min_success_rate_percent: number
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          alert_email?: boolean
          alert_in_app?: boolean
          alert_webhook?: boolean
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_pending_age_minutes?: number
          max_pending_count?: number
          min_success_rate_percent?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          alert_email?: boolean
          alert_in_app?: boolean
          alert_webhook?: boolean
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_pending_age_minutes?: number
          max_pending_count?: number
          min_success_rate_percent?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_alert_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_posting_failures: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string
          error_message: string
          id: string
          movement_subtype: string | null
          movement_type: string | null
          payload: Json
          payment_method: string | null
          resolved_at: string | null
          restaurant_id: string | null
          retry_count: number
          source_event: string
          source_id: string
          source_table: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          error_message: string
          id?: string
          movement_subtype?: string | null
          movement_type?: string | null
          payload?: Json
          payment_method?: string | null
          resolved_at?: string | null
          restaurant_id?: string | null
          retry_count?: number
          source_event: string
          source_id: string
          source_table: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string
          error_message?: string
          id?: string
          movement_subtype?: string | null
          movement_type?: string | null
          payload?: Json
          payment_method?: string | null
          resolved_at?: string | null
          restaurant_id?: string | null
          retry_count?: number
          source_event?: string
          source_id?: string
          source_table?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_failures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_posting_retry_runs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          pending_after_count: number
          processed_count: number
          requested_limit: number
          resolved_count: number
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          pending_after_count?: number
          processed_count?: number
          requested_limit?: number
          resolved_count?: number
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          pending_after_count?: number
          processed_count?: number
          requested_limit?: number
          resolved_count?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      gl_posting_settings: {
        Row: {
          auto_post: boolean
          company_id: string
          company_profile_id: string | null
          created_at: string
          credit_account_id: string | null
          credit_system_key: string | null
          debit_account_id: string | null
          debit_system_key: string | null
          id: string
          is_active: boolean
          metadata: Json
          movement_subtype: string
          movement_type: string
          notes: string | null
          payment_method: string
          posting_priority: number
          profile_code: string
          requires_approval: boolean
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          auto_post?: boolean
          company_id: string
          company_profile_id?: string | null
          created_at?: string
          credit_account_id?: string | null
          credit_system_key?: string | null
          debit_account_id?: string | null
          debit_system_key?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          movement_subtype?: string
          movement_type: string
          notes?: string | null
          payment_method?: string
          posting_priority?: number
          profile_code: string
          requires_approval?: boolean
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          auto_post?: boolean
          company_id?: string
          company_profile_id?: string | null
          created_at?: string
          credit_account_id?: string | null
          credit_system_key?: string | null
          debit_account_id?: string | null
          debit_system_key?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          movement_subtype?: string
          movement_type?: string
          notes?: string | null
          payment_method?: string
          posting_priority?: number
          profile_code?: string
          requires_approval?: boolean
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_settings_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_settings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_settings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_settings_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "gl_posting_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_lines: {
        Row: {
          actual_quantity: number
          book_quantity: number
          created_at: string | null
          id: string
          product_id: string | null
          session_id: string | null
          total_variance_cost: number | null
          unit_cost: number
          variance: number | null
        }
        Insert: {
          actual_quantity: number
          book_quantity: number
          created_at?: string | null
          id?: string
          product_id?: string | null
          session_id?: string | null
          total_variance_cost?: number | null
          unit_cost: number
          variance?: number | null
        }
        Update: {
          actual_quantity?: number
          book_quantity?: number
          created_at?: string | null
          id?: string
          product_id?: string | null
          session_id?: string | null
          total_variance_cost?: number | null
          unit_cost?: number
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inventory_audit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_lines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_audit_log_financial"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_sessions: {
        Row: {
          completed_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          restaurant_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          expiry_date: string
          id: string
          initial_qty: number
          item_id: string | null
          manufacturing_date: string | null
          remaining_qty: number
          status: string | null
          unit_cost: number
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          expiry_date: string
          id?: string
          initial_qty: number
          item_id?: string | null
          manufacturing_date?: string | null
          remaining_qty?: number
          status?: string | null
          unit_cost: number
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          initial_qty?: number
          item_id?: string | null
          manufacturing_date?: string | null
          remaining_qty?: number
          status?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_consumption: {
        Row: {
          consumed_at: string | null
          consumed_qty: number
          id: string
          item_id: string
          order_id: string | null
          restaurant_id: string
          total_cost: number
          unit_cost: number
          warehouse_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          consumed_qty: number
          id?: string
          item_id: string
          order_id?: string | null
          restaurant_id: string
          total_cost: number
          unit_cost: number
          warehouse_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          consumed_qty?: number
          id?: string
          item_id?: string
          order_id?: string | null
          restaurant_id?: string
          total_cost?: number
          unit_cost?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_consumption_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "inventory_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_cost_layers: {
        Row: {
          consumed_at: string | null
          created_at: string | null
          id: string
          is_consumed: boolean | null
          layer_date: string
          layer_type: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          remaining_qty: number
          restaurant_id: string
          unit_cost: number
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          is_consumed?: boolean | null
          layer_date?: string
          layer_type?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          remaining_qty?: number
          restaurant_id: string
          unit_cost: number
        }
        Update: {
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          is_consumed?: boolean | null
          layer_date?: string
          layer_type?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          remaining_qty?: number
          restaurant_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_cost_layers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          cost_method: string | null
          created_at: string | null
          current_cost: number | null
          id: string
          product_id: string | null
          restaurant_id: string
          sku: string | null
        }
        Insert: {
          barcode?: string | null
          cost_method?: string | null
          created_at?: string | null
          current_cost?: number | null
          id?: string
          product_id?: string | null
          restaurant_id: string
          sku?: string | null
        }
        Update: {
          barcode?: string | null
          cost_method?: string | null
          created_at?: string | null
          current_cost?: number | null
          id?: string
          product_id?: string | null
          restaurant_id?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          average_cost: number
          id: string
          product_id: string
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          total_value: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          average_cost?: number
          id?: string
          product_id: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          total_value?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          average_cost?: number
          id?: string
          product_id?: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          total_value?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          batch_number: string | null
          company_id: string
          cost_layer_ids: Json | null
          created_at: string
          created_by: string
          destination_warehouse_id: string | null
          expiry_date: string | null
          id: string
          journal_entry_id: string | null
          movement_date: string
          movement_type: string
          product_id: string
          quantity: number
          reference_id: string
          reference_line_id: string | null
          reference_type: string
          source_warehouse_id: string | null
          total_cost: number
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          company_id: string
          cost_layer_ids?: Json | null
          created_at?: string
          created_by: string
          destination_warehouse_id?: string | null
          expiry_date?: string | null
          id?: string
          journal_entry_id?: string | null
          movement_date?: string
          movement_type: string
          product_id: string
          quantity: number
          reference_id: string
          reference_line_id?: string | null
          reference_type: string
          source_warehouse_id?: string | null
          total_cost?: number
          unit_cost?: number
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          company_id?: string
          cost_layer_ids?: Json | null
          created_at?: string
          created_by?: string
          destination_warehouse_id?: string | null
          expiry_date?: string | null
          id?: string
          journal_entry_id?: string | null
          movement_date?: string
          movement_type?: string
          product_id?: string
          quantity?: number
          reference_id?: string
          reference_line_id?: string | null
          reference_type?: string
          source_warehouse_id?: string | null
          total_cost?: number
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          average_cost: number
          category_id: string | null
          company_id: string
          costing_method: string
          created_at: string
          id: string
          is_active: boolean
          is_inventory_item: boolean
          last_purchase_price: number
          name: string
          sku: string
          source_product_id: string | null
          standard_cost: number | null
          track_batches: boolean
          track_expiry: boolean
          unit_of_measure: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          average_cost?: number
          category_id?: string | null
          company_id: string
          costing_method?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_inventory_item?: boolean
          last_purchase_price?: number
          name: string
          sku: string
          source_product_id?: string | null
          standard_cost?: number | null
          track_batches?: boolean
          track_expiry?: boolean
          unit_of_measure?: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          average_cost?: number
          category_id?: string | null
          company_id?: string
          costing_method?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_inventory_item?: boolean
          last_purchase_price?: number
          name?: string
          sku?: string
          source_product_id?: string | null
          standard_cost?: number | null
          track_batches?: boolean
          track_expiry?: boolean
          unit_of_measure?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_products_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_products_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_receipt_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          inventory_receipt_id: string
          notes: string | null
          product_id: string | null
          quantity: number
          total_cost: number
          unit: string | null
          unit_cost: number
          warehouse_location: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_receipt_id: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          total_cost: number
          unit?: string | null
          unit_cost: number
          warehouse_location?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          inventory_receipt_id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          total_cost?: number
          unit?: string | null
          unit_cost?: number
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_receipt_items_inventory_receipt_id_fkey"
            columns: ["inventory_receipt_id"]
            isOneToOne: false
            referencedRelation: "inventory_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          id: string
          journal_entry_id: string | null
          net_amount: number | null
          notes: string | null
          paid_amount: number | null
          receipt_date: string
          receipt_number: string
          restaurant_id: string
          status: string | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          id?: string
          journal_entry_id?: string | null
          net_amount?: number | null
          notes?: string | null
          paid_amount?: number | null
          receipt_date?: string
          receipt_number: string
          restaurant_id: string
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          id?: string
          journal_entry_id?: string | null
          net_amount?: number | null
          notes?: string | null
          paid_amount?: number | null
          receipt_date?: string
          receipt_number?: string
          restaurant_id?: string
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_settings: {
        Row: {
          allow_negative_stock: boolean | null
          auto_adjust_negative_stock: boolean | null
          costing_method: string | null
          created_at: string | null
          restaurant_id: string
          stock_alert_threshold: number | null
          updated_at: string | null
          valuation_method: string | null
        }
        Insert: {
          allow_negative_stock?: boolean | null
          auto_adjust_negative_stock?: boolean | null
          costing_method?: string | null
          created_at?: string | null
          restaurant_id: string
          stock_alert_threshold?: number | null
          updated_at?: string | null
          valuation_method?: string | null
        }
        Update: {
          allow_negative_stock?: boolean | null
          auto_adjust_negative_stock?: boolean | null
          costing_method?: string | null
          created_at?: string | null
          restaurant_id?: string
          stock_alert_threshold?: number | null
          updated_at?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          average_cost: number | null
          id: string
          item_id: string | null
          last_movement_date: string | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          warehouse_id: string | null
        }
        Insert: {
          average_cost?: number | null
          id?: string
          item_id?: string | null
          last_movement_date?: string | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          warehouse_id?: string | null
        }
        Update: {
          average_cost?: number | null
          id?: string
          item_id?: string | null
          last_movement_date?: string | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_approval_actions: {
        Row: {
          action: string
          action_at: string
          action_by: string | null
          id: string
          journal_entry_id: string
          notes: string | null
          restaurant_id: string
        }
        Insert: {
          action: string
          action_at?: string
          action_by?: string | null
          id?: string
          journal_entry_id: string
          notes?: string | null
          restaurant_id: string
        }
        Update: {
          action?: string
          action_at?: string
          action_by?: string | null
          id?: string
          journal_entry_id?: string
          notes?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          workflow_status: string
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_date?: string
          entry_number: string
          fiscal_period_id?: string | null
          id?: string
          is_posted?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id: string
          source?: string | null
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number
          total_debit?: number
          workflow_status?: string
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          fiscal_period_id?: string | null
          id?: string
          is_posted?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id?: string
          source?: string | null
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number
          total_debit?: number
          workflow_status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_fiscal_period_id_fkey"
            columns: ["fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          company_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          line_order: number | null
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          company_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          line_order?: number | null
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          company_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          line_order?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      license_keys: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          key: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          duration_days?: number
          id?: string
          key: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          key?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_keys_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_orders: {
        Row: {
          actual_quantity: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          overhead_costs: number | null
          planned_quantity: number
          product_id: string | null
          restaurant_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          actual_quantity?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          overhead_costs?: number | null
          planned_quantity: number
          product_id?: string | null
          restaurant_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          actual_quantity?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          overhead_costs?: number | null
          planned_quantity?: number
          product_id?: string | null
          restaurant_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_components: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          product_id: string
          quantity_required: number
          unit_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          product_id: string
          quantity_required?: number
          unit_label?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          product_id?: string
          quantity_required?: number
          unit_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_components_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          calculated_cost_price: number | null
          category: string
          company_id: string | null
          created_at: string
          daily_overhead_allocation: number | null
          expected_daily_quantity: number | null
          id: string
          image: string
          inventory_mode: string
          name: string
          price: number
          pricing_method: string | null
          product_id: string | null
          product_type: string | null
          profit_margin_percent: number | null
          restaurant_id: string
          sort_order: number
          total_cost_with_overhead: number | null
          workspace_id: string | null
        }
        Insert: {
          available?: boolean
          calculated_cost_price?: number | null
          category?: string
          company_id?: string | null
          created_at?: string
          daily_overhead_allocation?: number | null
          expected_daily_quantity?: number | null
          id?: string
          image?: string
          inventory_mode?: string
          name: string
          price?: number
          pricing_method?: string | null
          product_id?: string | null
          product_type?: string | null
          profit_margin_percent?: number | null
          restaurant_id: string
          sort_order?: number
          total_cost_with_overhead?: number | null
          workspace_id?: string | null
        }
        Update: {
          available?: boolean
          calculated_cost_price?: number | null
          category?: string
          company_id?: string | null
          created_at?: string
          daily_overhead_allocation?: number | null
          expected_daily_quantity?: number | null
          id?: string
          image?: string
          inventory_mode?: string
          name?: string
          price?: number
          pricing_method?: string | null
          product_id?: string | null
          product_type?: string | null
          profit_margin_percent?: number | null
          restaurant_id?: string
          sort_order?: number
          total_cost_with_overhead?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items_costing: {
        Row: {
          actual_cost: number | null
          id: string
          menu_item_id: string | null
          restaurant_id: string | null
          target_margin: number | null
          theoretical_cost: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          id?: string
          menu_item_id?: string | null
          restaurant_id?: string | null
          target_margin?: number | null
          theoretical_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          id?: string
          menu_item_id?: string | null
          restaurant_id?: string | null
          target_margin?: number | null
          theoretical_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_costing_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_costing_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_costing_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_costing_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          company_id: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          restaurant_id: string
          target_id: string | null
          target_type: string
          title: string
          type: string
          workspace_id: string | null
        }
        Insert: {
          body?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          restaurant_id: string
          target_id?: string | null
          target_type?: string
          title?: string
          type?: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          restaurant_id?: string
          target_id?: string | null
          target_type?: string
          title?: string
          type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          company_id: string | null
          cost_price_snapshot: number | null
          id: string
          line_total: number | null
          manual_sale_amount: number | null
          menu_item_id: string | null
          menu_item_image: string
          menu_item_name: string
          order_id: string
          price: number
          pricing_input_mode: string | null
          product_id: string | null
          quantity: number
          sold_unit: string | null
          unit_factor: number | null
          unit_price_snapshot: number | null
        }
        Insert: {
          company_id?: string | null
          cost_price_snapshot?: number | null
          id?: string
          line_total?: number | null
          manual_sale_amount?: number | null
          menu_item_id?: string | null
          menu_item_image?: string
          menu_item_name: string
          order_id: string
          price?: number
          pricing_input_mode?: string | null
          product_id?: string | null
          quantity?: number
          sold_unit?: string | null
          unit_factor?: number | null
          unit_price_snapshot?: number | null
        }
        Update: {
          company_id?: string | null
          cost_price_snapshot?: number | null
          id?: string
          line_total?: number | null
          manual_sale_amount?: number | null
          menu_item_id?: string | null
          menu_item_image?: string
          menu_item_name?: string
          order_id?: string
          price?: number
          pricing_input_mode?: string | null
          product_id?: string | null
          quantity?: number
          sold_unit?: string | null
          unit_factor?: number | null
          unit_price_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
        ]
      }
      order_taxes: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          tax_amount: number
          tax_rate_id: string | null
          tax_type: string
          taxable_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          tax_amount: number
          tax_rate_id?: string | null
          tax_type: string
          taxable_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          tax_amount?: number
          tax_rate_id?: string | null
          tax_type?: string
          taxable_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_taxes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_taxes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_taxes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_taxes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_taxes_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_order_id: string | null
          company_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_agent_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          discount: number
          id: string
          journal_entry_id: string | null
          notes: string
          order_number: string
          order_type: string
          paid_amount: number
          payment_method: string
          restaurant_id: string
          status: string
          synced: boolean
          table_number: number | null
          total: number
          tracking_token: string | null
          workspace_id: string | null
        }
        Insert: {
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          delivery_agent_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string
          order_number: string
          order_type?: string
          paid_amount?: number
          payment_method?: string
          restaurant_id: string
          status?: string
          synced?: boolean
          table_number?: number | null
          total?: number
          tracking_token?: string | null
          workspace_id?: string | null
        }
        Update: {
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string
          delivery_agent_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string
          order_number?: string
          order_type?: string
          paid_amount?: number
          payment_method?: string
          restaurant_id?: string
          status?: string
          synced?: boolean
          table_number?: number | null
          total?: number
          tracking_token?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batch_items: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string | null
          id: string
          is_reconciled: boolean | null
          order_id: string | null
          payment_method: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          created_at?: string | null
          id?: string
          is_reconciled?: boolean | null
          order_id?: string | null
          payment_method: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string | null
          id?: string
          is_reconciled?: boolean | null
          order_id?: string | null
          payment_method?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_batch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          batch_date: string
          batch_type: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          id: string
          restaurant_id: string
          status: string | null
          total_amount: number
          transaction_count: number | null
        }
        Insert: {
          batch_date: string
          batch_type?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          restaurant_id: string
          status?: string | null
          total_amount?: number
          transaction_count?: number | null
        }
        Update: {
          batch_date?: string
          batch_type?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          id?: string
          restaurant_id?: string
          status?: string | null
          total_amount?: number
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: string | null
          id: string
          method: string
          restaurant_id: string
          status: string
          uploaded_at: string
        }
        Insert: {
          amount?: string | null
          id?: string
          method?: string
          restaurant_id: string
          status?: string
          uploaded_at?: string
        }
        Update: {
          amount?: string | null
          id?: string
          method?: string
          restaurant_id?: string
          status?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_transactions: {
        Row: {
          created_at: string | null
          id: string
          journal_entry_id: string | null
          month: number
          net_salary: number
          payment_date: string | null
          restaurant_id: string
          staff_id: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          month: number
          net_salary: number
          payment_date?: string | null
          restaurant_id: string
          staff_id?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          month?: number
          net_salary?: number
          payment_date?: string | null
          restaurant_id?: string
          staff_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "payroll_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description_ar: string | null
          module: string
          name_ar: string
        }
        Insert: {
          code: string
          description_ar?: string | null
          module: string
          name_ar: string
        }
        Update: {
          code?: string
          description_ar?: string | null
          module?: string
          name_ar?: string
        }
        Relationships: []
      }
      posting_queue: {
        Row: {
          created_at: string | null
          entry_id: string
          error_message: string | null
          id: string
          processed_at: string | null
          restaurant_id: string
          retry_count: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          entry_id: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          restaurant_id: string
          retry_count?: number | null
          status?: string
        }
        Update: {
          created_at?: string | null
          entry_id?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          restaurant_id?: string
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_queue_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_queue_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_queue_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "posting_queue_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_queue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_queue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_queue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          barcode: string | null
          category: string
          company_id: string | null
          cost_price: number
          created_at: string
          expiry_date: string | null
          id: string
          image: string
          min_quantity: number
          name: string
          price: number
          quantity: number
          restaurant_id: string
          secondary_unit: string | null
          sku: string | null
          sort_order: number
          unit: string
          unit_conversion_factor: number | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          available?: boolean
          barcode?: string | null
          category?: string
          company_id?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          image?: string
          min_quantity?: number
          name: string
          price?: number
          quantity?: number
          restaurant_id: string
          secondary_unit?: string | null
          sku?: string | null
          sort_order?: number
          unit?: string
          unit_conversion_factor?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          available?: boolean
          barcode?: string | null
          category?: string
          company_id?: string | null
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          image?: string
          min_quantity?: number
          name?: string
          price?: number
          quantity?: number
          restaurant_id?: string
          secondary_unit?: string | null
          sku?: string | null
          sort_order?: number
          unit?: string
          unit_conversion_factor?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          created_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          restaurant_id: string
          supplier_name: string
          total_amount: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          restaurant_id: string
          supplier_name: string
          total_amount?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          restaurant_id?: string
          supplier_name?: string
          total_amount?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "purchase_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_lines: {
        Row: {
          id: string
          item_id: string
          purchase_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          item_id: string
          purchase_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          item_id?: string
          purchase_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_lines_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          expected_arrival: string | null
          id: string
          po_date: string | null
          po_number: string
          restaurant_id: string | null
          status: string | null
          supplier_name: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          expected_arrival?: string | null
          id?: string
          po_date?: string | null
          po_number: string
          restaurant_id?: string | null
          status?: string | null
          supplier_name?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          expected_arrival?: string | null
          id?: string
          po_date?: string | null
          po_number?: string
          restaurant_id?: string | null
          status?: string | null
          supplier_name?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          product_id: string | null
          purchase_return_id: string
          quantity_returned: number
          reason: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_return_id: string
          quantity_returned: number
          reason?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_return_id?: string
          quantity_returned?: number
          reason?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_purchase_return_id_fkey"
            columns: ["purchase_return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_receipt_id: string | null
          journal_entry_id: string | null
          reason: string | null
          refund_method: string | null
          restaurant_id: string
          return_date: string
          return_number: string
          status: string | null
          supplier_credit_applied: boolean | null
          supplier_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_receipt_id?: string | null
          journal_entry_id?: string | null
          reason?: string | null
          refund_method?: string | null
          restaurant_id: string
          return_date?: string
          return_number: string
          status?: string | null
          supplier_credit_applied?: boolean | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_receipt_id?: string | null
          journal_entry_id?: string | null
          reason?: string | null
          refund_method?: string | null
          restaurant_id?: string
          return_date?: string
          return_number?: string
          status?: string | null
          supplier_credit_applied?: boolean | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_inventory_receipt_id_fkey"
            columns: ["inventory_receipt_id"]
            isOneToOne: false
            referencedRelation: "inventory_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_components: {
        Row: {
          id: string
          inventory_item_id: string
          line_order: number | null
          menu_item_id: string | null
          quantity_required: number
          unit_cost_at_time: number | null
          wastage_percent: number | null
        }
        Insert: {
          id?: string
          inventory_item_id: string
          line_order?: number | null
          menu_item_id?: string | null
          quantity_required: number
          unit_cost_at_time?: number | null
          wastage_percent?: number | null
        }
        Update: {
          id?: string
          inventory_item_id?: string
          line_order?: number | null
          menu_item_id?: string | null
          quantity_required?: number
          unit_cost_at_time?: number | null
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_components_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_components_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string | null
          menu_item_id: string | null
          quantity: number
          restaurant_id: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string | null
          quantity: number
          restaurant_id?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          menu_item_id?: string | null
          quantity?: number
          restaurant_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_business_profiles: {
        Row: {
          accounting_method: string
          costing_method: string
          features: Json
          profile_code: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          accounting_method?: string
          costing_method?: string
          features?: Json
          profile_code: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          accounting_method?: string
          costing_method?: string
          features?: Json
          profile_code?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_business_profiles_profile_code_fkey"
            columns: ["profile_code"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "restaurant_business_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_business_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_business_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_order_lines: {
        Row: {
          actual_cogs: number
          id: string
          menu_item_id: string
          order_id: string | null
          quantity: number
          theoretical_cogs: number
          total_price: number
          unit_price: number
        }
        Insert: {
          actual_cogs: number
          id?: string
          menu_item_id: string
          order_id?: string | null
          quantity?: number
          theoretical_cogs: number
          total_price: number
          unit_price: number
        }
        Update: {
          actual_cogs?: number
          id?: string
          menu_item_id?: string
          order_id?: string | null
          quantity?: number
          theoretical_cogs?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_order_lines_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_orders: {
        Row: {
          cogs_entry_id: string | null
          created_at: string | null
          id: string
          journal_entry_id: string | null
          order_date: string
          order_number: string
          payment_method: string | null
          restaurant_id: string
          subtotal: number | null
          table_number: string | null
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          cogs_entry_id?: string | null
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          order_date?: string
          order_number: string
          payment_method?: string | null
          restaurant_id: string
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Update: {
          cogs_entry_id?: string | null
          created_at?: string | null
          id?: string
          journal_entry_id?: string | null
          order_date?: string
          order_number?: string
          payment_method?: string | null
          restaurant_id?: string
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_orders_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "restaurant_orders_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "restaurant_orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string
          pin: string
          restaurant_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string
          pin?: string
          restaurant_id: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string
          pin?: string
          restaurant_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accounting_config: Json | null
          accounting_standard: string | null
          address: string | null
          auto_print_receipt: boolean | null
          business_category: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          commercial_registration: string | null
          company_id: string | null
          created_at: string
          currency: string
          delivery_fee: number | null
          enable_customer_display: boolean | null
          enable_kitchen_print: boolean | null
          feature_flags: Json | null
          id: string
          inventory_method: string | null
          inventory_system: string | null
          layout_config: Json | null
          license_key: string | null
          logo_url: string | null
          name: string
          owner_id: string
          payment_gateways: Json | null
          phone: string | null
          printer_settings: Json | null
          quick_actions: Json | null
          receipt_footer: string | null
          receipt_header: string | null
          status: string
          subscription_end: string | null
          tax_number: string | null
          tax_settings: Json | null
          theme_settings: Json | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          accounting_config?: Json | null
          accounting_standard?: string | null
          address?: string | null
          auto_print_receipt?: boolean | null
          business_category?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          commercial_registration?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          delivery_fee?: number | null
          enable_customer_display?: boolean | null
          enable_kitchen_print?: boolean | null
          feature_flags?: Json | null
          id?: string
          inventory_method?: string | null
          inventory_system?: string | null
          layout_config?: Json | null
          license_key?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          payment_gateways?: Json | null
          phone?: string | null
          printer_settings?: Json | null
          quick_actions?: Json | null
          receipt_footer?: string | null
          receipt_header?: string | null
          status?: string
          subscription_end?: string | null
          tax_number?: string | null
          tax_settings?: Json | null
          theme_settings?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          accounting_config?: Json | null
          accounting_standard?: string | null
          address?: string | null
          auto_print_receipt?: boolean | null
          business_category?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          commercial_registration?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          delivery_fee?: number | null
          enable_customer_display?: boolean | null
          enable_kitchen_print?: boolean | null
          feature_flags?: Json | null
          id?: string
          inventory_method?: string | null
          inventory_system?: string | null
          layout_config?: Json | null
          license_key?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_gateways?: Json | null
          phone?: string | null
          printer_settings?: Json | null
          quick_actions?: Json | null
          receipt_footer?: string | null
          receipt_header?: string | null
          status?: string
          subscription_end?: string | null
          tax_number?: string | null
          tax_settings?: Json | null
          theme_settings?: Json | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_sale_lines: {
        Row: {
          cost_layers_used: string[] | null
          id: string
          item_id: string
          quantity: number
          sale_id: string | null
          total_cost: number
          total_price: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          cost_layers_used?: string[] | null
          id?: string
          item_id: string
          quantity: number
          sale_id?: string | null
          total_cost: number
          total_price: number
          unit_cost: number
          unit_price: number
        }
        Update: {
          cost_layers_used?: string[] | null
          id?: string
          item_id?: string
          quantity?: number
          sale_id?: string | null
          total_cost?: number
          total_price?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "retail_sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "retail_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_sales: {
        Row: {
          cogs_entry_id: string | null
          created_at: string | null
          customer_name: string | null
          discount_amount: number | null
          id: string
          invoice_number: string
          journal_entry_id: string | null
          payment_method: string
          restaurant_id: string
          sale_date: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          warehouse_id: string | null
        }
        Insert: {
          cogs_entry_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number: string
          journal_entry_id?: string | null
          payment_method: string
          restaurant_id: string
          sale_date?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          warehouse_id?: string | null
        }
        Update: {
          cogs_entry_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          discount_amount?: number | null
          id?: string
          invoice_number?: string
          journal_entry_id?: string | null
          payment_method?: string
          restaurant_id?: string
          sale_date?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retail_sales_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "retail_sales_cogs_entry_id_fkey"
            columns: ["cogs_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "retail_sales_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_allowed: boolean | null
          permission_code: string | null
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          permission_code?: string | null
          role: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          permission_code?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      sales_invoice_lines: {
        Row: {
          created_at: string
          description: string | null
          discount_amount: number
          id: string
          invoice_id: string
          line_total: number
          product_id: string | null
          quantity: number
          tax_amount: number
          total_cost: number
          unit_cost: number
          unit_price: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_amount?: number
          id?: string
          invoice_id: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total_cost?: number
          unit_cost?: number
          unit_price?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_amount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total_cost?: number
          unit_cost?: number
          unit_price?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          notes: string | null
          paid_amount: number
          payment_method: string | null
          source_reference_id: string | null
          source_type: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales_orders: {
        Row: {
          created_at: string | null
          customer_name: string | null
          expected_delivery: string | null
          id: string
          order_date: string | null
          order_number: string
          restaurant_id: string | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          expected_delivery?: string | null
          id?: string
          order_date?: string | null
          order_number: string
          restaurant_id?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          expected_delivery?: string | null
          id?: string
          order_date?: string | null
          order_number?: string
          restaurant_id?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          condition: string | null
          cost_price_at_return: number | null
          created_at: string | null
          id: string
          menu_item_id: string | null
          notes: string | null
          original_order_item_id: string | null
          product_id: string | null
          quantity_returned: number
          return_to_inventory: boolean | null
          sales_return_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          condition?: string | null
          cost_price_at_return?: number | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          original_order_item_id?: string | null
          product_id?: string | null
          quantity_returned: number
          return_to_inventory?: boolean | null
          sales_return_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          condition?: string | null
          cost_price_at_return?: number | null
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          original_order_item_id?: string | null
          product_id?: string | null
          quantity_returned?: number
          return_to_inventory?: boolean | null
          sales_return_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_original_order_item_id_fkey"
            columns: ["original_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_original_order_item_id_fkey"
            columns: ["original_order_item_id"]
            isOneToOne: false
            referencedRelation: "v_cost_of_goods_sold"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_sales_return_id_fkey"
            columns: ["sales_return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          inventory_adjusted: boolean | null
          journal_entry_id: string | null
          original_order_id: string | null
          reason: string | null
          restaurant_id: string
          return_date: string
          return_number: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          inventory_adjusted?: boolean | null
          journal_entry_id?: string | null
          original_order_id?: string | null
          reason?: string | null
          restaurant_id: string
          return_date?: string
          return_number: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          inventory_adjusted?: boolean | null
          journal_entry_id?: string | null
          original_order_id?: string | null
          reason?: string | null
          restaurant_id?: string
          return_date?: string
          return_number?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_returns_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      service_invoices: {
        Row: {
          amount: number
          amount_paid: number | null
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          payment_method: string | null
          restaurant_id: string
          service_description: string
          status: string | null
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          amount?: number
          amount_paid?: number | null
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          payment_method?: string | null
          restaurant_id: string
          service_description: string
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          restaurant_id?: string
          service_description?: string
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "service_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          cashier_id: string
          cashier_name: string
          closed_at: string | null
          closing_balance: number | null
          company_id: string | null
          id: string
          notes: string
          opened_at: string
          opening_balance: number
          restaurant_id: string
          status: string
          total_orders: number
          total_sales: number
          workspace_id: string | null
        }
        Insert: {
          cashier_id: string
          cashier_name?: string
          closed_at?: string | null
          closing_balance?: number | null
          company_id?: string | null
          id?: string
          notes?: string
          opened_at?: string
          opening_balance?: number
          restaurant_id: string
          status?: string
          total_orders?: number
          total_sales?: number
          workspace_id?: string | null
        }
        Update: {
          cashier_id?: string
          cashier_name?: string
          closed_at?: string | null
          closing_balance?: number | null
          company_id?: string | null
          id?: string
          notes?: string
          opened_at?: string
          opening_balance?: number
          restaurant_id?: string
          status?: string
          total_orders?: number
          total_sales?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          email: string | null
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          restaurant_id: string
          role: string | null
          salary: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          restaurant_id: string
          role?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          restaurant_id?: string
          role?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string | null
          deductions: number | null
          full_name: string
          hire_date: string | null
          id: string
          position: string | null
          restaurant_id: string
          status: string | null
        }
        Insert: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          deductions?: number | null
          full_name: string
          hire_date?: string | null
          id?: string
          position?: string | null
          restaurant_id: string
          status?: string | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          deductions?: number | null
          full_name?: string
          hire_date?: string | null
          id?: string
          position?: string | null
          restaurant_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          cost_price: number
          id: string
          product_id: string | null
          quantity: number
          received_at: string | null
          remaining_quantity: number
          restaurant_id: string | null
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          cost_price: number
          id?: string
          product_id?: string | null
          quantity: number
          received_at?: string | null
          remaining_quantity: number
          restaurant_id?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          cost_price?: number
          id?: string
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          remaining_quantity?: number
          restaurant_id?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          restaurant_id: string
          type: string
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          restaurant_id: string
          type?: string
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          restaurant_id?: string
          type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          receipt_id: string | null
          restaurant_id: string
          supplier_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          receipt_id?: string | null
          restaurant_id: string
          supplier_id: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          receipt_id?: string | null
          restaurant_id?: string
          supplier_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number
          company_id: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string
          restaurant_id: string
          tax_number: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          restaurant_id: string
          tax_number?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number
          company_id?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string
          restaurant_id?: string
          tax_number?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          location: string | null
          qr_code: string | null
          restaurant_id: string
          status: string | null
          table_number: number
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          qr_code?: string | null
          restaurant_id: string
          status?: string | null
          table_number: number
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          qr_code?: string | null
          restaurant_id?: string
          status?: string | null
          table_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          applies_to: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_compound: boolean | null
          is_included_in_price: boolean | null
          name: string
          rate: number
          restaurant_id: string
          type: string | null
        }
        Insert: {
          applies_to?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_compound?: boolean | null
          is_included_in_price?: boolean | null
          name: string
          rate: number
          restaurant_id: string
          type?: string | null
        }
        Update: {
          applies_to?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_compound?: boolean | null
          is_included_in_price?: boolean | null
          name?: string
          rate?: number
          restaurant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bots: {
        Row: {
          allowed_chat_ids: Json | null
          auto_suggest_entries: boolean | null
          bot_token_hash: string
          bot_username: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          require_approval: boolean | null
          restaurant_id: string
          webhook_url: string | null
        }
        Insert: {
          allowed_chat_ids?: Json | null
          auto_suggest_entries?: boolean | null
          bot_token_hash: string
          bot_username?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          require_approval?: boolean | null
          restaurant_id: string
          webhook_url?: string | null
        }
        Update: {
          allowed_chat_ids?: Json | null
          auto_suggest_entries?: boolean | null
          bot_token_hash?: string
          bot_username?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          require_approval?: boolean | null
          restaurant_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_messages: {
        Row: {
          ai_suggestion_id: string | null
          created_at: string | null
          extracted_entities: Json | null
          id: string
          message_text: string | null
          message_type: string | null
          processed_at: string | null
          processing_status: string | null
          received_at: string | null
          restaurant_id: string
          telegram_bot_id: string | null
          telegram_chat_id: number
          telegram_chat_title: string | null
          telegram_data: Json | null
          telegram_message_id: number
          telegram_sender_id: number | null
          telegram_sender_name: string | null
        }
        Insert: {
          ai_suggestion_id?: string | null
          created_at?: string | null
          extracted_entities?: Json | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          processed_at?: string | null
          processing_status?: string | null
          received_at?: string | null
          restaurant_id: string
          telegram_bot_id?: string | null
          telegram_chat_id: number
          telegram_chat_title?: string | null
          telegram_data?: Json | null
          telegram_message_id: number
          telegram_sender_id?: number | null
          telegram_sender_name?: string | null
        }
        Update: {
          ai_suggestion_id?: string | null
          created_at?: string | null
          extracted_entities?: Json | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          processed_at?: string | null
          processing_status?: string | null
          received_at?: string | null
          restaurant_id?: string
          telegram_bot_id?: string | null
          telegram_chat_id?: number
          telegram_chat_title?: string | null
          telegram_data?: Json | null
          telegram_message_id?: number
          telegram_sender_id?: number | null
          telegram_sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_messages_ai_suggestion_id_fkey"
            columns: ["ai_suggestion_id"]
            isOneToOne: false
            referencedRelation: "ai_journal_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_messages_telegram_bot_id_fkey"
            columns: ["telegram_bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_accounts: {
        Row: {
          account_name: string
          account_type: string
          chart_account_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_balance: number
          external_ref: string | null
          id: string
          is_active: boolean
          opening_balance: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type: string
          chart_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          external_ref?: string | null
          id?: string
          is_active?: boolean
          opening_balance?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string
          chart_account_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number
          external_ref?: string | null
          id?: string
          is_active?: boolean
          opening_balance?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_accounts_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          movement_date: string
          movement_type: string
          notes: string | null
          restaurant_id: string
          source_event: string | null
          source_id: string | null
          source_module: string | null
          treasury_account_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          restaurant_id: string
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          treasury_account_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          restaurant_id?: string
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          treasury_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_reconciliations: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          counted_balance: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reconciliation_date: string
          restaurant_id: string
          status: string
          system_balance: number
          treasury_account_id: string
          variance_amount: number | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          counted_balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reconciliation_date?: string
          restaurant_id: string
          status?: string
          system_balance?: number
          treasury_account_id: string
          variance_amount?: number | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          counted_balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reconciliation_date?: string
          restaurant_id?: string
          status?: string
          system_balance?: number
          treasury_account_id?: string
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_reconciliations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_reconciliations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_reconciliations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_reconciliations_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waiter_calls: {
        Row: {
          acknowledged: boolean
          company_id: string | null
          created_at: string
          id: string
          restaurant_id: string
          table_info: string
          workspace_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          restaurant_id: string
          table_info?: string
          workspace_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          restaurant_id?: string
          table_info?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiter_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_calls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          location: string | null
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          location?: string | null
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          location?: string | null
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_company_profiles: {
        Row: {
          company_profile_id: string
          created_at: string
          is_active: boolean
          workspace_id: string
        }
        Insert: {
          company_profile_id: string
          created_at?: string
          is_active?: boolean
          workspace_id: string
        }
        Update: {
          company_profile_id?: string
          created_at?: string
          is_active?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_company_profiles_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_company_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          address: string | null
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean
          manager_id: string | null
          name: string
          phone: string | null
          restaurant_id: string
          settings: Json | null
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          manager_id?: string | null
          name: string
          phone?: string | null
          restaurant_id: string
          settings?: Json | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean
          manager_id?: string | null
          name?: string
          phone?: string | null
          restaurant_id?: string
          settings?: Json | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      delivery_agents_tracking: {
        Row: {
          current_lat: number | null
          current_lng: number | null
          id: string | null
          last_location_update: string | null
          restaurant_id: string | null
          status: string | null
        }
        Insert: {
          current_lat?: number | null
          current_lng?: number | null
          id?: string | null
          last_location_update?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Update: {
          current_lat?: number | null
          current_lng?: number | null
          id?: string | null
          last_location_update?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      public_restaurant_info: {
        Row: {
          currency: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          status: string | null
        }
        Insert: {
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          status?: string | null
        }
        Update: {
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      restaurants_public: {
        Row: {
          currency: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          status: string | null
        }
        Insert: {
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          status?: string | null
        }
        Update: {
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      v_accounting_period_status: {
        Row: {
          closed_at: string | null
          closing_journal_entry_id: string | null
          expense_total: number | null
          is_locked: boolean | null
          net_result: number | null
          period_end: string | null
          period_start: string | null
          reopened_at: string | null
          restaurant_id: string | null
          revenue_total: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "accounting_period_closes_closing_journal_entry_id_fkey"
            columns: ["closing_journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ap_aging_detail: {
        Row: {
          aging_bucket: string | null
          balance_amount: number | null
          days_overdue: number | null
          doc_date: string | null
          doc_no: string | null
          due_date: string | null
          id: string | null
          original_amount: number | null
          paid_amount: number | null
          restaurant_id: string | null
          source_id: string | null
          source_type: string | null
          supplier_id: string | null
          supplier_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_open_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ar_aging_detail: {
        Row: {
          address: string | null
          balance: number | null
          company_id: string | null
          created_at: string | null
          credit_limit: number | null
          customer_type: string | null
          email: string | null
          id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          restaurant_id: string | null
          tax_number: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          company_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          restaurant_id?: string | null
          tax_number?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          company_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          restaurant_id?: string | null
          tax_number?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_log_financial: {
        Row: {
          completed_at: string | null
          created_by: string | null
          id: string | null
          notes: string | null
          restaurant_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          id?: string | null
          notes?: string | null
          restaurant_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          id?: string | null
          notes?: string | null
          restaurant_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_timeline: {
        Row: {
          amount: number | null
          entity_id: string | null
          entity_ref: string | null
          entity_status: string | null
          entity_type: string | null
          entry_number: string | null
          event_at: string | null
          event_name: string | null
          is_posted: boolean | null
          journal_entry_id: string | null
          restaurant_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      v_balance_sheet: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          company_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          entry_id: string | null
          id: string | null
          line_order: number | null
          restaurant_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_variance: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          actual_amount: number | null
          budget_amount: number | null
          fiscal_month: number | null
          fiscal_year: number | null
          restaurant_id: string | null
          variance_amount: number | null
          variance_percent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_vs_actual_scoped: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          actual_amount: number | null
          budget_amount: number | null
          company_id: string | null
          fiscal_month: number | null
          fiscal_year: number | null
          restaurant_id: string | null
          variance_amount: number | null
          variance_percent: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cash_flow: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string | null
          entry_number: string | null
          id: string | null
          is_posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string | null
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number | null
          total_debit: number | null
          workflow_status: string | null
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: string | null
          id?: string | null
          is_posted?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id?: string | null
          source?: string | null
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number | null
          total_debit?: number | null
          workflow_status?: string | null
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: string | null
          id?: string | null
          is_posted?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id?: string | null
          source?: string | null
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number | null
          total_debit?: number | null
          workflow_status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cfo_kpi_snapshot: {
        Row: {
          cash_in: number | null
          cash_out: number | null
          expenses: number | null
          net_cash: number | null
          net_profit: number | null
          open_ap: number | null
          open_ar: number | null
          period_month: string | null
          restaurant_id: string | null
          revenue: number | null
        }
        Relationships: []
      }
      v_cogs_ratio_vs_budget_scoped: {
        Row: {
          actual_cogs: number | null
          actual_cogs_ratio_percent: number | null
          actual_revenue: number | null
          budget_cogs: number | null
          budget_cogs_ratio_percent: number | null
          budget_revenue: number | null
          cogs_ratio_variance_pp: number | null
          company_id: string | null
          fiscal_month: number | null
          fiscal_year: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cost_of_goods_sold: {
        Row: {
          company_id: string | null
          cost_price_snapshot: number | null
          id: string | null
          line_total: number | null
          manual_sale_amount: number | null
          menu_item_id: string | null
          menu_item_image: string | null
          menu_item_name: string | null
          order_id: string | null
          price: number | null
          pricing_input_mode: string | null
          product_id: string | null
          quantity: number | null
          sold_unit: string | null
          unit_factor: number | null
          unit_price_snapshot: number | null
        }
        Insert: {
          company_id?: string | null
          cost_price_snapshot?: number | null
          id?: string | null
          line_total?: number | null
          manual_sale_amount?: number | null
          menu_item_id?: string | null
          menu_item_image?: string | null
          menu_item_name?: string | null
          order_id?: string | null
          price?: number | null
          pricing_input_mode?: string | null
          product_id?: string | null
          quantity?: number | null
          sold_unit?: string | null
          unit_factor?: number | null
          unit_price_snapshot?: number | null
        }
        Update: {
          company_id?: string | null
          cost_price_snapshot?: number | null
          id?: string | null
          line_total?: number | null
          manual_sale_amount?: number | null
          menu_item_id?: string | null
          menu_item_image?: string | null
          menu_item_name?: string | null
          order_id?: string | null
          price?: number | null
          pricing_input_mode?: string | null
          product_id?: string | null
          quantity?: number | null
          sold_unit?: string | null
          unit_factor?: number | null
          unit_price_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_statement: {
        Row: {
          amount: number | null
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string | null
          order_id: string | null
          payment_method: string | null
          reference_number: string | null
          restaurant_id: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string | null
          order_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          restaurant_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string | null
          order_id?: string | null
          payment_method?: string | null
          reference_number?: string | null
          restaurant_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_expense_analysis: {
        Row: {
          account_code: string | null
          amount: number | null
          category: string | null
          company_id: string | null
          cost_center: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string | null
          journal_entry_id: string | null
          payment_account_code: string | null
          restaurant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          account_code?: string | null
          amount?: number | null
          category?: string | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string | null
          journal_entry_id?: string | null
          payment_account_code?: string | null
          restaurant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number | null
          category?: string | null
          company_id?: string | null
          cost_center?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string | null
          journal_entry_id?: string | null
          payment_account_code?: string | null
          restaurant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_general_ledger: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          company_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          entry_id: string | null
          id: string | null
          line_order: number | null
          restaurant_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gl_autopost_activity_30d: {
        Row: {
          company_id: string | null
          created_at: string | null
          entry_date: string | null
          journal_entry_id: string | null
          source_event: string | null
          source_module: string | null
          workspace_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          entry_date?: string | null
          journal_entry_id?: string | null
          source_event?: string | null
          source_module?: string | null
          workspace_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          entry_date?: string | null
          journal_entry_id?: string | null
          source_event?: string | null
          source_module?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gl_autopost_success_rate_30d: {
        Row: {
          failure_count: number | null
          success_count: number | null
          success_rate_percent: number | null
          total_attempts: number | null
        }
        Relationships: []
      }
      v_gl_posting_alert_counts: {
        Row: {
          alerts_count: number | null
          company_id: string | null
          severity: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_alert_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gl_posting_failures_summary: {
        Row: {
          failures_count: number | null
          latest_updated_at: string | null
          oldest_created_at: string | null
          status: string | null
        }
        Relationships: []
      }
      v_gl_posting_open_alerts: {
        Row: {
          alert_type: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          message: string | null
          metric_value: number | null
          severity: string | null
          threshold_value: number | null
          title: string | null
        }
        Insert: {
          alert_type?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          metric_value?: number | null
          severity?: string | null
          threshold_value?: number | null
          title?: string | null
        }
        Update: {
          alert_type?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          message?: string | null
          metric_value?: number | null
          severity?: string | null
          threshold_value?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_alert_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gl_posting_pending_aging: {
        Row: {
          aging_bucket: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          movement_subtype: string | null
          movement_type: string | null
          pending_hours: number | null
          restaurant_id: string | null
          retry_count: number | null
          source_id: string | null
          source_table: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          aging_bucket?: never
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          movement_subtype?: string | null
          movement_type?: string | null
          pending_hours?: never
          restaurant_id?: string | null
          retry_count?: number | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          aging_bucket?: never
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          movement_subtype?: string | null
          movement_type?: string | null
          pending_hours?: never
          restaurant_id?: string | null
          retry_count?: number | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_failures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_failures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gl_posting_pending_aging_summary: {
        Row: {
          aging_bucket: string | null
          pending_count: number | null
        }
        Relationships: []
      }
      v_gl_posting_top_failure_reasons_30d: {
        Row: {
          error_signature: string | null
          failures_count: number | null
          last_seen_at: string | null
        }
        Relationships: []
      }
      v_inventory_valuation: {
        Row: {
          available: boolean | null
          barcode: string | null
          category: string | null
          company_id: string | null
          cost_price: number | null
          created_at: string | null
          expiry_date: string | null
          id: string | null
          image: string | null
          min_quantity: number | null
          name: string | null
          price: number | null
          quantity: number | null
          restaurant_id: string | null
          secondary_unit: string | null
          sku: string | null
          sort_order: number | null
          unit: string | null
          unit_conversion_factor: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          available?: boolean | null
          barcode?: string | null
          category?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string | null
          image?: string | null
          min_quantity?: number | null
          name?: string | null
          price?: number | null
          quantity?: number | null
          restaurant_id?: string | null
          secondary_unit?: string | null
          sku?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_conversion_factor?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          available?: boolean | null
          barcode?: string | null
          category?: string | null
          company_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string | null
          image?: string | null
          min_quantity?: number | null
          name?: string | null
          price?: number | null
          quantity?: number | null
          restaurant_id?: string | null
          secondary_unit?: string | null
          sku?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_conversion_factor?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_journal_approval_audit: {
        Row: {
          action: string | null
          action_at: string | null
          action_by: string | null
          entry_number: string | null
          journal_entry_id: string | null
          notes: string | null
          restaurant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_approval_actions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_journal_workflow_queue: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          description: string | null
          entry_date: string | null
          entry_number: string | null
          id: string | null
          posted_at: string | null
          posted_by: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number | null
          total_debit: number | null
          workflow_status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: string | null
          id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number | null
          total_debit?: number | null
          workflow_status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          description?: string | null
          entry_date?: string | null
          entry_number?: string | null
          id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number | null
          total_debit?: number | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_account_actuals: {
        Row: {
          account_id: string | null
          actual_credit: number | null
          actual_debit: number | null
          fiscal_month: number | null
          fiscal_year: number | null
          net_actual: number | null
          restaurant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_account_actuals_scoped: {
        Row: {
          account_id: string | null
          actual_credit: number | null
          actual_debit: number | null
          company_id: string | null
          fiscal_month: number | null
          fiscal_year: number | null
          net_actual: number | null
          restaurant_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_order_financial_api: {
        Row: {
          created_at: string | null
          entry_date: string | null
          entry_number: string | null
          is_posted: boolean | null
          journal_entry_id: string | null
          order_id: string | null
          order_number: string | null
          order_status: string | null
          order_total: number | null
          restaurant_id: string | null
          source_event: string | null
          source_module: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_period_close_control_status: {
        Row: {
          budget_frozen: boolean | null
          company_id: string | null
          expense_total: number | null
          freeze_reason: string | null
          frozen_at: string | null
          net_result: number | null
          period_end: string | null
          period_start: string | null
          restaurant_id: string | null
          revenue_total: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_profit_loss: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          company_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          entry_id: string | null
          id: string | null
          line_order: number | null
          restaurant_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sales_analytics: {
        Row: {
          client_order_id: string | null
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_agent_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          discount: number | null
          id: string | null
          journal_entry_id: string | null
          notes: string | null
          order_number: string | null
          order_type: string | null
          paid_amount: number | null
          payment_method: string | null
          restaurant_id: string | null
          status: string | null
          synced: boolean | null
          table_number: number | null
          total: number | null
          tracking_token: string | null
          workspace_id: string | null
        }
        Insert: {
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_agent_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number | null
          id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          restaurant_id?: string | null
          status?: string | null
          synced?: boolean | null
          table_number?: number | null
          total?: number | null
          tracking_token?: string | null
          workspace_id?: string | null
        }
        Update: {
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_agent_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number | null
          id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          restaurant_id?: string | null
          status?: string | null
          synced?: boolean | null
          table_number?: number | null
          total?: number | null
          tracking_token?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_supplier_statement: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string | null
          receipt_id: string | null
          restaurant_id: string | null
          supplier_id: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          receipt_id?: string | null
          restaurant_id?: string | null
          supplier_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          receipt_id?: string | null
          restaurant_id?: string | null
          supplier_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tax_report: {
        Row: {
          client_order_id: string | null
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_agent_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          discount: number | null
          id: string | null
          journal_entry_id: string | null
          notes: string | null
          order_number: string | null
          order_type: string | null
          paid_amount: number | null
          payment_method: string | null
          restaurant_id: string | null
          status: string | null
          synced: boolean | null
          table_number: number | null
          total: number | null
          tracking_token: string | null
          workspace_id: string | null
        }
        Insert: {
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_agent_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number | null
          id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          restaurant_id?: string | null
          status?: string | null
          synced?: boolean | null
          table_number?: number | null
          total?: number | null
          tracking_token?: string | null
          workspace_id?: string | null
        }
        Update: {
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_agent_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number | null
          id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          restaurant_id?: string | null
          status?: string | null
          synced?: boolean | null
          table_number?: number | null
          total?: number | null
          tracking_token?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents_tracking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_treasury_kpi_snapshot: {
        Row: {
          cash_in_today: number | null
          cash_out_today: number | null
          draft_reconciliation_variance: number | null
          net_cash_today: number | null
          restaurant_id: string | null
          total_treasury_balance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trial_balance: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          company_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          entry_id: string | null
          id: string | null
          line_order: number | null
          restaurant_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_variance_approval_backlog: {
        Row: {
          approved_count: number | null
          company_id: string | null
          fiscal_month: number | null
          fiscal_year: number | null
          pending_abs_variance_amount: number | null
          pending_count: number | null
          rejected_count: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_variance_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_variance_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_product_stock: {
        Args: {
          _movement_type: string
          _product_id: string
          _quantity: number
          _reason: string
          _reference_id: string
          _restaurant_id: string
        }
        Returns: undefined
      }
      approve_journal_entry: {
        Args: { p_entry_id: string; p_notes?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          workflow_status: string
          workspace_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "journal_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auth_restaurant_ids: {
        Args: never
        Returns: {
          restaurant_id: string
        }[]
      }
      calculate_fifo_cost: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: {
          avg_unit_cost: number
          layers_used: number
          total_cost: number
        }[]
      }
      can_approve_journal: {
        Args: { p_restaurant_id: string; p_user_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: {
          p_company_id: string
          p_permission_code: string
          p_user_id: string
        }
        Returns: boolean
      }
      close_accounting_period: {
        Args: {
          p_create_closing_entry?: boolean
          p_notes?: string
          p_period_end: string
          p_period_start: string
          p_restaurant_id: string
        }
        Returns: {
          close_id: string
          closing_entry_id: string
          expense_total: number
          locked: boolean
          net_result: number
          revenue_total: number
        }[]
      }
      confirm_treasury_reconciliation: {
        Args: { p_post_variance?: boolean; p_reconciliation_id: string }
        Returns: {
          confirmed_at: string | null
          confirmed_by: string | null
          counted_balance: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reconciliation_date: string
          restaurant_id: string
          status: string
          system_balance: number
          treasury_account_id: string
          variance_amount: number | null
        }
        SetofOptions: {
          from: "*"
          to: "treasury_reconciliations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_default_chart_of_accounts: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      create_default_fiscal_periods: {
        Args: { p_restaurant_id: string; p_year?: number }
        Returns: undefined
      }
      create_fiscal_periods_for_year: {
        Args: { p_company_id: string; p_year: number }
        Returns: undefined
      }
      create_treasury_reconciliation_snapshot: {
        Args: {
          p_counted_balance: number
          p_notes?: string
          p_treasury_account_id: string
        }
        Returns: {
          confirmed_at: string | null
          confirmed_by: string | null
          counted_balance: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reconciliation_date: string
          restaurant_id: string
          status: string
          system_balance: number
          treasury_account_id: string
          variance_amount: number | null
        }
        SetofOptions: {
          from: "*"
          to: "treasury_reconciliations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_autopost_transaction: {
        Args: {
          p_amount: number
          p_company_id: string
          p_created_by?: string
          p_description: string
          p_entry_date: string
          p_movement_subtype: string
          p_movement_type: string
          p_payment_method: string
          p_profile_code: string
          p_restaurant_id: string
          p_source_event: string
          p_source_id: string
          p_source_module: string
          p_workspace_id: string
        }
        Returns: string
      }
      fn_capture_material_variances: {
        Args: {
          p_company_id: string
          p_month: number
          p_requested_by?: string
          p_workspace_id: string
          p_year: number
        }
        Returns: number
      }
      fn_cfo_aging_ap: {
        Args: { p_restaurant_id: string }
        Returns: {
          amount: number
          bucket: string
        }[]
      }
      fn_cfo_aging_ar: {
        Args: { p_restaurant_id: string }
        Returns: {
          amount: number
          bucket: string
        }[]
      }
      fn_cfo_budget_variance: {
        Args: { p_month: number; p_restaurant_id: string; p_year: number }
        Returns: {
          actual_amount: number
          budget_amount: number
          section: string
          variance_amount: number
          variance_percent: number
        }[]
      }
      fn_cfo_budget_variance_scoped: {
        Args: {
          p_company_id: string
          p_month: number
          p_workspace_id: string
          p_year: number
        }
        Returns: {
          actual_amount: number
          budget_amount: number
          section: string
          variance_amount: number
          variance_percent: number
        }[]
      }
      fn_cfo_cashflow: {
        Args: { p_from: string; p_restaurant_id: string; p_to: string }
        Returns: {
          cash_in: number
          cash_out: number
          net_cash: number
        }[]
      }
      fn_cfo_pnl: {
        Args: { p_from: string; p_restaurant_id: string; p_to: string }
        Returns: {
          amount: number
          section: string
        }[]
      }
      fn_close_period_with_controls: {
        Args: {
          p_create_closing_entry?: boolean
          p_notes?: string
          p_period_end: string
          p_period_start: string
          p_restaurant_id: string
        }
        Returns: {
          close_id: string
          closing_entry_id: string
          expense_total: number
          locked: boolean
          net_result: number
          revenue_total: number
          variance_requests_created: number
        }[]
      }
      fn_company_id_from_restaurant: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      fn_default_workspace_id: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      fn_get_profile_code: {
        Args: { p_company_id: string; p_workspace_id: string }
        Returns: string
      }
      fn_gl_posting_emit_alerts: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          alert_type: string
          emitted_alert_id: string
          severity: string
          status: string
        }[]
      }
      fn_gl_posting_emit_alerts_all: {
        Args: { p_days?: number }
        Returns: {
          alert_type: string
          company_id: string
          emitted_alert_id: string
          severity: string
          status: string
        }[]
      }
      fn_gl_posting_health_check: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          company_id: string
          is_healthy: boolean
          is_pending_age_breach: boolean
          is_pending_count_breach: boolean
          is_success_rate_breach: boolean
          max_pending_age_minutes: number
          pending_count: number
          policy_max_pending_age_minutes: number
          policy_max_pending_count: number
          policy_min_success_rate_percent: number
          success_rate_percent: number
        }[]
      }
      fn_gl_posting_kpi_snapshot: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          avg_pending_hours: number
          failure_count: number
          pending_now: number
          success_count: number
          success_rate_percent: number
          total_attempts: number
        }[]
      }
      fn_log_posting_failure: {
        Args: {
          p_amount: number
          p_company_id: string
          p_error_message: string
          p_movement_subtype: string
          p_movement_type: string
          p_payload: Json
          p_payment_method: string
          p_restaurant_id: string
          p_source_event: string
          p_source_id: string
          p_source_table: string
          p_workspace_id: string
        }
        Returns: string
      }
      fn_normalize_payment_method: {
        Args: { p_method: string }
        Returns: string
      }
      fn_resolve_coa_account_id: {
        Args: {
          p_company_id: string
          p_system_key: string
          p_workspace_id: string
        }
        Returns: string
      }
      fn_resolve_posting_setting: {
        Args: {
          p_company_id: string
          p_movement_subtype: string
          p_movement_type: string
          p_payment_method: string
          p_profile_code: string
          p_workspace_id: string
        }
        Returns: {
          auto_post: boolean
          credit_account_id: string
          debit_account_id: string
          requires_approval: boolean
          setting_id: string
        }[]
      }
      fn_retry_failed_postings: {
        Args: { p_limit?: number }
        Returns: {
          failure_id: string
          resolved_entry_id: string
          retry_count: number
          source_id: string
          source_table: string
          status: string
        }[]
      }
      fn_retry_posting_failure: {
        Args: { p_failure_id: string }
        Returns: string
      }
      fn_run_posting_self_heal: {
        Args: { p_limit?: number }
        Returns: {
          pending_after_count: number
          processed_count: number
          resolved_count: number
          run_id: string
          status: string
        }[]
      }
      fn_validate_period_close_controls: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
          p_workspace_id: string
        }
        Returns: {
          control_name: string
          details: string
          passed: boolean
        }[]
      }
      generate_entry_number: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      generate_return_number: {
        Args: { restaurant_id: string; return_type: string }
        Returns: string
      }
      get_account_by_system_key: {
        Args: { p_restaurant_id: string; p_system_key: string }
        Returns: string
      }
      get_accounts_payable: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_accounts_receivable: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_balance_sheet: {
        Args: { p_as_of_date?: string; p_restaurant_id: string }
        Returns: {
          account_type: string
          amount: number
          section: string
        }[]
      }
      get_cash_account: { Args: { p_restaurant_id: string }; Returns: string }
      get_cogs_account: { Args: { p_restaurant_id: string }; Returns: string }
      get_current_fiscal_period: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_inventory_account: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_or_create_expense_account: {
        Args: {
          p_account_name: string
          p_code: string
          p_restaurant_id: string
        }
        Returns: string
      }
      get_profit_and_loss: {
        Args: {
          p_end_date: string
          p_restaurant_id: string
          p_start_date: string
        }
        Returns: {
          amount: number
          category: string
          line_type: string
        }[]
      }
      get_sales_account: { Args: { p_restaurant_id: string }; Returns: string }
      get_sales_returns_account: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_trial_balance: {
        Args: { p_as_of_date?: string; p_restaurant_id: string }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          account_type: string
          budget_amount: number
          closing_balance: number
          credit_movement: number
          debit_movement: number
          opening_balance: number
          variance: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { cid: string }; Returns: boolean }
      is_posting_allowed: {
        Args: { p_entry_date: string; p_restaurant_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      post_approved_journal_entry: {
        Args: { p_entry_id: string; p_notes?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          workflow_status: string
          workspace_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "journal_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      post_journal_entry: { Args: { p_entry_id: string }; Returns: boolean }
      recalc_ap_item_status: { Args: { p_item_id: string }; Returns: undefined }
      recalc_ar_item_status: { Args: { p_item_id: string }; Returns: undefined }
      recalc_journal_totals: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      reject_journal_entry: {
        Args: { p_entry_id: string; p_reason: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          workflow_status: string
          workspace_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "journal_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reopen_accounting_period: {
        Args: {
          p_notes?: string
          p_period_end: string
          p_period_start: string
          p_restaurant_id: string
        }
        Returns: {
          close_id: string
          reopened: boolean
        }[]
      }
      require_account_by_system_key: {
        Args: { p_restaurant_id: string; p_system_key: string }
        Returns: string
      }
      resolve_order_item_unit_price: {
        Args: {
          p_fallback_price: number
          p_menu_item_id: string
          p_product_id: string
        }
        Returns: number
      }
      seed_equal_monthly_budget: {
        Args: {
          p_account_id: string
          p_annual_budget: number
          p_restaurant_id: string
          p_year: number
        }
        Returns: undefined
      }
      seed_global_coa: {
        Args: { p_profile?: string; p_restaurant_id: string }
        Returns: undefined
      }
      submit_journal_entry: {
        Args: { p_entry_id: string; p_notes?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_posted: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          workflow_status: string
          workspace_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "journal_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_account_balance: {
        Args: {
          p_account_id: string
          p_amount: number
          p_fiscal_period_id?: string
        }
        Returns: undefined
      }
      user_owns_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "restaurant_owner"
        | "accountant"
        | "finance_manager"
      business_type:
        | "restaurant"
        | "retail"
        | "wholesale"
        | "warehouse"
        | "cafe"
        | "grocery"
        | "pharmacy"
        | "other"
        | "services"
        | "shipping"
        | "distribution"
        | "hospital"
        | "factory"
        | "real_estate"
        | "contracting"
        | "finishing"
        | "rental"
        | "education"
        | "law_firm"
        | "marketing_agency"
        | "gym"
        | "beauty_salon"
        | "auto_repair"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "restaurant_owner",
        "accountant",
        "finance_manager",
      ],
      business_type: [
        "restaurant",
        "retail",
        "wholesale",
        "warehouse",
        "cafe",
        "grocery",
        "pharmacy",
        "other",
        "services",
        "shipping",
        "distribution",
        "hospital",
        "factory",
        "real_estate",
        "contracting",
        "finishing",
        "rental",
        "education",
        "law_firm",
        "marketing_agency",
        "gym",
        "beauty_salon",
        "auto_repair",
      ],
    },
  },
} as const
