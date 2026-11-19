import React from 'react';
import { AnimatedCounter } from '../animations/MotionContainer';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'muted' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-white border border-slate-200/80 shadow-xs rounded-xl',
    bordered: 'bg-white border-2 border-slate-200 rounded-xl',
    muted: 'bg-slate-50/70 border border-slate-200/60 rounded-xl',
    interactive:
      'bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-500/50 transition-all rounded-xl cursor-pointer',
  };

  return (
    <div className={`${variantClasses[variant]} overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 pb-3 border-b border-slate-100 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-slate-900 tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-500 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-600 ${className}`} {...props}>
    {children}
  </div>
);

export interface MetricCardProps {
  title: string;
  value: number | string;
  numericValue?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: 'teal' | 'navy' | 'amber' | 'red' | 'green';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  numericValue,
  subtitle,
  icon,
  badge,
  trend,
  accentColor = 'teal',
  className = '',
}) => {
  const accentBorder = {
    teal: 'border-l-4 border-l-teal-600',
    navy: 'border-l-4 border-l-slate-900',
    amber: 'border-l-4 border-l-amber-500',
    red: 'border-l-4 border-l-red-600',
    green: 'border-l-4 border-l-emerald-600',
  };

  const iconBg = {
    teal: 'bg-teal-50 text-teal-700',
    navy: 'bg-slate-100 text-slate-800',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <Card className={`p-5 ${accentBorder[accentColor]} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {typeof numericValue === 'number' ? (
              <AnimatedCounter value={numericValue} />
            ) : (
              value
            )}
          </div>
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg shrink-0 ${iconBg[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-slate-500 truncate">{subtitle}</div>
          {badge}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {trend.value} {trend.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

