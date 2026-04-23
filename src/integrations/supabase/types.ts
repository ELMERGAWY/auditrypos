export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // ============================================================
      // EXISTING CORE TABLES
      // ============================================================
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
          reason: string
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
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_transactions: {
        Row: {
          amount: number
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
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
            foreignKeyName: "customer_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          credit_limit: number
          customer_type: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          customer_type?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          customer_type?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_agents: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          last_location_update: string | null
          name: string
          phone: string
          restaurant_id: string
          status: string
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          last_location_update?: string | null
          name: string
          phone?: string
          restaurant_id: string
          status?: string
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          last_location_update?: string | null
          name?: string
          phone?: string
          restaurant_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          restaurant_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          restaurant_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
            referencedRelation: "restaurants"
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
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          category: string
          created_at: string
          id: string
          image: string
          inventory_mode: string
          name: string
          price: number
          product_id: string | null
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          available?: boolean
          category?: string
          created_at?: string
          id?: string
          image?: string
          inventory_mode?: string
          name: string
          price?: number
          product_id?: string | null
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          id?: string
          image?: string
          inventory_mode?: string
          name?: string
          price?: number
          product_id?: string | null
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          restaurant_id: string
          target_id: string | null
          target_type: string
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          restaurant_id: string
          target_id?: string | null
          target_type?: string
          title?: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          restaurant_id?: string
          target_id?: string | null
          target_type?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cost_price_snapshot: number | null
          id: string
          menu_item_id: string | null
          menu_item_image: string
          menu_item_name: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          sold_unit: string | null
          unit_factor: number | null
        }
        Insert: {
          cost_price_snapshot?: number | null
          id?: string
          menu_item_id?: string | null
          menu_item_image?: string
          menu_item_name: string
          order_id: string
          price?: number
          product_id?: string | null
          quantity?: number
          sold_unit?: string | null
          unit_factor?: number | null
        }
        Update: {
          cost_price_snapshot?: number | null
          id?: string
          menu_item_id?: string | null
          menu_item_image?: string
          menu_item_name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          sold_unit?: string | null
          unit_factor?: number | null
        }
        Relationships: [
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_order_id: string | null
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
        }
        Insert: {
          client_order_id?: string | null
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
        }
        Update: {
          client_order_id?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          barcode: string | null
          category: string
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
        }
        Insert: {
          available?: boolean
          barcode?: string | null
          category?: string
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
        }
        Update: {
          available?: boolean
          barcode?: string | null
          category?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accounting_config: Json | null
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          currency: string
          id: string
          license_key: string | null
          logo_url: string | null
          name: string
          owner_id: string
          status: string
          subscription_end: string | null
          updated_at: string
        }
        Insert: {
          accounting_config?: Json | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          currency?: string
          id?: string
          license_key?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          status?: string
          subscription_end?: string | null
          updated_at?: string
        }
        Update: {
          accounting_config?: Json | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          currency?: string
          id?: string
          license_key?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          status?: string
          subscription_end?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          cashier_id: string
          cashier_name: string
          closed_at: string | null
          closing_balance: number | null
          id: string
          notes: string
          opened_at: string
          opening_balance: number
          restaurant_id: string
          status: string
          total_orders: number
          total_sales: number
        }
        Insert: {
          cashier_id: string
          cashier_name?: string
          closed_at?: string | null
          closing_balance?: number | null
          id?: string
          notes?: string
          opened_at?: string
          opening_balance?: number
          restaurant_id: string
          status?: string
          total_orders?: number
          total_sales?: number
        }
        Update: {
          cashier_id?: string
          cashier_name?: string
          closed_at?: string | null
          closing_balance?: number | null
          id?: string
          notes?: string
          opened_at?: string
          opening_balance?: number
          restaurant_id?: string
          status?: string
          total_orders?: number
          total_sales?: number
        }
        Relationships: [
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          restaurant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          restaurant_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          restaurant_id: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string
          restaurant_id: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          created_at: string
          id: string
          restaurant_id: string
          table_info: string
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          restaurant_id: string
          table_info?: string
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          restaurant_id?: string
          table_info?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }

      // ============================================================
      // PROFESSIONAL ACCOUNTING TABLES (NEW)
      // ============================================================
      
      // Core Accounting
      fiscal_periods: {
        Row: {
          id: string
          restaurant_id: string
          period_name: string
          start_date: string
          end_date: string
          status: string
          is_posting_allowed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          period_name: string
          start_date: string
          end_date: string
          status?: string
          is_posting_allowed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          period_name?: string
          start_date?: string
          end_date?: string
          status?: string
          is_posting_allowed?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          id: string
          restaurant_id: string
          code: string
          name: string
          account_type: string
          parent_id: string | null
          is_bank_account: boolean
          is_cash_account: boolean
          opening_balance: number
          current_balance: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          code: string
          name: string
          account_type: string
          parent_id?: string | null
          is_bank_account?: boolean
          is_cash_account?: boolean
          opening_balance?: number
          current_balance?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          code?: string
          name?: string
          account_type?: string
          parent_id?: string | null
          is_bank_account?: boolean
          is_cash_account?: boolean
          opening_balance?: number
          current_balance?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          id: string
          restaurant_id: string
          entry_number: string
          entry_date: string
          reference_type: string | null
          reference_id: string | null
          description: string
          source: string | null
          total_debit: number
          total_credit: number
          is_posted: boolean
          posted_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          entry_number: string
          entry_date?: string
          reference_type?: string | null
          reference_id?: string | null
          description: string
          source?: string | null
          total_debit?: number
          total_credit?: number
          is_posted?: boolean
          posted_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          entry_number?: string
          entry_date?: string
          reference_type?: string | null
          reference_id?: string | null
          description?: string
          source?: string | null
          total_debit?: number
          total_credit?: number
          is_posted?: boolean
          posted_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          id: string
          entry_id: string
          account_id: string
          debit: number
          credit: number
          description: string | null
          line_order: number
        }
        Insert: {
          id?: string
          entry_id: string
          account_id: string
          debit?: number
          credit?: number
          description?: string | null
          line_order?: number
        }
        Update: {
          id?: string
          entry_id?: string
          account_id?: string
          debit?: number
          credit?: number
          description?: string | null
          line_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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

      // Services Module
      service_invoices: {
        Row: {
          id: string
          restaurant_id: string
          invoice_number: string
          invoice_date: string
          customer_name: string
          customer_phone: string | null
          service_description: string
          amount: number
          tax_amount: number
          total_amount: number
          amount_paid: number
          payment_method: string | null
          status: string
          journal_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          invoice_number: string
          invoice_date: string
          customer_name: string
          customer_phone?: string | null
          service_description: string
          amount?: number
          tax_amount?: number
          total_amount?: number
          amount_paid?: number
          payment_method?: string | null
          status?: string
          journal_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          invoice_number?: string
          invoice_date?: string
          customer_name?: string
          customer_phone?: string | null
          service_description?: string
          amount?: number
          tax_amount?: number
          total_amount?: number
          amount_paid?: number
          payment_method?: string | null
          status?: string
          journal_entry_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }

      // Retail Module
      warehouses: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          location: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          location?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          location?: string | null
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          id: string
          restaurant_id: string
          product_id: string | null
          sku: string | null
          barcode: string | null
          cost_method: string
          current_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          product_id?: string | null
          sku?: string | null
          barcode?: string | null
          cost_method?: string
          current_cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          product_id?: string | null
          sku?: string | null
          barcode?: string | null
          cost_method?: string
          current_cost?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          id: string
          item_id: string
          warehouse_id: string
          quantity_on_hand: number
          quantity_reserved: number
          average_cost: number
          last_movement_date: string | null
        }
        Insert: {
          id?: string
          item_id: string
          warehouse_id: string
          quantity_on_hand?: number
          quantity_reserved?: number
          average_cost?: number
          last_movement_date?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          warehouse_id?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          average_cost?: number
          last_movement_date?: string | null
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
      cost_layers: {
        Row: {
          id: string
          item_id: string
          warehouse_id: string
          layer_date: string
          quantity: number
          unit_cost: number
          remaining_qty: number
          is_consumed: boolean
          reference_type: string | null
          reference_id: string | null
        }
        Insert: {
          id?: string
          item_id: string
          warehouse_id: string
          layer_date: string
          quantity: number
          unit_cost: number
          remaining_qty?: number
          is_consumed?: boolean
          reference_type?: string | null
          reference_id?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          warehouse_id?: string
          layer_date?: string
          quantity?: number
          unit_cost?: number
          remaining_qty?: number
          is_consumed?: boolean
          reference_type?: string | null
          reference_id?: string | null
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
      retail_sales: {
        Row: {
          id: string
          restaurant_id: string
          invoice_number: string
          sale_date: string
          customer_name: string | null
          subtotal: number
          discount_amount: number
          tax_amount: number
          total_amount: number
          payment_method: string
          warehouse_id: string | null
          journal_entry_id: string | null
          cogs_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          invoice_number: string
          sale_date?: string
          customer_name?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total_amount: number
          payment_method: string
          warehouse_id?: string | null
          journal_entry_id?: string | null
          cogs_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          invoice_number?: string
          sale_date?: string
          customer_name?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total_amount?: number
          payment_method?: string
          warehouse_id?: string | null
          journal_entry_id?: string | null
          cogs_entry_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_sales_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sales_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_sale_lines: {
        Row: {
          id: string
          sale_id: string
          item_id: string
          quantity: number
          unit_price: number
          unit_cost: number
          total_price: number
          total_cost: number
          cost_layers_used: string[] | null
        }
        Insert: {
          id?: string
          sale_id: string
          item_id: string
          quantity: number
          unit_price: number
          unit_cost: number
          total_price: number
          total_cost: number
          cost_layers_used?: string[] | null
        }
        Update: {
          id?: string
          sale_id?: string
          item_id?: string
          quantity?: number
          unit_price?: number
          unit_cost?: number
          total_price?: number
          total_cost?: number
          cost_layers_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "retail_sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "retail_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_sale_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          id: string
          restaurant_id: string
          invoice_number: string
          supplier_name: string
          invoice_date: string
          total_amount: number
          warehouse_id: string | null
          journal_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          invoice_number: string
          supplier_name: string
          invoice_date: string
          total_amount: number
          warehouse_id?: string | null
          journal_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          invoice_number?: string
          supplier_name?: string
          invoice_date?: string
          total_amount?: number
          warehouse_id?: string | null
          journal_entry_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          purchase_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: {
          id?: string
          purchase_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Update: {
          id?: string
          purchase_id?: string
          item_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_lines_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }

      // Restaurant Module
      menu_items_costing: {
        Row: {
          id: string
          menu_item_id: string
          restaurant_id: string
          theoretical_cost: number
          actual_cost: number
          target_margin: number
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          restaurant_id: string
          theoretical_cost?: number
          actual_cost?: number
          target_margin?: number
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          restaurant_id?: string
          theoretical_cost?: number
          actual_cost?: number
          target_margin?: number
          updated_at?: string
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
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_components: {
        Row: {
          id: string
          menu_item_id: string
          inventory_item_id: string
          quantity_required: number
          wastage_percent: number
          unit_cost_at_time: number | null
          line_order: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          inventory_item_id: string
          quantity_required: number
          wastage_percent?: number
          unit_cost_at_time?: number | null
          line_order?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          inventory_item_id?: string
          quantity_required?: number
          wastage_percent?: number
          unit_cost_at_time?: number | null
          line_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_components_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_components_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_orders: {
        Row: {
          id: string
          restaurant_id: string
          order_number: string
          table_number: string | null
          order_date: string
          subtotal: number
          tax_amount: number
          total_amount: number
          payment_method: string | null
          journal_entry_id: string | null
          cogs_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          order_number: string
          table_number?: string | null
          order_date?: string
          subtotal?: number
          tax_amount?: number
          total_amount: number
          payment_method?: string | null
          journal_entry_id?: string | null
          cogs_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          order_number?: string
          table_number?: string | null
          order_date?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          payment_method?: string | null
          journal_entry_id?: string | null
          cogs_entry_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_order_lines: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          unit_price: number
          total_price: number
          theoretical_cogs: number
          actual_cogs: number
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id: string
          quantity?: number
          unit_price: number
          total_price: number
          theoretical_cogs: number
          actual_cogs: number
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          theoretical_cogs?: number
          actual_cogs?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_order_lines_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_consumption: {
        Row: {
          id: string
          restaurant_id: string
          order_id: string | null
          item_id: string
          warehouse_id: string | null
          consumed_qty: number
          unit_cost: number
          total_cost: number
          consumed_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          order_id?: string | null
          item_id: string
          warehouse_id?: string | null
          consumed_qty: number
          unit_cost: number
          total_cost: number
          consumed_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          order_id?: string | null
          item_id?: string
          warehouse_id?: string | null
          consumed_qty?: number
          unit_cost?: number
          total_cost?: number
          consumed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_consumption_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
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

      // Pharmacy Module
      inventory_batches: {
        Row: {
          id: string
          item_id: string
          batch_number: string
          manufacturing_date: string | null
          expiry_date: string
          initial_qty: number
          remaining_qty: number
          unit_cost: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          batch_number: string
          manufacturing_date?: string | null
          expiry_date: string
          initial_qty: number
          remaining_qty?: number
          unit_cost: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          batch_number?: string
          manufacturing_date?: string | null
          expiry_date?: string
          initial_qty?: number
          remaining_qty?: number
          unit_cost?: number
          status?: string
          created_at?: string
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
      batch_consumption: {
        Row: {
          id: string
          batch_id: string
          sale_line_id: string | null
          consumed_qty: number
          consumed_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          sale_line_id?: string | null
          consumed_qty: number
          consumed_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          sale_line_id?: string | null
          consumed_qty?: number
          consumed_at?: string
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

      // Expenses Module
      expense_vouchers: {
        Row: {
          id: string
          restaurant_id: string
          voucher_number: string
          voucher_date: string
          expense_account_id: string
          category: string | null
          description: string | null
          amount: number
          tax_amount: number
          total_amount: number
          payment_method: string | null
          bank_account_id: string | null
          journal_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          voucher_number: string
          voucher_date?: string
          expense_account_id: string
          category?: string | null
          description?: string | null
          amount?: number
          tax_amount?: number
          total_amount?: number
          payment_method?: string | null
          bank_account_id?: string | null
          journal_entry_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          voucher_number?: string
          voucher_date?: string
          expense_account_id?: string
          category?: string | null
          description?: string | null
          amount?: number
          tax_amount?: number
          total_amount?: number
          payment_method?: string | null
          bank_account_id?: string | null
          journal_entry_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_vouchers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
            foreignKeyName: "expense_vouchers_bank_account_id_fkey"
            columns: ["bank_account_id"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      validate_journal_balance: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      post_journal_entry: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
    }

    Enums: {
      app_role: "super_admin" | "restaurant_owner"
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
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "restaurant_owner"],
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
      ],
    },
  },
} as const
