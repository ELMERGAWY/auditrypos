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
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "delivery_agents_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "license_keys_used_by_fkey"
            columns: ["used_by"]
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
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          calculated_cost_price: number | null
          category: string
          created_at: string
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
        }
        Insert: {
          available?: boolean
          calculated_cost_price?: number | null
          category?: string
          created_at?: string
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
        }
        Update: {
          available?: boolean
          calculated_cost_price?: number | null
          category?: string
          created_at?: string
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
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
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
          {
            foreignKeyName: "notifications_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "payment_receipts_restaurant_id_fkey"
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
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          currency: string
          delivery_fee: number | null
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
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          currency?: string
          delivery_fee?: number | null
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
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          currency?: string
          delivery_fee?: number | null
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
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
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
          {
            foreignKeyName: "waiter_calls_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      // VENTRO PRO: NEW ACCOUNTING TABLES
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          is_bank_account: boolean
          is_cash_account: boolean
          name: string
          opening_balance: number
          parent_id: string | null
          restaurant_id: string
          subtype: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          is_bank_account?: boolean
          is_cash_account?: boolean
          name: string
          opening_balance?: number
          parent_id?: string | null
          restaurant_id: string
          subtype?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          is_bank_account?: boolean
          is_cash_account?: boolean
          name?: string
          opening_balance?: number
          parent_id?: string | null
          restaurant_id?: string
          subtype?: string | null
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          is_posted: boolean
          is_recurring: boolean
          reference_id: string | null
          reference_type: string | null
          restaurant_id: string
          source: string
          total_credit: number
          total_debit: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          entry_number: string
          id?: string
          is_posted?: boolean
          is_recurring?: boolean
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id: string
          source?: string
          total_credit?: number
          total_debit?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          is_posted?: boolean
          is_recurring?: boolean
          reference_id?: string | null
          reference_type?: string | null
          restaurant_id?: string
          source?: string
          total_credit?: number
          total_debit?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          line_order: number
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          line_order?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          line_order?: number
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
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_cost_layers: {
        Row: {
          consumed_at: string | null
          created_at: string
          id: string
          is_consumed: boolean
          layer_date: string
          layer_type: string
          product_id: string
          quantity: number
          reference_id: string | null
          remaining_qty: number
          restaurant_id: string
          unit_cost: number
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          id?: string
          is_consumed?: boolean
          layer_date?: string
          layer_type?: string
          product_id: string
          quantity: number
          reference_id?: string | null
          remaining_qty?: number
          restaurant_id: string
          unit_cost: number
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          id?: string
          is_consumed?: boolean
          layer_date?: string
          layer_type?: string
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
            foreignKeyName: "inventory_cost_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          applies_to: string[]
          created_at: string
          id: string
          is_active: boolean
          is_compound: boolean
          is_included_in_price: boolean
          name: string
          rate: number
          restaurant_id: string
          type: string
        }
        Insert: {
          applies_to?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          is_compound?: boolean
          is_included_in_price?: boolean
          name: string
          rate: number
          restaurant_id: string
          type?: string
        }
        Update: {
          applies_to?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          is_compound?: boolean
          is_included_in_price?: boolean
          name?: string
          rate?: number
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_taxes: {
        Row: {
          created_at: string
          id: string
          order_id: string
          tax_amount: number
          tax_rate_id: string
          tax_type: string
          taxable_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          tax_amount: number
          tax_rate_id: string
          tax_type: string
          taxable_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          tax_amount?: number
          tax_rate_id?: string
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
            foreignKeyName: "order_taxes_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          restaurant_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          restaurant_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          restaurant_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      // VENTRO PRO: ADDITIONAL BUSINESS TABLES
      inventory_consumption: {
        Row: {
          consumed_at: string
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          consumed_at?: string
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_cost?: number
        }
        Update: {
          consumed_at?: string
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          location: string | null
          qr_code: string | null
          restaurant_id: string
          status: string
          table_number: number
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          location?: string | null
          qr_code?: string | null
          restaurant_id: string
          status?: string
          table_number: number
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          location?: string | null
          qr_code?: string | null
          restaurant_id?: string
          status?: string
          table_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          commission_rate: number
          created_at: string
          email: string | null
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          restaurant_id: string
          role: string
          salary: number | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          restaurant_id: string
          role?: string
          salary?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          restaurant_id?: string
          role?: string
          salary?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_overheads: {
        Row: {
          created_at: string
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
          updated_at: string
        }
        Insert: {
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_overheads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string
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
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
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
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
            foreignKeyName: "sales_returns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          condition: string | null
          cost_price_at_return: number | null
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
            foreignKeyName: "sales_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      purchase_returns: {
        Row: {
          created_at: string
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
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
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
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_inventory_receipt_id_fkey"
            columns: ["inventory_receipt_id"]
            isOneToOne: false
            referencedRelation: "inventory_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          batch_number: string | null
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
            foreignKeyName: "purchase_return_items_purchase_return_id_fkey"
            columns: ["purchase_return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
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
      // VENTRO PRO: ACCOUNTING FUNCTIONS
      create_default_chart_of_accounts: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      update_account_balance: {
        Args: { p_account_id: string; p_amount: number }
        Returns: undefined
      }
      calculate_fifo_cost: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: {
          total_cost: number
          avg_unit_cost: number
          layers_used: number
        }
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
