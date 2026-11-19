import React from 'react';
import { PulseAI } from '../animations/MotionContainer';

export interface StatusIndicatorProps {
  status?: 'operational' | 'analyzing' | 'warning' | 'idle';
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = 'operational',
  label,
  sublabel,
  size = 'md',
  className = '',
}) => {
  const configs = {
    operational: {
      color: 'bg-emerald-500',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      defaultLabel: 'AI Engine Active',
    },
    analyzing: {
      color: 'bg-teal-500',
      text: 'text-teal-700',
      bg: 'bg-teal-50 border-teal-200',
      defaultLabel: 'Analyzing Data',
    },
    warning: {
      color: 'bg-amber-500',
      text: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      defaultLabel: 'Anomalies Flagged',
    },
    idle: {
      color: 'bg-slate-400',
      text: 'text-slate-600',
      bg: 'bg-slate-50 border-slate-200',
      defaultLabel: 'Awaiting Records',
    },
  };

  const config = configs[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <PulseAI size={size === 'sm' ? 'sm' : 'md'} />
      <span className="font-semibold">{displayLabel}</span>
      {sublabel && <span className="opacity-75 font-normal">({sublabel})</span>}
    </div>
  );
};

export default StatusIndicator;

