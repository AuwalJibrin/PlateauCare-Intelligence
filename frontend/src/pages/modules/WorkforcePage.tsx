
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import workforceService from '../../services/workforceService';
import coreService from '../../services/coreService';
import type {
  WorkforceHealthRecord,
  WorkforceHealthRecordCreatePayload,
  LocalGovernmentArea,
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
import { Input, Select, Textarea } from '../../components/common/FormControls';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';
import { Badge } from '../../components/common/Badge';

import {
  Users,
  UserRoundX,
  AlertTriangle,
  ShieldAlert,
  ThermometerSun,
  PlusCircle,
  RefreshCw,
  Filter,
  CalendarDays,
  X,
  Building2,
} from 'lucide-react';

interface Filters {
  lga: string;
  date: string;
}

interface WorkforceForm {
  organization_name: string;
  reporting_date: string;
  total_workforce: string;
  sickness_absences: string;
  workplace_incidents: string;
  occupational_exposures: string;
  heat_related_incidents: string;
  notes: string;
}

const INITIAL_FILTERS: Filters = {
  lga: '',
  date: '',
};

const getLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const INITIAL_FORM: WorkforceForm = {
  organization_name: '',
  reporting_date: getLocalDate(),
  total_workforce: '',
  sickness_absences: '',
  workplace_incidents: '',
  occupational_exposures: '',
  heat_related_incidents: '',
  notes: '',
};

const toNumber = (value: string): number => Number(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-NG').format(value);

const WorkforcePage: React.FC = () => {
  const { role, user } = useAuth();

  const isWorkforceReporter = role === 'WORKFORCE_REPORTER';
  const canCreateRecord = isWorkforceReporter;

  const assignedLgaId = user?.lga_id ?? null;
  const assignedLgaName = user?.lga_name ?? null;

  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);
  const [records, setRecords] = useState<WorkforceHealthRecord[]>([]);

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<WorkforceForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // Reference data
  // --------------------------------------------------

  const fetchReferenceData = useCallback(async () => {
    if (isWorkforceReporter) return;

    try {
      const data = await coreService.getLGAs();
      setLgas(data);
    } catch {
      setError('Unable to load the Local Government Area list.');
    }
  }, [isWorkforceReporter]);

  // --------------------------------------------------
  // Workforce records
  // --------------------------------------------------

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: { lga?: number; date?: string } = {};

      // Workforce reporters are restricted to their assigned LGA.
      if (isWorkforceReporter && assignedLgaId) {
        params.lga = assignedLgaId;
      } else if (filters.lga && !isWorkforceReporter) {
        params.lga = Number(filters.lga);
      }

      if (filters.date) {
        params.date = filters.date;
      }

      const data = await workforceService.getRecords(params);

      const sorted = [...data].sort((a, b) =>
        b.reporting_date.localeCompare(a.reporting_date)
      );

      setRecords(sorted);
    } catch {
      setError(
        'Unable to retrieve workforce records. Check your connection and access permissions.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, isWorkforceReporter, assignedLgaId]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // --------------------------------------------------
  // Filters
  // --------------------------------------------------

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // --------------------------------------------------
  // Form handling
  // --------------------------------------------------

  const updateForm = <K extends keyof WorkforceForm>(
    key: K,
    value: WorkforceForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFormErrors((previous) => ({
      ...previous,
      [key]: '',
    }));

    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!assignedLgaId) {
      errors.lga = 'Your account does not have an assigned LGA.';
    }

    if (!form.organization_name.trim()) {
      errors.organization_name = 'Organization name is required.';
    }

    if (!form.reporting_date) {
      errors.reporting_date = 'Reporting date is required.';
    } else if (form.reporting_date > getLocalDate()) {
      errors.reporting_date = 'Reporting date cannot be in the future.';
    }

    const numericFields: Array<keyof WorkforceForm> = [
      'total_workforce',
      'sickness_absences',
      'workplace_incidents',
      'occupational_exposures',
      'heat_related_incidents',
    ];

    numericFields.forEach((field) => {
      const value = form[field] as string;

      if (value.trim() === '') {
        errors[field] = 'This field is required.';
      } else if (
        !Number.isInteger(Number(value)) ||
        Number(value) < 0
      ) {
        errors[field] = 'Enter a valid non-negative whole number.';
      }
    });

    if (
      form.total_workforce.trim() &&
      form.sickness_absences.trim() &&
      Number(form.sickness_absences) > Number(form.total_workforce)
    ) {
      errors.sickness_absences =
        'Sickness absences cannot exceed the total workforce.';
    }

    setFormErrors(errors);

    return Object.values(errors).every((value) => !value);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSubmitError(null);
    setSuccess(null);

    if (!validateForm()) return;

    if (!assignedLgaId) {
      setSubmitError(
        'Your account must be assigned to an LGA before submitting workforce records.'
      );
      return;
    }

    const payload: WorkforceHealthRecordCreatePayload = {
      organization_name: form.organization_name.trim(),
      lga: assignedLgaId,
      reporting_date: form.reporting_date,
      total_workforce: toNumber(form.total_workforce),
      sickness_absences: toNumber(form.sickness_absences),
      workplace_incidents: toNumber(form.workplace_incidents),
      occupational_exposures: toNumber(form.occupational_exposures),
      heat_related_incidents: toNumber(form.heat_related_incidents),
      notes: form.notes.trim(),
    };

    setIsSubmitting(true);

    try {
      await workforceService.createRecord(payload);

      setSuccess('Workforce health record submitted successfully.');

      setForm(INITIAL_FORM);
      setFormErrors({});
      setShowForm(false);

      await fetchRecords();
    } catch {
      setSubmitError(
        'The workforce record could not be submitted. Check your access permissions and the entered values.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // Dashboard calculations
  // --------------------------------------------------

  const totals = useMemo(() => {
    return records.reduce(
      (result, record) => ({
        workforce: result.workforce + record.total_workforce,
        absences: result.absences + record.sickness_absences,
        incidents: result.incidents + record.workplace_incidents,
        exposures: result.exposures + record.occupational_exposures,
        heat: result.heat + record.heat_related_incidents,
      }),
      {
        workforce: 0,
        absences: 0,
        incidents: 0,
        exposures: 0,
        heat: 0,
      }
    );
  }, [records]);

  const lgaOptions = useMemo(
    () => [
      { value: '', label: 'All LGAs' },
      ...lgas.map((lga) => ({
        value: String(lga.id),
        label: lga.name,
      })),
    ],
    [lgas]
  );

  // --------------------------------------------------
  // Table columns
  // --------------------------------------------------

  const columns: Column<WorkforceHealthRecord>[] = [
    {
      key: 'reporting_date',
      header: 'Reporting Date',
      render: (item) => (
        <span className="font-mono text-xs text-slate-700">
          {item.reporting_date}
        </span>
      ),
    },
    {
      key: 'organization_name',
      header: 'Organization',
      render: (item) => (
        <span className="font-semibold text-slate-900">
          {item.organization_name}
        </span>
      ),
    },
    {
      key: 'lga_name',
      header: 'Local Government',
      render: (item) => (
        <span className="text-sm text-slate-700">
          {item.lga_name}
        </span>
      ),
    },
    {
      key: 'total_workforce',
      header: 'Total Workforce',
      align: 'right',
      render: (item) => (
        <span className="font-semibold text-slate-800">
          {formatNumber(item.total_workforce)}
        </span>
      ),
    },
    {
      key: 'sickness_absences',
      header: 'Sickness Absences',
      align: 'right',
      render: (item) => (
        <span
          className={
            item.sickness_absences > 0
              ? 'font-semibold text-amber-700'
              : 'text-slate-600'
          }
        >
          {formatNumber(item.sickness_absences)}
        </span>
      ),
    },
    {
      key: 'workplace_incidents',
      header: 'Workplace Incidents',
      align: 'right',
      render: (item) => (
        <Badge variant={item.workplace_incidents > 0 ? 'amber' : 'green'}>
          {item.workplace_incidents}
        </Badge>
      ),
    },
    {
      key: 'occupational_exposures',
      header: 'Occupational Exposures',
      align: 'right',
      render: (item) => (
        <span className="text-slate-700">
          {formatNumber(item.occupational_exposures)}
        </span>
      ),
    },
    {
      key: 'heat_related_incidents',
      header: 'Heat Incidents',
      align: 'right',
      render: (item) => (
        <Badge variant={item.heat_related_incidents > 0 ? 'amber' : 'green'}>
          {item.heat_related_incidents}
        </Badge>
      ),
    },
  ];

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-teal-50 p-2">
              <Users className="h-6 w-6 text-teal-700" />
            </div>

            <Badge variant="teal">Population Health Monitoring</Badge>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workforce Health Monitoring
          </h1>

          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Monitor workforce sickness absences, workplace incidents,
            occupational exposures and heat-related health risks across
            Plateau State.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={fetchRecords}
            disabled={isLoading}
          >
            Refresh
          </Button>

          {canCreateRecord && (
            <Button
              variant="primary"
              leftIcon={
                showForm ? (
                  <X className="h-4 w-4" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )
              }
              onClick={() => {
                setShowForm((previous) => !previous);
                setSubmitError(null);
                setSuccess(null);
              }}
            >
              {showForm ? 'Close Form' : 'Submit Workforce Record'}
            </Button>
          )}
        </div>
      </div>

      {/* Reporter assignment */}
      {isWorkforceReporter && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-teal-700 mt-0.5" />

            <div>
              <p className="text-sm font-semibold text-teal-900">
                Your reporting area
              </p>

              <p className="text-sm text-teal-800 mt-1">
                {assignedLgaName || 'No LGA assigned to your account'}
              </p>

              <p className="text-xs text-teal-700 mt-1">
                Workforce submissions are restricted to your assigned
                Local Government Area.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <AlertBanner
          type="danger"
          title="Unable to load workforce data"
          message={error}
        />
      )}

      {success && (
        <AlertBanner
          type="success"
          title="Submission successful"
          message={success}
        />
      )}

      {/* Submission form */}
      {showForm && canCreateRecord && (
        <Card>
          <CardHeader>
            <CardTitle>New Workforce Health Report</CardTitle>
            <CardDescription>
              Submit workforce health information for your assigned LGA.
              All numeric fields must contain non-negative whole numbers.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitError && (
              <div className="mb-4">
                <AlertBanner
                  type="danger"
                  title="Submission failed"
                  message={submitError}
                />
              </div>
            )}

            {!assignedLgaId && (
              <div className="mb-4">
                <AlertBanner
                  type="warning"
                  title="LGA assignment required"
                  message="Your account has no assigned LGA. Contact your system administrator before submitting a report."
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <Input
                  label="Organization Name"
                  placeholder="e.g. Jos General Hospital"
                  value={form.organization_name}
                  onChange={(event) =>
                    updateForm('organization_name', event.target.value)
                  }
                  error={formErrors.organization_name}
                  required
                />

                <Input
                  label="Reporting Date"
                  type="date"
                  max={getLocalDate()}
                  value={form.reporting_date}
                  onChange={(event) =>
                    updateForm('reporting_date', event.target.value)
                  }
                  error={formErrors.reporting_date}
                  required
                />

                <Input
                  label="Total Workforce"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 120"
                  value={form.total_workforce}
                  onChange={(event) =>
                    updateForm('total_workforce', event.target.value)
                  }
                  error={formErrors.total_workforce}
                  required
                />

                <Input
                  label="Sickness Absences"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 8"
                  value={form.sickness_absences}
                  onChange={(event) =>
                    updateForm('sickness_absences', event.target.value)
                  }
                  error={formErrors.sickness_absences}
                  required
                />

                <Input
                  label="Workplace Incidents"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2"
                  value={form.workplace_incidents}
                  onChange={(event) =>
                    updateForm('workplace_incidents', event.target.value)
                  }
                  error={formErrors.workplace_incidents}
                  required
                />

                <Input
                  label="Occupational Exposures"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 4"
                  value={form.occupational_exposures}
                  onChange={(event) =>
                    updateForm('occupational_exposures', event.target.value)
                  }
                  error={formErrors.occupational_exposures}
                  required
                />

                <Input
                  label="Heat-Related Incidents"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1"
                  value={form.heat_related_incidents}
                  onChange={(event) =>
                    updateForm('heat_related_incidents', event.target.value)
                  }
                  error={formErrors.heat_related_incidents}
                  required
                />

                <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assigned Local Government
                  </span>
                  <span className="mt-1 text-sm font-semibold text-slate-900">
                    {assignedLgaName || 'Not assigned'}
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    Automatically assigned from your account
                  </span>
                </div>
              </div>

              <Textarea
                label="Additional Notes"
                placeholder="Describe relevant workforce health observations or incidents..."
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  updateForm('notes', event.target.value)
                }
              />

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setForm(INITIAL_FORM);
                    setFormErrors({});
                    setSubmitError(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!assignedLgaId || isSubmitting}
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                >
                  Submit Workforce Report
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Workforce"
              value={formatNumber(totals.workforce)}
              numericValue={totals.workforce}
              subtitle={`${records.length} workforce records`}
              icon={<Users className="h-5 w-5" />}
              accentColor="teal"
            />

            <MetricCard
              title="Sickness Absences"
              value={formatNumber(totals.absences)}
              numericValue={totals.absences}
              subtitle="Reported absence events"
              icon={<UserRoundX className="h-5 w-5" />}
              accentColor="amber"
            />

            <MetricCard
              title="Workplace Incidents"
              value={formatNumber(totals.incidents)}
              numericValue={totals.incidents}
              subtitle="Reported workplace incidents"
              icon={<AlertTriangle className="h-5 w-5" />}
              accentColor={totals.incidents > 0 ? 'red' : 'green'}
            />

            <MetricCard
              title="Occupational Exposures"
              value={formatNumber(totals.exposures)}
              numericValue={totals.exposures}
              subtitle={`${formatNumber(totals.heat)} heat-related incidents`}
              icon={<ShieldAlert className="h-5 w-5" />}
              accentColor="amber"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Workforce Records</CardTitle>
              <CardDescription>
                Review workforce health reports and occupational risk indicators.
              </CardDescription>
            </div>

            <Badge variant="teal">
              {records.length} records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

            {!isWorkforceReporter && (
              <div className="flex-1">
                <Select
                  label="Local Government Area"
                  options={lgaOptions}
                  value={filters.lga}
                  onChange={(event) =>
                    handleFilterChange('lga', event.target.value)
                  }
                />
              </div>
            )}

            <div className="flex-1">
              <Input
                label="Reporting Date"
                type="date"
                value={filters.date}
                onChange={(event) =>
                  handleFilterChange('date', event.target.value)
                }
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetFilters}
                leftIcon={<Filter className="h-4 w-4" />}
              >
                Reset Filters
              </Button>

              <Button
                variant="primary"
                onClick={fetchRecords}
                disabled={isLoading}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Records table */}
          <Table
            columns={columns}
            data={records}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No workforce records found"
            emptySubtitle="No workforce reports match the selected filters, or no reports have been submitted yet."
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing {records.length} workforce records
            </span>

            <span>
              <CalendarDays className="inline h-3.5 w-3.5 mr-1" />
              Data reflects the selected reporting period
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Interpretation note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex items-start gap-3">
          <ThermometerSun className="h-5 w-5 text-amber-700 mt-0.5" />

          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Workforce Health Monitoring Notice
            </h3>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              These indicators summarize submitted workforce records.
              They should be interpreted alongside disease surveillance,
              environmental observations and community health information.
              A zero value means no incidents were recorded in the
              available reports; it does not establish that no incidents
              occurred.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkforcePage;
