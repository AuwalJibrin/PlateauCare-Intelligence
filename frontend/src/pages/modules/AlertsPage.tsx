
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  CalendarDays,
  Activity,
  ClipboardCheck,
  Loader2,
  Info,
} from 'lucide-react';

import responseService from '../../services/responseService';
import coreService from '../../services/coreService';
import AISignalsPanel from '../../components/alerts/AISignalsPanel';

import type {
  PublicHealthAlert,
  AlertStatus,
  RiskLevel,
  LocalGovernmentArea,
} from '../../types';

type AlertFilters = {
  lga: string;
  status: string;
  riskLevel: string;
  date: string;
};

type FactorDisplay = {
  name: string;
  value: string;
  sortValue: number;
};

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
};

const initialFilters: AlertFilters = {
  lga: '',
  status: '',
  riskLevel: '',
  date: '',
};

const statusStyles: Record<AlertStatus, string> = {
  OPEN: 'bg-rose-50 text-rose-700 border-rose-200',
  ACKNOWLEDGED: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const riskStyles: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
};

const formatLabel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value?: string | null): string => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatScore = (value: unknown): string => {
  const score =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(score) ? score.toFixed(3) : 'N/A';
};

/**
 * Safely handles different possible contributing_factors formats.
 *
 * Supported examples:
 * { rainfall: 1.25, suspected_cases: 2.10 }
 * { rainfall: "1.25" }
 * [{ factor: "rainfall", score: 1.25 }]
 * { rainfall: { score: 1.25 } }
 *
 * Invalid values will never be formatted as NaN.
 */
