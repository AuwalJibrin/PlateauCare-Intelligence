import React from 'react';
import { Menu, MapPin, Building2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { RoleBadge } from '../components/common/Badge';

interface TopbarProps {
  onMobileMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileMenuToggle }) => {
  const { user, role } = useAuth();

  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Toggle & Contextual Badges */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {user?.lga_name && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
              <span>LGA: {user.lga_name}</span>
            </div>
          )}

          {user?.health_facility_name && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[200px]">{user.health_facility_name}</span>
            </div>
          )}

          <div className="hidden lg:block">
            <StatusIndicator status="operational" size="sm" label="Early Warning Engine" />
          </div>
        </div>
      </div>

      {/* Right: Date, Role and User Avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-slate-800">{currentDate}</p>
          <p className="text-[10px] text-slate-400 font-mono">Plateau State Time</p>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-400 font-bold text-xs flex items-center justify-center border border-slate-700 shadow-2xs">
            {user?.username ? user.username.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.username || 'Officer'}
            </p>
            <RoleBadge role={role} size="sm" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
