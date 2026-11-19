import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import surveillanceService from '../../services/surveillanceService';
import coreService from '../../services/coreService';
import type {
  Disease,
  DiseaseReport,
  DiseaseReportCreatePayload,
  DiseaseReportStatus,
  LocalGovernmentArea,
} from '../../types';
import { MetricCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import type { Column } from '../../components/common/Table';
import { Input, Select, Textarea } from '../../components/common/FormControls';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';
import { Badge, RoleBadge } from '../../components/common/Badge';
import { Activity, Search, PlusCircle, RefreshCw, FileCheck2, Skull, HeartPulse, Filter } from 'lucide-react';

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------
interface Filters {
  lga: string;
  disease: string;
  date: string;
  status: string;
}

const INITIAL_FILTERS: Filters = { lga: '', disease: '', date: '', status: '' };

// ---------------------------------------------------------------------------
// Form state for new report
// ---------------------------------------------------------------------------
interface ReportForm {
  disease: string;
  reporting_date: string;
  suspected_cases: string;
  confirmed_cases: string;
  deaths: string;
  recoveries: string;
  status: DiseaseReportStatus;
  notes: string;
}

const INITIAL_FORM: ReportForm = {
  disease: '',
  reporting_date: '',
  suspected_cases: '',
  confirmed_cases: '',
  deaths: '',
  recoveries: '',
  status: 'SUSPECTED',
  notes: '',
};

interface FormErrors {
  disease?: string;
  reporting_date?: string;
  suspected_cases?: string;
  confirmed_cases?: string;
  deaths?: string;
  recoveries?: string;
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
const StatusBadge: React.FC<{ status: DiseaseReportStatus }> = ({ status }) => {
  const map: Record<DiseaseReportStatus, { label: string; variant: 'amber' | 'green' | 'teal' }> = {
    SUSPECTED: { label: 'Suspected', variant: 'amber' },
    CONFIRMED: { label: 'Confirmed', variant: 'green' },
    UNDER_REVIEW: { label: 'Under Review', variant: 'teal' },
  };
  const cfg = map[status] ?? map.SUSPECTED;
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export const SurveillancePage: React.FC = () => {
  const { user, role } = useAuth();

  // Reference data
  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);

  // Reports data
  const [reports, setReports] = useState<DiseaseReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  // New report form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReportForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Determine write access
  const canCreateReport =
    role === 'HEALTH_FACILITY_REPORTER' &&
    user?.facility_verification_status === 'VERIFIED';

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (filters.lga) params.lga = Number(filters.lga);
      if (filters.disease) params.disease = Number(filters.disease);
      if (filters.date) params.date = filters.date;
      if (filters.status) params.status = filters.status;

      const data = await surveillanceService.getReports(params);
      setReports(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load surveillance reports.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [lgaData, diseaseData] = await Promise.all([
        coreService.getLGAs(),
        surveillanceService.getDiseases(),
      ]);
      setLgas(lgaData);
      setDiseases(diseaseData);
    } catch {
      // Reference data failure is non-blocking; filters will be limited
    }
  }, []);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // -----------------------------------------------------------------------
  // Filter handlers
  // -----------------------------------------------------------------------
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // -----------------------------------------------------------------------
  // KPI computations
  // -----------------------------------------------------------------------
  const totalReports = reports.length;
  const totalSuspected = reports.reduce((sum, r) => sum + r.suspected_cases, 0);
  const totalConfirmed = reports.reduce((sum, r) => sum + r.confirmed_cases, 0);
  const totalDeaths = reports.reduce((sum, r) => sum + r.deaths, 0);

  // -----------------------------------------------------------------------
  // Form validation & submission
  // -----------------------------------------------------------------------
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!form.disease) errors.disease = 'Disease is required.';
    if (!form.reporting_date) errors.reporting_date = 'Reporting date is required.';

    const suspected = Number(form.suspected_cases);
    const confirmed = Number(form.confirmed_cases);
    const deaths = Number(form.deaths);
    const recoveries = Number(form.recoveries);

    if (form.suspected_cases === '' || isNaN(suspected) || suspected < 0) {
      errors.suspected_cases = 'Must be a non-negative number.';
    }
    if (form.confirmed_cases === '' || isNaN(confirmed) || confirmed < 0) {
      errors.confirmed_cases = 'Must be a non-negative number.';
    }
    if (form.deaths === '' || isNaN(deaths) || deaths < 0) {
      errors.deaths = 'Must be a non-negative number.';
    }
    if (form.recoveries === '' || isNaN(recoveries) || recoveries < 0) {
      errors.recoveries = 'Must be a non-negative number.';
    }

    // Backend constraint: deaths cannot exceed confirmed_cases
    if (!errors.deaths && !errors.confirmed_cases && deaths > confirmed) {
      errors.deaths = 'Deaths cannot exceed confirmed cases.';
    }

    // Backend constraint: recoveries cannot exceed confirmed_cases
    if (!errors.recoveries && !errors.confirmed_cases && recoveries > confirmed) {
      errors.recoveries = 'Recoveries cannot exceed confirmed cases.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (key: keyof ReportForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field-level error on change
    if (formErrors[key as keyof FormErrors]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FormErrors];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setSubmitError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: DiseaseReportCreatePayload = {
        disease: Number(form.disease),
        reporting_date: form.reporting_date,
        suspected_cases: Number(form.suspected_cases),
        confirmed_cases: Number(form.confirmed_cases),
        deaths: Number(form.deaths),
        recoveries: Number(form.recoveries),
        status: form.status,
        notes: form.notes || undefined,
      };

      await surveillanceService.createReport(payload);
      setSubmitSuccess('Disease report submitted successfully.');
      setForm(INITIAL_FORM);
      setFormErrors({});
      setShowForm(false);
      // Refresh the table
      fetchReports();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit report.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Table columns
  // -----------------------------------------------------------------------
  const columns: Column<DiseaseReport>[] = [
    {
      key: 'reporting_date',
      header: 'Date',
      render: (row) => (
        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
          {new Date(row.reporting_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'disease_name',
      header: 'Disease',
      render: (row) => <span className="font-medium text-slate-800">{row.disease_name}</span>,
    },
    {
      key: 'health_facility_name',
      header: 'Facility',
      render: (row) => <span className="text-slate-600 text-xs">{row.health_facility_name}</span>,
    },
    {
      key: 'lga_name',
      header: 'LGA',
      render: (row) => <span className="text-slate-600">{row.lga_name}</span>,
    },
    {
      key: 'suspected_cases',
      header: 'Suspected',
      align: 'right',
      render: (row) => <span className="tabular-nums text-amber-700 font-semibold">{row.suspected_cases}</span>,
    },
    {
      key: 'confirmed_cases',
      header: 'Confirmed',
      align: 'right',
      render: (row) => <span className="tabular-nums text-teal-700 font-semibold">{row.confirmed_cases}</span>,
    },
    {
      key: 'deaths',
      header: 'Deaths',
      align: 'right',
      render: (row) => (
        <span className={`tabular-nums font-semibold ${row.deaths > 0 ? 'text-red-700' : 'text-slate-400'}`}>
          {row.deaths}
        </span>
      ),
    },
    {
      key: 'recoveries',
      header: 'Recoveries',
      align: 'right',
      render: (row) => <span className="tabular-nums text-emerald-700 font-semibold">{row.recoveries}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  // -----------------------------------------------------------------------
  // Active disease options for selects
  // -----------------------------------------------------------------------
  const activeDiseases = diseases.filter((d) => d.is_active);

  const lgaOptions = [
    { value: '', label: 'All LGAs' },
    ...lgas.map((l) => ({ value: String(l.id), label: l.name })),
  ];

  const diseaseFilterOptions = [
    { value: '', label: 'All Diseases' },
    ...activeDiseases.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'SUSPECTED', label: 'Suspected' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
  ];

  const diseaseFormOptions = [
    { value: '', label: 'Select a disease…' },
    ...activeDiseases.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  const statusFormOptions = [
    { value: 'SUSPECTED', label: 'Suspected' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Disease Surveillance Centre
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor and report disease cases across Plateau State health facilities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={role} />
          {canCreateReport && (
            <Button
              variant={showForm ? 'outline' : 'primary'}
              size="sm"
              leftIcon={<PlusCircle className="w-4 h-4" />}
              onClick={() => {
                setShowForm((v) => !v);
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
            >
              {showForm ? 'Cancel' : 'New Report'}
            </Button>
          )}
        </div>
      </div>

      {/* ---- Success / Error banners ---- */}
      {submitSuccess && (
        <AlertBanner
          type="success"
          title="Report Submitted"
          message={submitSuccess}
          onDismiss={() => setSubmitSuccess(null)}
        />
      )}
      {submitError && (
        <AlertBanner
          type="danger"
          title="Submission Failed"
          message={submitError}
          onDismiss={() => setSubmitError(null)}
        />
      )}

      {/* ---- New Report Form ---- */}
      {showForm && canCreateReport && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Disease Report</CardTitle>
            <CardDescription>
              Report new disease cases from your health facility. LGA and facility are set
              automatically from your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select
                  label="Disease"
                  required
                  value={form.disease}
                  onChange={(e) => handleFormChange('disease', e.target.value)}
                  options={diseaseFormOptions}
                  error={formErrors.disease}
                />
                <Input
                  label="Reporting Date"
                  type="date"
                  required
                  value={form.reporting_date}
                  onChange={(e) => handleFormChange('reporting_date', e.target.value)}
                  error={formErrors.reporting_date}
                />
                <Select
                  label="Status"
                  required
                  value={form.status}
                  onChange={(e) => handleFormChange('status', e.target.value as DiseaseReportStatus)}
                  options={statusFormOptions}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Suspected Cases"
                  type="number"
                  min={0}
                  required
                  value={form.suspected_cases}
                  onChange={(e) => handleFormChange('suspected_cases', e.target.value)}
                  error={formErrors.suspected_cases}
                />
                <Input
                  label="Confirmed Cases"
                  type="number"
                  min={0}
                  required
                  value={form.confirmed_cases}
                  onChange={(e) => handleFormChange('confirmed_cases', e.target.value)}
                  error={formErrors.confirmed_cases}
                />
                <Input
                  label="Deaths"
                  type="number"
                  min={0}
                  required
                  value={form.deaths}
                  onChange={(e) => handleFormChange('deaths', e.target.value)}
                  error={formErrors.deaths}
                  helperText="Cannot exceed confirmed"
                />
                <Input
                  label="Recoveries"
                  type="number"
                  min={0}
                  required
                  value={form.recoveries}
                  onChange={(e) => handleFormChange('recoveries', e.target.value)}
                  error={formErrors.recoveries}
                  helperText="Cannot exceed confirmed"
                />
              </div>

              <Textarea
                label="Notes"
                placeholder="Additional observations or context (optional)"
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                rows={3}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setFormErrors({});
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={<FileCheck2 className="w-4 h-4" />}
                >
                  Submit Report
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ---- Filter Bar ---- */}
      <Card>
        <CardContent className="!py-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 lg:mr-1">
              <Filter className="w-4 h-4 text-slate-400" />
              Filters
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              <Select
                value={filters.lga}
                onChange={(e) => handleFilterChange('lga', e.target.value)}
                options={lgaOptions}
              />
              <Select
                value={filters.disease}
                onChange={(e) => handleFilterChange('disease', e.target.value)}
                options={diseaseFilterOptions}
              />
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                placeholder="Date"
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                options={statusFilterOptions}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={fetchReports}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- KPI Metrics Row ---- */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Reports"
            value={totalReports}
            numericValue={totalReports}
            subtitle="Filtered results"
            icon={<FileCheck2 className="w-5 h-5" />}
            accentColor="navy"
          />
          <MetricCard
            title="Suspected Cases"
            value={totalSuspected}
            numericValue={totalSuspected}
            subtitle="Across all reports"
            icon={<Activity className="w-5 h-5" />}
            accentColor="amber"
          />
          <MetricCard
            title="Confirmed Cases"
            value={totalConfirmed}
            numericValue={totalConfirmed}
            subtitle="Laboratory confirmed"
            icon={<HeartPulse className="w-5 h-5" />}
            accentColor="teal"
          />
          <MetricCard
            title="Deaths"
            value={totalDeaths}
            numericValue={totalDeaths}
            subtitle="Reported fatalities"
            icon={<Skull className="w-5 h-5" />}
            accentColor="red"
          />
        </div>
      )}

      {/* ---- Error State ---- */}
      {error && (
        <AlertBanner
          type="danger"
          title="Error Loading Reports"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* ---- Reports Table ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Disease Reports</CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Loading reports…'
                  : `${totalReports} report${totalReports !== 1 ? 's' : ''} found`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="!p-0">
          <Table<DiseaseReport>
            columns={columns}
            data={reports}
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No surveillance reports found"
            emptySubtitle="Adjust the filters above or submit a new disease report."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveillancePage;
