import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import communityService from '../../services/communityService';
import coreService from '../../services/coreService';
import type {
  CommunityHealthRecord,
  CommunityHealthRecordCreatePayload,
  LocalGovernmentArea,
} from '../../types';

import {
  Users,
  HeartPulse,
  ClipboardList,
  Megaphone,
  RefreshCw,
  CalendarDays,
  MapPin,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react';

const getLocalDate = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

interface CommunityFormState {
  community_name: string;
  reporting_date: string;
  population_covered: string;
  people_screened: string;
  people_referred: string;
  reported_health_concerns: string;
  people_reached_through_awareness: string;
  notes: string;
}

const initialFormState = (): CommunityFormState => ({
  community_name: '',
  reporting_date: getLocalDate(),
  population_covered: '',
  people_screened: '',
  people_referred: '',
  reported_health_concerns: '',
  people_reached_through_awareness: '',
  notes: '',
});

const formatNumber = (value: number): string =>
  new Intl.NumberFormat().format(value);

const formatDate = (value: string): string => {
  if (!value) return '—';

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const CommunityPage: React.FC = () => {
  const { role, user } = useAuth();

  const isCommunityReporter = role === 'COMMUNITY_REPORTER';
  const assignedLgaId = user?.lga_id ?? null;
  const assignedLgaName = user?.lga_name ?? null;

  const [records, setRecords] = useState<CommunityHealthRecord[]>([]);
  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedLga, setSelectedLga] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [form, setForm] = useState<CommunityFormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // --------------------------------------------------
  // Load LGA reference data for officers and admins
  // --------------------------------------------------

  const fetchLgas = useCallback(async () => {
    if (isCommunityReporter) return;

    try {
      const data = await coreService.getLGAs();
      setLgas(data);
    } catch {
      setError('Unable to load the Local Government Area list.');
    }
  }, [isCommunityReporter]);

  // --------------------------------------------------
  // Load community health records
  // --------------------------------------------------

  const fetchRecords = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const params: { lga?: number; date?: string } = {};

      if (isCommunityReporter) {
        if (assignedLgaId !== null) {
          params.lga = assignedLgaId;
        }
      } else if (selectedLga) {
        params.lga = Number(selectedLga);
      }

      if (selectedDate) {
        params.date = selectedDate;
      }

      const data = await communityService.getRecords(params);
      setRecords(data);
    } catch {
      setError(
        'Unable to retrieve community health records. Please check your connection and try again.'
      );
      setRecords([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isCommunityReporter, assignedLgaId, selectedLga, selectedDate]);

  useEffect(() => {
    fetchLgas();
  }, [fetchLgas]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // --------------------------------------------------
  // Summary metrics from the currently loaded records
  // --------------------------------------------------

  const metrics = useMemo(() => {
    return records.reduce(
      (totals, record) => ({
        population: totals.population + record.population_covered,
        screened: totals.screened + record.people_screened,
        referred: totals.referred + record.people_referred,
        concerns:
          totals.concerns + record.reported_health_concerns,
        reached:
          totals.reached + record.people_reached_through_awareness,
      }),
      {
        population: 0,
        screened: 0,
        referred: 0,
        concerns: 0,
        reached: 0,
      }
    );
  }, [records]);

  // --------------------------------------------------
  // Form handling
  // --------------------------------------------------

  const updateForm = (
    field: keyof CommunityFormState,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);
    setSuccess(null);

    if (!isCommunityReporter) {
      setFormError(
        'Only an authorised Community Reporter can submit community health reports.'
      );
      return;
    }

    if (assignedLgaId === null) {
      setFormError(
        'Your account does not have an assigned LGA. Contact your administrator.'
      );
      return;
    }

    if (!form.community_name.trim()) {
      setFormError('Enter the community name.');
      return;
    }

    if (!form.reporting_date) {
      setFormError('Select the reporting date.');
      return;
    }

    const populationCovered = Number(form.population_covered);
    const peopleScreened = Number(form.people_screened);
    const peopleReferred = Number(form.people_referred);
    const healthConcerns = Number(form.reported_health_concerns);
    const peopleReached = Number(
      form.people_reached_through_awareness
    );

    const numericValues = [
      populationCovered,
      peopleScreened,
      peopleReferred,
      healthConcerns,
      peopleReached,
    ];

    if (
      numericValues.some(
        (value) => !Number.isInteger(value) || value < 0
      )
    ) {
      setFormError(
        'All population and activity figures must be whole numbers of zero or greater.'
      );
      return;
    }

    if (populationCovered <= 0) {
      setFormError('Population covered must be greater than zero.');
      return;
    }

    if (peopleScreened > populationCovered) {
      setFormError(
        'People screened cannot exceed the population covered.'
      );
      return;
    }

    const payload: CommunityHealthRecordCreatePayload = {
      community_name: form.community_name.trim(),
      lga: assignedLgaId,
      reporting_date: form.reporting_date,
      population_covered: populationCovered,
      people_screened: peopleScreened,
      people_referred: peopleReferred,
      reported_health_concerns: healthConcerns,
      people_reached_through_awareness: peopleReached,
      notes: form.notes.trim(),
    };

    setIsSubmitting(true);

    try {
      await communityService.createRecord(payload);

      setSuccess('Community health report submitted successfully.');
      setForm(initialFormState());

      await fetchRecords(true);
    } catch {
      setFormError(
        'The report could not be submitted. Please check your entries and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // Shared styling
  // --------------------------------------------------

  const inputClass =
    'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100';

  const labelClass =
    'block text-sm font-medium text-slate-700';

  const metricCards = [
    {
      title: 'Population covered',
      value: metrics.population,
      description: 'Across loaded community reports',
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'People screened',
      value: metrics.screened,
      description: 'Reported screening activities',
      icon: HeartPulse,
      color: 'bg-teal-50 text-teal-700',
    },
    {
      title: 'People referred',
      value: metrics.referred,
      description: 'Reported referrals',
      icon: ClipboardList,
      color: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Health concerns',
      value: metrics.concerns,
      description: 'Reported health concerns',
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-700',
    },
    {
      title: 'People reached',
      value: metrics.reached,
      description: 'Through health awareness',
      icon: Megaphone,
      color: 'bg-violet-50 text-violet-700',
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-700">
            <Users className="h-4 w-4" />
            Population and Community Health
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Community Health Monitoring
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor community-level health activities, population
            screening, referrals, reported health concerns and
            awareness coverage across Plateau State.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRecords(true)}
          disabled={isRefreshing || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh records
        </button>
      </div>

      {/* Reporter assignment */}
      {isCommunityReporter && (
        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />

          <div>
            <p className="text-sm font-semibold text-teal-900">
              Your assigned reporting area
            </p>
            <p className="mt-1 text-sm text-teal-800">
              {assignedLgaName || (assignedLgaId !== null
                ? `LGA ID: ${assignedLgaId}`
                : 'No LGA assigned to this account')}
            </p>
            <p className="mt-1 text-xs text-teal-700">
              Reports submitted through this account are associated
              with your assigned LGA.
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary metrics */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Community health overview
          </h2>
          <span className="text-xs text-slate-500">
            Based on currently loaded records
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.title}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {metric.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                      {isLoading ? '—' : formatNumber(metric.value)}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg p-2.5 ${metric.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {metric.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional awareness indicator */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-teal-50 to-white p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-2.5 text-teal-700 shadow-sm">
            <Megaphone className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Community awareness activities
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {isLoading
                ? 'Loading awareness data...'
                : `${formatNumber(metrics.reached)} people reported reached through awareness activities in the currently loaded records.`}
            </p>
          </div>
        </div>
      </div>

      {/* Submission form - Community Reporters only */}
      {isCommunityReporter && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-100 p-2 text-teal-700">
                <PlusCircle className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Submit Community Health Report
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter the community monitoring figures for your
                  assigned LGA.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5">
            {success && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {success}
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Community name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.community_name}
                  onChange={(event) =>
                    updateForm('community_name', event.target.value)
                  }
                  placeholder="Enter community or settlement name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Assigned Local Government Area
                </label>
                <input
                  type="text"
                  value={assignedLgaName || 'Your assigned LGA'}
                  disabled
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  This field is locked to your account assignment.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Reporting date *
                </label>
                <input
                  type="date"
                  required
                  value={form.reporting_date}
                  max={getLocalDate()}
                  onChange={(event) =>
                    updateForm('reporting_date', event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Population covered *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={form.population_covered}
                  onChange={(event) =>
                    updateForm('population_covered', event.target.value)
                  }
                  placeholder="e.g. 500"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  People screened *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.people_screened}
                  onChange={(event) =>
                    updateForm('people_screened', event.target.value)
                  }
                  placeholder="e.g. 120"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  People referred *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.people_referred}
                  onChange={(event) =>
                    updateForm('people_referred', event.target.value)
                  }
                  placeholder="e.g. 15"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Reported health concerns *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.reported_health_concerns}
                  onChange={(event) =>
                    updateForm(
                      'reported_health_concerns',
                      event.target.value
                    )
                  }
                  placeholder="e.g. 8"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  People reached through awareness *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.people_reached_through_awareness}
                  onChange={(event) =>
                    updateForm(
                      'people_reached_through_awareness',
                      event.target.value
                    )
                  }
                  placeholder="e.g. 250"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Additional notes
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(event) =>
                  updateForm('notes', event.target.value)
                }
                placeholder="Add relevant observations or activity details..."
                className={inputClass}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Fields marked with * are required.
              </p>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  assignedLgaId === null
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Submit community report
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Records and filters */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Community health records
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Review submitted community monitoring reports.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {isLoading
                ? 'Loading...'
                : `${records.length} record${records.length === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-end">
          {!isCommunityReporter && (
            <div className="flex-1">
              <label className={labelClass}>
                Local Government Area
              </label>
              <select
                value={selectedLga}
                onChange={(event) => setSelectedLga(event.target.value)}
                className={inputClass}
              >
                <option value="">All LGAs</option>
                {lgas.map((lga) => (
                  <option key={lga.id} value={lga.id}>
                    {lga.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1">
            <label className={labelClass}>
              Reporting date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedLga('');
              setSelectedDate('');
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Clear filters
          </button>
        </div>

        {/* Records table */}
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Community</th>
                <th className="px-5 py-3 font-semibold">LGA</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Population
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Screened
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Referred
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Concerns
                </th>
                <th className="px-5 py-3 text-right font-semibold">
                  Awareness
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-teal-600" />
                    Loading community records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <p className="mt-3 font-medium text-slate-700">
                        No community records found
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Try changing the filters or submit a new
                        community report.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        {record.community_name}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {record.lga_name}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {formatDate(record.reporting_date)}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {formatNumber(record.population_covered)}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {formatNumber(record.people_screened)}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {formatNumber(record.people_referred)}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {formatNumber(record.reported_health_concerns)}
                    </td>

                    <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                      {formatNumber(
                        record.people_reached_through_awareness
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Figures represent submitted reports and may include
            repeated reporting periods or communities.
          </p>

          <p className="text-xs text-slate-500">
            {isCommunityReporter
              ? `Showing records for ${assignedLgaName || 'your assigned LGA'}`
              : 'Showing records permitted by your account'}
          </p>
        </div>
      </section>
    </div>
  );
};

export default CommunityPage;