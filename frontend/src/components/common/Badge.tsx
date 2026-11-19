import React from 'react';
import type { RiskLevel, AlertStatus, UserRole } from '../../types';
import { AlertCircle, CheckCircle, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

interface GenericBadgeProps {
  children: React.ReactNode;
  variant?: 'slate' | 'teal' | 'green' | 'amber' | 'orange' | 'red';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<GenericBadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantStyles = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    orange: 'bg-orange-50 text-orange-800 border-orange-200',
    red: 'bg-red-50 text-red-800 border-red-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export const RiskBadge: React.FC<{ level: RiskLevel; size?: 'sm' | 'md'; showIcon?: boolean }> = ({
  level,
  size = 'md',
  showIcon = true,
}) => {
  const configs: Record<
    RiskLevel,
    { label: string; variant: 'green' | 'amber' | 'orange' | 'red'; icon: React.ReactNode }
  > = {
    LOW: {
      label: 'Low Risk',
      variant: 'green',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
    },
    MODERATE: {
      label: 'Moderate Risk',
      variant: 'amber',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
    },
    HIGH: {
      label: 'High Risk',
      variant: 'orange',
      icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />,
    },
    CRITICAL: {
      label: 'Critical Risk',
      variant: 'red',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600" />,
    },
  };

  const config = configs[level] || configs.LOW;

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={showIcon ? config.icon : undefined}
    >
      {config.label}
    </Badge>
  );
};

export const AlertStatusBadge: React.FC<{ status: AlertStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const configs: Record<
    AlertStatus,
    { label: string; variant: 'amber' | 'teal' | 'green' | 'slate'; icon: React.ReactNode }
  > = {
    OPEN: {
      label: 'Open Alert',
      variant: 'amber',
      icon: <AlertCircle className="w-3 h-3 text-amber-600" />,
    },
    ACKNOWLEDGED: {
      label: 'Acknowledged',
      variant: 'teal',
      icon: <Clock className="w-3 h-3 text-teal-600" />,
    },
    RESOLVED: {
      label: 'Resolved',
      variant: 'green',
      icon: <CheckCircle className="w-3 h-3 text-emerald-600" />,
    },
    DISMISSED: {
      label: 'Dismissed',
      variant: 'slate',
      icon: null,
    },
  };

  const config = configs[status] || configs.OPEN;

  return (
    <Badge variant={config.variant} size={size} icon={config.icon}>
      {config.label}
    </Badge>
  );
};

export const RoleBadge: React.FC<{ role: UserRole; size?: 'sm' | 'md' }> = ({
  role,
  size = 'sm',
}) => {
  const configs: Record<UserRole, { label: string; variant: GenericBadgeProps['variant'] }> = {
    SYSTEM_ADMIN: { label: 'System Admin', variant: 'slate' },
    PUBLIC_HEALTH_OFFICER: { label: 'Health Officer', variant: 'teal' },
    HEALTH_FACILITY_REPORTER: { label: 'Facility Reporter', variant: 'green' },
    WORKFORCE_REPORTER: { label: 'Workforce Reporter', variant: 'amber' },
    COMMUNITY_REPORTER: { label: 'Community Reporter', variant: 'orange' },
    UNASSIGNED: { label: 'Unassigned', variant: 'slate' },
  };

  const config = configs[role] || { label: role, variant: 'slate' };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};