const getFactorEntries = (factors: unknown): FactorDisplay[] => {
  if (!factors || typeof factors !== 'object') {
    return [];
  }

  const entries: Array<[string, unknown]> = Array.isArray(factors)
    ? factors.map((item: unknown, index: number) => [
        String(index + 1),
        item,
      ])
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

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accent,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
          {value}
        </p>
      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </div>
    </div>
  </div>
);

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<PublicHealthAlert[]>([]);
  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);

  const [filters, setFilters] = useState<AlertFilters>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAlert, setSelectedAlert] =
    useState<PublicHealthAlert | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load alerts from the existing backend API.
  const loadAlerts = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const params: {
          lga?: number;
          status?: string;
          risk_level?: string;
          date?: string;
        } = {};

        if (filters.lga) {
          const lgaId = Number(filters.lga);

          if (Number.isFinite(lgaId)) {
            params.lga = lgaId;
          }
        }

        if (filters.status) {
          params.status = filters.status;
        }

        if (filters.riskLevel) {
          params.risk_level = filters.riskLevel;
        }

        if (filters.date) {
          params.date = filters.date;
        }

        const result = await responseService.getAlerts(params);

        setAlerts(result);

        setSelectedAlert((current) => {
          if (!current) {
            return result[0] ?? null;
          }

          return (
            result.find((alert) => alert.id === current.id) ??
            result[0] ??
            null
          );
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'The request could not be completed. Please try again.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  // Load the LGA list for the filter.
  useEffect(() => {
    let active = true;

    const loadLgas = async () => {
      try {
        const result = await coreService.getLGAs();

        if (active) {
          setLgas(result);
        }
      } catch {
        // The alert list remains usable if the LGA list fails.
      }
    };

    void loadLgas();

    return () => {
      active = false;
    };
  }, []);

  // Prepare alert search results.
  const filteredAlerts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return alerts;
    }

    return alerts.filter((alert) =>
      [
        alert.title,
        alert.description,
        alert.lga_name,
        alert.recommended_action,
        alert.status,
        alert.risk_level,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [alerts, searchTerm]);

  // Calculate alert statistics.
  const counts = useMemo(
    () => ({
      total: alerts.length,
      open: alerts.filter((alert) => alert.status === 'OPEN').length,
      acknowledged: alerts.filter(
        (alert) => alert.status === 'ACKNOWLEDGED',
      ).length,
      resolved: alerts.filter(
        (alert) => alert.status === 'RESOLVED',
      ).length,
      dismissed: alerts.filter(
        (alert) => alert.status === 'DISMISSED',
      ).length,
    }),
    [alerts],
  );

  // Prepare the selected alert's factor information safely.
  const selectedAlertFactors = useMemo(
    () => getFactorEntries(selectedAlert?.contributing_factors),
    [selectedAlert],
  );

  const updateFilter = (key: keyof AlertFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setSearchTerm('');
  };

  // Acknowledge, resolve or dismiss an alert.
  const performAction = async (
    action: 'acknowledge' | 'resolve' | 'dismiss',
    alert: PublicHealthAlert,
  ) => {
    const actionLabels = {
      acknowledge: 'acknowledged',
      resolve: 'resolved',
      dismiss: 'dismissed',
    };

    setActionLoading(`${action}-${alert.id}`);
    setActionMessage(null);
    setError(null);

    try {
      let updatedAlert: PublicHealthAlert;

      if (action === 'acknowledge') {
        updatedAlert = await responseService.acknowledgeAlert(alert.id);
      } else if (action === 'resolve') {
        updatedAlert = await responseService.resolveAlert(alert.id);
      } else {
        updatedAlert = await responseService.dismissAlert(alert.id);
      }

      setAlerts((current) =>
        current.map((item) =>
          item.id === updatedAlert.id ? updatedAlert : item,
        ),
      );

      setSelectedAlert(updatedAlert);

      setActionMessage(
        `Alert successfully ${actionLabels[action]}.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The alert action could not be completed. Please try again.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const renderStatus = (status: AlertStatus) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] ?? statusStyles.OPEN
      }`}
    >
      {formatLabel(status)}
    </span>
  );

  const renderRisk = (risk: RiskLevel) => (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        riskStyles[risk] ?? riskStyles.LOW
      }`}
    >
      {formatLabel(risk)}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <ShieldAlert className="h-4 w-4" />
            Public Health Operations
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Alerts &amp; Response Centre
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Review public-health alerts, understand risk signals, and
            coordinate response actions across Plateau State.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAlerts(true)}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          Refresh alerts
        </button>
      </div>

      {/* AI interpretation notice */}
      <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

        <div>
          <p className="text-sm font-semibold text-blue-900">
            Interpreting AI-generated alerts
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-800">
            Risk scores represent anomaly-ranking scores, not the
            probability of an outbreak. Statistical indicators support
            review and investigation; they do not establish causation.
            Confirm alerts with appropriate public-health evidence before
            taking action.
          </p>
        </div>
      </div>

      {/* AI signals requiring public-health officer review */}
      <AISignalsPanel />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total alerts"
          value={counts.total}
          icon={<BellRing className="h-5 w-5 text-slate-700" />}
          accent="bg-slate-100"
        />

        <StatCard
          label="Open"
          value={counts.open}
          icon={<AlertTriangle className="h-5 w-5 text-rose-700" />}
          accent="bg-rose-50"
        />

        <StatCard
          label="Acknowledged"
          value={counts.acknowledged}
          icon={<Clock3 className="h-5 w-5 text-amber-700" />}
          accent="bg-amber-50"
        />

        <StatCard
          label="Resolved"
          value={counts.resolved}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
          accent="bg-emerald-50"
        />

        <StatCard
          label="Dismissed"
          value={counts.dismissed}
          icon={<XCircle className="h-5 w-5 text-slate-600" />}
          accent="bg-slate-100"
        />
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900">
              Find alerts
            </h2>

            <p className="text-xs text-slate-500">
              Filter the alert records returned by the server.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            Clear filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Search
            </span>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search alerts..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Local Government Area
            </span>

            <select
              value={filters.lga}
              onChange={(event) =>
                updateFilter('lga', event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">All LGAs</option>

              {lgas.map((lga) => (
                <option key={lga.id} value={lga.id}>
                  {lga.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Alert status
            </span>

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter('status', event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Risk level
            </span>

            <select
              value={filters.riskLevel}
              onChange={(event) =>
                updateFilter('riskLevel', event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="">All risk levels</option>
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Assessment date
            </span>

            <input
              type="date"
              value={filters.date}
              onChange={(event) =>
                updateFilter('date', event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>
      </section>

      {/* Request feedback */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Unable to complete the request
            </p>

            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {actionMessage}
        </div>
      )}

      {/* Alert records and details */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-5">
        {/* Alert register */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Alert register
              </h2>

              <p className="text-xs text-slate-500">
                {filteredAlerts.length} record
                {filteredAlerts.length === 1 ? '' : 's'} displayed
              </p>
            </div>

            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              Live API data
            </span>
          </div>

          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
              <p className="text-sm">Loading alert records...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <BellRing className="h-7 w-7 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                {alerts.length === 0
                  ? 'No alerts available'
                  : 'No matching alerts'}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {alerts.length === 0
                  ? 'There are currently no alert records in the response system. Alerts will appear here when they are generated and returned by the backend.'
                  : 'Try changing your search or filters to find an alert.'}
              </p>

              {alerts.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAlerts.map((alert) => (
                <button
                  type="button"
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setActionMessage(null);
                    setError(null);
                  }}
                  className={`w-full p-4 text-left transition hover:bg-slate-50 ${
                    selectedAlert?.id === alert.id
                      ? 'bg-teal-50/60 ring-1 ring-inset ring-teal-200'
                      : ''
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderRisk(alert.risk_level)}
                        {renderStatus(alert.status)}
                      </div>

                      <h3 className="mt-2 font-semibold text-slate-900">
                        {alert.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {alert.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {alert.lga_name || 'LGA unavailable'}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(alert.assessment_date)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Anomaly score
                      </p>

                      <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">
                        {formatScore(alert.risk_score)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Selected alert details */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-100 px-4 py-4">
            <h2 className="font-semibold text-slate-900">
              Alert details
            </h2>

            <p className="text-xs text-slate-500">
              Review the selected record and its response options.
            </p>
          </div>

          {!selectedAlert ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <ClipboardCheck className="h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-medium text-slate-600">
                Select an alert to review its details
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  {renderRisk(selectedAlert.risk_level)}
                  {renderStatus(selectedAlert.status)}
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {selectedAlert.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedAlert.description ||
                    'No description is available for this alert.'}
                </p>
              </div>

              {/* Alert information */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    LGA
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedAlert.lga_name || 'Unavailable'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Assessment date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(selectedAlert.assessment_date)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Anomaly score
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatScore(selectedAlert.risk_score)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Alert ID
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    #{selectedAlert.id}
                  </p>
                </div>
              </div>

              {/* AI explanation */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Activity className="h-4 w-4 text-teal-700" />
                  AI assessment explanation
                </h4>

                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                  {selectedAlert.explanation ||
                    'No additional explanation was provided for this alert.'}
                </p>
              </div>

              {/* Statistical indicators */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Notable statistical indicators
                </h4>

                {selectedAlertFactors.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No contributing indicator details are available.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {selectedAlertFactors.slice(0, 6).map((factor, index) => (
                      <div
                        key={`${factor.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="text-xs text-slate-600">
                          {formatLabel(factor.name)}
                        </span>

                        <span className="text-xs font-semibold tabular-nums text-slate-800">
                          {factor.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  These values indicate statistical deviations identified
                  by the model. They should not be interpreted as proven
                  causes.
                </p>
              </div>

              {/* Recommended response */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Recommended response
                </h4>

                <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs leading-6 text-teal-900">
                  {selectedAlert.recommended_action ||
                    'No recommended action is recorded for this alert.'}
                </div>
              </div>

              {/* Response history */}
              {(selectedAlert.acknowledged_by_username ||
                selectedAlert.resolved_by_username) && (
                <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                  {selectedAlert.acknowledged_by_username && (
                    <p>
                      Acknowledged by{' '}
                      <strong>
                        {selectedAlert.acknowledged_by_username}
                      </strong>

                      {selectedAlert.acknowledged_at
                        ? ` on ${formatDate(selectedAlert.acknowledged_at)}`
                        : ''}
                    </p>
                  )}

                  {selectedAlert.resolved_by_username && (
                    <p className="mt-1">
                      Resolved by{' '}
                      <strong>
                        {selectedAlert.resolved_by_username}
                      </strong>

                      {selectedAlert.resolved_at
                        ? ` on ${formatDate(selectedAlert.resolved_at)}`
                        : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Response actions */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Response actions
                </p>

                {selectedAlert.status === 'OPEN' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        void performAction('acknowledge', selectedAlert)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                    >
                      {actionLoading ===
                      `acknowledge-${selectedAlert.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4" />
                      )}

                      Acknowledge alert
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        void performAction('dismiss', selectedAlert)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Dismiss alert
                    </button>
                  </>
                )}

                {selectedAlert.status === 'ACKNOWLEDGED' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        void performAction('resolve', selectedAlert)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {actionLoading ===
                      `resolve-${selectedAlert.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      Mark as resolved
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() =>
                        void performAction('dismiss', selectedAlert)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Dismiss alert
                    </button>
                  </>
                )}

                {(selectedAlert.status === 'RESOLVED' ||
                  selectedAlert.status === 'DISMISSED') && (
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    This alert is{' '}
                    {formatLabel(selectedAlert.status).toLowerCase()}.
                    No further response actions are available.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AlertsPage;
