import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Building2,
  Activity,
  BellRing,
  ExternalLink,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import coreService from '../../services/coreService';
import surveillanceService from '../../services/surveillanceService';
import environmentService from '../../services/environmentService';
import workforceService from '../../services/workforceService';
import communityService from '../../services/communityService';
import intelligenceService from '../../services/intelligenceService';
import responseService from '../../services/responseService';
import type {
  LocalGovernmentArea,
  HealthFacility,
  DiseaseReport,
  EnvironmentalObservation,
  WorkforceHealthRecord,
  CommunityHealthRecord,
  HealthRiskAssessment,
  PublicHealthAlert,
} from '../../types';
import { MetricCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import type { Column } from '../../components/common/Table';
import { RiskBadge, AlertStatusBadge } from '../../components/common/Badge';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';
import { PlateauStateMap } from '../../components/map/PlateauStateMap';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);
  const [facilities, setFacilities] = useState<HealthFacility[]>([]);
  const [diseaseReports, setDiseaseReports] = useState<DiseaseReport[]>([]);
  const [envObservations, setEnvObservations] = useState<EnvironmentalObservation[]>([]);
  const [workforceRecords, setWorkforceRecords] = useState<WorkforceHealthRecord[]>([]);
  const [communityRecords, setCommunityRecords] = useState<CommunityHealthRecord[]>([]);
  const [assessments, setAssessments] = useState<HealthRiskAssessment[]>([]);
  const [alerts, setAlerts] = useState<PublicHealthAlert[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        lgasData,
        facilitiesData,
        reportsData,
        envData,
        workforceData,
        commData,
        assessmentsData,
        alertsData,
      ] = await Promise.all([
        coreService.getLGAs().catch(() => []),
        coreService.getHealthFacilities().catch(() => []),
        surveillanceService.getReports().catch(() => []),
        environmentService.getObservations().catch(() => []),
        workforceService.getRecords().catch(() => []),
        communityService.getRecords().catch(() => []),
        intelligenceService.getRiskAssessments().catch(() => []),
        responseService.getAlerts().catch(() => []),
      ]);

      setLgas(lgasData);
      setFacilities(facilitiesData);
      setDiseaseReports(reportsData);
      setEnvObservations(envData);
      setWorkforceRecords(workforceData);
      setCommunityRecords(commData);
      setAssessments(assessmentsData);
      setAlerts(alertsData);
    } catch {
      setError('Failed to retrieve statewide administrative indicators. Check API connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAlertsCount = alerts.filter((a) => a.status === 'OPEN').length;
  const criticalRiskCount = assessments.filter((a) => a.risk_level === 'CRITICAL').length;
  const highRiskCount = assessments.filter((a) => a.risk_level === 'HIGH').length;

  // Chart: Domain Coverage Breakdown
  const domainCoverageData = [
    { name: 'Disease Reports', count: diseaseReports.length, fill: '#0D9488' },
    { name: 'Environmental', count: envObservations.length, fill: '#0284C7' },
    { name: 'Workforce Records', count: workforceRecords.length, fill: '#D97706' },
    { name: 'Community Records', count: communityRecords.length, fill: '#16A34A' },
  ];

  // Table columns for recent alerts
  const alertColumns: Column<PublicHealthAlert>[] = [
    {
      key: 'title',
      header: 'Alert Title',
      render: (a) => (
        <div>
          <p className="font-semibold text-slate-900">{a.title}</p>
          <p className="text-[11px] text-slate-500">{a.lga_name} • {a.assessment_date}</p>
        </div>
      ),
    },
    {
      key: 'risk_level',
      header: 'Severity',
      render: (a) => <RiskBadge level={a.risk_level} size="sm" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <AlertStatusBadge status={a.status} size="sm" />,
    },
    {
      key: 'recommended_action',
      header: 'Recommended Response Action',
      render: (a) => <span className="text-xs text-slate-600 line-clamp-1">{a.recommended_action}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Statewide Administration Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-teal-400 font-semibold text-xs border border-slate-800">
              System Administrator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong className="text-slate-700">{user?.username}</strong> • Comprehensive multi-domain surveillance telemetry across all 17 LGAs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Telemetry
          </Button>
          <a
            href="/admin/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            <span>Django Admin</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {error && (
        <AlertBanner
          type="danger"
          title="Telemetry Connectivity Issue"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="Monitored LGAs"
              value={lgas.length}
              numericValue={lgas.length}
              subtitle="Full territorial coverage"
              icon={<MapPin className="w-5 h-5" />}
              accentColor="teal"
            />
            <MetricCard
              title="Registered Facilities"
              value={facilities.length}
              numericValue={facilities.length}
              subtitle="Primary & Secondary Centers"
              icon={<Building2 className="w-5 h-5" />}
              accentColor="navy"
            />
            <MetricCard
              title="Total Observations"
              value={diseaseReports.length + envObservations.length + workforceRecords.length + communityRecords.length}
              numericValue={diseaseReports.length + envObservations.length + workforceRecords.length + communityRecords.length}
              subtitle="Across all 4 data domains"
              icon={<Activity className="w-5 h-5" />}
              accentColor="green"
            />
            <MetricCard
              title="Active Risk Warnings"
              value={openAlertsCount}
              numericValue={openAlertsCount}
              subtitle={`${criticalRiskCount} Critical • ${highRiskCount} High`}
              icon={<BellRing className="w-5 h-5" />}
              accentColor={openAlertsCount > 0 ? 'red' : 'green'}
            />
          </>
        )}
      </div>

      {/* Surveillance Matrix & Visual Coverage Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coverage Chart */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Surveillance Ingestion Telemetry</CardTitle>
              <CardDescription>Records currently indexed by the database</CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainCoverageData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" fontSize={11} stroke="#64748B" />
                  <YAxis type="category" dataKey="name" fontSize={10} width={90} stroke="#64748B" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#2DD4BF' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
              Integrated across clinical, environmental, workforce, and community domains.
            </div>
          </Card>
        </div>

        {/* Administration Governance Overview */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Administration & Audit Controls</CardTitle>
                  <CardDescription>
                    Official Django administration portal integration
                  </CardDescription>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  Governance
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 text-teal-400 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">User Account & Role Management</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      User creation, credential administration, role assignment (System Admin, Public Health Officer, Facility Reporter, Workforce Reporter, Community Reporter), and LGA bindings take place within the authenticated Django Administration console.
                    </p>
                  </div>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <a
                    href="/admin/auth/user/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <span>Manage User Accounts</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                  <a
                    href="/admin/core/healthfacility/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <span>Verify Health Facilities</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                  <a
                    href="/admin/auditlog/auditlog/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <span>Audit Trail Log</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Clinical</span>
                  <span className="text-lg font-bold text-teal-700">{diseaseReports.length}</span>
                  <span className="text-[10px] text-slate-500 block">Reports Filed</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Weather</span>
                  <span className="text-lg font-bold text-blue-700">{envObservations.length}</span>
                  <span className="text-[10px] text-slate-500 block">Readings Taken</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Workforce</span>
                  <span className="text-lg font-bold text-amber-700">{workforceRecords.length}</span>
                  <span className="text-[10px] text-slate-500 block">Logs Filed</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Outreach</span>
                  <span className="text-lg font-bold text-emerald-700">{communityRecords.length}</span>
                  <span className="text-[10px] text-slate-500 block">Screenings</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Spatial 17-LGA Map & Anomaly Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Plateau State 17 LGAs Spatial Risk Grid</h2>
            <p className="text-xs text-slate-500">Live AI risk status mapped from latest batch assessments</p>
          </div>
          <Link to="/intelligence">
            <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
              Open AI Intelligence Centre
            </Button>
          </Link>
        </div>
        <PlateauStateMap
          assessments={assessments}
          alerts={alerts}
           />
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Public Health Warning Triage</h2>
            <p className="text-xs text-slate-500">Latest active alerts generated by multivariate anomaly spikes</p>
          </div>
          <Link to="/alerts">
            <Button variant="primary" size="sm">
              Manage All Alerts ({alerts.length})
            </Button>
          </Link>
        </div>

        <Table
          columns={alertColumns}
          data={alerts.slice(0, 5)}
          keyExtractor={(a) => a.id}
          isLoading={isLoading}
          emptyMessage="No active public health alerts"
          emptySubtitle="All LGA surveillance indicators are currently within expected ranges."
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
