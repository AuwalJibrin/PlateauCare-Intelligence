
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Database,
  Filter,
  Info,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  MapPin,
  BarChart3,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import intelligenceService from '../../services/intelligenceService';
import coreService from '../../services/coreService';

import type {
  HealthRiskAssessment,
  LocalGovernmentArea,
  RiskLevel,
} from '../../types';

import { RiskBadge } from '../../components/common/Badge';
import { AlertBanner } from '../../components/common/AlertBanner';

const RISK_LEVELS: RiskLevel[] = [
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL',
];

const riskColors: Record<RiskLevel, string> = {
  LOW: '#16A34A',
  MODERATE: '#D97706',
  HIGH: '#EA580C',
  CRITICAL: '#DC2626',
};

const formatDate = (value: string) => {
  if (!value) return 'Not available';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatScore = (score: number) => {
  if (!Number.isFinite(score)) return 'N/A';

  return (score * 100).toFixed(1);
};

const getModelNotice = (assessments: HealthRiskAssessment[]) => {
  return assessments.some((item) =>
    item.model_version.toLowerCase().includes('simulated')
  );
};

// API returns contributing_factors as an array of descriptive strings.
const getContributingFactors = (
  factors: HealthRiskAssessment['contributing_factors']
): string[] => {
  if (!Array.isArray(factors)) return [];

  return factors.filter(
    (factor): factor is string =>
      typeof factor === 'string' && factor.trim().length > 0
  );
};

const IntelligencePage: React.FC = () => {
  const [assessments, setAssessments] = useState<HealthRiskAssessment[]>([]);
  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);

  const [selectedLga, setSelectedLga] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const params = {
        ...(selectedLga ? { lga: Number(selectedLga) } : {}),
        ...(selectedDate ? { date: selectedDate } : {}),
      };

      const data = await intelligenceService.getRiskAssessments(params);

      setAssessments(data);
    } catch {
      setError(
        'Unable to retrieve AI risk assessments. Please check your connection and permissions, then try again.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedLga, selectedDate]);

  useEffect(() => {
    coreService.getLGAs()
      .then(setLgas)
      .catch(() => setLgas([]));
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const riskCounts = useMemo(() => {
    return RISK_LEVELS.reduce(
      (result, level) => {
        result[level] = assessments.filter(
          (assessment) => assessment.risk_level === level
        ).length;

        return result;
      },
      {
        LOW: 0,
        MODERATE: 0,
        HIGH: 0,
        CRITICAL: 0,
      } as Record<RiskLevel, number>
    );
  }, [assessments]);

  const chartData = useMemo(() => {
    return [...assessments]
      .filter((assessment) => Number.isFinite(assessment.risk_score))
      .sort((a, b) => b.risk_score - a.risk_score)
      .map((assessment) => ({
        name: assessment.lga_name,
        score: Number(formatScore(assessment.risk_score)),
        level: assessment.risk_level,
        fill: riskColors[assessment.risk_level],
      }));
  }, [assessments]);

  const latestAssessmentDate = useMemo(() => {
    if (assessments.length === 0) return null;

    return [...assessments].sort(
      (a, b) =>
        new Date(b.assessment_date).getTime() -
        new Date(a.assessment_date).getTime()
    )[0].assessment_date;
  }, [assessments]);

  const modelVersions = useMemo(() => {
    return Array.from(
      new Set(assessments.map((item) => item.model_version))
    );
  }, [assessments]);

  const simulatedData = getModelNotice(assessments);

  const clearFilters = () => {
    setSelectedLga('');
    setSelectedDate('');
  };

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              AI-Powered Early Warning
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            AI Intelligence Centre
          </h1>

          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Population and workforce health risk monitoring across
            Plateau State's 17 Local Government Areas.
          </p>
        </div>

        <button
          onClick={() => fetchAssessments(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          Refresh Assessments
        </button>
      </div>

      {/* MODEL EXPLANATION */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />

        <div>
          <h3 className="text-sm font-semibold text-indigo-900">
            Understanding the AI risk score
          </h3>

          <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
            The Isolation Forest model identifies unusual patterns in
            available health, environmental, workforce and community
            indicators. The displayed anomaly score is not an outbreak
            probability and does not establish causation.
          </p>
        </div>
      </div>

      {simulatedData && (
        <AlertBanner
          type="warning"
          title="Simulated Demonstration Data"
          message="At least one assessment was generated using a model version labelled as simulated. These results demonstrate system functionality and must not be treated as validated real-world outbreak predictions."
        />
      )}

      {error && (
        <AlertBanner
          type="danger"
          title="Assessment Retrieval Failed"
          message={error}
        />
      )}

      {/* FILTERS */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />

          <h2 className="text-sm font-bold text-slate-800">
            Assessment Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Local Government Area
            </label>

            <select
              value={selectedLga}
              onChange={(event) => setSelectedLga(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All LGAs</option>

              {lgas.map((lga) => (
                <option key={lga.id} value={lga.id}>
                  {lga.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Assessment Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              disabled={!selectedLga && !selectedDate}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* SUMMARY METRICS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Assessment Overview
          </h2>

          <span className="text-xs text-slate-500">
            {assessments.length} assessment
            {assessments.length === 1 ? '' : 's'} retrieved
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Total Assessments"
            value={assessments.length}
            description="Retrieved from the AI API"
            icon={<Activity className="w-5 h-5" />}
            color="indigo"
            loading={isLoading}
          />

          <MetricCard
            title="Low Risk"
            value={riskCounts.LOW}
            description="Low anomaly classification"
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="green"
            loading={isLoading}
          />

          <MetricCard
            title="Moderate Risk"
            value={riskCounts.MODERATE}
            description="Moderate anomaly classification"
            icon={<TrendingUp className="w-5 h-5" />}
            color="amber"
            loading={isLoading}
          />

          <MetricCard
            title="High / Critical"
            value={riskCounts.HIGH + riskCounts.CRITICAL}
            description="Higher anomaly classifications"
            icon={<ShieldAlert className="w-5 h-5" />}
            color="red"
            loading={isLoading}
          />
        </div>
      </section>

      {/* RISK DISTRIBUTION */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Risk Classification Distribution
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Number of retrieved assessments in each risk category.
            </p>
          </div>

          <BarChart3 className="w-5 h-5 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {RISK_LEVELS.map((level) => (
            <div
              key={level}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {level}
                </span>

                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: riskColors[level] }}
                />
              </div>

              <p className="text-2xl font-bold text-slate-900 mt-2">
                {isLoading ? '—' : riskCounts[level]}
              </p>

              <p className="text-[11px] text-slate-400 mt-1">
                {assessments.length > 0
                  ? `${(
                      (riskCounts[level] / assessments.length) * 100
                    ).toFixed(1)}% of assessments`
                  : 'No assessments'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* LGA COMPARISON CHART */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900">
            LGA Anomaly Score Comparison
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Higher scores indicate a stronger relative anomaly ranking.
            Scores are not outbreak probabilities.
          </p>
        </div>

        {isLoading ? (
          <div className="h-72 flex items-center justify-center text-sm text-slate-400">
            Loading assessment chart...
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState message="No AI assessments are available for the selected filters." />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 35 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  label={{
                    value: 'Anomaly score (percentile)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#64748B' },
                  }}
                />

                <Tooltip
                  formatter={(value) => [
                    `${value ?? 'N/A'}`,
                    'Anomaly score',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />

                <Bar
                  dataKey="score"
                  name="Anomaly score"
                  radius={[6, 6, 0, 0]}
                  fill="#4F46E5"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ASSESSMENT RECORDS */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                LGA Risk Assessments
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Detailed AI-generated anomaly assessment records.
              </p>
            </div>

            <Database className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Loading assessment records...
          </div>
        ) : assessments.length === 0 ? (
          <EmptyState message="No assessments found. Try clearing the filters or generating eligible assessments through the existing backend workflow." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    LGA
                  </th>

                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assessment Date
                  </th>

                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Risk Level
                  </th>

                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Anomaly Score
                  </th>

                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Model Version
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {assessments.map((assessment) => (
                  <tr
                    key={assessment.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />

                        <span className="text-sm font-semibold text-slate-800">
                          {assessment.lga_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {formatDate(assessment.assessment_date)}
                    </td>

                    <td className="px-5 py-4">
                      <RiskBadge level={assessment.risk_level} size="sm" />
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-slate-800">
                        {formatScore(assessment.risk_score)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        percentile
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-xs font-medium text-slate-600">
                        {assessment.model_version}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* EXPLANATIONS */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">
            AI Assessment Explanations
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Model-generated explanations and notable statistical indicators.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            Loading assessment explanations...
          </div>
        ) : assessments.length === 0 ? (
          <EmptyState message="No explanations are available because there are no assessments to display." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {assessments.map((assessment) => {
              const factors = getContributingFactors(
                assessment.contributing_factors
              );

              return (
                <article
                  key={assessment.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {assessment.lga_name}
                      </h3>

                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatDate(assessment.assessment_date)}
                      </p>
                    </div>

                    <RiskBadge level={assessment.risk_level} size="sm" />
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BrainCircuit className="w-4 h-4 text-indigo-600" />

                      <span className="text-xs font-bold text-slate-700">
                        Model Explanation
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {assessment.explanation ||
                        'No explanation was provided for this assessment.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-3">
                      Notable Statistical Indicators
                    </h4>

                    {factors.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No contributing indicator details are available.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {factors.map((factor, index) => (
                          <li
                            key={`${assessment.id}-${index}`}
                            className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-teal-600 font-bold">•</span>

                            <span className="text-xs text-slate-600 leading-relaxed">
                              {factor}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      Model: {assessment.model_version}
                    </span>

                    <span className="text-[10px] text-slate-400">
                      Score: {formatScore(assessment.risk_score)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MODEL INFORMATION */}
      <section className="bg-slate-900 rounded-2xl p-5 md:p-6 text-white">
        <div className="flex items-start gap-3">
          <BrainCircuit className="w-6 h-6 text-teal-400 shrink-0" />

          <div className="flex-1">
            <h2 className="text-base font-bold">
              AI Model Information
            </h2>

            <p className="text-xs text-slate-300 mt-1">
              Existing PlateauCare Intelligence anomaly detection service.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Detection Method
                </p>

                <p className="text-sm font-semibold mt-2">
                  Isolation Forest
                </p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Latest Retrieved Assessment
                </p>

                <p className="text-sm font-semibold mt-2">
                  {latestAssessmentDate
                    ? formatDate(latestAssessmentDate)
                    : 'Not available'}
                </p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Model Version(s)
                </p>

                <p className="text-sm font-semibold mt-2 break-words">
                  {modelVersions.length > 0
                    ? modelVersions.join(', ')
                    : 'Not available'}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-start gap-2">
              <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Assessment records are retrieved from the existing backend.
                Missing assessments are not interpreted as low risk. Risk
                classifications should support professional review and
                public-health decision-making, not replace it.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: 'indigo' | 'green' | 'amber' | 'red';
  loading: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon,
  color,
  loading,
}) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>

        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          AI Assessment
        </span>
      </div>

      <p className="text-2xl font-bold text-slate-900 mt-4">
        {loading ? '—' : value}
      </p>

      <p className="text-xs font-semibold text-slate-700 mt-1">
        {title}
      </p>

      <p className="text-[11px] text-slate-400 mt-1">
        {description}
      </p>
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-3" />

    <p className="text-sm font-semibold text-slate-700">
      No Data Available
    </p>

    <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
      {message}
    </p>
  </div>
);

export default IntelligencePage;
