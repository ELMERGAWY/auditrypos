import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { type Permission } from '@/types/auth';

interface PermissionGateProps {
  /** Coarse permission from ROLE_PERMISSIONS map */
  permission?: Permission;
  /** Coarse role check */
  role?: 'admin' | 'manager' | 'cashier';
  /** Fine-grained permission code (e.g. "inventory.edit", "pos.discount") */
  can?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  role,
  can: codeProp,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, isRole, can, isLoading } = usePermissions();

  if (isLoading) return null;

  const passPermission = permission ? hasPermission(permission) : true;
  const passRole = role ? isRole(role) : true;
  const passCode = codeProp ? can(codeProp) : true;

  if (passPermission && passRole && passCode) return <>{children}</>;
  return <>{fallback}</>;
}
