
export type UserRole = 'admin' | 'manager' | 'cashier';

export type Permission = 
  | 'view_finance' 
  | 'edit_inventory' 
  | 'manage_users' 
  | 'create_sales' 
  | 'process_returns'
  | 'view_reports'
  | 'manage_crm'
  | 'delete_orders';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_finance',
    'edit_inventory',
    'manage_users',
    'create_sales',
    'process_returns',
    'view_reports',
    'manage_crm',
    'delete_orders'
  ],
  manager: [
    'view_finance',
    'edit_inventory',
    'create_sales',
    'process_returns',
    'view_reports',
    'manage_crm'
  ],
  cashier: [
    'create_sales',
    'process_returns',
    'manage_crm'
  ]
};

export interface UserAuthProfile {
  id: string;
  email: string;
  role: UserRole;
  restaurant_id: string;
  name?: string;
}
