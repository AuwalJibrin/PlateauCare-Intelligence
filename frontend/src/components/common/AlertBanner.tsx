import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export interface AlertBannerProps {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-50/80',
      border: 'border-blue-200',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      subtext: 'text-emerald-700',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-200',
      text: 'text-amber-900',
      subtext: 'text-amber-700',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    },
    danger: {
      bg: 'bg-red-50/80',
      border: 'border-red-200',
      text: 'text-red-900',
      subtext: 'text-red-700',
      icon: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
    },
  };

  const style = styles[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} ${className}`}
    >
      <div className="pt-0.5">{style.icon}</div>
      <div className="flex-1 text-sm">
        {title && <h4 className={`font-semibold ${style.text}`}>{title}</h4>}
        <div className={`${title ? 'mt-0.5' : ''} ${style.subtext}`}>{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;

