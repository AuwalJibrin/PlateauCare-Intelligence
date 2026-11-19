import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import OfficerDashboard from './OfficerDashboard';
import FacilityReporterDashboard from './FacilityReporterDashboard';
import WorkforceReporterDashboard from './WorkforceReporterDashboard';
import CommunityReporterDashboard from './CommunityReporterDashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { AlertBanner } from '../../components/common/AlertBanner';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const DashboardDispatcher: React.FC = () => {
  const { user, role, logout } = useAuth();

  switch (role) {
    case 'SYSTEM_ADMIN':
      return <AdminDashboard />;

    case 'PUBLIC_HEALTH_OFFICER':
      return <OfficerDashboard />;

    case 'HEALTH_FACILITY_REPORTER':
      return <FacilityReporterDashboard />;

    case 'WORKFORCE_REPORTER':
      return <WorkforceReporterDashboard />;

    case 'COMMUNITY_REPORTER':
      return <CommunityReporterDashboard />;

    case 'UNASSIGNED':
    default:
      return (
        <div className="max-w-2xl mx-auto py-12 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Account Pending Role Assignment</h1>
            <p className="text-xs text-slate-500">
              Logged in as <strong className="text-slate-800">{user?.username}</strong> ({user?.email || 'No email registered'})
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome to PlateauCare Intelligence</CardTitle>
              <CardDescription>
                Your account authentication was successful, but your profile has not yet been assigned a public health role or territorial jurisdiction.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertBanner
                type="warning"
                title="Authorization Required"
                message="To access specific surveillance and reporting dashboards, a System Administrator must assign your role (Public Health Officer, Health Facility Reporter, Workforce Reporter, or Community Reporter) and bind your account to an LGA or verified health facility in Django Admin."
              />

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                <h4 className="font-semibold text-slate-800 uppercase tracking-wider">Next Steps:</h4>
                <p>1. Notify your supervisor or the Ministry of Health IT focal point of your username ({user?.username}).</p>
                <p>2. Once your profile is updated in the administrative backend, refresh your session to load your assigned operational dashboard.</p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Refresh Session
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
  }
};

export default DashboardDispatcher;
