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
      abandoned_carts: {
        Row: {
          cart_items: Json
          cart_total: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          item_count: number
          last_activity: string
          restaurant_id: string
          status: string
          visitor_id: string
        }
        Insert: {
          cart_items?: Json
          cart_total?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_count?: number
          last_activity?: string
          restaurant_id: string
          status?: string
          visitor_id: string
        }
        Update: {
          cart_items?: Json
          cart_total?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_count?: number
          last_activity?: string
          restaurant_id?: string
          status?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "account_balances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      account_balances_backup: {
        Row: {
          account_type: string | null
          backup_timestamp: string | null
          code: string | null
          current_balance: number | null
          id: string
          name: string | null
          opening_balance: number | null
          restaurant_id: string | null
        }
        Insert: {
          account_type?: string | null
          backup_timestamp?: string | null
          code?: string | null
          current_balance?: number | null
          id: string
          name?: string | null
          opening_balance?: number | null
          restaurant_id?: string | null
        }
        Update: {
          account_type?: string | null
          backup_timestamp?: string | null
          code?: string | null
          current_balance?: number | null
          id?: string
          name?: string | null
          opening_balance?: number | null
          restaurant_id?: string | null
        }
        Relationships: []
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
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "accounting_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "accounting_period_locks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      ad_account_connections: {
        Row: {
          access_token: string | null
          created_at: string
          customer_id: string | null
          display_name: string | null
          external_account_id: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          platform: string
          refresh_token: string | null
          restaurant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          external_account_id: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform: string
          refresh_token?: string | null
          restaurant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          external_account_id?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform?: string
          refresh_token?: string | null
          restaurant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_account_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_account_connections_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_account_connections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_account_connections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_account_connections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_account_connections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number
          conversions: number
          created_at: string
          date: string
          id: string
          impressions: number
          platform: string
          raw: Json | null
          restaurant_id: string
          revenue: number
          spend: number
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number
          conversions?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          platform: string
          raw?: Json | null
          restaurant_id: string
          revenue?: number
          spend?: number
        }
        Update: {
          campaign_id?: string | null
          clicks?: number
          conversions?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          platform?: string
          raw?: Json | null
          restaurant_id?: string
          revenue?: number
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_metrics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_metrics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_metrics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_metrics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          restaurant_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          restaurant_id?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          restaurant_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "ai_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_journal_suggestions: {
        Row: {
          analysis_standard: string | null
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
          analysis_standard?: string | null
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
          analysis_standard?: string | null
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
            foreignKeyName: "ai_journal_suggestions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "ap_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "ar_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "ar_settlements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_depreciation_history: {
        Row: {
          accumulated_depreciation_after: number
          accumulated_depreciation_before: number
          asset_id: string
          book_value_after: number
          book_value_before: number
          created_at: string | null
          created_by: string | null
          depreciation_amount: number
          depreciation_date: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          restaurant_id: string
        }
        Insert: {
          accumulated_depreciation_after: number
          accumulated_depreciation_before: number
          asset_id: string
          book_value_after: number
          book_value_before: number
          created_at?: string | null
          created_by?: string | null
          depreciation_amount: number
          depreciation_date: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          restaurant_id: string
        }
        Update: {
          accumulated_depreciation_after?: number
          accumulated_depreciation_before?: number
          asset_id?: string
          book_value_after?: number
          book_value_before?: number
          created_at?: string | null
          created_by?: string | null
          depreciation_amount?: number
          depreciation_date?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciation_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "bank_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "bans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      branches: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          manager_name: string | null
          name: string | null
          order_count: number | null
          phone: string | null
          restaurant_id: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id: string
          manager_name?: string | null
          name?: string | null
          order_count?: number | null
          phone?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          manager_name?: string | null
          name?: string | null
          order_count?: number | null
          phone?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
            foreignKeyName: "chart_of_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      chat_typing_status: {
        Row: {
          id: string
          restaurant_id: string
          room_id: string
          updated_at: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          room_id?: string
          updated_at?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          room_id?: string
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_status_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_typing_status_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_typing_status_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_typing_status_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          join_code: string | null
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
          join_code?: string | null
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
          join_code?: string | null
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
      contractor_payments: {
        Row: {
          amount: number
          contractor_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          restaurant_id: string
        }
        Insert: {
          amount: number
          contractor_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          contractor_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_payments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_services: {
        Row: {
          completion_date: string | null
          contractor_amount: number
          contractor_id: string
          created_at: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          order_id: string | null
          restaurant_id: string
          service_amount: number
          service_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          completion_date?: string | null
          contractor_amount: number
          contractor_id: string
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string | null
          restaurant_id: string
          service_amount: number
          service_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          completion_date?: string | null
          contractor_amount?: number
          contractor_id?: string
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string | null
          restaurant_id?: string
          service_amount?: number
          service_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_services_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "contractor_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "contractor_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_payments"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "contractor_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          balance: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_type: string
          payment_value: number
          phone: string | null
          restaurant_id: string
          service_variables: Json
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_type?: string
          payment_value?: number
          phone?: string | null
          restaurant_id: string
          service_variables?: Json
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_type?: string
          payment_value?: number
          phone?: string | null
          restaurant_id?: string
          service_variables?: Json
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "cost_centers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
        ]
      }
      crm_communication_logs: {
        Row: {
          ai_analysis: string | null
          contact_date: string | null
          created_at: string | null
          customer_id: string | null
          details: string | null
          id: string
          lead_id: string | null
          restaurant_id: string | null
          sentiment: string | null
          summary: string | null
          type: string | null
        }
        Insert: {
          ai_analysis?: string | null
          contact_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          details?: string | null
          id?: string
          lead_id?: string | null
          restaurant_id?: string | null
          sentiment?: string | null
          summary?: string | null
          type?: string | null
        }
        Update: {
          ai_analysis?: string | null
          contact_date?: string | null
          created_at?: string | null
          customer_id?: string | null
          details?: string | null
          id?: string
          lead_id?: string | null
          restaurant_id?: string | null
          sentiment?: string | null
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
          {
            foreignKeyName: "crm_communication_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          staff_id: string | null
          status: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          staff_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          staff_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          ad_group_name: string | null
          ai_score: number | null
          ai_summary: string | null
          assigned_to: string | null
          campaign_name: string | null
          created_at: string | null
          email: string | null
          estimated_value: number | null
          id: string
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          platform: string | null
          raw_social_data: Json | null
          restaurant_id: string | null
          source: string | null
          source_details: Json | null
          stage: string | null
        }
        Insert: {
          ad_group_name?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          assigned_to?: string | null
          campaign_name?: string | null
          created_at?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          platform?: string | null
          raw_social_data?: Json | null
          restaurant_id?: string | null
          source?: string | null
          source_details?: Json | null
          stage?: string | null
        }
        Update: {
          ad_group_name?: string | null
          ai_score?: number | null
          ai_summary?: string | null
          assigned_to?: string | null
          campaign_name?: string | null
          created_at?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          platform?: string | null
          raw_social_data?: Json | null
          restaurant_id?: string | null
          source?: string | null
          source_details?: Json | null
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
          {
            foreignKeyName: "crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_platform_configs: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          pixel_id: string | null
          platform: string
          restaurant_id: string | null
          settings: Json | null
          updated_at: string | null
          webhook_verify_token: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string | null
          platform: string
          restaurant_id?: string | null
          settings?: Json | null
          updated_at?: string | null
          webhook_verify_token?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string | null
          platform?: string
          restaurant_id?: string | null
          settings?: Json | null
          updated_at?: string | null
          webhook_verify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_platform_configs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_platform_configs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_platform_configs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_platform_configs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_accounts: {
        Row: {
          access_token: string | null
          account_name: string | null
          created_at: string | null
          external_account_id: string | null
          id: string
          is_active: boolean | null
          platform: string
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string | null
          external_account_id?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string | null
          external_account_id?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_social_messages: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          message_content: string | null
          platform: string | null
          restaurant_id: string | null
          sender_external_id: string | null
          sender_name: string | null
          social_account_id: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          message_content?: string | null
          platform?: string | null
          restaurant_id?: string | null
          sender_external_id?: string | null
          sender_name?: string | null
          social_account_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          message_content?: string | null
          platform?: string | null
          restaurant_id?: string | null
          sender_external_id?: string | null
          sender_name?: string | null
          social_account_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_social_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_social_messages_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "crm_social_accounts"
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
          {
            foreignKeyName: "crm_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_business_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          name: string
          tabs: string[]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          tabs: string[]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          tabs?: string[]
        }
        Relationships: []
      }
      customer_balances_backup: {
        Row: {
          backup_timestamp: string | null
          balance: number | null
          id: string
          name: string | null
          restaurant_id: string | null
        }
        Insert: {
          backup_timestamp?: string | null
          balance?: number | null
          id: string
          name?: string | null
          restaurant_id?: string | null
        }
        Update: {
          backup_timestamp?: string | null
          balance?: number | null
          id?: string
          name?: string | null
          restaurant_id?: string | null
        }
        Relationships: []
      }
      customer_points: {
        Row: {
          customer_id: string | null
          id: string
          last_earned: string | null
          points: number | null
          restaurant_id: string | null
          total_earned: number | null
          total_redeemed: number | null
        }
        Insert: {
          customer_id?: string | null
          id: string
          last_earned?: string | null
          points?: number | null
          restaurant_id?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
        }
        Update: {
          customer_id?: string | null
          id?: string
          last_earned?: string | null
          points?: number | null
          restaurant_id?: string | null
          total_earned?: number | null
          total_redeemed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
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
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
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
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          customer_ref: string | null
          customer_type: string
          email: string | null
          id: string
          loyalty_points: number | null
          loyalty_tier: string | null
          name: string
          notes: string | null
          phone: string
          restaurant_id: string
          risk_level: string | null
          tax_number: string | null
          total_spent: number | null
          updated_at: string
          vip_status: boolean | null
          warning_flags: number | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number
          company_id?: string | null
          created_at?: string
          credit_limit?: number
          customer_ref?: string | null
          customer_type?: string
          email?: string | null
          id?: string
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name: string
          notes?: string | null
          phone?: string
          restaurant_id: string
          risk_level?: string | null
          tax_number?: string | null
          total_spent?: number | null
          updated_at?: string
          vip_status?: boolean | null
          warning_flags?: number | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number
          company_id?: string | null
          created_at?: string
          credit_limit?: number
          customer_ref?: string | null
          customer_type?: string
          email?: string | null
          id?: string
          loyalty_points?: number | null
          loyalty_tier?: string | null
          name?: string
          notes?: string | null
          phone?: string
          restaurant_id?: string
          risk_level?: string | null
          tax_number?: string | null
          total_spent?: number | null
          updated_at?: string
          vip_status?: boolean | null
          warning_flags?: number | null
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
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "daily_overheads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      delivery_contact_logs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          order_id: string | null
          restaurant_id: string
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string | null
          restaurant_id: string
          source: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string | null
          restaurant_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_contact_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "service_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_payments"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_contact_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      device_version_tracking: {
        Row: {
          created_at: string | null
          current_version: string
          device_id: string
          id: string
          is_weak_device: boolean | null
          last_check_in: string | null
          platform: string | null
          restaurant_id: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          current_version: string
          device_id: string
          id?: string
          is_weak_device?: boolean | null
          last_check_in?: string | null
          platform?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          current_version?: string
          device_id?: string
          id?: string
          is_weak_device?: boolean | null
          last_check_in?: string | null
          platform?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_version_tracking_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_version_tracking_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_version_tracking_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_version_tracking_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_chat_messages: {
        Row: {
          created_at: string | null
          department_id: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_pinned: boolean | null
          message_content: string
          reactions: Json | null
          recipient_user_id: string | null
          reply_to_id: string | null
          restaurant_id: string
          sender_name: string
          sender_role: string | null
          sender_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean | null
          message_content: string
          reactions?: Json | null
          recipient_user_id?: string | null
          reply_to_id?: string | null
          restaurant_id: string
          sender_name: string
          sender_role?: string | null
          sender_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean | null
          message_content?: string
          reactions?: Json | null
          recipient_user_id?: string | null
          reply_to_id?: string | null
          restaurant_id?: string
          sender_name?: string
          sender_role?: string | null
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_chat_messages_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "staff_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "employee_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_chat_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          created_by: string | null
          created_by_name: string | null
          description: string | null
          expense_account_id: string
          id: string
          journal_entry_id: string | null
          payment_method: string | null
          restaurant_id: string
          tax_amount: number | null
          total_amount: number
          updated_by: string | null
          updated_by_name: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          expense_account_id: string
          id?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          restaurant_id: string
          tax_amount?: number | null
          total_amount?: number
          updated_by?: string | null
          updated_by_name?: string | null
          voucher_date?: string
          voucher_number: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          expense_account_id?: string
          id?: string
          journal_entry_id?: string | null
          payment_method?: string | null
          restaurant_id?: string
          tax_amount?: number | null
          total_amount?: number
          updated_by?: string | null
          updated_by_name?: string | null
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
          {
            foreignKeyName: "expense_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_code: string | null
          amount: number
          billing_amount: number | null
          block_id: string | null
          category: string
          company_id: string | null
          cost_center: string | null
          created_at: string
          customer_id: string | null
          date: string
          description: string | null
          id: string
          is_client_reimbursable: boolean | null
          journal_entry_id: string | null
          payment_account_code: string | null
          project_id: string | null
          restaurant_id: string
          revenue_account_id: string | null
          site_id: string | null
          workspace_id: string | null
        }
        Insert: {
          account_code?: string | null
          amount?: number
          billing_amount?: number | null
          block_id?: string | null
          category?: string
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          customer_id?: string | null
          date?: string
          description?: string | null
          id?: string
          is_client_reimbursable?: boolean | null
          journal_entry_id?: string | null
          payment_account_code?: string | null
          project_id?: string | null
          restaurant_id: string
          revenue_account_id?: string | null
          site_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_code?: string | null
          amount?: number
          billing_amount?: number | null
          block_id?: string | null
          category?: string
          company_id?: string | null
          cost_center?: string | null
          created_at?: string
          customer_id?: string | null
          date?: string
          description?: string | null
          id?: string
          is_client_reimbursable?: boolean | null
          journal_entry_id?: string | null
          payment_account_code?: string | null
          project_id?: string | null
          restaurant_id?: string
          revenue_account_id?: string | null
          site_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "project_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_revenue_account_id_fkey"
            columns: ["revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "project_sites"
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
            foreignKeyName: "fiscal_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "fixed_assets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_cutting_lots: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by_name: string | null
          created_at: string
          cut_at: string | null
          cut_by_name: string | null
          fabric_roll_id: string | null
          garment_order_id: string
          id: string
          inventory_deducted: boolean
          lays_count: number | null
          lot_number: string
          marker_length_m: number | null
          meters_actual: number
          meters_planned: number
          notes: string | null
          pieces_cut: number
          pieces_planned: number
          requires_approval: boolean
          restaurant_id: string
          status: string
          variance_flag: boolean
          waste_meters: number | null
          waste_pct: number | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by_name?: string | null
          created_at?: string
          cut_at?: string | null
          cut_by_name?: string | null
          fabric_roll_id?: string | null
          garment_order_id: string
          id?: string
          inventory_deducted?: boolean
          lays_count?: number | null
          lot_number: string
          marker_length_m?: number | null
          meters_actual?: number
          meters_planned?: number
          notes?: string | null
          pieces_cut?: number
          pieces_planned?: number
          requires_approval?: boolean
          restaurant_id: string
          status?: string
          variance_flag?: boolean
          waste_meters?: number | null
          waste_pct?: number | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by_name?: string | null
          created_at?: string
          cut_at?: string | null
          cut_by_name?: string | null
          fabric_roll_id?: string | null
          garment_order_id?: string
          id?: string
          inventory_deducted?: boolean
          lays_count?: number | null
          lot_number?: string
          marker_length_m?: number | null
          meters_actual?: number
          meters_planned?: number
          notes?: string | null
          pieces_cut?: number
          pieces_planned?: number
          requires_approval?: boolean
          restaurant_id?: string
          status?: string
          variance_flag?: boolean
          waste_meters?: number | null
          waste_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garment_cutting_lots_fabric_roll_id_fkey"
            columns: ["fabric_roll_id"]
            isOneToOne: false
            referencedRelation: "garment_fabric_rolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_cutting_lots_garment_order_id_fkey"
            columns: ["garment_order_id"]
            isOneToOne: false
            referencedRelation: "garment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_cutting_lots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_cutting_lots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_cutting_lots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_cutting_lots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_fabric_rolls: {
        Row: {
          color: string | null
          created_at: string
          fabric_type: string | null
          garment_order_id: string | null
          id: string
          meters_consumed: number
          meters_received: number
          meters_remaining: number | null
          notes: string | null
          product_id: string | null
          received_at: string | null
          received_by_name: string | null
          restaurant_id: string
          roll_number: string
          status: string
          supplier_name: string | null
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          fabric_type?: string | null
          garment_order_id?: string | null
          id?: string
          meters_consumed?: number
          meters_received?: number
          meters_remaining?: number | null
          notes?: string | null
          product_id?: string | null
          received_at?: string | null
          received_by_name?: string | null
          restaurant_id: string
          roll_number: string
          status?: string
          supplier_name?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          fabric_type?: string | null
          garment_order_id?: string | null
          id?: string
          meters_consumed?: number
          meters_received?: number
          meters_remaining?: number | null
          notes?: string | null
          product_id?: string | null
          received_at?: string | null
          received_by_name?: string | null
          restaurant_id?: string
          roll_number?: string
          status?: string
          supplier_name?: string | null
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garment_fabric_rolls_garment_order_id_fkey"
            columns: ["garment_order_id"]
            isOneToOne: false
            referencedRelation: "garment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_fabric_rolls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_orders: {
        Row: {
          color: string | null
          cost_per_unit: number | null
          cost_variance: number | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          current_stage: string
          customer_id: string | null
          customer_name: string | null
          cutting_waste_limit_pct: number | null
          delivered_at: string | null
          due_date: string | null
          fabric_product_id: string | null
          fabric_type: string | null
          id: string
          notes: string | null
          order_number: string
          planned_cost_per_unit: number | null
          quantity_assembled: number
          quantity_cut: number
          quantity_delivered: number
          quantity_laundry: number
          quantity_packed: number
          quantity_planned: number
          quantity_qc_fail: number
          quantity_qc_pass: number
          restaurant_id: string
          sales_order_id: string | null
          sizes: Json
          status: string
          style_code: string | null
          style_name: string
          total_outsourcing_cost: number
          total_stage_cost: number
          total_value: number | null
          unit_price: number | null
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          color?: string | null
          cost_per_unit?: number | null
          cost_variance?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_stage?: string
          customer_id?: string | null
          customer_name?: string | null
          cutting_waste_limit_pct?: number | null
          delivered_at?: string | null
          due_date?: string | null
          fabric_product_id?: string | null
          fabric_type?: string | null
          id?: string
          notes?: string | null
          order_number: string
          planned_cost_per_unit?: number | null
          quantity_assembled?: number
          quantity_cut?: number
          quantity_delivered?: number
          quantity_laundry?: number
          quantity_packed?: number
          quantity_planned?: number
          quantity_qc_fail?: number
          quantity_qc_pass?: number
          restaurant_id: string
          sales_order_id?: string | null
          sizes?: Json
          status?: string
          style_code?: string | null
          style_name: string
          total_outsourcing_cost?: number
          total_stage_cost?: number
          total_value?: number | null
          unit_price?: number | null
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          color?: string | null
          cost_per_unit?: number | null
          cost_variance?: number | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          current_stage?: string
          customer_id?: string | null
          customer_name?: string | null
          cutting_waste_limit_pct?: number | null
          delivered_at?: string | null
          due_date?: string | null
          fabric_product_id?: string | null
          fabric_type?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          planned_cost_per_unit?: number | null
          quantity_assembled?: number
          quantity_cut?: number
          quantity_delivered?: number
          quantity_laundry?: number
          quantity_packed?: number
          quantity_planned?: number
          quantity_qc_fail?: number
          quantity_qc_pass?: number
          restaurant_id?: string
          sales_order_id?: string | null
          sizes?: Json
          status?: string
          style_code?: string | null
          style_name?: string
          total_outsourcing_cost?: number
          total_stage_cost?: number
          total_value?: number | null
          unit_price?: number | null
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garment_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_fabric_product_id_fkey"
            columns: ["fabric_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_fabric_product_id_fkey"
            columns: ["fabric_product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_fabric_product_id_fkey"
            columns: ["fabric_product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "garment_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "garment_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v_order_payments"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "garment_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_outsourcing_jobs: {
        Row: {
          created_at: string
          created_by_name: string | null
          due_date: string | null
          external_ref: string | null
          garment_order_id: string
          id: string
          notes: string | null
          qty_received: number
          qty_rejected: number
          qty_sent: number
          received_at: string | null
          restaurant_id: string
          sent_at: string | null
          stage: string
          status: string
          total_cost: number
          unit_cost: number
          updated_at: string
          updated_by_name: string | null
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          due_date?: string | null
          external_ref?: string | null
          garment_order_id: string
          id?: string
          notes?: string | null
          qty_received?: number
          qty_rejected?: number
          qty_sent?: number
          received_at?: string | null
          restaurant_id: string
          sent_at?: string | null
          stage: string
          status?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
          updated_by_name?: string | null
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          due_date?: string | null
          external_ref?: string | null
          garment_order_id?: string
          id?: string
          notes?: string | null
          qty_received?: number
          qty_rejected?: number
          qty_sent?: number
          received_at?: string | null
          restaurant_id?: string
          sent_at?: string | null
          stage?: string
          status?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: string
          updated_by_name?: string | null
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garment_outsourcing_jobs_garment_order_id_fkey"
            columns: ["garment_order_id"]
            isOneToOne: false
            referencedRelation: "garment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_outsourcing_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_outsourcing_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_outsourcing_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_outsourcing_jobs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_stage_costs: {
        Row: {
          cost_type: string
          created_at: string
          garment_order_id: string
          id: string
          notes: string | null
          outsourcing_job_id: string | null
          quantity: number
          quantity_transferred: number | null
          recorded_by_name: string | null
          restaurant_id: string
          stage: string
          stage_log_id: string | null
          total_cost: number
          unit_cost: number
          vendor_name: string | null
        }
        Insert: {
          cost_type?: string
          created_at?: string
          garment_order_id: string
          id?: string
          notes?: string | null
          outsourcing_job_id?: string | null
          quantity?: number
          quantity_transferred?: number | null
          recorded_by_name?: string | null
          restaurant_id: string
          stage: string
          stage_log_id?: string | null
          total_cost?: number
          unit_cost?: number
          vendor_name?: string | null
        }
        Update: {
          cost_type?: string
          created_at?: string
          garment_order_id?: string
          id?: string
          notes?: string | null
          outsourcing_job_id?: string | null
          quantity?: number
          quantity_transferred?: number | null
          recorded_by_name?: string | null
          restaurant_id?: string
          stage?: string
          stage_log_id?: string | null
          total_cost?: number
          unit_cost?: number
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garment_stage_costs_garment_order_id_fkey"
            columns: ["garment_order_id"]
            isOneToOne: false
            referencedRelation: "garment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_costs_outsourcing_job_id_fkey"
            columns: ["outsourcing_job_id"]
            isOneToOne: false
            referencedRelation: "garment_outsourcing_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_costs_stage_log_id_fkey"
            columns: ["stage_log_id"]
            isOneToOne: false
            referencedRelation: "garment_stage_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_stage_defs: {
        Row: {
          created_at: string
          icon_key: string | null
          id: string
          is_active: boolean
          is_system: boolean
          is_terminal: boolean
          label_ar: string
          notes: string | null
          order_index: number
          planned_cost_per_unit: number | null
          restaurant_id: string
          stage_key: string
          tracks_cutting: boolean
          tracks_packing: boolean
          triggers_invoice: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          is_terminal?: boolean
          label_ar: string
          notes?: string | null
          order_index?: number
          planned_cost_per_unit?: number | null
          restaurant_id: string
          stage_key: string
          tracks_cutting?: boolean
          tracks_packing?: boolean
          triggers_invoice?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          is_terminal?: boolean
          label_ar?: string
          notes?: string | null
          order_index?: number
          planned_cost_per_unit?: number | null
          restaurant_id?: string
          stage_key?: string
          tracks_cutting?: boolean
          tracks_packing?: boolean
          triggers_invoice?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_stage_defs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_defs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_defs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_defs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_stage_logs: {
        Row: {
          actor_name: string | null
          created_at: string
          from_stage: string | null
          garment_order_id: string
          id: string
          laundry_ref: string | null
          notes: string | null
          qc_fail: number | null
          qc_pass: number | null
          quantity: number
          restaurant_id: string
          to_stage: string
        }
        Insert: {
          actor_name?: string | null
          created_at?: string
          from_stage?: string | null
          garment_order_id: string
          id?: string
          laundry_ref?: string | null
          notes?: string | null
          qc_fail?: number | null
          qc_pass?: number | null
          quantity?: number
          restaurant_id: string
          to_stage: string
        }
        Update: {
          actor_name?: string | null
          created_at?: string
          from_stage?: string | null
          garment_order_id?: string
          id?: string
          laundry_ref?: string | null
          notes?: string | null
          qc_fail?: number | null
          qc_pass?: number | null
          quantity?: number
          restaurant_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_stage_logs_garment_order_id_fkey"
            columns: ["garment_order_id"]
            isOneToOne: false
            referencedRelation: "garment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_stage_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_stage_rates: {
        Row: {
          auto_apply: boolean
          cost_type: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          rate_per_piece: number
          restaurant_id: string
          stage_key: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          auto_apply?: boolean
          cost_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          rate_per_piece?: number
          restaurant_id: string
          stage_key: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          auto_apply?: boolean
          cost_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          rate_per_piece?: number
          restaurant_id?: string
          stage_key?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          balance: number | null
          code: string | null
          expires_at: string | null
          gift_to: string | null
          id: string
          initial_amount: number | null
          purchased_at: string | null
          purchased_by: string | null
          redeemed_at: string | null
          restaurant_id: string | null
          status: string | null
        }
        Insert: {
          balance?: number | null
          code?: string | null
          expires_at?: string | null
          gift_to?: string | null
          id: string
          initial_amount?: number | null
          purchased_at?: string | null
          purchased_by?: string | null
          redeemed_at?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Update: {
          balance?: number | null
          code?: string | null
          expires_at?: string | null
          gift_to?: string | null
          id?: string
          initial_amount?: number | null
          purchased_at?: string | null
          purchased_by?: string | null
          redeemed_at?: string | null
          restaurant_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            referencedRelation: "public_products"
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
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          accounting_standard: string | null
          average_cost: number
          id: string
          inventory_valuation_rule: string | null
          is_lcm_applied: boolean | null
          item_id: string
          last_movement_at: string | null
          last_movement_id: string | null
          last_purchase_at: string | null
          last_purchase_cost: number
          lcm_adjustment: number | null
          net_realizable_value: number | null
          quantity_allocated: number
          quantity_available: number
          quantity_incoming: number
          quantity_on_hand: number
          quantity_reserved: number
          sub_warehouse_id: string
          total_value: number
          unit_cost: number
          updated_at: string | null
          updated_by: string | null
          valuation_method: string | null
        }
        Insert: {
          accounting_standard?: string | null
          average_cost?: number
          id?: string
          inventory_valuation_rule?: string | null
          is_lcm_applied?: boolean | null
          item_id: string
          last_movement_at?: string | null
          last_movement_id?: string | null
          last_purchase_at?: string | null
          last_purchase_cost?: number
          lcm_adjustment?: number | null
          net_realizable_value?: number | null
          quantity_allocated?: number
          quantity_available?: number
          quantity_incoming?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          sub_warehouse_id: string
          total_value?: number
          unit_cost?: number
          updated_at?: string | null
          updated_by?: string | null
          valuation_method?: string | null
        }
        Update: {
          accounting_standard?: string | null
          average_cost?: number
          id?: string
          inventory_valuation_rule?: string | null
          is_lcm_applied?: boolean | null
          item_id?: string
          last_movement_at?: string | null
          last_movement_id?: string | null
          last_purchase_at?: string | null
          last_purchase_cost?: number
          lcm_adjustment?: number | null
          net_realizable_value?: number | null
          quantity_allocated?: number
          quantity_available?: number
          quantity_incoming?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          sub_warehouse_id?: string
          total_value?: number
          unit_cost?: number
          updated_at?: string | null
          updated_by?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_sub_warehouse_id_fkey"
            columns: ["sub_warehouse_id"]
            isOneToOne: false
            referencedRelation: "sub_warehouses"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
            foreignKeyName: "inventory_consumption_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_cost_layers: {
        Row: {
          accounting_standard: string | null
          consumed_at: string | null
          consumed_quantity: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_consumed: boolean | null
          item_id: string
          layer_type: string
          purchase_date: string | null
          quantity: number
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          remaining_quantity: number
          sub_warehouse_id: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          accounting_standard?: string | null
          consumed_at?: string | null
          consumed_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_consumed?: boolean | null
          item_id: string
          layer_type: string
          purchase_date?: string | null
          quantity: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remaining_quantity: number
          sub_warehouse_id: string
          total_cost: number
          unit_cost: number
        }
        Update: {
          accounting_standard?: string | null
          consumed_at?: string | null
          consumed_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_consumed?: boolean | null
          item_id?: string
          layer_type?: string
          purchase_date?: string | null
          quantity?: number
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remaining_quantity?: number
          sub_warehouse_id?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_cost_layers_sub_warehouse_id_fkey"
            columns: ["sub_warehouse_id"]
            isOneToOne: false
            referencedRelation: "sub_warehouses"
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
            referencedRelation: "public_products"
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
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_landed_costs: {
        Row: {
          allocation_method: string | null
          amount: number | null
          created_at: string | null
          expense_type: string | null
          id: string
          receipt_id: string | null
          restaurant_id: string | null
        }
        Insert: {
          allocation_method?: string | null
          amount?: number | null
          created_at?: string | null
          expense_type?: string | null
          id?: string
          receipt_id?: string | null
          restaurant_id?: string | null
        }
        Update: {
          allocation_method?: string | null
          amount?: number | null
          created_at?: string | null
          expense_type?: string | null
          id?: string
          receipt_id?: string | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_landed_costs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "inventory_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_landed_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_landed_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_landed_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_landed_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          accounting_entry_id: string | null
          accounting_standard: string | null
          batch_number: string | null
          cost_layer_id: string | null
          created_at: string | null
          created_by: string
          from_sub_warehouse_id: string | null
          id: string
          is_posted: boolean | null
          is_verified: boolean | null
          item_id: string
          lot_number: string | null
          movement_date: string
          movement_type: string
          notes: string | null
          posting_date: string
          quality_status: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          serial_number: string | null
          sub_warehouse_id: string
          to_sub_warehouse_id: string | null
          total_cost: number
          unit_cost: number
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          accounting_entry_id?: string | null
          accounting_standard?: string | null
          batch_number?: string | null
          cost_layer_id?: string | null
          created_at?: string | null
          created_by: string
          from_sub_warehouse_id?: string | null
          id?: string
          is_posted?: boolean | null
          is_verified?: boolean | null
          item_id: string
          lot_number?: string | null
          movement_date?: string
          movement_type: string
          notes?: string | null
          posting_date?: string
          quality_status?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          serial_number?: string | null
          sub_warehouse_id: string
          to_sub_warehouse_id?: string | null
          total_cost?: number
          unit_cost?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          accounting_entry_id?: string | null
          accounting_standard?: string | null
          batch_number?: string | null
          cost_layer_id?: string | null
          created_at?: string | null
          created_by?: string
          from_sub_warehouse_id?: string | null
          id?: string
          is_posted?: boolean | null
          is_verified?: boolean | null
          item_id?: string
          lot_number?: string | null
          movement_date?: string
          movement_type?: string
          notes?: string | null
          posting_date?: string
          quality_status?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          serial_number?: string | null
          sub_warehouse_id?: string
          to_sub_warehouse_id?: string | null
          total_cost?: number
          unit_cost?: number
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_from_sub_warehouse_id_fkey"
            columns: ["from_sub_warehouse_id"]
            isOneToOne: false
            referencedRelation: "sub_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_sub_warehouse_id_fkey"
            columns: ["sub_warehouse_id"]
            isOneToOne: false
            referencedRelation: "sub_warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_sub_warehouse_id_fkey"
            columns: ["to_sub_warehouse_id"]
            isOneToOne: false
            referencedRelation: "sub_warehouses"
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
            referencedRelation: "public_products"
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
            referencedRelation: "public_products"
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
          created_by_name: string | null
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
          updated_by: string | null
          updated_by_name: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
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
          updated_by?: string | null
          updated_by_name?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
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
          updated_by?: string | null
          updated_by_name?: string | null
          warehouse_id?: string | null
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
            foreignKeyName: "inventory_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "inventory_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "v_restaurant_plan_health"
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
        ]
      }
      inventory_transfer_items: {
        Row: {
          cost_price: number | null
          id: string
          product_id: string | null
          quantity: number
          restaurant_id: string | null
          transfer_id: string | null
        }
        Insert: {
          cost_price?: number | null
          id?: string
          product_id?: string | null
          quantity: number
          restaurant_id?: string | null
          transfer_id?: string | null
        }
        Update: {
          cost_price?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          restaurant_id?: string | null
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_sub_warehouse_id: string | null
          from_warehouse_id: string | null
          id: string
          items: Json | null
          notes: string | null
          restaurant_id: string | null
          status: string | null
          to_sub_warehouse_id: string | null
          to_warehouse_id: string | null
          transfer_date: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_sub_warehouse_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          restaurant_id?: string | null
          status?: string | null
          to_sub_warehouse_id?: string | null
          to_warehouse_id?: string | null
          transfer_date?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_sub_warehouse_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          restaurant_id?: string | null
          status?: string | null
          to_sub_warehouse_id?: string | null
          to_warehouse_id?: string | null
          transfer_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      item_types: {
        Row: {
          accounting_account_code: string | null
          cogs_account_code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_inventory: boolean | null
          name: string
          name_ar: string | null
          requires_warehouse: boolean | null
          type: string
        }
        Insert: {
          accounting_account_code?: string | null
          cogs_account_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_inventory?: boolean | null
          name: string
          name_ar?: string | null
          requires_warehouse?: boolean | null
          type: string
        }
        Update: {
          accounting_account_code?: string | null
          cogs_account_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_inventory?: boolean | null
          name?: string
          name_ar?: string | null
          requires_warehouse?: boolean | null
          type?: string
        }
        Relationships: []
      }
      item_warehouse_assignments: {
        Row: {
          accounting_standard: string
          costing_method: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          inventory_valuation_rule: string | null
          is_active: boolean | null
          is_primary: boolean | null
          item_id: string
          lead_time_days: number | null
          low_stock_alert: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          overstock_alert: boolean | null
          purchase_unit: string | null
          reorder_point: number | null
          reorder_quantity: number | null
          sales_unit: string | null
          stock_unit: string | null
          sub_warehouse_id: string
          updated_at: string | null
        }
        Insert: {
          accounting_standard?: string
          costing_method?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          inventory_valuation_rule?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          item_id: string
          lead_time_days?: number | null
          low_stock_alert?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          overstock_alert?: boolean | null
          purchase_unit?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sales_unit?: string | null
          stock_unit?: string | null
          sub_warehouse_id: string
          updated_at?: string | null
        }
        Update: {
          accounting_standard?: string
          costing_method?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          inventory_valuation_rule?: string | null
          is_active?: boolean | null
          is_primary?: boolean | null
          item_id?: string
          lead_time_days?: number | null
          low_stock_alert?: boolean | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          overstock_alert?: boolean | null
          purchase_unit?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          sales_unit?: string | null
          stock_unit?: string | null
          sub_warehouse_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_warehouse_assignments_sub_warehouse_id_fkey"
            columns: ["sub_warehouse_id"]
            isOneToOne: false
            referencedRelation: "sub_warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      item_warehouse_stock_history: {
        Row: {
          accounting_standard: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          item_id: string
          movement_id: string | null
          movement_type: string | null
          new_quantity_available: number | null
          new_quantity_on_hand: number | null
          new_total_value: number | null
          new_unit_cost: number | null
          previous_quantity_available: number | null
          previous_quantity_on_hand: number | null
          previous_total_value: number | null
          previous_unit_cost: number | null
          quantity_change: number | null
          reason: string | null
          sub_warehouse_id: string
        }
        Insert: {
          accounting_standard?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          item_id: string
          movement_id?: string | null
          movement_type?: string | null
          new_quantity_available?: number | null
          new_quantity_on_hand?: number | null
          new_total_value?: number | null
          new_unit_cost?: number | null
          previous_quantity_available?: number | null
          previous_quantity_on_hand?: number | null
          previous_total_value?: number | null
          previous_unit_cost?: number | null
          quantity_change?: number | null
          reason?: string | null
          sub_warehouse_id: string
        }
        Update: {
          accounting_standard?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          item_id?: string
          movement_id?: string | null
          movement_type?: string | null
          new_quantity_available?: number | null
          new_quantity_on_hand?: number | null
          new_total_value?: number | null
          new_unit_cost?: number | null
          previous_quantity_available?: number | null
          previous_quantity_on_hand?: number | null
          previous_total_value?: number | null
          previous_unit_cost?: number | null
          quantity_change?: number | null
          reason?: string | null
          sub_warehouse_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          created_by_name: string | null
          deleted_at: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_deleted: boolean | null
          is_posted: boolean | null
          is_reversed: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          reversal_entry_id: string | null
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
          workflow_status: string
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          description: string
          entry_date?: string
          entry_number: string
          fiscal_period_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_posted?: boolean | null
          is_reversed?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id: string
          reversal_entry_id?: string | null
          source?: string | null
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
          workflow_status?: string
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          fiscal_period_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_posted?: boolean | null
          is_reversed?: boolean | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          restaurant_id?: string
          reversal_entry_id?: string | null
          source?: string | null
          source_event?: string | null
          source_id?: string | null
          source_module?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_credit?: number
          total_debit?: number
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_entry_id_fkey"
            columns: ["reversal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
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
      journal_entries_backup: {
        Row: {
          backup_timestamp: string | null
          entry_date: string | null
          entry_number: string | null
          id: string
          is_posted: boolean | null
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          backup_timestamp?: string | null
          entry_date?: string | null
          entry_number?: string | null
          id: string
          is_posted?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          backup_timestamp?: string | null
          entry_date?: string | null
          entry_number?: string | null
          id?: string
          is_posted?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: []
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
          {
            foreignKeyName: "license_keys_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          expiry_days: number | null
          id: string
          is_active: boolean | null
          min_points_for_redemption: number | null
          points_per_currency: number | null
          restaurant_id: string | null
          reward_value: number | null
        }
        Insert: {
          expiry_days?: number | null
          id: string
          is_active?: boolean | null
          min_points_for_redemption?: number | null
          points_per_currency?: number | null
          restaurant_id?: string | null
          reward_value?: number | null
        }
        Update: {
          expiry_days?: number | null
          id?: string
          is_active?: boolean | null
          min_points_for_redemption?: number | null
          points_per_currency?: number | null
          restaurant_id?: string | null
          reward_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            referencedRelation: "public_products"
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
          {
            foreignKeyName: "manufacturing_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ad_campaigns: {
        Row: {
          campaign_id: string
          campaign_name: string
          campaign_objective: string | null
          campaign_status: string | null
          created_at: string | null
          created_by: string | null
          daily_budget: number | null
          end_date: string | null
          facebook_page_id: string | null
          id: string
          lifetime_budget: number | null
          metadata: Json | null
          platform: string
          project_id: string | null
          restaurant_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          campaign_name: string
          campaign_objective?: string | null
          campaign_status?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_budget?: number | null
          end_date?: string | null
          facebook_page_id?: string | null
          id?: string
          lifetime_budget?: number | null
          metadata?: Json | null
          platform?: string
          project_id?: string | null
          restaurant_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          campaign_name?: string
          campaign_objective?: string | null
          campaign_status?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_budget?: number | null
          end_date?: string | null
          facebook_page_id?: string | null
          id?: string
          lifetime_budget?: number | null
          metadata?: Json | null
          platform?: string
          project_id?: string | null
          restaurant_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ad_campaigns_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "marketing_facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ad_performance: {
        Row: {
          campaign_id: string | null
          click_through_rate: number | null
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          cost_per_click: number | null
          cost_per_conversion: number | null
          cost_per_thousand_impressions: number | null
          created_at: string | null
          created_by: string | null
          engagement_rate: number | null
          engagements: number | null
          facebook_page_id: string | null
          id: string
          impressions: number | null
          metric_date: string
          raw_data: Json | null
          reach: number | null
          restaurant_id: string
          return_on_ad_spend: number | null
          revenue: number | null
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          click_through_rate?: number | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost_per_click?: number | null
          cost_per_conversion?: number | null
          cost_per_thousand_impressions?: number | null
          created_at?: string | null
          created_by?: string | null
          engagement_rate?: number | null
          engagements?: number | null
          facebook_page_id?: string | null
          id?: string
          impressions?: number | null
          metric_date: string
          raw_data?: Json | null
          reach?: number | null
          restaurant_id: string
          return_on_ad_spend?: number | null
          revenue?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          click_through_rate?: number | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost_per_click?: number | null
          cost_per_conversion?: number | null
          cost_per_thousand_impressions?: number | null
          created_at?: string | null
          created_by?: string | null
          engagement_rate?: number | null
          engagements?: number | null
          facebook_page_id?: string | null
          id?: string
          impressions?: number | null
          metric_date?: string
          raw_data?: Json | null
          reach?: number | null
          restaurant_id?: string
          return_on_ad_spend?: number | null
          revenue?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ad_performance_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_performance_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "marketing_facebook_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_performance_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_performance_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_performance_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_performance_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_ad_spend_expenses: {
        Row: {
          base_currency_amount: number | null
          billed_amount: number | null
          campaign_id: string | null
          campaign_name: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          exchange_rate: number | null
          id: string
          invoice_id: string | null
          is_billable_to_client: boolean | null
          metadata: Json | null
          notes: string | null
          platform: string
          platform_account_id: string | null
          project_id: string | null
          receipt_url: string | null
          restaurant_id: string
          screenshot_url: string | null
          spend_amount: number
          spend_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          base_currency_amount?: number | null
          billed_amount?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency: string
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_billable_to_client?: boolean | null
          metadata?: Json | null
          notes?: string | null
          platform: string
          platform_account_id?: string | null
          project_id?: string | null
          receipt_url?: string | null
          restaurant_id: string
          screenshot_url?: string | null
          spend_amount: number
          spend_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          base_currency_amount?: number | null
          billed_amount?: number | null
          campaign_id?: string | null
          campaign_name?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_billable_to_client?: boolean | null
          metadata?: Json | null
          notes?: string | null
          platform?: string
          platform_account_id?: string | null
          project_id?: string | null
          receipt_url?: string | null
          restaurant_id?: string
          screenshot_url?: string | null
          spend_amount?: number
          spend_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_ad_spend_expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_ad_spend_expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_agency_employees: {
        Row: {
          allowed_project_ids: string[] | null
          can_access_all_projects: boolean | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          department: string | null
          email: string
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          phone: string | null
          restaurant_id: string
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allowed_project_ids?: string[] | null
          can_access_all_projects?: boolean | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          department?: string | null
          email: string
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          phone?: string | null
          restaurant_id: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_project_ids?: string[] | null
          can_access_all_projects?: boolean | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          department?: string | null
          email?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          phone?: string | null
          restaurant_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_agency_employees_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_agency_employees_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_agency_employees_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_agency_employees_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_billing_schedule: {
        Row: {
          completed_date: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          invoice_id: string | null
          is_completed: boolean | null
          milestone_description: string | null
          milestone_name: string
          restaurant_id: string
          scheduled_amount: number
          scheduled_date: string
          status: string | null
          updated_at: string | null
          updated_by: string | null
          workflow_instance_id: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          is_completed?: boolean | null
          milestone_description?: string | null
          milestone_name: string
          restaurant_id: string
          scheduled_amount?: number
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_instance_id: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_id?: string | null
          is_completed?: boolean | null
          milestone_description?: string | null
          milestone_name?: string
          restaurant_id?: string
          scheduled_amount?: number
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_billing_schedule_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_billing_schedule_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_billing_schedule_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_billing_schedule_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_billing_schedule_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_billing_schedule_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number
          channel: string
          contract_id: string | null
          created_at: string
          customer_id: string | null
          end_date: string | null
          external_campaign_id: string | null
          id: string
          kpis: Json
          name: string
          notes: string | null
          objective: string | null
          restaurant_id: string
          spent: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          channel?: string
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          external_campaign_id?: string | null
          id?: string
          kpis?: Json
          name: string
          notes?: string | null
          objective?: string | null
          restaurant_id: string
          spent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          channel?: string
          contract_id?: string | null
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          external_campaign_id?: string | null
          id?: string
          kpis?: Json
          name?: string
          notes?: string | null
          objective?: string | null
          restaurant_id?: string
          spent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_contract_services: {
        Row: {
          contract_id: string | null
          description: string | null
          id: string
          price: number | null
          service_id: string | null
          service_name: string | null
        }
        Insert: {
          contract_id?: string | null
          description?: string | null
          id?: string
          price?: number | null
          service_id?: string | null
          service_name?: string | null
        }
        Update: {
          contract_id?: string | null
          description?: string | null
          id?: string
          price?: number | null
          service_id?: string | null
          service_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contract_services_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contract_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketing_services"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_contracts: {
        Row: {
          account_manager_id: string | null
          auto_renew: boolean
          billing_cycle: string
          created_at: string
          currency: string
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          monthly_value: number
          notes: string | null
          restaurant_id: string
          setup_fee: number
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_manager_id?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          monthly_value?: number
          notes?: string | null
          restaurant_id: string
          setup_fee?: number
          start_date?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_manager_id?: string | null
          auto_renew?: boolean
          billing_cycle?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          monthly_value?: number
          notes?: string | null
          restaurant_id?: string
          setup_fee?: number
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_crm_leads: {
        Row: {
          client_id: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          expected_close_date: string | null
          id: string
          lead_code: string
          lead_source: string | null
          lead_status: string
          metadata: Json | null
          next_follow_up: string | null
          notes: string | null
          opportunity_value: number | null
          pipeline_stage: string
          probability: number | null
          restaurant_id: string
          sales_rep_id: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          lead_code: string
          lead_source?: string | null
          lead_status?: string
          metadata?: Json | null
          next_follow_up?: string | null
          notes?: string | null
          opportunity_value?: number | null
          pipeline_stage?: string
          probability?: number | null
          restaurant_id: string
          sales_rep_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_close_date?: string | null
          id?: string
          lead_code?: string
          lead_source?: string | null
          lead_status?: string
          metadata?: Json | null
          next_follow_up?: string | null
          notes?: string | null
          opportunity_value?: number | null
          pipeline_stage?: string
          probability?: number | null
          restaurant_id?: string
          sales_rep_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_crm_leads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_crm_leads_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_employee_project_access: {
        Row: {
          access_level: string | null
          can_approve_time: boolean | null
          can_edit_tasks: boolean | null
          can_log_time: boolean | null
          can_view_financials: boolean | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          project_id: string
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          can_approve_time?: boolean | null
          can_edit_tasks?: boolean | null
          can_log_time?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          project_id: string
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          can_approve_time?: boolean | null
          can_edit_tasks?: boolean | null
          can_log_time?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          project_id?: string
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_employee_project_access_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "marketing_agency_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_employee_project_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_employee_project_access_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_employee_project_access_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_employee_project_access_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_employee_project_access_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_exchange_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_date: string
          exchange_rate: number
          from_currency: string
          id: string
          metadata: Json | null
          rate_source: string | null
          restaurant_id: string
          to_currency: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          exchange_rate: number
          from_currency: string
          id?: string
          metadata?: Json | null
          rate_source?: string | null
          restaurant_id: string
          to_currency: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          exchange_rate?: number
          from_currency?: string
          id?: string
          metadata?: Json | null
          rate_source?: string | null
          restaurant_id?: string
          to_currency?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_exchange_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_exchange_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_exchange_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_exchange_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_facebook_accounts: {
        Row: {
          access_token_encrypted: string | null
          account_name: string | null
          business_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_connected: boolean | null
          metadata: Json | null
          permissions: string[] | null
          refresh_token_encrypted: string | null
          restaurant_id: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          account_name?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          metadata?: Json | null
          permissions?: string[] | null
          refresh_token_encrypted?: string | null
          restaurant_id: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          account_name?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          metadata?: Json | null
          permissions?: string[] | null
          refresh_token_encrypted?: string | null
          restaurant_id?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_facebook_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_facebook_pages: {
        Row: {
          ad_account_id: string | null
          ad_account_name: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          facebook_account_id: string | null
          id: string
          is_active: boolean | null
          is_managed: boolean | null
          metadata: Json | null
          page_category: string | null
          page_id: string
          page_name: string
          page_url: string | null
          project_id: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          ad_account_id?: string | null
          ad_account_name?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          facebook_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_managed?: boolean | null
          metadata?: Json | null
          page_category?: string | null
          page_id: string
          page_name: string
          page_url?: string | null
          project_id?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          ad_account_id?: string | null
          ad_account_name?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          facebook_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_managed?: boolean | null
          metadata?: Json | null
          page_category?: string | null
          page_id?: string
          page_name?: string
          page_url?: string | null
          project_id?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_facebook_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_facebook_account_id_fkey"
            columns: ["facebook_account_id"]
            isOneToOne: false
            referencedRelation: "marketing_facebook_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_facebook_pages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_freelancer_payments: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          expense_account_id: string | null
          freelancer_id: string
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          journal_entry_id: string | null
          metadata: Json | null
          notes: string | null
          payment_amount: number
          payment_date: string
          payment_method: string | null
          project_allocation: Json | null
          project_id: string | null
          restaurant_id: string
          status: string
          task_description: string | null
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expense_account_id?: string | null
          freelancer_id: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          journal_entry_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_amount: number
          payment_date: string
          payment_method?: string | null
          project_allocation?: Json | null
          project_id?: string | null
          restaurant_id: string
          status?: string
          task_description?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expense_account_id?: string | null
          freelancer_id?: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          journal_entry_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_amount?: number
          payment_date?: string
          payment_method?: string | null
          project_allocation?: Json | null
          project_id?: string | null
          restaurant_id?: string
          status?: string
          task_description?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_freelancer_payments_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_freelancer_id_fkey"
            columns: ["freelancer_id"]
            isOneToOne: false
            referencedRelation: "marketing_freelancers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancer_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_freelancers: {
        Row: {
          address: string | null
          bank_account_details: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          notes: string | null
          payment_method: string | null
          phone: string | null
          restaurant_id: string
          specialization: string | null
          tax_id: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          bank_account_details?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          restaurant_id: string
          specialization?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          bank_account_details?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          payment_method?: string | null
          phone?: string | null
          restaurant_id?: string
          specialization?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_freelancers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_freelancers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_hourly_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          department_id: string | null
          effective_from: string
          effective_to: string | null
          hourly_rate: number
          id: string
          is_active: boolean | null
          restaurant_id: string
          role: string | null
          staff_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          effective_from?: string
          effective_to?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          restaurant_id: string
          role?: string | null
          staff_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          effective_from?: string
          effective_to?: string | null
          hourly_rate?: number
          id?: string
          is_active?: boolean | null
          restaurant_id?: string
          role?: string | null
          staff_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_hourly_rates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "staff_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_hourly_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_hourly_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_hourly_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_hourly_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_hourly_rates_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_pipeline_stages: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          probability_percentage: number | null
          restaurant_id: string
          stage_name: string
          stage_name_ar: string | null
          stage_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          probability_percentage?: number | null
          restaurant_id: string
          stage_name: string
          stage_name_ar?: string | null
          stage_order: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          probability_percentage?: number | null
          restaurant_id?: string
          stage_name?: string
          stage_name_ar?: string | null
          stage_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_pipeline_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_pipeline_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_pipeline_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_pipeline_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_profitability: {
        Row: {
          budget_utilization_percentage: number | null
          calculated_at: string | null
          completion_percentage: number | null
          cost_per_hour: number | null
          gross_profit: number | null
          id: string
          profit_margin_percentage: number | null
          restaurant_id: string
          revenue_per_hour: number | null
          total_budget: number | null
          total_cost: number | null
          total_hours_logged: number | null
          total_revenue: number | null
          workflow_instance_id: string
        }
        Insert: {
          budget_utilization_percentage?: number | null
          calculated_at?: string | null
          completion_percentage?: number | null
          cost_per_hour?: number | null
          gross_profit?: number | null
          id?: string
          profit_margin_percentage?: number | null
          restaurant_id: string
          revenue_per_hour?: number | null
          total_budget?: number | null
          total_cost?: number | null
          total_hours_logged?: number | null
          total_revenue?: number | null
          workflow_instance_id: string
        }
        Update: {
          budget_utilization_percentage?: number | null
          calculated_at?: string | null
          completion_percentage?: number | null
          cost_per_hour?: number | null
          gross_profit?: number | null
          id?: string
          profit_margin_percentage?: number | null
          restaurant_id?: string
          revenue_per_hour?: number | null
          total_budget?: number | null
          total_cost?: number | null
          total_hours_logged?: number | null
          total_revenue?: number | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_profitability_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_profitability_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_profitability_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_profitability_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_profitability_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: true
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_project_costs: {
        Row: {
          amount: number
          billed: boolean | null
          billed_amount: number | null
          billed_date: string | null
          cost_type: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          invoice_date: string | null
          invoice_id: string | null
          is_billable: boolean | null
          quantity: number | null
          restaurant_id: string
          staff_id: string | null
          task_id: string | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
          workflow_instance_id: string
        }
        Insert: {
          amount?: number
          billed?: boolean | null
          billed_amount?: number | null
          billed_date?: string | null
          cost_type: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          invoice_date?: string | null
          invoice_id?: string | null
          is_billable?: boolean | null
          quantity?: number | null
          restaurant_id: string
          staff_id?: string | null
          task_id?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_instance_id: string
        }
        Update: {
          amount?: number
          billed?: boolean | null
          billed_amount?: number | null
          billed_date?: string | null
          cost_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          invoice_date?: string | null
          invoice_id?: string | null
          is_billable?: boolean | null
          quantity?: number | null
          restaurant_id?: string
          staff_id?: string | null
          task_id?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_project_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_costs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_costs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_costs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_costs_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_project_revenue: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          is_paid: boolean | null
          milestone_date: string | null
          milestone_id: string | null
          milestone_name: string | null
          milestone_status: string | null
          paid_amount: number | null
          paid_date: string | null
          restaurant_id: string
          revenue_type: string
          sales_invoice_id: string | null
          sales_order_id: string | null
          updated_at: string | null
          updated_by: string | null
          workflow_instance_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          milestone_date?: string | null
          milestone_id?: string | null
          milestone_name?: string | null
          milestone_status?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          restaurant_id: string
          revenue_type: string
          sales_invoice_id?: string | null
          sales_order_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_instance_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          milestone_date?: string | null
          milestone_id?: string | null
          milestone_name?: string | null
          milestone_status?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          restaurant_id?: string
          revenue_type?: string
          sales_invoice_id?: string | null
          sales_order_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_project_revenue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_revenue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_revenue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_revenue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_revenue_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_revenue_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_revenue_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_project_tasks: {
        Row: {
          actual_end_date: string | null
          actual_hours: number | null
          actual_start_date: string | null
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          depends_on_task_ids: string[] | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          metadata: Json | null
          name: string
          name_ar: string | null
          parent_task_id: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          priority: string | null
          progress_percentage: number | null
          project_id: string
          restaurant_id: string
          status: string
          tags: string[] | null
          task_code: string
          task_type: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_hours?: number | null
          actual_start_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          depends_on_task_ids?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          metadata?: Json | null
          name: string
          name_ar?: string | null
          parent_task_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_id: string
          restaurant_id: string
          status?: string
          tags?: string[] | null
          task_code: string
          task_type?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_hours?: number | null
          actual_start_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          depends_on_task_ids?: string[] | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          name_ar?: string | null
          parent_task_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_id?: string
          restaurant_id?: string
          status?: string
          tags?: string[] | null
          task_code?: string
          task_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "marketing_project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_project_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_projects: {
        Row: {
          actual_cost: number | null
          actual_end_date: string | null
          actual_revenue: number | null
          actual_start_date: string | null
          budget_amount: number | null
          budget_currency: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          name: string
          name_ar: string | null
          priority: string | null
          profit_margin: number | null
          project_code: string
          project_manager_id: string | null
          project_type: string
          restaurant_id: string
          start_date: string | null
          status: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_revenue?: number | null
          actual_start_date?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name: string
          name_ar?: string | null
          priority?: string | null
          profit_margin?: number | null
          project_code: string
          project_manager_id?: string | null
          project_type?: string
          restaurant_id: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_end_date?: string | null
          actual_revenue?: number | null
          actual_start_date?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          name_ar?: string | null
          priority?: string | null
          profit_margin?: number | null
          project_code?: string
          project_manager_id?: string | null
          project_type?: string
          restaurant_id?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_quote_items: {
        Row: {
          description: string | null
          id: string
          quantity: number | null
          quote_id: string | null
          service_id: string | null
          service_name: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          quantity?: number | null
          quote_id?: string | null
          service_id?: string | null
          service_name?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          quantity?: number | null
          quote_id?: string | null
          service_id?: string | null
          service_name?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "marketing_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_quote_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketing_services"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          id: string
          notes: string | null
          quote_number: string | null
          restaurant_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          quote_number?: string | null
          restaurant_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          quote_number?: string | null
          restaurant_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_quotes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_quotes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_quotes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_quotes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_retainer_contracts: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string
          client_id: string
          contract_code: string
          contract_name: string
          contract_type: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          end_date: string | null
          id: string
          invoicing_day: number | null
          metadata: Json | null
          notes: string | null
          notice_period_days: number | null
          payment_terms: string | null
          project_id: string | null
          restaurant_id: string
          retainer_amount: number
          revenue_recognition_method: string | null
          start_date: string
          status: string
          terms_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string
          client_id: string
          contract_code: string
          contract_name: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          invoicing_day?: number | null
          metadata?: Json | null
          notes?: string | null
          notice_period_days?: number | null
          payment_terms?: string | null
          project_id?: string | null
          restaurant_id: string
          retainer_amount: number
          revenue_recognition_method?: string | null
          start_date: string
          status?: string
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string
          client_id?: string
          contract_code?: string
          contract_name?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          invoicing_day?: number | null
          metadata?: Json | null
          notes?: string | null
          notice_period_days?: number | null
          payment_terms?: string | null
          project_id?: string | null
          restaurant_id?: string
          retainer_amount?: number
          revenue_recognition_method?: string | null
          start_date?: string
          status?: string
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_retainer_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_retainer_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          invoice_amount: number
          invoice_id: string | null
          invoice_number: string
          metadata: Json | null
          notes: string | null
          period_end: string
          period_start: string
          recognition_date: string | null
          recognized_amount: number | null
          restaurant_id: string
          retainer_contract_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_amount: number
          invoice_id?: string | null
          invoice_number: string
          metadata?: Json | null
          notes?: string | null
          period_end: string
          period_start: string
          recognition_date?: string | null
          recognized_amount?: number | null
          restaurant_id: string
          retainer_contract_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          invoice_amount?: number
          invoice_id?: string | null
          invoice_number?: string
          metadata?: Json | null
          notes?: string | null
          period_end?: string
          period_start?: string
          recognition_date?: string | null
          recognized_amount?: number | null
          restaurant_id?: string
          retainer_contract_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_retainer_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_retainer_invoices_retainer_contract_id_fkey"
            columns: ["retainer_contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_retainer_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_revenue_recognition: {
        Row: {
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          metadata: Json | null
          recognition_end_date: string
          recognition_method: string | null
          recognition_period: string | null
          recognition_start_date: string
          restaurant_id: string
          retainer_invoice_id: string | null
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          recognition_end_date: string
          recognition_method?: string | null
          recognition_period?: string | null
          recognition_start_date: string
          restaurant_id: string
          retainer_invoice_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          recognition_end_date?: string
          recognition_method?: string | null
          recognition_period?: string | null
          recognition_start_date?: string
          restaurant_id?: string
          retainer_invoice_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_revenue_recognition_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_retainer_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_retainer_invoice_id_fkey"
            columns: ["retainer_invoice_id"]
            isOneToOne: false
            referencedRelation: "marketing_retainer_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_revenue_recognition_entries: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          deferred_revenue_account_id: string | null
          id: string
          is_recognized: boolean | null
          journal_entry_id: string | null
          metadata: Json | null
          notes: string | null
          recognition_date: string
          recognition_id: string
          recognized_at: string | null
          restaurant_id: string
          revenue_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deferred_revenue_account_id?: string | null
          id?: string
          is_recognized?: boolean | null
          journal_entry_id?: string | null
          metadata?: Json | null
          notes?: string | null
          recognition_date: string
          recognition_id: string
          recognized_at?: string | null
          restaurant_id: string
          revenue_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deferred_revenue_account_id?: string | null
          id?: string
          is_recognized?: boolean | null
          journal_entry_id?: string | null
          metadata?: Json | null
          notes?: string | null
          recognition_date?: string
          recognition_id?: string
          recognized_at?: string | null
          restaurant_id?: string
          revenue_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_revenue_recognition__deferred_revenue_account_id_fkey"
            columns: ["deferred_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_recognition_id_fkey"
            columns: ["recognition_id"]
            isOneToOne: false
            referencedRelation: "marketing_revenue_recognition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_revenue_recognition_entries_revenue_account_id_fkey"
            columns: ["revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_service_deliverables: {
        Row: {
          actual_delivery_date: string | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          expected_delivery_date: string
          id: string
          invoice_id: string | null
          invoice_line_id: string | null
          notes: string | null
          priority: string | null
          quote_id: string | null
          restaurant_id: string | null
          service_id: string | null
          service_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          expected_delivery_date: string
          id?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          notes?: string | null
          priority?: string | null
          quote_id?: string | null
          restaurant_id?: string | null
          service_id?: string | null
          service_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          expected_delivery_date?: string
          id?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          notes?: string | null
          priority?: string | null
          quote_id?: string | null
          restaurant_id?: string | null
          service_id?: string | null
          service_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_service_deliverables_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_invoice_line_id_fkey"
            columns: ["invoice_line_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "marketing_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_service_deliverables_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "marketing_services"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_services: {
        Row: {
          base_price: number | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_services_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_tasks: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          campaign_id: string | null
          contract_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          labels: string[] | null
          position: number
          priority: string
          restaurant_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          campaign_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          position?: number
          priority?: string
          restaurant_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          campaign_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          position?: number
          priority?: string
          restaurant_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_timesheet_entries: {
        Row: {
          activity_type: string | null
          approved_at: string | null
          approved_by: string | null
          billable_amount: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string | null
          hourly_rate: number | null
          hours_worked: number
          id: string
          is_approved: boolean | null
          is_billable: boolean | null
          metadata: Json | null
          project_id: string | null
          rejection_reason: string | null
          restaurant_id: string
          staff_id: string
          start_time: string | null
          task_id: string | null
          updated_at: string | null
          work_date: string
        }
        Insert: {
          activity_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billable_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          hourly_rate?: number | null
          hours_worked: number
          id?: string
          is_approved?: boolean | null
          is_billable?: boolean | null
          metadata?: Json | null
          project_id?: string | null
          rejection_reason?: string | null
          restaurant_id: string
          staff_id: string
          start_time?: string | null
          task_id?: string | null
          updated_at?: string | null
          work_date: string
        }
        Update: {
          activity_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billable_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          hourly_rate?: number | null
          hours_worked?: number
          id?: string
          is_approved?: boolean | null
          is_billable?: boolean | null
          metadata?: Json | null
          project_id?: string | null
          rejection_reason?: string | null
          restaurant_id?: string
          staff_id?: string
          start_time?: string | null
          task_id?: string | null
          updated_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_timesheet_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_timesheet_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_timesheet_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_timesheet_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_timesheet_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_timesheet_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_timesheet_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_assets: {
        Row: {
          asset_type: string
          client_approved: boolean | null
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_final: boolean | null
          tags: string[] | null
          task_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
          workflow_instance_id: string
        }
        Insert: {
          asset_type: string
          client_approved?: boolean | null
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_final?: boolean | null
          tags?: string[] | null
          task_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          workflow_instance_id: string
        }
        Update: {
          asset_type?: string
          client_approved?: boolean | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_final?: boolean | null
          tags?: string[] | null
          task_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_assets_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_assets_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_comments: {
        Row: {
          asset_id: string | null
          author_id: string
          comment_text: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          mentioned_staff: string[] | null
          task_id: string | null
          updated_at: string | null
          workflow_instance_id: string
        }
        Insert: {
          asset_id?: string | null
          author_id: string
          comment_text: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          mentioned_staff?: string[] | null
          task_id?: string | null
          updated_at?: string | null
          workflow_instance_id: string
        }
        Update: {
          asset_id?: string | null
          author_id?: string
          comment_text?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          mentioned_staff?: string[] | null
          task_id?: string | null
          updated_at?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_comments_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_instances: {
        Row: {
          actual_end_date: string | null
          contract_id: string | null
          created_at: string | null
          current_stage_id: string | null
          expected_end_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          priority: string | null
          progress_percentage: number | null
          quote_id: string | null
          restaurant_id: string
          start_date: string | null
          status: string | null
          total_budget: number | null
          total_spent: number | null
          updated_at: string | null
          workflow_name: string | null
        }
        Insert: {
          actual_end_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          current_stage_id?: string | null
          expected_end_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          priority?: string | null
          progress_percentage?: number | null
          quote_id?: string | null
          restaurant_id: string
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          total_spent?: number | null
          updated_at?: string | null
          workflow_name?: string | null
        }
        Update: {
          actual_end_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          current_stage_id?: string | null
          expected_end_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          priority?: string | null
          progress_percentage?: number | null
          quote_id?: string | null
          restaurant_id?: string
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          total_spent?: number | null
          updated_at?: string | null
          workflow_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_instances_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "marketing_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "marketing_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_instances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_revisions: {
        Row: {
          attachments: string[] | null
          completed_at: string | null
          created_at: string | null
          description: string
          id: string
          impact_assessment: string | null
          requested_at: string | null
          requested_by: string | null
          revision_number: number
          status: string | null
          task_id: string | null
          workflow_instance_id: string
        }
        Insert: {
          attachments?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          impact_assessment?: string | null
          requested_at?: string | null
          requested_by?: string | null
          revision_number?: number
          status?: string | null
          task_id?: string | null
          workflow_instance_id: string
        }
        Update: {
          attachments?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          impact_assessment?: string | null
          requested_at?: string | null
          requested_by?: string | null
          revision_number?: number
          status?: string | null
          task_id?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_revisions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_revisions_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_stage_history: {
        Row: {
          duration_hours: number | null
          from_stage_id: string | null
          id: string
          notes: string | null
          status: string | null
          to_stage_id: string
          transitioned_at: string | null
          transitioned_by: string | null
          workflow_instance_id: string
        }
        Insert: {
          duration_hours?: number | null
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          to_stage_id: string
          transitioned_at?: string | null
          transitioned_by?: string | null
          workflow_instance_id: string
        }
        Update: {
          duration_hours?: number | null
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          to_stage_id?: string
          transitioned_at?: string | null
          transitioned_by?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_stage_history_transitioned_by_fkey"
            columns: ["transitioned_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_stage_history_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_stages: {
        Row: {
          auto_transition: boolean | null
          created_at: string | null
          default_duration_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number
          requires_approval: boolean | null
          restaurant_id: string
          stage_key: string
          stage_name_ar: string
          stage_name_en: string
          updated_at: string | null
        }
        Insert: {
          auto_transition?: boolean | null
          created_at?: string | null
          default_duration_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number
          requires_approval?: boolean | null
          restaurant_id: string
          stage_key: string
          stage_name_ar: string
          stage_name_en: string
          updated_at?: string | null
        }
        Update: {
          auto_transition?: boolean | null
          created_at?: string | null
          default_duration_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number
          requires_approval?: boolean | null
          restaurant_id?: string
          stage_key?: string
          stage_name_ar?: string
          stage_name_en?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_stages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          attachments: string[] | null
          completed_at: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          parent_task_id: string | null
          priority: string | null
          stage_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          workflow_instance_id: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          workflow_instance_id: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          attachments?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "staff_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_tasks_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_workflow_time_logs: {
        Row: {
          activity_type: string | null
          billable: boolean | null
          created_at: string | null
          description: string | null
          duration_hours: number | null
          ended_at: string | null
          hourly_rate: number | null
          id: string
          staff_id: string
          started_at: string
          task_id: string | null
          workflow_instance_id: string
        }
        Insert: {
          activity_type?: string | null
          billable?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          staff_id: string
          started_at: string
          task_id?: string | null
          workflow_instance_id: string
        }
        Update: {
          activity_type?: string | null
          billable?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          staff_id?: string
          started_at?: string
          task_id?: string | null
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_workflow_time_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_workflow_time_logs_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "marketing_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plans: {
        Row: {
          actual_spend: number
          campaign_type: string
          channels: Json
          client_name: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string | null
          end_date: string | null
          id: string
          kpis: Json
          notes: string | null
          plan_name: string
          restaurant_id: string
          results: Json
          revenue_generated: number
          start_date: string | null
          status: string
          total_budget: number
          updated_at: string
          updated_by_name: string | null
        }
        Insert: {
          actual_spend?: number
          campaign_type?: string
          channels?: Json
          client_name: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          end_date?: string | null
          id?: string
          kpis?: Json
          notes?: string | null
          plan_name: string
          restaurant_id: string
          results?: Json
          revenue_generated?: number
          start_date?: string | null
          status?: string
          total_budget?: number
          updated_at?: string
          updated_by_name?: string | null
        }
        Update: {
          actual_spend?: number
          campaign_type?: string
          channels?: Json
          client_name?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          end_date?: string | null
          id?: string
          kpis?: Json
          notes?: string | null
          plan_name?: string
          restaurant_id?: string
          results?: Json
          revenue_generated?: number
          start_date?: string | null
          status?: string
          total_budget?: number
          updated_at?: string
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v_ar_aging_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "menu_item_components_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
            referencedRelation: "public_products"
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
          icon_url: string | null
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
          icon_url?: string | null
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
          icon_url?: string | null
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
            referencedRelation: "public_products"
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
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "menu_items_costing_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
          {
            foreignKeyName: "menu_items_costing_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      oauth_connection_logs: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          restaurant_id: string
          social_account_id: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          restaurant_id: string
          social_account_id?: string | null
          status: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          restaurant_id?: string
          social_account_id?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connection_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_connection_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_connection_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_connection_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_connection_logs_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_audit_log: {
        Row: {
          amount: number | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation_type: string
          restaurant_id: string | null
          status: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation_type: string
          restaurant_id?: string | null
          status?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation_type?: string
          restaurant_id?: string | null
          status?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_name: string
          created_at: string
          id: string
          menu_item_id: string | null
          notes: string | null
          order_item_id: string
          price: number
          quantity: number
        }
        Insert: {
          addon_name: string
          created_at?: string
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_item_id: string
          price?: number
          quantity?: number
        }
        Update: {
          addon_name?: string
          created_at?: string
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_item_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "v_cost_of_goods_sold"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          company_id: string | null
          cost_price_snapshot: number | null
          delivered_at: string | null
          id: string
          is_delivered: boolean
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
          variables: Json
        }
        Insert: {
          company_id?: string | null
          cost_price_snapshot?: number | null
          delivered_at?: string | null
          id?: string
          is_delivered?: boolean
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
          variables?: Json
        }
        Update: {
          company_id?: string | null
          cost_price_snapshot?: number | null
          delivered_at?: string | null
          id?: string
          is_delivered?: boolean
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
          variables?: Json
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
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
            referencedRelation: "public_products"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
          actual_delivery_date: string | null
          client_order_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          customer_ref: string | null
          delivery_address: string
          delivery_agent_id: string | null
          delivery_date: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_receipt_note: string | null
          delivery_received_by: string | null
          delivery_status: string | null
          direct_paid_amount: number
          discount: number
          id: string
          journal_entry_id: string | null
          notes: string
          order_number: string
          order_type: string
          paid_amount: number
          payment_method: string
          receipt_voucher_ids: string[] | null
          restaurant_id: string
          sales_order_id: string | null
          status: string
          synced: boolean
          table_number: number | null
          total: number
          total_cost: number | null
          tracking_token: string | null
          updated_by: string | null
          updated_by_name: string | null
          workspace_id: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_ref?: string | null
          delivery_address?: string
          delivery_agent_id?: string | null
          delivery_date?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_receipt_note?: string | null
          delivery_received_by?: string | null
          delivery_status?: string | null
          direct_paid_amount?: number
          discount?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string
          order_number: string
          order_type?: string
          paid_amount?: number
          payment_method?: string
          receipt_voucher_ids?: string[] | null
          restaurant_id: string
          sales_order_id?: string | null
          status?: string
          synced?: boolean
          table_number?: number | null
          total?: number
          total_cost?: number | null
          tracking_token?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          client_order_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_ref?: string | null
          delivery_address?: string
          delivery_agent_id?: string | null
          delivery_date?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_receipt_note?: string | null
          delivery_received_by?: string | null
          delivery_status?: string | null
          direct_paid_amount?: number
          discount?: number
          id?: string
          journal_entry_id?: string | null
          notes?: string
          order_number?: string
          order_type?: string
          paid_amount?: number
          payment_method?: string
          receipt_voucher_ids?: string[] | null
          restaurant_id?: string
          sales_order_id?: string | null
          status?: string
          synced?: boolean
          table_number?: number | null
          total?: number
          total_cost?: number | null
          tracking_token?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
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
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
          {
            foreignKeyName: "payment_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "payment_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_vouchers: {
        Row: {
          account_id: string | null
          actor_id: string
          actor_type: string
          amount: number
          contractor_id: string | null
          counter_account_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_method: string
          reference_number: string | null
          restaurant_id: string
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          account_id?: string | null
          actor_id: string
          actor_type?: string
          amount: number
          contractor_id?: string | null
          counter_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string
          reference_number?: string | null
          restaurant_id: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
          voucher_date?: string
          voucher_number: string
        }
        Update: {
          account_id?: string | null
          actor_id?: string
          actor_type?: string
          amount?: number
          contractor_id?: string | null
          counter_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string
          reference_number?: string | null
          restaurant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_vouchers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "payment_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_transactions: {
        Row: {
          allowances: number | null
          created_at: string | null
          deductions: number | null
          department_id: string | null
          expense_account_id: string | null
          id: string
          journal_entry_id: string | null
          month: number
          net_salary: number
          notes: string | null
          payment_account_id: string | null
          payment_date: string | null
          restaurant_id: string
          staff_id: string | null
          status: string | null
          year: number
        }
        Insert: {
          allowances?: number | null
          created_at?: string | null
          deductions?: number | null
          department_id?: string | null
          expense_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          month: number
          net_salary: number
          notes?: string | null
          payment_account_id?: string | null
          payment_date?: string | null
          restaurant_id: string
          staff_id?: string | null
          status?: string | null
          year: number
        }
        Update: {
          allowances?: number | null
          created_at?: string | null
          deductions?: number | null
          department_id?: string | null
          expense_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          month?: number
          net_salary?: number
          notes?: string | null
          payment_account_id?: string | null
          payment_date?: string | null
          restaurant_id?: string
          staff_id?: string | null
          status?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "staff_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_transactions_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "payroll_transactions_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
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
            foreignKeyName: "payroll_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "posting_queue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      print_settings: {
        Row: {
          created_at: string | null
          id: string
          restaurant_id: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_id: string
          settings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_id?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "v_restaurant_plan_health"
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
          icon_url: string | null
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
          warehouse_id: string | null
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
          icon_url?: string | null
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
          warehouse_id?: string | null
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
          icon_url?: string | null
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
          warehouse_id?: string | null
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
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      project_blocks: {
        Row: {
          created_at: string | null
          estimated_cost: number | null
          id: string
          name: string
          project_id: string | null
          site_id: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          name: string
          project_id?: string | null
          site_id?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          name?: string
          project_id?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_blocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_blocks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "project_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sites: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          name: string
          project_id: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          project_id: string
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          project_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_name: string | null
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          restaurant_id: string | null
          start_date: string | null
          status: string | null
          total_budget: number | null
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          restaurant_id?: string | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          restaurant_id?: string | null
          start_date?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_items: {
        Row: {
          created_at: string
          description: string
          gl_account_id: string | null
          id: string
          invoice_id: string
          line_type: string
          product_id: string | null
          quantity: number
          tax_amount: number
          total: number
          unit_cost: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          gl_account_id?: string | null
          id?: string
          invoice_id: string
          line_type?: string
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total?: number
          unit_cost?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          gl_account_id?: string | null
          id?: string
          invoice_id?: string
          line_type?: string
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total?: number
          unit_cost?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          client_sales_amount: number | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          goods_received_at: string | null
          id: string
          inventory_receipt_id: string | null
          invoice_date: string
          invoice_number: string
          is_credit: boolean
          is_pass_through_to_client: boolean | null
          journal_entry_id: string | null
          net_amount: number
          notes: string | null
          paid_amount: number
          pass_through_markup_amount: number | null
          restaurant_id: string
          site_id: string | null
          status: string
          supplier_contract_id: string | null
          supplier_id: string | null
          supplier_name: string
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
          warehouse_id: string | null
        }
        Insert: {
          client_sales_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          goods_received_at?: string | null
          id?: string
          inventory_receipt_id?: string | null
          invoice_date: string
          invoice_number: string
          is_credit?: boolean
          is_pass_through_to_client?: boolean | null
          journal_entry_id?: string | null
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          pass_through_markup_amount?: number | null
          restaurant_id: string
          site_id?: string | null
          status?: string
          supplier_contract_id?: string | null
          supplier_id?: string | null
          supplier_name: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          warehouse_id?: string | null
        }
        Update: {
          client_sales_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          goods_received_at?: string | null
          id?: string
          inventory_receipt_id?: string | null
          invoice_date?: string
          invoice_number?: string
          is_credit?: boolean
          is_pass_through_to_client?: boolean | null
          journal_entry_id?: string | null
          net_amount?: number
          notes?: string | null
          paid_amount?: number
          pass_through_markup_amount?: number | null
          restaurant_id?: string
          site_id?: string | null
          status?: string
          supplier_contract_id?: string | null
          supplier_id?: string | null
          supplier_name?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
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
            foreignKeyName: "purchase_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "project_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_contract_id_fkey"
            columns: ["supplier_contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          created_by: string | null
          created_by_name: string | null
          expected_arrival: string | null
          id: string
          po_date: string | null
          po_number: string
          restaurant_id: string | null
          status: string | null
          supplier_name: string | null
          total_amount: number | null
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expected_arrival?: string | null
          id?: string
          po_date?: string | null
          po_number: string
          restaurant_id?: string | null
          status?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expected_arrival?: string | null
          id?: string
          po_date?: string | null
          po_number?: string
          restaurant_id?: string | null
          status?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_by?: string | null
          updated_by_name?: string | null
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
          {
            foreignKeyName: "purchase_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            referencedRelation: "public_products"
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
            foreignKeyName: "purchase_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      receipt_voucher_allocations: {
        Row: {
          allocated_amount: number
          created_at: string
          id: string
          order_id: string
          receipt_voucher_id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          created_at?: string
          id?: string
          order_id: string
          receipt_voucher_id: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          id?: string
          order_id?: string
          receipt_voucher_id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_voucher_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_payments"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_receipt_voucher_id_fkey"
            columns: ["receipt_voucher_id"]
            isOneToOne: false
            referencedRelation: "receipt_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_voucher_allocations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_vouchers: {
        Row: {
          account_id: string | null
          actor_id: string
          actor_type: string
          amount: number
          counter_account_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_method: string
          restaurant_id: string
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          account_id?: string | null
          actor_id: string
          actor_type?: string
          amount: number
          counter_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string
          restaurant_id: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
          voucher_date?: string
          voucher_number: string
        }
        Update: {
          account_id?: string | null
          actor_id?: string
          actor_type?: string
          amount?: number
          counter_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_method?: string
          restaurant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_vouchers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_cash_flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_gl_autopost_activity_30d"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "receipt_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "v_journal_workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "recipe_components_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
            referencedRelation: "public_products"
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
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "restaurant_business_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_custom_roles: {
        Row: {
          base_role: string | null
          created_at: string | null
          description: string | null
          id: string
          name_ar: string
          restaurant_id: string | null
        }
        Insert: {
          base_role?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name_ar: string
          restaurant_id?: string | null
        }
        Update: {
          base_role?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name_ar?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_custom_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_custom_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_custom_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_custom_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "restaurant_order_lines_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
          {
            foreignKeyName: "restaurant_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_staff: {
        Row: {
          base_salary: number | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          payment_cycle: string | null
          phone: string
          pin: string
          restaurant_id: string
          role: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          payment_cycle?: string | null
          phone?: string
          pin?: string
          restaurant_id: string
          role?: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          payment_cycle?: string | null
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
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          account_mappings: Json | null
          accounting_config: Json | null
          accounting_standard: string | null
          address: string | null
          allow_invoice_editing: boolean
          auto_print_receipt: boolean | null
          business_category: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          business_type_locked: boolean | null
          commercial_registration: string | null
          company_id: string | null
          created_at: string
          currency: string
          custom_business_type_id: string | null
          custom_tabs: string[] | null
          delivery_fee: number | null
          enable_customer_display: boolean | null
          enable_kitchen_print: boolean | null
          feature_flags: Json | null
          id: string
          inventory_method: string | null
          inventory_system: string | null
          landing_page_pixels: Json | null
          layout_config: Json | null
          license_key: string | null
          logo_url: string | null
          name: string
          owner_id: string
          payment_gateways: Json | null
          phone: string | null
          plan_id: string | null
          preferred_currency: string | null
          preferred_language: string | null
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
          account_mappings?: Json | null
          accounting_config?: Json | null
          accounting_standard?: string | null
          address?: string | null
          allow_invoice_editing?: boolean
          auto_print_receipt?: boolean | null
          business_category?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          business_type_locked?: boolean | null
          commercial_registration?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          custom_business_type_id?: string | null
          custom_tabs?: string[] | null
          delivery_fee?: number | null
          enable_customer_display?: boolean | null
          enable_kitchen_print?: boolean | null
          feature_flags?: Json | null
          id?: string
          inventory_method?: string | null
          inventory_system?: string | null
          landing_page_pixels?: Json | null
          layout_config?: Json | null
          license_key?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          payment_gateways?: Json | null
          phone?: string | null
          plan_id?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
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
          account_mappings?: Json | null
          accounting_config?: Json | null
          accounting_standard?: string | null
          address?: string | null
          allow_invoice_editing?: boolean
          auto_print_receipt?: boolean | null
          business_category?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          business_type_locked?: boolean | null
          commercial_registration?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          custom_business_type_id?: string | null
          custom_tabs?: string[] | null
          delivery_fee?: number | null
          enable_customer_display?: boolean | null
          enable_kitchen_print?: boolean | null
          feature_flags?: Json | null
          id?: string
          inventory_method?: string | null
          inventory_system?: string | null
          landing_page_pixels?: Json | null
          layout_config?: Json | null
          license_key?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          payment_gateways?: Json | null
          phone?: string | null
          plan_id?: string | null
          preferred_currency?: string | null
          preferred_language?: string | null
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
          {
            foreignKeyName: "restaurants_custom_business_type_id_fkey"
            columns: ["custom_business_type_id"]
            isOneToOne: false
            referencedRelation: "custom_business_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
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
            foreignKeyName: "retail_sales_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          restaurant_id: string | null
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          permission_code?: string | null
          restaurant_id?: string | null
          role: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          permission_code?: string | null
          restaurant_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_lines: {
        Row: {
          actual_delivery_date: string | null
          created_at: string
          delivery_notes: string | null
          delivery_priority: string | null
          delivery_status: string | null
          description: string | null
          discount_amount: number
          expected_delivery_date: string | null
          id: string
          invoice_id: string
          line_total: number
          product_id: string | null
          quantity: number
          tax_amount: number
          total_cost: number
          unit_cost: number
          unit_price: number
          variables: Json | null
          warehouse_id: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string
          delivery_notes?: string | null
          delivery_priority?: string | null
          delivery_status?: string | null
          description?: string | null
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          invoice_id: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total_cost?: number
          unit_cost?: number
          unit_price?: number
          variables?: Json | null
          warehouse_id?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string
          delivery_notes?: string | null
          delivery_priority?: string | null
          delivery_status?: string | null
          description?: string | null
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_amount?: number
          total_cost?: number
          unit_cost?: number
          unit_price?: number
          variables?: Json | null
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
          block_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string | null
          discount_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          is_progress_invoice: boolean | null
          journal_entry_id: string | null
          notes: string | null
          order_id: string | null
          paid_amount: number
          payment_method: string | null
          project_id: string | null
          restaurant_id: string | null
          site_id: string | null
          source_reference_id: string | null
          source_type: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          block_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          is_progress_invoice?: boolean | null
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          payment_method?: string | null
          project_id?: string | null
          restaurant_id?: string | null
          site_id?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          block_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_progress_invoice?: boolean | null
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number
          payment_method?: string | null
          project_id?: string | null
          restaurant_id?: string | null
          site_id?: string | null
          source_reference_id?: string | null
          source_type?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "project_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_payments"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "project_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          customer_name: string | null
          expected_delivery: string | null
          id: string
          order_date: string | null
          order_id: string | null
          order_number: string
          restaurant_id: string | null
          status: string | null
          total_amount: number | null
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          customer_name?: string | null
          expected_delivery?: string | null
          id?: string
          order_date?: string | null
          order_id?: string | null
          order_number: string
          restaurant_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          customer_name?: string | null
          expected_delivery?: string | null
          id?: string
          order_date?: string | null
          order_id?: string | null
          order_number?: string
          restaurant_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_financial_api"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_payments"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "sales_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_sales_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_tax_report"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "sales_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "sales_return_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
            referencedRelation: "public_products"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
          {
            foreignKeyName: "sales_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          delivery_status: string
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
          delivery_status?: string
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
          delivery_status?: string
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
          {
            foreignKeyName: "service_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          package_id: string
          quantity: number
          service_name: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          package_id: string
          quantity?: number
          service_name: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          package_id?: string
          quantity?: number
          service_name?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_package_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          name: string
          price: number
          restaurant_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          name: string
          price?: number
          restaurant_id: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      service_variable_presets: {
        Row: {
          created_at: string
          id: string
          label: string
          restaurant_id: string
          updated_at: string
          usage_count: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          restaurant_id: string
          updated_at?: string
          usage_count?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          restaurant_id?: string
          updated_at?: string
          usage_count?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_variable_presets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variable_presets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variable_presets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_variable_presets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      social_media_accounts: {
        Row: {
          access_token: string
          account_avatar_url: string | null
          account_handle: string | null
          account_id: string
          account_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_posted_at: string | null
          last_synced_at: string | null
          metadata: Json | null
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token: string | null
          restaurant_id: string
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          account_avatar_url?: string | null
          account_handle?: string | null
          account_id: string
          account_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_posted_at?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          restaurant_id: string
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          account_avatar_url?: string | null
          account_handle?: string | null
          account_id?: string
          account_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_posted_at?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          restaurant_id?: string
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_analytics: {
        Row: {
          clicks_count: number | null
          comments_count: number | null
          created_at: string | null
          engagement_rate: number | null
          followers_count: number | null
          id: string
          impressions: number | null
          likes_count: number | null
          metadata: Json | null
          metric_date: string
          posts_count: number | null
          profile_views: number | null
          reach: number | null
          shares_count: number | null
          social_account_id: string
        }
        Insert: {
          clicks_count?: number | null
          comments_count?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          id?: string
          impressions?: number | null
          likes_count?: number | null
          metadata?: Json | null
          metric_date: string
          posts_count?: number | null
          profile_views?: number | null
          reach?: number | null
          shares_count?: number | null
          social_account_id: string
        }
        Update: {
          clicks_count?: number | null
          comments_count?: number | null
          created_at?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          id?: string
          impressions?: number | null
          likes_count?: number | null
          metadata?: Json | null
          metric_date?: string
          posts_count?: number | null
          profile_views?: number | null
          reach?: number | null
          shares_count?: number | null
          social_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_analytics_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_oauth_config: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: Database["public"]["Enums"]["social_platform"]
          redirect_uri: string | null
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: Database["public"]["Enums"]["social_platform"]
          redirect_uri?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: Database["public"]["Enums"]["social_platform"]
          redirect_uri?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_oauth_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_oauth_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_oauth_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_oauth_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          media_urls: string[] | null
          metrics: Json | null
          platform_post_id: string | null
          post_type: string | null
          published_at: string | null
          restaurant_id: string
          scheduled_at: string | null
          social_account_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_urls?: string[] | null
          metrics?: Json | null
          platform_post_id?: string | null
          post_type?: string | null
          published_at?: string | null
          restaurant_id: string
          scheduled_at?: string | null
          social_account_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          media_urls?: string[] | null
          metrics?: Json | null
          platform_post_id?: string | null
          post_type?: string | null
          published_at?: string | null
          restaurant_id?: string
          scheduled_at?: string | null
          social_account_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_posts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_media_accounts"
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
          {
            foreignKeyName: "staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_access_requests: {
        Row: {
          company_hint: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          join_code: string | null
          requested_role: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_hint?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          join_code?: string | null
          requested_role?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_hint?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          join_code?: string | null
          requested_role?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_access_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_departments: {
        Row: {
          code: string | null
          created_at: string | null
          expense_account_id: string | null
          id: string
          manager_id: string | null
          name: string
          restaurant_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          expense_account_id?: string | null
          id?: string
          manager_id?: string | null
          name: string
          restaurant_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          expense_account_id?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_departments_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_departments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_departments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_departments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_departments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          department_id: string | null
          email: string | null
          expense_account_id: string | null
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          position: string | null
          restaurant_id: string
          restaurant_staff_id: string | null
          status: string | null
        }
        Insert: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          deductions?: number | null
          department_id?: string | null
          email?: string | null
          expense_account_id?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          restaurant_id: string
          restaurant_staff_id?: string | null
          status?: string | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string | null
          deductions?: number | null
          department_id?: string | null
          email?: string | null
          expense_account_id?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          restaurant_id?: string
          restaurant_staff_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "staff_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "staff_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_restaurant_staff_id_fkey"
            columns: ["restaurant_staff_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_restaurant_staff_id_fkey"
            columns: ["restaurant_staff_id"]
            isOneToOne: false
            referencedRelation: "restaurant_staff_safe"
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
            referencedRelation: "public_products"
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
          {
            foreignKeyName: "stock_batches_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_internal: boolean | null
          is_return_location: boolean | null
          is_scrap_location: boolean | null
          location_type: string
          metadata: Json | null
          name: string
          name_ar: string | null
          parent_id: string | null
          path: string | null
          restaurant_id: string
          updated_at: string | null
          usage: string
          warehouse_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          is_return_location?: boolean | null
          is_scrap_location?: boolean | null
          location_type?: string
          metadata?: Json | null
          name: string
          name_ar?: string | null
          parent_id?: string | null
          path?: string | null
          restaurant_id: string
          updated_at?: string | null
          usage?: string
          warehouse_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_internal?: boolean | null
          is_return_location?: boolean | null
          is_scrap_location?: boolean | null
          location_type?: string
          metadata?: Json | null
          name?: string
          name_ar?: string | null
          parent_id?: string | null
          path?: string | null
          restaurant_id?: string
          updated_at?: string | null
          usage?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          warehouse_id: string | null
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
          warehouse_id?: string | null
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
          warehouse_id?: string | null
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
            referencedRelation: "public_products"
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
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      stock_moves: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          location_dest_id: string | null
          location_id: string | null
          metadata: Json | null
          note: string | null
          origin: string | null
          partner_id: string | null
          picking_id: string | null
          product_id: string
          quantity: number
          quantity_done: number | null
          reference: string | null
          restaurant_id: string
          state: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          location_dest_id?: string | null
          location_id?: string | null
          metadata?: Json | null
          note?: string | null
          origin?: string | null
          partner_id?: string | null
          picking_id?: string | null
          product_id: string
          quantity: number
          quantity_done?: number | null
          reference?: string | null
          restaurant_id: string
          state?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          location_dest_id?: string | null
          location_id?: string | null
          metadata?: Json | null
          note?: string | null
          origin?: string | null
          partner_id?: string | null
          picking_id?: string | null
          product_id?: string
          quantity?: number
          quantity_done?: number | null
          reference?: string | null
          restaurant_id?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_location_dest_id_fkey"
            columns: ["location_dest_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_warehouses: {
        Row: {
          accounting_account_code: string | null
          aisle: string | null
          bin: string | null
          building: string | null
          capacity_quantity: number | null
          capacity_volume: number | null
          code: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          floor: string | null
          humidity_control: boolean | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          location_zone: string | null
          name: string
          name_ar: string | null
          notes: string | null
          security_level: string | null
          temperature_control: boolean | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          accounting_account_code?: string | null
          aisle?: string | null
          bin?: string | null
          building?: string | null
          capacity_quantity?: number | null
          capacity_volume?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          floor?: string | null
          humidity_control?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_zone?: string | null
          name: string
          name_ar?: string | null
          notes?: string | null
          security_level?: string | null
          temperature_control?: boolean | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          accounting_account_code?: string | null
          aisle?: string | null
          bin?: string | null
          building?: string | null
          capacity_quantity?: number | null
          capacity_volume?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          floor?: string | null
          humidity_control?: boolean | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          location_zone?: string | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          security_level?: string | null
          temperature_control?: boolean | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          allowed_features: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          locked_features: Json | null
          max_branches: number | null
          max_modules: number | null
          max_staff: number | null
          name_ar: string
          name_en: string
          name_fr: string
          price_egp: number | null
          price_eur: number | null
          price_usd: number | null
          sort_order: number | null
        }
        Insert: {
          allowed_features?: Json | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          locked_features?: Json | null
          max_branches?: number | null
          max_modules?: number | null
          max_staff?: number | null
          name_ar: string
          name_en: string
          name_fr: string
          price_egp?: number | null
          price_eur?: number | null
          price_usd?: number | null
          sort_order?: number | null
        }
        Update: {
          allowed_features?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          locked_features?: Json | null
          max_branches?: number | null
          max_modules?: number | null
          max_staff?: number | null
          name_ar?: string
          name_en?: string
          name_fr?: string
          price_egp?: number | null
          price_eur?: number | null
          price_usd?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      supplier_balances_backup: {
        Row: {
          backup_timestamp: string | null
          balance: number | null
          id: string
          name: string | null
          restaurant_id: string | null
        }
        Insert: {
          backup_timestamp?: string | null
          balance?: number | null
          id: string
          name?: string | null
          restaurant_id?: string | null
        }
        Update: {
          backup_timestamp?: string | null
          balance?: number | null
          id?: string
          name?: string | null
          restaurant_id?: string | null
        }
        Relationships: []
      }
      supplier_commissions: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string | null
          status: string | null
          supplier_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string | null
          status?: string | null
          supplier_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string | null
          status?: string | null
          supplier_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_commissions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "supplier_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_commissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_commissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_commissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_commissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_commissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contracts: {
        Row: {
          annual_bonus_threshold: number | null
          annual_bonus_type: string | null
          annual_bonus_value: number | null
          contract_name: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          end_date: string | null
          has_annual_bonus: boolean | null
          id: string
          immediate_commission_fixed: number | null
          immediate_commission_percent: number | null
          notes: string | null
          restaurant_id: string | null
          start_date: string
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          annual_bonus_threshold?: number | null
          annual_bonus_type?: string | null
          annual_bonus_value?: number | null
          contract_name: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          end_date?: string | null
          has_annual_bonus?: boolean | null
          id?: string
          immediate_commission_fixed?: number | null
          immediate_commission_percent?: number | null
          notes?: string | null
          restaurant_id?: string | null
          start_date: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          annual_bonus_threshold?: number | null
          annual_bonus_type?: string | null
          annual_bonus_value?: number | null
          contract_name?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          end_date?: string | null
          has_annual_bonus?: boolean | null
          id?: string
          immediate_commission_fixed?: number | null
          immediate_commission_percent?: number | null
          notes?: string | null
          restaurant_id?: string | null
          start_date?: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contracts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          reference_id: string | null
          reference_type: string | null
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
          reference_id?: string | null
          reference_type?: string | null
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
          reference_id?: string | null
          reference_type?: string | null
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
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      system_versions: {
        Row: {
          created_at: string | null
          force_update: boolean | null
          id: string
          is_active: boolean | null
          min_compatible_version: string | null
          release_date: string | null
          release_notes: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          force_update?: boolean | null
          id?: string
          is_active?: boolean | null
          min_compatible_version?: string | null
          release_date?: string | null
          release_notes?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          force_update?: boolean | null
          id?: string
          is_active?: boolean | null
          min_compatible_version?: string | null
          release_date?: string | null
          release_notes?: string | null
          version?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "tax_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_state: {
        Row: {
          created_at: string
          id: string
          last_polled_at: string | null
          restaurant_id: string
          telegram_bot_id: string
          update_offset: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_polled_at?: string | null
          restaurant_id: string
          telegram_bot_id: string
          update_offset?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_polled_at?: string | null
          restaurant_id?: string
          telegram_bot_id?: string
          update_offset?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_bot_state_telegram_bot_id_fkey"
            columns: ["telegram_bot_id"]
            isOneToOne: true
            referencedRelation: "telegram_bots"
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
          {
            foreignKeyName: "telegram_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "telegram_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      tracking_pixels: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          pixel_id: string
          pixel_name: string | null
          placement: string
          platform: string
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pixel_id: string
          pixel_name?: string | null
          placement: string
          platform: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string
          pixel_name?: string | null
          placement?: string
          platform?: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_pixels_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_pixels_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_pixels_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_pixels_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "treasury_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "treasury_reconciliations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      unbalanced_journal_entries: {
        Row: {
          check_timestamp: string | null
          difference: number | null
          entry_date: string | null
          entry_number: string | null
          id: string
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          check_timestamp?: string | null
          difference?: number | null
          entry_date?: string | null
          entry_number?: string | null
          id: string
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          check_timestamp?: string | null
          difference?: number | null
          entry_date?: string | null
          entry_number?: string | null
          id?: string
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: []
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
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      warehouse_permissions: {
        Row: {
          can_adjust: boolean | null
          can_edit_stock: boolean | null
          can_transfer: boolean | null
          can_view_stock: boolean | null
          created_at: string | null
          id: string
          permission_level: string
          updated_at: string | null
          user_id: string
          warehouse_id: string
        }
        Insert: {
          can_adjust?: boolean | null
          can_edit_stock?: boolean | null
          can_transfer?: boolean | null
          can_view_stock?: boolean | null
          created_at?: string | null
          id?: string
          permission_level: string
          updated_at?: string | null
          user_id: string
          warehouse_id: string
        }
        Update: {
          can_adjust?: boolean | null
          can_edit_stock?: boolean | null
          can_transfer?: boolean | null
          can_view_stock?: boolean | null
          created_at?: string | null
          id?: string
          permission_level?: string
          updated_at?: string | null
          user_id?: string
          warehouse_id?: string
        }
        Relationships: []
      }
      warehouse_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_type: string | null
          setting_value: string | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_type?: string | null
          setting_value?: string | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: []
      }
      warehouse_stock: {
        Row: {
          id: string
          location_in_warehouse: string | null
          min_quantity: number | null
          product_id: string | null
          quantity: number | null
          restaurant_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          id?: string
          location_in_warehouse?: string | null
          min_quantity?: number | null
          product_id?: string | null
          quantity?: number | null
          restaurant_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          id?: string
          location_in_warehouse?: string | null
          min_quantity?: number | null
          product_id?: string | null
          quantity?: number | null
          restaurant_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_valuation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          accounting_account_code: string | null
          accounting_standard: string | null
          address: string | null
          city: string | null
          code: string
          cogs_account_code: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          email: string | null
          id: string
          inventory_account_code: string | null
          is_active: boolean | null
          is_default: boolean | null
          manager_name: string | null
          name: string
          name_ar: string | null
          notes: string | null
          parent_warehouse_id: string | null
          phone: string | null
          restaurant_id: string
          type: string
          updated_at: string | null
          warehouse_category: string | null
        }
        Insert: {
          accounting_account_code?: string | null
          accounting_standard?: string | null
          address?: string | null
          city?: string | null
          code: string
          cogs_account_code?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          inventory_account_code?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          manager_name?: string | null
          name: string
          name_ar?: string | null
          notes?: string | null
          parent_warehouse_id?: string | null
          phone?: string | null
          restaurant_id: string
          type?: string
          updated_at?: string | null
          warehouse_category?: string | null
        }
        Update: {
          accounting_account_code?: string | null
          accounting_standard?: string | null
          address?: string | null
          city?: string | null
          code?: string
          cogs_account_code?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          inventory_account_code?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          manager_name?: string | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          parent_warehouse_id?: string | null
          phone?: string | null
          restaurant_id?: string
          type?: string
          updated_at?: string | null
          warehouse_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_parent_warehouse_id_fkey"
            columns: ["parent_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "warehouses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_bots: {
        Row: {
          allowed_numbers: string[] | null
          auto_suggest_entries: boolean | null
          bot_name: string
          created_at: string | null
          id: string
          instance_id: string | null
          is_active: boolean | null
          provider: string | null
          restaurant_id: string
          token_hash: string
          updated_at: string | null
        }
        Insert: {
          allowed_numbers?: string[] | null
          auto_suggest_entries?: boolean | null
          bot_name: string
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          provider?: string | null
          restaurant_id: string
          token_hash: string
          updated_at?: string | null
        }
        Update: {
          allowed_numbers?: string[] | null
          auto_suggest_entries?: boolean | null
          bot_name?: string
          created_at?: string | null
          id?: string
          instance_id?: string | null
          is_active?: boolean | null
          provider?: string | null
          restaurant_id?: string
          token_hash?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_bots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          external_message_id: string | null
          id: string
          message_text: string | null
          message_type: string | null
          processing_status: string | null
          restaurant_id: string
          sender_name: string | null
          sender_number: string | null
          whatsapp_bot_id: string | null
          whatsapp_data: Json | null
        }
        Insert: {
          created_at?: string | null
          external_message_id?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          processing_status?: string | null
          restaurant_id: string
          sender_name?: string | null
          sender_number?: string | null
          whatsapp_bot_id?: string | null
          whatsapp_data?: Json | null
        }
        Update: {
          created_at?: string | null
          external_message_id?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          processing_status?: string | null
          restaurant_id?: string
          sender_name?: string | null
          sender_number?: string | null
          whatsapp_bot_id?: string | null
          whatsapp_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_whatsapp_bot_id_fkey"
            columns: ["whatsapp_bot_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_bots"
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
          {
            foreignKeyName: "workspaces_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      public_menu_items: {
        Row: {
          available: boolean | null
          category: string | null
          icon_url: string | null
          id: string | null
          image: string | null
          in_stock: boolean | null
          inventory_mode: string | null
          name: string | null
          price: number | null
          product_type: string | null
          restaurant_id: string | null
          sort_order: number | null
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          icon_url?: string | null
          id?: string | null
          image?: string | null
          in_stock?: never
          inventory_mode?: string | null
          name?: string | null
          price?: number | null
          product_type?: string | null
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Update: {
          available?: boolean | null
          category?: string | null
          icon_url?: string | null
          id?: string | null
          image?: string | null
          in_stock?: never
          inventory_mode?: string | null
          name?: string | null
          price?: number | null
          product_type?: string | null
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
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
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      public_products: {
        Row: {
          available: boolean | null
          category: string | null
          icon_url: string | null
          id: string | null
          image: string | null
          in_stock: boolean | null
          name: string | null
          price: number | null
          quantity: number | null
          restaurant_id: string | null
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          available?: boolean | null
          category?: string | null
          icon_url?: string | null
          id?: string | null
          image?: string | null
          in_stock?: never
          name?: string | null
          price?: number | null
          quantity?: never
          restaurant_id?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          available?: boolean | null
          category?: string | null
          icon_url?: string | null
          id?: string | null
          image?: string | null
          in_stock?: never
          name?: string | null
          price?: number | null
          quantity?: never
          restaurant_id?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
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
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      restaurant_staff_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          phone: string | null
          restaurant_id: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          restaurant_id?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          restaurant_id?: string | null
          role?: string | null
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
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants_public: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type"] | null
          currency: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          status: string | null
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["business_type"] | null
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          status?: string | null
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type"] | null
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
          {
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "ap_open_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "inventory_audit_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "account_budgets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "public_menu_items"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
            referencedRelation: "public_products"
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
            referencedRelation: "v_invoice_payment_status"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_order_payments"
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
          {
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_audit_summary: {
        Row: {
          entity_type: string | null
          failed_count: number | null
          operation_count: number | null
          operation_date: string | null
          operation_type: string | null
          restaurant_id: string | null
          success_count: number | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "gl_posting_failures_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      v_invoice_payment_status: {
        Row: {
          direct_paid: number | null
          order_date: string | null
          order_id: string | null
          order_number: string | null
          receipt_voucher_paid: number | null
          remaining_balance: number | null
          total: number | null
          total_paid: number | null
        }
        Relationships: []
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
          {
            foreignKeyName: "journal_approval_actions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      v_order_payments: {
        Row: {
          direct_paid: number | null
          order_id: string | null
          order_number: string | null
          order_total: number | null
          receipt_voucher_total: number | null
          remaining_balance: number | null
          total_paid: number | null
        }
        Relationships: []
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
            foreignKeyName: "accounting_period_closes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      v_recent_important_operations: {
        Row: {
          amount: number | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation_type: string | null
          restaurant_id: string | null
          restaurant_name: string | null
          status: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "public_restaurant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
            referencedColumns: ["id"]
          },
        ]
      }
      v_restaurant_plan_health: {
        Row: {
          created_at: string | null
          customer_count: number | null
          effective_plan: string | null
          id: string | null
          name: string | null
          order_count: number | null
          owner_id: string | null
          plan_id: string | null
          status: string | null
          subscription_end: string | null
        }
        Insert: {
          created_at?: string | null
          customer_count?: never
          effective_plan?: never
          id?: string | null
          name?: string | null
          order_count?: never
          owner_id?: string | null
          plan_id?: string | null
          status?: string | null
          subscription_end?: string | null
        }
        Update: {
          created_at?: string | null
          customer_count?: never
          effective_plan?: never
          id?: string | null
          name?: string | null
          order_count?: never
          owner_id?: string | null
          plan_id?: string | null
          status?: string | null
          subscription_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
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
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "supplier_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
          {
            foreignKeyName: "treasury_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v_restaurant_plan_health"
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
      _coa_by_code: {
        Args: { p_code: string; p_restaurant_id: string }
        Returns: string
      }
      _create_balanced_journal: {
        Args: {
          p_amount: number
          p_credit_account_id: string
          p_debit_account_id: string
          p_description: string
          p_entry_date: string
          p_reference_id: string
          p_reference_type: string
          p_restaurant_id: string
          p_source: string
        }
        Returns: string
      }
      _get_or_create_account: {
        Args: {
          p_code: string
          p_is_bank?: boolean
          p_is_cash?: boolean
          p_name: string
          p_normal_side?: string
          p_restaurant_id: string
          p_subtype?: string
          p_system_key?: string
          p_type: string
        }
        Returns: string
      }
      _next_journal_number: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      _resolve_payment_account: {
        Args: {
          p_override_account_id?: string
          p_payment_method: string
          p_restaurant_id: string
        }
        Returns: string
      }
      add_customer_warning: {
        Args: { p_customer_id: string; p_reason?: string; p_user_id?: string }
        Returns: number
      }
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
          created_by_name: string | null
          deleted_at: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_deleted: boolean | null
          is_posted: boolean | null
          is_reversed: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          reversal_entry_id: string | null
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
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
      approve_staff_access: {
        Args: {
          p_company_ids?: string[]
          p_request_id: string
          p_role?: string
        }
        Returns: boolean
      }
      auth_restaurant_ids: {
        Args: never
        Returns: {
          restaurant_id: string
        }[]
      }
      calculate_contractor_payment: {
        Args: {
          p_payment_type: string
          p_payment_value: number
          p_service_amount: number
        }
        Returns: number
      }
      calculate_employee_utilization: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          billable_hours: number
          total_hours: number
          utilization_rate: number
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
      calculate_marketing_profitability: {
        Args: { p_workflow_instance_id: string }
        Returns: undefined
      }
      calculate_project_profitability: {
        Args: { p_project_id: string }
        Returns: {
          gross_profit: number
          hours_billed: number
          hours_worked: number
          profit_margin: number
          total_cost: number
          total_revenue: number
        }[]
      }
      can_approve_journal: {
        Args: { p_restaurant_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_company: {
        Args: { company_id: string; user_id: string }
        Returns: boolean
      }
      check_customer_dependencies: {
        Args: { p_customer_id: string; p_restaurant_id: string }
        Returns: Json
      }
      check_for_update: {
        Args: { p_current_version: string; p_restaurant_id: string }
        Returns: {
          force_update: boolean
          has_update: boolean
          latest_version: string
          release_notes: string
        }[]
      }
      check_staff_permission: {
        Args: { p_permission_code: string; p_staff_id: string }
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
      convert_currency: {
        Args: {
          p_amount: number
          p_date?: string
          p_from_currency: string
          p_restaurant_id: string
          p_to_currency: string
        }
        Returns: number
      }
      create_default_chart_of_accounts: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      create_default_fiscal_periods: {
        Args: { p_restaurant_id: string; p_year?: number }
        Returns: undefined
      }
      create_default_workflow_stages: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      create_fiscal_periods_for_year: {
        Args: { p_company_id: string; p_year: number }
        Returns: undefined
      }
      create_journal_entry_with_transaction: {
        Args: {
          p_description: string
          p_entry_date: string
          p_is_posted: boolean
          p_lines: Json
          p_reference_id: string
          p_reference_type: string
          p_restaurant_id: string
          p_source: string
        }
        Returns: Json
      }
      create_stock_move: {
        Args: {
          p_created_by?: string
          p_location_dest_id?: string
          p_location_src_id?: string
          p_note?: string
          p_product_id: string
          p_quantity: number
          p_reference?: string
          p_restaurant_id: string
        }
        Returns: string
      }
      create_storefront_order: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address?: string
          p_items: Json
          p_notes?: string
          p_order_type?: string
          p_restaurant_id: string
        }
        Returns: Json
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
      decrypt_token: { Args: { encrypted_token: string }; Returns: string }
      delete_payment_voucher: {
        Args: { p_voucher_id: string }
        Returns: undefined
      }
      delete_receipt_voucher: {
        Args: { p_voucher_id: string }
        Returns: undefined
      }
      delete_sales_return: {
        Args: { p_sales_return_id: string }
        Returns: Json
      }
      encrypt_token: { Args: { token: string }; Returns: string }
      ensure_owner_company_membership: { Args: never; Returns: undefined }
      ensure_warehouse_accounts: {
        Args: { restaurant_id: string; warehouse_id: string }
        Returns: undefined
      }
      execute_inventory_transfer: {
        Args: {
          p_from_warehouse_id: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_restaurant_id: string
          p_to_warehouse_id: string
        }
        Returns: Json
      }
      find_or_create_customer: {
        Args: { p_name: string; p_phone?: string; p_restaurant_id: string }
        Returns: string
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
      fn_upsert_doc_journal: {
        Args: {
          p_date: string
          p_description: string
          p_lines: Json
          p_ref_id: string
          p_ref_type: string
          p_restaurant_id: string
          p_source: string
        }
        Returns: string
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
      garment_advance_stage: {
        Args: {
          p_actor_name?: string
          p_cost_per_unit?: number
          p_laundry_ref?: string
          p_notes?: string
          p_order_id: string
          p_qc_fail?: number
          p_qc_pass?: number
          p_quantity?: number
          p_record_cost?: boolean
          p_to_stage: string
        }
        Returns: string
      }
      garment_approve_cutting: {
        Args: { p_approver_name?: string; p_lot_id: string }
        Returns: boolean
      }
      garment_create_outsourcing: {
        Args: {
          p_actor_name?: string
          p_auto_cost?: boolean
          p_due_date?: string
          p_external_ref?: string
          p_garment_order_id: string
          p_notes?: string
          p_qty_sent: number
          p_restaurant_id: string
          p_stage: string
          p_unit_cost?: number
          p_vendor_name: string
          p_vendor_phone?: string
        }
        Returns: string
      }
      garment_delete_order: {
        Args: { p_actor_name?: string; p_order_id: string }
        Returns: boolean
      }
      garment_deliver_and_invoice: {
        Args: {
          p_actor_name?: string
          p_notes?: string
          p_order_id: string
          p_paid_amount?: number
          p_payment_method?: string
          p_quantity?: number
        }
        Returns: string
      }
      garment_next_stage_key: {
        Args: { p_current: string; p_restaurant_id: string }
        Returns: string
      }
      garment_receive_outsourcing: {
        Args: {
          p_actor_name?: string
          p_job_id: string
          p_notes?: string
          p_qty_received: number
          p_qty_rejected?: number
        }
        Returns: boolean
      }
      garment_record_cutting: {
        Args: {
          p_cut_by_name?: string
          p_fabric_roll_id: string
          p_garment_order_id: string
          p_lays_count: number
          p_lot_number: string
          p_marker_length_m: number
          p_meters_actual: number
          p_meters_planned: number
          p_notes?: string
          p_pieces_cut: number
          p_pieces_planned: number
          p_restaurant_id: string
        }
        Returns: string
      }
      garment_record_stage_cost:
        | {
            Args: {
              p_actor_name?: string
              p_cost_type?: string
              p_garment_order_id: string
              p_notes?: string
              p_outsourcing_job_id?: string
              p_quantity?: number
              p_restaurant_id: string
              p_stage: string
              p_unit_cost?: number
              p_vendor_name?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_actor_name?: string
              p_cost_type?: string
              p_garment_order_id: string
              p_notes?: string
              p_outsourcing_job_id?: string
              p_quantity?: number
              p_restaurant_id: string
              p_stage: string
              p_stage_log_id?: string
              p_unit_cost?: number
              p_vendor_name?: string
            }
            Returns: string
          }
      garment_refresh_order_costs: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      garment_reorder_stages: {
        Args: { p_ordered_keys: string[]; p_restaurant_id: string }
        Returns: boolean
      }
      garment_seed_default_stages: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      generate_entry_number: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      generate_retainer_invoice: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_retainer_id: string
        }
        Returns: string
      }
      generate_return_number: {
        Args: { restaurant_id: string; return_type: string }
        Returns: string
      }
      get_account_balance: { Args: { p_account_id: string }; Returns: number }
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
      get_contractor_balance: {
        Args: { p_contractor_id: string }
        Returns: number
      }
      get_current_fiscal_period: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_customer_balance: { Args: { p_customer_id: string }; Returns: number }
      get_delayed_deliverables_count: {
        Args: { p_restaurant_id: string }
        Returns: number
      }
      get_inventory_account: {
        Args: { p_restaurant_id: string }
        Returns: string
      }
      get_invoice_total_paid: { Args: { p_order_id: string }; Returns: number }
      get_my_staff_access: {
        Args: never
        Returns: {
          companies: Json
          full_name: string
          has_access: boolean
          pending_request: boolean
        }[]
      }
      get_or_create_expense_account: {
        Args: {
          p_account_name: string
          p_code: string
          p_restaurant_id: string
        }
        Returns: string
      }
      get_or_create_print_settings: {
        Args: { restaurant_id: string }
        Returns: Json
      }
      get_order_allocated_amount: {
        Args: { p_order_id: string }
        Returns: number
      }
      get_order_total_paid: { Args: { p_order_id: string }; Returns: number }
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
      get_supplier_balance: { Args: { p_supplier_id: string }; Returns: number }
      get_tracking_pixels: {
        Args: { p_placement?: string; p_restaurant_id: string }
        Returns: Json
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
      get_user_default_company: {
        Args: { p_user_id?: string }
        Returns: {
          company_id: string
          company_name: string
          restaurant_id: string
          role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_item_warehouse_assignment: {
        Args: {
          p_accounting_standard: string
          p_costing_method: string
          p_inventory_valuation_rule: string
          p_is_primary: boolean
          p_item_id: string
          p_lead_time_days: number
          p_low_stock_alert: boolean
          p_max_stock_level: number
          p_min_stock_level: number
          p_overstock_alert: boolean
          p_purchase_unit: string
          p_reorder_point: number
          p_reorder_quantity: number
          p_sales_unit: string
          p_stock_unit: string
          p_sub_warehouse_id: string
        }
        Returns: undefined
      }
      is_company_admin:
        | { Args: { _company_id: string; _user_id: string }; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
      is_owner: { Args: { cid: string }; Returns: boolean }
      is_posting_allowed: {
        Args: { p_entry_date: string; p_restaurant_id: string }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      list_deleted_warehouses: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      log_operation: {
        Args: {
          p_amount?: number
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
          p_operation_type: string
          p_restaurant_id: string
          p_status?: string
        }
        Returns: string
      }
      log_stock_movement: {
        Args: {
          p_movement_type: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_reference_id?: string
          p_restaurant_id: string
          p_warehouse_id?: string
        }
        Returns: string
      }
      mark_cart_converted: {
        Args: { p_restaurant_id: string; p_visitor_id: string }
        Returns: undefined
      }
      merge_duplicate_customers: {
        Args: {
          p_duplicate_customer_id: string
          p_restaurant_id: string
          p_target_customer_id: string
        }
        Returns: Json
      }
      post_approved_journal_entry: {
        Args: { p_entry_id: string; p_notes?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          deleted_at: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_deleted: boolean | null
          is_posted: boolean | null
          is_reversed: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          reversal_entry_id: string | null
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
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
      recalculate_account_balance: {
        Args: { p_account_id: string }
        Returns: number
      }
      recalculate_all_account_balances: {
        Args: { p_restaurant_id?: string }
        Returns: number
      }
      recalculate_all_customer_balances: {
        Args: { p_restaurant_id?: string }
        Returns: number
      }
      recalculate_all_supplier_balances: {
        Args: { p_restaurant_id?: string }
        Returns: number
      }
      recalculate_customer_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      recalculate_supplier_balance: {
        Args: { p_supplier_id: string }
        Returns: number
      }
      recognize_revenue: {
        Args: { p_recognition_date: string; p_recognition_id: string }
        Returns: boolean
      }
      record_asset_depreciation: {
        Args: {
          p_asset_id: string
          p_created_by?: string
          p_depreciation_date?: string
          p_notes?: string
          p_restaurant_id: string
        }
        Returns: string
      }
      record_device_check_in: {
        Args: {
          p_current_version: string
          p_device_id: string
          p_is_weak_device?: boolean
          p_platform?: string
          p_restaurant_id: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      record_payroll_payment: {
        Args: {
          p_allowances?: number
          p_deductions?: number
          p_department_id?: string
          p_expense_account_id?: string
          p_month: number
          p_net_salary: number
          p_notes?: string
          p_payment_account_id?: string
          p_payment_date?: string
          p_restaurant_id: string
          p_staff_id: string
          p_year: number
        }
        Returns: string
      }
      refresh_oauth_token: { Args: { p_account_id: string }; Returns: boolean }
      reject_journal_entry: {
        Args: { p_entry_id: string; p_reason: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          deleted_at: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_deleted: boolean | null
          is_posted: boolean | null
          is_reversed: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          reversal_entry_id: string | null
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
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
      reject_staff_access: {
        Args: { p_note?: string; p_request_id: string }
        Returns: boolean
      }
      remove_customer_warning: {
        Args: { p_customer_id: string; p_reason?: string; p_user_id?: string }
        Returns: number
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
      restore_inventory_for_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      restore_restaurant_warehouses: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      restore_stock_for_order_item: {
        Args: {
          p_item: Database["public"]["Tables"]["order_items"]["Row"]
          p_restaurant_id: string
        }
        Returns: undefined
      }
      restore_warehouse: { Args: { p_warehouse_id: string }; Returns: Json }
      save_payment_voucher: {
        Args: {
          p_account_id?: string
          p_actor_id: string
          p_actor_type?: string
          p_amount: number
          p_counter_account_id?: string
          p_notes?: string
          p_payment_method?: string
          p_reference_number?: string
          p_restaurant_id: string
          p_voucher_date?: string
          p_voucher_id?: string
        }
        Returns: string
      }
      save_receipt_voucher:
        | {
            Args: {
              p_account_id?: string
              p_actor_id: string
              p_actor_type?: string
              p_amount: number
              p_counter_account_id?: string
              p_notes?: string
              p_payment_method?: string
              p_restaurant_id: string
              p_voucher_date?: string
              p_voucher_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_account_id?: string
              p_amount: number
              p_counter_account_id?: string
              p_customer_id: string
              p_notes?: string
              p_payment_method?: string
              p_restaurant_id: string
              p_voucher_date?: string
              p_voucher_id?: string
            }
            Returns: string
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
          created_by_name: string | null
          deleted_at: string | null
          description: string
          entry_date: string
          entry_number: string
          fiscal_period_id: string | null
          id: string
          is_deleted: boolean | null
          is_posted: boolean | null
          is_reversed: boolean | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          restaurant_id: string
          reversal_entry_id: string | null
          source: string | null
          source_event: string | null
          source_id: string | null
          source_module: string | null
          submitted_at: string | null
          submitted_by: string | null
          total_credit: number
          total_debit: number
          updated_at: string | null
          updated_by: string | null
          updated_by_name: string | null
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
      submit_staff_access_request: {
        Args: {
          p_company_hint?: string
          p_full_name: string
          p_join_code?: string
          p_requested_role?: string
        }
        Returns: string
      }
      superadmin_get_company_users: {
        Args: { p_company_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          role: string
          user_id: string
        }[]
      }
      superadmin_manage_company_user: {
        Args: {
          p_action: string
          p_company_id: string
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      update_order: {
        Args: {
          p_customer_name: string
          p_customer_ref: string
          p_discount: number
          p_notes: string
          p_order_id: string
          p_paid_amount: number
          p_payment_method: string
          p_total: number
        }
        Returns: undefined
      }
      update_order_item: {
        Args: {
          p_item_id: string
          p_menu_item_name: string
          p_price: number
          p_quantity: number
          p_variables?: Json
        }
        Returns: undefined
      }
      update_print_settings: {
        Args: { new_settings: Json; restaurant_id: string }
        Returns: undefined
      }
      update_sales_order: {
        Args: {
          p_customer_id: string
          p_customer_name: string
          p_expected_delivery: string
          p_order_id: string
          p_status: string
          p_total_amount: number
        }
        Returns: undefined
      }
      update_sales_order_item: {
        Args: {
          p_item_id: string
          p_item_name: string
          p_quantity: number
          p_unit_price: number
          p_variables?: Json
        }
        Returns: undefined
      }
      upsert_abandoned_cart: {
        Args: {
          p_cart_items: Json
          p_cart_total: number
          p_customer_name?: string
          p_customer_phone?: string
          p_item_count: number
          p_restaurant_id: string
          p_visitor_id: string
        }
        Returns: undefined
      }
      upsert_pos_order: {
        Args: { p_payload: Json }
        Returns: {
          actual_delivery_date: string | null
          client_order_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          customer_ref: string | null
          delivery_address: string
          delivery_agent_id: string | null
          delivery_date: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_receipt_note: string | null
          delivery_received_by: string | null
          delivery_status: string | null
          direct_paid_amount: number
          discount: number
          id: string
          journal_entry_id: string | null
          notes: string
          order_number: string
          order_type: string
          paid_amount: number
          payment_method: string
          receipt_voucher_ids: string[] | null
          restaurant_id: string
          sales_order_id: string | null
          status: string
          synced: boolean
          table_number: number | null
          total: number
          total_cost: number | null
          tracking_token: string | null
          updated_by: string | null
          updated_by_name: string | null
          workspace_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_owns_company: { Args: { _company_id: string }; Returns: boolean }
      validate_company_access: {
        Args: { p_company_id: string; p_user_id?: string }
        Returns: boolean
      }
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
        | "custom"
        | "garment_factory"
      social_platform:
        | "facebook"
        | "instagram"
        | "google"
        | "youtube"
        | "linkedin"
        | "tiktok"
        | "twitter"
        | "pinterest"
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
        "custom",
        "garment_factory",
      ],
      social_platform: [
        "facebook",
        "instagram",
        "google",
        "youtube",
        "linkedin",
        "tiktok",
        "twitter",
        "pinterest",
      ],
    },
  },
} as const
