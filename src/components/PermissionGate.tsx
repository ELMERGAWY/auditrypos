
import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { type Permission } from '@/types/auth';

interface PermissionGateProps {
  permission?: Permission;
  role?: 'admin' | 'manager' | 'cashier';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ 
  permission, 
  role, 
  children, 
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, isRole, isLoading } = usePermissions();

  if (isLoading) return null;

  const hasAccess = permission ? hasPermission(permission) : true;
  const hasRole = role ? isRole(role) : true;

  if (hasAccess && hasRole) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
