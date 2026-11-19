
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import FeaturesPage from './pages/public/FeaturesPage';
import LoginPage from './pages/public/LoginPage';

import DashboardDispatcher from './pages/dashboards/DashboardDispatcher';

// Monitoring module pages
import SurveillancePage from './pages/modules/SurveillancePage';
import EnvironmentalPage from './pages/modules/EnvironmentalPage';
import WorkforcePage from './pages/modules/WorkforcePage';
import CommunityPage from './pages/modules/CommunityPage';

// AI Intelligence Centre
import IntelligencePage from './pages/modules/IntelligencePage';

// Alerts and Response Centre
import AlertsPage from './pages/modules/AlertsPage';

// Shared components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/common/Card';

import { AlertBanner } from './components/common/AlertBanner';
import { ExternalLink } from 'lucide-react';

// Admin Information pages for Django Admin governance
const AdminInfoPage: React.FC<{
  title: string;
  target: string;
  description: string;
}> = ({ title, target, description }) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-2xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="text-sm text-slate-500">
          {description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Administration Portal</CardTitle>

          <CardDescription>
            In accordance with platform governance,{' '}
            {title.toLowerCase()} are managed centrally through the
            Django Administration panel.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <AlertBanner
            type="info"
            title="Backend Administration Mode"
            message={`Management for this section is securely handled through Django Admin (${target}). The frontend does not fabricate REST CRUD interfaces for unavailable backend endpoints.`}
          />

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Administrative Access
            </h4>

            <p className="text-xs text-slate-600">
              Superusers and designated system administrators can
              access the full management interface via the secure
              Django portal.
            </p>

            <div className="pt-2">
              <a
                href={target}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <span>Launch Django Administration</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ====================================== */}
          {/* PUBLIC ROUTES                         */}
          {/* ====================================== */}

          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* ====================================== */}
          {/* PROTECTED DASHBOARD ROUTES            */}
          {/* ====================================== */}

          <Route element={<DashboardLayout />}>

            <Route
              path="/dashboard"
              element={<DashboardDispatcher />}
            />

            {/* ================================== */}
            {/* MONITORING MODULES                 */}
            {/* ================================== */}

            <Route
              path="/surveillance"
              element={<SurveillancePage />}
            />

            <Route
              path="/environment"
              element={<EnvironmentalPage />}
            />

            <Route
              path="/workforce"
              element={<WorkforcePage />}
            />

            <Route
              path="/community"
              element={<CommunityPage />}
            />

            {/* ================================== */}
            {/* AI INTELLIGENCE CENTRE             */}
            {/* ================================== */}

            <Route
              path="/intelligence"
              element={<IntelligencePage />}
            />

            {/* ================================== */}
            {/* ALERTS AND RESPONSE CENTRE         */}
            {/* ================================== */}

            <Route
              path="/alerts"
              element={<AlertsPage />}
            />

            {/* ================================== */}
            {/* SYSTEM ADMINISTRATION              */}
            {/* ================================== */}

            <Route
              path="/admin/users"
              element={
                <AdminInfoPage
                  title="User Management"
                  target="/admin/auth/user/"
                  description="Administrative user profiles, roles, and facility assignments."
                />
              }
            />

            <Route
              path="/admin/audit-logs"
              element={
                <AdminInfoPage
                  title="Audit Logs"
                  target="/admin/auditlog/auditlog/"
                  description="System audit trail records, actions, and administrative compliance."
                />
              }
            />

          </Route>

          {/* ====================================== */}
          {/* CATCH-ALL ROUTE                       */}
          {/* ====================================== */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
