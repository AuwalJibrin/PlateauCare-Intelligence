
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CloudRain,
  BrainCircuit,
  BellRing,
  MapPin,
  RefreshCw,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import surveillanceService from '../../services/surveillanceService';
import environmentService from '../../services/environmentService';
import intelligenceService from '../../services/intelligenceService';
import responseService from '../../services/responseService';
import type {
  DiseaseReport,
  EnvironmentalObservation,
  HealthRiskAssessment,
  PublicHealthAlert,
} from '../../types';
import {
  MetricCard,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import type { Column } from '../../components/common/Table';
import { RiskBadge, AlertStatusBadge } from '../../components/common/Badge';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';
import { Modal } from '../../components/common/Modal';
import { PlateauStateMap } from '../../components/map/PlateauStateMap';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

/* =========================================================
   1. TYPES AND HELPER FUNCTIONS
========================================================= */

type FactorDisplay = {
  name: string;
  value: string;
  sortValue: number;
};

/**
 * Converts AI contributing factors into displayable entries.
 */
const getFactorEntries = (factors: unknown): FactorDisplay[] => {
  if (!factors || typeof factors !== 'object') {
    return [];
  }

  const entries: Array<[string, unknown]> = Array.isArray(factors)
    ? factors.map(
        (item: unknown, index: number): [string, unknown] => [
          String(index + 1),
          item,
        ],
      )
    : Object.entries(factors as Record<string, unknown>);

  return entries
    .map(([key, rawValue]) => {
      let name = key;
      let value: unknown = rawValue;

      if (
        rawValue !== null &&
        typeof rawValue === 'object' &&
        !Array.isArray(rawValue)
      ) {
        const record = rawValue as Record<string, unknown>;

        const possibleName =
          record.factor ??
          record.name ??
          record.feature ??
          record.key;

        if (
          typeof possibleName === 'string' ||
          typeof possibleName === 'number'
        ) {
          name = String(possibleName);
        } else if (Array.isArray(factors)) {
          name = `Indicator ${key}`;
        }

        value =
          record.score ??
          record.value ??
          record.contribution ??
          record.deviation ??
          record.iqr_deviation ??
          rawValue;
      } else if (Array.isArray(factors)) {
        name = `Indicator ${key}`;
      }

      const numericValue =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : Number.NaN;

      let displayValue: string;

      if (Number.isFinite(numericValue)) {
        displayValue = numericValue.toFixed(3);
      } else if (typeof value === 'string') {
        displayValue = value;
      } else {
        try {
          displayValue = JSON.stringify(value) ?? 'Not available';
        } catch {
          displayValue = 'Not available';
        }
      }

      return {
        name,
        value: displayValue,
        sortValue: Number.isFinite(numericValue)
          ? Math.abs(numericValue)
          : 0,
      };
    })
    .sort((a, b) => b.sortValue - a.sortValue);
};

/**
 * Formats factor names for display.
 */
const formatFactorName = (name: string): string =>
  name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Formats the normalized anomaly score as a percentage.
 * This is not an outbreak probability.
 */
const formatAnomalyScore = (score: number): string => {
  if (!Number.isFinite(score)) {
    return 'N/A';
  }

  return `${(score * 100).toFixed(1)}%`;
};

/* =========================================================
   2. DASHBOARD COMPONENT
========================================================= */

export const OfficerDashboard: React.FC = () => {
  const { user, role } = useAuth();

  /* -------------------------------------------------------
     2.1 USER ACCESS AND MONITORING SCOPE
  ------------------------------------------------------- */

  const assignedLgaId = user?.lga_id || undefined;
  const assignedLgaName = user?.lga_name || 'Assigned LGA';

  // System administrators have statewide access.
  // Public health officers are restricted by their assigned LGA.
  const isStatewideView = role === 'SYSTEM_ADMIN';

  const dashboardScope = isStatewideView
    ? 'Plateau State — All 17 LGAs'
    : assignedLgaId
      ? assignedLgaName
      : 'No LGA Assigned';

  const requestParams = isStatewideView
    ? undefined
    : assignedLgaId
      ? { lga: assignedLgaId }
      : undefined;

  /* -------------------------------------------------------
     2.2 DASHBOARD STATE
  ------------------------------------------------------- */

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [diseaseReports, setDiseaseReports] = useState<DiseaseReport[]>([]);
  const [envObservations, setEnvObservations] = useState<
    EnvironmentalObservation[]
  >([]);
  const [riskAssessments, setRiskAssessments] = useState<
    HealthRiskAssessment[]
  >([]);
  const [alerts, setAlerts] = useState<PublicHealthAlert[]>([]);

  // Alert management modal.
  const [selectedAlert, setSelectedAlert] =
    useState<PublicHealthAlert | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  /* =========================================================
     3. DATA RETRIEVAL
  ========================================================= */

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    // Prevent accounts without an assigned LGA from requesting
    // unscoped dashboard data.
    if (!isStatewideView && !assignedLgaId) {
      setDiseaseReports([]);
      setEnvObservations([]);
      setRiskAssessments([]);
      setAlerts([]);

      setError(
        'Your account does not have an assigned LGA. Please contact the System Administrator.',
      );

      setIsLoading(false);
      return;
    }

    try {
      // Each request is handled independently so that one
      // failed service does not prevent other data from loading.
      const [
        reportsResult,
        environmentResult,
        assessmentsResult,
        alertsResult,
      ] = await Promise.all([
        surveillanceService.getReports(requestParams).then(
          (data) => ({ data, error: null as string | null }),
          (err) => {
            console.error('Disease reports request failed:', err);

            return {
              data: [] as DiseaseReport[],
              error: 'Unable to retrieve disease surveillance reports.',
            };
          },
        ),

        environmentService.getObservations(requestParams).then(
          (data) => ({ data, error: null as string | null }),
          (err) => {
            console.error('Environmental observations request failed:', err);

            return {
              data: [] as EnvironmentalObservation[],
              error: 'Unable to retrieve environmental observations.',
            };
          },
        ),

        intelligenceService.getRiskAssessments(requestParams).then(
          (data) => ({ data, error: null as string | null }),
          (err) => {
            console.error('Risk assessments request failed:', err);

            return {
              data: [] as HealthRiskAssessment[],
              error: 'Unable to retrieve AI risk assessments.',
            };
          },
        ),

        responseService.getAlerts(requestParams).then(
          (data) => ({ data, error: null as string | null }),
          (err) => {
            console.error('Public health alerts request failed:', err);

            return {
              data: [] as PublicHealthAlert[],
              error: 'Unable to retrieve public-health alerts.',
            };
          },
        ),
      ]);

      // Update each dashboard section.
      setDiseaseReports(reportsResult.data);
      setEnvObservations(environmentResult.data);
      setRiskAssessments(assessmentsResult.data);
      setAlerts(alertsResult.data);

      // Display all request failures together.
      const requestErrors = [
        reportsResult.error,
        environmentResult.error,
        assessmentsResult.error,
        alertsResult.error,
      ].filter((message): message is string => message !== null);

      if (requestErrors.length > 0) {
        setError(requestErrors.join(' '));
      }
    } catch (err) {
      console.error('Dashboard data retrieval failed:', err);

      setError(
        'Failed to retrieve health intelligence. Please verify network connectivity.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------------------------------------------
     3.1 INITIAL DATA LOADING
  ------------------------------------------------------- */

  useEffect(() => {
    void fetchData();
  }, [role, assignedLgaId]);

  /* =========================================================
     4. DASHBOARD METRICS AND CALCULATIONS
  ========================================================= */

  // Total suspected disease cases.
  const totalSuspected = diseaseReports.reduce(
    (total, report) => total + (report.suspected_cases || 0),
    0,
  );

  // Total confirmed disease cases.
  const totalConfirmed = diseaseReports.reduce(
    (total, report) => total + (report.confirmed_cases || 0),
    0,
  );

  // Active alerts include OPEN and ACKNOWLEDGED alerts.
  const openAlerts = alerts.filter(
    (alert) =>
      alert.status === 'OPEN' ||
      alert.status === 'ACKNOWLEDGED',
  );

  // Latest available records.
  const latestAssessment = riskAssessments[0];
  const latestEnv = envObservations[0];

  // AI assessment contributing factors.
  const latestAssessmentFactors = getFactorEntries(
    latestAssessment?.contributing_factors,
  );

  // Selected alert contributing factors.
  const selectedAlertFactors = selectedAlert
    ? getFactorEntries(selectedAlert.contributing_factors)
    : [];

  // Validate the AI anomaly score.
  const latestRiskScore = latestAssessment
    ? Number(latestAssessment.risk_score)
    : Number.NaN;

  const validRiskScore = Number.isFinite(latestRiskScore)
    ? Math.max(0, Math.min(1, latestRiskScore))
    : null;

  /* -------------------------------------------------------
     4.1 DISEASE REPORT TREND DATA
  ------------------------------------------------------- */

  const reportsByDateMap = new Map<
    string,
    { date: string; suspected: number; confirmed: number }
  >();

  diseaseReports.forEach((report) => {
    const existing = reportsByDateMap.get(report.reporting_date) || {
      date: report.reporting_date,
      suspected: 0,
      confirmed: 0,
    };

    existing.suspected += report.suspected_cases || 0;
    existing.confirmed += report.confirmed_cases || 0;

    reportsByDateMap.set(report.reporting_date, existing);
  });

  const chartData = Array.from(reportsByDateMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  /* =========================================================
     5. PUBLIC HEALTH ALERT MANAGEMENT
  ========================================================= */

  /**
   * Acknowledge an open alert.
   */
  const handleAcknowledge = async (alertId: number) => {
    setIsActionLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      await responseService.acknowledgeAlert(alertId);

      setActionSuccess('Alert successfully acknowledged.');
      setSelectedAlert(null);

      await fetchData();
    } catch (err) {
      console.error('Alert acknowledgement failed:', err);

      setError(
        'Failed to acknowledge alert. Please ensure you are authorized and that the alert is still open.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Resolve an acknowledged alert.
   */
  const handleResolve = async (alertId: number) => {
    setIsActionLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      await responseService.resolveAlert(alertId);

      setActionSuccess('Alert successfully resolved.');
      setSelectedAlert(null);

      await fetchData();
    } catch (err) {
      console.error('Alert resolution failed:', err);

      setError(
        'Failed to resolve alert. The alert must be in ACKNOWLEDGED state.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Dismiss an open or acknowledged alert.
   */
  const handleDismiss = async (alertId: number) => {
    setIsActionLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      await responseService.dismissAlert(alertId);

      setActionSuccess('Alert successfully dismissed.');
      setSelectedAlert(null);

      await fetchData();
    } catch (err) {
      console.error('Alert dismissal failed:', err);

      setError(
        'Failed to dismiss alert. Please verify your permissions.',
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  /* =========================================================
     6. DISEASE REPORT TABLE CONFIGURATION
  ========================================================= */

  const reportColumns: Column<DiseaseReport>[] = [
    {
      key: 'reporting_date',
      header: 'Reporting Date',
      render: (report) => (
        <span className="font-mono text-xs">
          {report.reporting_date}
        </span>
      ),
    },
    {
      key: 'disease_name',
      header: 'Disease',
      render: (report) => (
        <span className="font-semibold text-slate-900">
          {report.disease_name}
        </span>
      ),
    },
    {
      key: 'health_facility_name',
      header: 'Reporting Facility',
      render: (report) => (
        <span className="text-xs text-slate-600 truncate max-w-xs">
          {report.health_facility_name}
        </span>
      ),
    },
    {
      key: 'cases',
      header: 'Suspected / Confirmed',
      render: (report) => (
        <span className="font-mono text-xs">
          <strong className="text-amber-700">
            {report.suspected_cases}
          </strong>{' '}
          /{' '}
          <strong className="text-red-700">
            {report.confirmed_cases}
          </strong>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (report) => (
        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {report.status}
        </span>
      ),
    },
  ];

  /* =========================================================
     7. DASHBOARD USER INTERFACE
  ========================================================= */

  return (
    <div className="space-y-8">

      {/* -----------------------------------------------------
          7.1 DASHBOARD HEADER
      ----------------------------------------------------- */}

      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Public Health Officer Dashboard
            </h1>

            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold text-xs border border-teal-200">
              Epidemiological Surveillance
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600" />

            <span>
              Monitoring Scope: <strong>{dashboardScope}</strong>
            </span>

            {!isStatewideView && assignedLgaId && (
              <span className="text-slate-400 font-mono">
                (ID: {assignedLgaId})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>

          <Link to="/surveillance">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Full Surveillance
            </Button>
          </Link>
        </div>
      </section>

      {/* -----------------------------------------------------
          7.2 NOTIFICATIONS AND ERRORS
      ----------------------------------------------------- */}

      {actionSuccess && (
        <AlertBanner
          type="success"
          title="Action Completed"
          message={actionSuccess}
          onDismiss={() => setActionSuccess(null)}
        />
      )}

      {error && (
        <AlertBanner
          type="danger"
          title="Dashboard Data Notice"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* -----------------------------------------------------
          7.3 PRIMARY PERFORMANCE INDICATORS
      ----------------------------------------------------- */}

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <MetricSkeleton key={index} />
            ))
          ) : (
            <>
              <MetricCard
                title="Suspected Cases"
                value={totalSuspected}
                numericValue={totalSuspected}
                subtitle="Cumulative reported count"
                icon={<Activity className="w-5 h-5" />}
                accentColor="amber"
              />

              <MetricCard
                title="Confirmed Cases"
                value={totalConfirmed}
                numericValue={totalConfirmed}
                subtitle="Laboratory confirmed cases"
                icon={<TrendingUp className="w-5 h-5" />}
                accentColor="red"
              />

              <MetricCard
                title="AI Anomaly Score"
                value={
                  latestAssessment && validRiskScore !== null
                    ? formatAnomalyScore(validRiskScore)
                    : 'No Model Data'
                }
                subtitle={
                  latestAssessment
                    ? latestAssessment.model_version
                    : 'Awaiting daily features'
                }
                icon={<BrainCircuit className="w-5 h-5" />}
                accentColor={
                  latestAssessment?.risk_level === 'CRITICAL'
                    ? 'red'
                    : latestAssessment?.risk_level === 'HIGH'
                      ? 'amber'
                      : 'teal'
                }
                badge={
                  latestAssessment ? (
                    <RiskBadge
                      level={latestAssessment.risk_level}
                      size="sm"
                    />
                  ) : undefined
                }
              />

              <MetricCard
                title="Active Alerts"
                value={openAlerts.length}
                numericValue={openAlerts.length}
                subtitle="Open and acknowledged alerts"
                icon={<BellRing className="w-5 h-5" />}
                accentColor={openAlerts.length > 0 ? 'red' : 'green'}
              />
            </>
          )}
        </div>
      </section>

      {/* -----------------------------------------------------
          7.4 DISEASE SURVEILLANCE AND ENVIRONMENTAL MONITORING
      ----------------------------------------------------- */}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Disease Trend Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>
                    Disease Surveillance Trajectory
                  </CardTitle>

                  <CardDescription>
                    Suspected and confirmed cases across the last 14 reporting dates
                  </CardDescription>
                </div>

                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  Clinical Timeline
                </span>
              </div>
            </CardHeader>

            <CardContent className="h-64 pt-2">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{
                      left: -10,
                      right: 10,
                      top: 10,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="suspectedGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#D97706"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#D97706"
                          stopOpacity={0}
                        />
                      </linearGradient>

                      <linearGradient
                        id="confirmedGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#DC2626"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#DC2626"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />

                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      stroke="#64748B"
                    />

                    <YAxis fontSize={11} stroke="#64748B" />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        color: '#FFF',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="suspected"
                      stroke="#D97706"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#suspectedGrad)"
                      name="Suspected Cases"
                    />

                    <Area
                      type="monotone"
                      dataKey="confirmed"
                      stroke="#DC2626"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#confirmedGrad)"
                      name="Confirmed Cases"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No time-series records are currently available for{' '}
                  {dashboardScope}.
                </div>
              )}
            </CardContent>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Suspected
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                Confirmed
              </span>

              <span>Available facility submissions</span>
            </div>
          </Card>
        </div>

        {/* Environmental Monitoring */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Environmental Conditions</CardTitle>

                  <CardDescription>
                    Latest available environmental observation for{' '}
                    {dashboardScope}
                  </CardDescription>
                </div>

                <CloudRain className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {latestEnv ? (
                <>
                  <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Rainfall
                    </span>

                    <span className="text-base font-bold text-blue-900">
                      {latestEnv.rainfall_mm ?? '—'} mm
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Temperature
                    </span>

                    <span className="text-base font-bold text-slate-900">
                      {latestEnv.temperature_celsius ?? '—'} °C
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Relative Humidity
                    </span>

                    <span className="text-base font-bold text-slate-900">
                      {latestEnv.humidity_percentage ?? '—'}%
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Air Quality Index
                    </span>

                    <span className="text-base font-bold text-slate-900">
                      {latestEnv.air_quality_index ?? '—'} AQI
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                    <span className="text-xs text-amber-900 font-medium">
                      Flood Incident Flag
                    </span>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        latestEnv.flood_occurred
                          ? 'bg-red-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {latestEnv.flood_occurred
                        ? 'FLOOD REPORTED'
                        : 'NO FLOOD'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No environmental observations are currently available for{' '}
                  {dashboardScope}.
                </div>
              )}
            </CardContent>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>
                Date: {latestEnv?.observation_date || 'N/A'}
              </span>

              <Link
                to="/environment"
                className="text-teal-700 font-semibold hover:underline"
              >
                Log New Observation →
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* -----------------------------------------------------
          7.5 AI RISK ASSESSMENT AND ALERT MANAGEMENT
      ----------------------------------------------------- */}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AI Risk Assessment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>
                  AI Isolation Forest Assessment
                </CardTitle>

                <CardDescription>
                  Latest multivariate anomaly assessment for{' '}
                  {dashboardScope}
                </CardDescription>
              </div>

              {latestAssessment && (
                <RiskBadge
                  level={latestAssessment.risk_level}
                  size="sm"
                />
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {latestAssessment ? (
              <>
                {/* Anomaly Score */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>AI Anomaly Percentile</span>

                    <span className="font-mono text-slate-700 font-bold">
                      {validRiskScore !== null
                        ? formatAnomalyScore(validRiskScore)
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        latestAssessment.risk_level === 'CRITICAL'
                          ? 'bg-red-600'
                          : latestAssessment.risk_level === 'HIGH'
                            ? 'bg-orange-500'
                            : latestAssessment.risk_level === 'MODERATE'
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                      }`}
                      style={{
                        width:
                          validRiskScore !== null
                            ? `${validRiskScore * 100}%`
                            : '0%',
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Evaluated on {latestAssessment.assessment_date} •{' '}
                    {latestAssessment.model_version}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    This score represents the assessment's relative anomaly
                    ranking. It is not an outbreak probability or diagnosis.
                  </p>
                </div>

                {/* Contributing Factors */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                    Key Factor Deviations
                  </h4>

                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {latestAssessmentFactors.length > 0 ? (
                      latestAssessmentFactors
                        .slice(0, 5)
                        .map((factor, index) => (
                          <li
                            key={`${factor.name}-${index}`}
                            className="flex items-start gap-1.5"
                          >
                            <span className="text-teal-600 font-bold">
                              •
                            </span>

                            <span>
                              <strong className="font-semibold capitalize">
                                {formatFactorName(factor.name)}:
                              </strong>{' '}

                              <span className="font-mono">
                                {factor.value}
                              </span>
                            </span>
                          </li>
                        ))
                    ) : (
                      <li className="text-slate-400">
                        No factor breakdown available for this assessment.
                      </li>
                    )}
                  </ul>
                </div>

                {/* AI Explanation */}
                {latestAssessment.explanation && (
                  <div className="p-3 rounded-lg bg-teal-50/50 border border-teal-100 text-xs text-teal-900 leading-relaxed">
                    <strong className="block text-teal-950 mb-1">
                      AI Assessment Explanation
                    </strong>

                    {latestAssessment.explanation}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No eligible AI risk assessment is currently available for{' '}
                {dashboardScope}.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Public Health Alert Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Public Health Warning Queue</CardTitle>

                <CardDescription>
                  Select an alert to review its details and available response actions.
                </CardDescription>
              </div>

              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                {openAlerts.length} Active
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {alerts.length > 0 ? (
              alerts.slice(0, 4).map((alert) => (
                <button
                  type="button"
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-teal-500/60 bg-white hover:bg-slate-50 transition-all cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {alert.title}
                      </span>

                      <RiskBadge
                        level={alert.risk_level}
                        size="sm"
                        showIcon={false}
                      />
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">
                      {alert.recommended_action}
                    </p>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {alert.assessment_date}
                    </span>
                  </div>

                  <AlertStatusBadge
                    status={alert.status}
                    size="sm"
                  />
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No alert records are currently available for{' '}
                {dashboardScope}.
              </p>
            )}
          </CardContent>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
            <Link
              to="/alerts"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              View All Alerts & Responses ({alerts.length}) →
            </Link>
          </div>
        </Card>
      </section>

      {/* -----------------------------------------------------
          7.6 PLATEAU STATE HEALTH INTELLIGENCE MAP
      ----------------------------------------------------- */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Plateau State Health Intelligence Map
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            View AI risk assessments and public-health alerts across your
            authorized monitoring area. Select an alert to review its
            details and available response actions.
          </p>
        </div>

        <PlateauStateMap
          assessments={riskAssessments}
          alerts={alerts}
          onSelectAlert={(alert) => setSelectedAlert(alert)}
        />
      </section>

      {/* -----------------------------------------------------
          7.7 RECENT DISEASE REPORTS
      ----------------------------------------------------- */}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Facility Disease Reports
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Disease reports submitted by healthcare facilities
            </p>
          </div>

          <Link to="/surveillance">
            <Button variant="outline" size="sm">
              View All Reports
            </Button>
          </Link>
        </div>

        <Table
          columns={reportColumns}
          data={diseaseReports.slice(0, 6)}
          keyExtractor={(report) => report.id}
          isLoading={isLoading}
          emptyMessage="No disease reports logged"
          emptySubtitle={`No facility reports are currently available for ${dashboardScope}.`}
        />
      </section>

      {/* =====================================================
          8. ALERT DETAILS AND RESPONSE MODAL
      ===================================================== */}

      {selectedAlert && (
        <Modal
          isOpen={Boolean(selectedAlert)}
          onClose={() => setSelectedAlert(null)}
          title={selectedAlert.title}
          description={`LGA: ${selectedAlert.lga_name} • Date: ${selectedAlert.assessment_date}`}
          footer={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </Button>

              {selectedAlert.status === 'OPEN' && (
                <>
                  <Button
                    variant="navy"
                    size="sm"
                    onClick={() =>
                      void handleAcknowledge(selectedAlert.id)
                    }
                    isLoading={isActionLoading}
                  >
                    Acknowledge Warning
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      void handleDismiss(selectedAlert.id)
                    }
                    isLoading={isActionLoading}
                  >
                    Dismiss
                  </Button>
                </>
              )}

              {selectedAlert.status === 'ACKNOWLEDGED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    void handleResolve(selectedAlert.id)
                  }
                  isLoading={isActionLoading}
                >
                  Mark as Resolved
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">

            {/* Alert Lifecycle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">
                Current Lifecycle Status:
              </span>

              <AlertStatusBadge status={selectedAlert.status} />
            </div>

            {/* Alert Description */}
            <div className="space-y-1">
              <h5 className="font-semibold text-slate-800 uppercase tracking-wider">
                Alert Description
              </h5>

              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {selectedAlert.description ||
                  'Elevated anomaly score triggered in multi-domain surveillance.'}
              </p>
            </div>

            {/* Recommended Action */}
            <div className="space-y-1">
              <h5 className="font-semibold text-slate-800 uppercase tracking-wider">
                Recommended Public-Health Protocol
              </h5>

              <p className="text-teal-900 bg-teal-50 p-3 rounded-lg border border-teal-100 leading-relaxed font-medium">
                {selectedAlert.recommended_action}
              </p>
            </div>

            {/* Alert Contributing Factors */}
            {selectedAlertFactors.length > 0 && (
              <div className="space-y-1">
                <h5 className="font-semibold text-slate-800 uppercase tracking-wider">
                  Underlying Anomaly Factors
                </h5>

                <ul className="space-y-1 text-slate-600 pl-2">
                  {selectedAlertFactors.map((factor, index) => (
                    <li key={`${factor.name}-${index}`}>
                      •{' '}
                      <strong className="capitalize">
                        {formatFactorName(factor.name)}:
                      </strong>{' '}

                      <span className="font-mono">
                        {factor.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OfficerDashboard;
