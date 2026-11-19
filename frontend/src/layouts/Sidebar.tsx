import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  CloudRain,
  Briefcase,
  Users,
  BrainCircuit,
  BellRing,
  UserCog,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/common/Badge';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}) => {
  const { user, role, isAdmin, isOfficer, isFacilityReporter, isWorkforceReporter, isCommunityReporter, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    visible: boolean;
  }

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      visible: true,
    },
    {
      label: 'Disease Surveillance',
      path: '/surveillance',
      icon: <Activity className="w-5 h-5 shrink-0" />,
      visible: isOfficer || isFacilityReporter,
    },
    {
      label: 'Environmental Monitoring',
      path: '/environment',
      icon: <CloudRain className="w-5 h-5 shrink-0" />,
      visible: isOfficer,
    },
    {
      label: 'Workforce Monitoring',
      path: '/workforce',
      icon: <Briefcase className="w-5 h-5 shrink-0" />,
      visible: isOfficer || isWorkforceReporter,
    },
    {
      label: 'Community Monitoring',
      path: '/community',
      icon: <Users className="w-5 h-5 shrink-0" />,
      visible: isOfficer || isCommunityReporter,
    },
    {
      label: 'AI Intelligence Centre',
      path: '/intelligence',
      icon: <BrainCircuit className="w-5 h-5 shrink-0" />,
      visible: isOfficer,
    },
    {
      label: 'Alerts & Response',
      path: '/alerts',
      icon: <BellRing className="w-5 h-5 shrink-0" />,
      visible: isOfficer,
    },
    {
      label: 'User Management',
      path: '/admin/users',
      icon: <UserCog className="w-5 h-5 shrink-0" />,
      visible: isAdmin,
    },
    {
      label: 'Audit Logs',
      path: '/admin/audit-logs',
      icon: <FileText className="w-5 h-5 shrink-0" />,
      visible: isAdmin,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="font-bold text-sm text-white tracking-tight">
                  PlateauCare
                </span>
                <span className="text-[10px] text-teal-400 font-semibold block leading-tight">
                  Health Intelligence
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Context Banner (When not collapsed) */}
        {!isCollapsed && user && (
          <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-white truncate">{user.username}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {user.lga_name ? `LGA: ${user.lga_name}` : user.health_facility_name ? user.health_facility_name : 'Statewide'}
              </p>
            </div>
            <RoleBadge role={role} size="sm" />
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-1">
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
