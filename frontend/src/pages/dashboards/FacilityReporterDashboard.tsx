import React, { useEffect, useState } from 'react';
import {
  Building2,
  Activity,
  PlusCircle,
  FileCheck2,
  RefreshCw,
  CheckCircle2,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import surveillanceService from '../../services/surveillanceService';
import type {
  Disease,
  DiseaseReport,
  DiseaseReportCreatePayload,
  DiseaseReportStatus,
} from '../../types';
import { MetricCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import type { Column } from '../../components/common/Table';
import { Input, Select, Textarea } from '../../components/common/FormControls';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';

export const FacilityReporterDashboard: React.FC = () => {
  const { user } = useAuth();

  const facilityName = user?.health_facility_name || 'Assigned Health Facility';
  const lgaName = user?.lga_name || 'Assigned LGA';
  const verificationStatus = user?.facility_verification_status || 'PENDING';
  const isVerified = verificationStatus === 'VERIFIED';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [reports, setReports] = useState<DiseaseReport[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const getLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
};

const todayStr = getLocalDate();
  const [formData, setFormData] = useState<DiseaseReportCreatePayload>({
    disease: 0,
    reporting_date: todayStr,
    suspected_cases: 0,
    confirmed_cases: 0,
    deaths: 0,
    recoveries: 0,
    status: 'SUSPECTED' as DiseaseReportStatus,
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [diseasesData, reportsData] = await Promise.all([
        surveillanceService.getDiseases().catch(() => []),
        surveillanceService.getReports().catch(() => []),
      ]);

      setDiseases(diseasesData);
      setReports(reportsData);

      if (diseasesData.length > 0 && formData.disease === 0) {
        setFormData((prev) => ({ ...prev, disease: diseasesData[0].id }));
      }
    } catch {
      setError('Unable to fetch facility records. Please verify API connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Front-end sanity checks matching Django serializer validations
    if (formData.disease === 0) {
      setError('Please select a disease from the catalogue.');
      return;
    }
    if (formData.deaths > formData.confirmed_cases) {
      setError('Deaths cannot exceed the number of confirmed cases.');
      return;
    }
    if (formData.recoveries > formData.confirmed_cases) {
      setError('Recoveries cannot exceed the number of confirmed cases.');
      return;
    }

    setIsSubmitting(true);
    try {
      await surveillanceService.createReport(formData);
      setSuccessMessage('Disease report submitted successfully and logged to facility history.');
      setShowForm(false);
      // Reset numeric fields
      setFormData((prev) => ({
        ...prev,
        suspected_cases: 0,
        confirmed_cases: 0,
        deaths: 0,
        recoveries: 0,
        notes: '',
      }));
      await fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[] | string> } };
      const errData = axiosErr.response?.data;
      if (errData && typeof errData === 'object') {
        const firstKey = Object.keys(errData)[0];
        const val = errData[firstKey];
        setError(Array.isArray(val) ? val[0] : String(val));
      } else {
        setError('Submission failed. Check network or verify facility authorization.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics derived from actual facility reports
  const totalReports = reports.length;
  const cumulativeSuspected = reports.reduce((acc, r) => acc + (r.suspected_cases || 0), 0);
  const cumulativeConfirmed = reports.reduce((acc, r) => acc + (r.confirmed_cases || 0), 0);
  const cumulativeRecoveries = reports.reduce((acc, r) => acc + (r.recoveries || 0), 0);

  // Table columns
  const reportColumns: Column<DiseaseReport>[] = [
    {
      key: 'reporting_date',
      header: 'Reporting Date',
      render: (r) => <span className="font-mono text-xs">{r.reporting_date}</span>,
    },
    {
      key: 'disease_name',
      header: 'Disease Target',
      render: (r) => <span className="font-semibold text-slate-900">{r.disease_name}</span>,
    },
    {
      key: 'suspected_cases',
      header: 'Suspected',
      render: (r) => <span className="text-amber-700 font-bold">{r.suspected_cases}</span>,
    },
    {
      key: 'confirmed_cases',
      header: 'Confirmed',
      render: (r) => <span className="text-red-700 font-bold">{r.confirmed_cases}</span>,
    },
    {
      key: 'recoveries',
      header: 'Recoveries',
      render: (r) => <span className="text-emerald-700 font-bold">{r.recoveries}</span>,
    },
    {
      key: 'deaths',
      header: 'Deaths',
      render: (r) => <span className="text-slate-700 font-semibold">{r.deaths}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
            r.status === 'CONFIRMED'
              ? 'bg-red-50 text-red-800 border-red-200'
              : r.status === 'SUSPECTED'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Health Facility Reporter Dashboard
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full font-semibold text-xs border ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isVerified ? 'Verified Facility' : 'Pending Verification'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              {facilityName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              LGA: {lgaName}
            </span>
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
            Refresh
          </Button>
          {isVerified && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              {showForm ? 'Close Form' : 'New Disease Report'}
            </Button>
          )}
        </div>
      </div>

      {!isVerified && (
        <AlertBanner
          type="warning"
          title="Facility Verification Pending"
          message="Your account is assigned to an unverified or inactive health facility. Under Plateau State public-health policy, disease reports can only be submitted once the system administrator has verified your facility in Django Admin."
        />
      )}

      {error && (
        <AlertBanner
          type="danger"
          title="Reporting Notice"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {successMessage && (
        <AlertBanner
          type="success"
          title="Report Accepted"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="Reports Submitted"
              value={totalReports}
              numericValue={totalReports}
              subtitle="Logged to facility archive"
              icon={<FileCheck2 className="w-5 h-5" />}
              accentColor="teal"
            />
            <MetricCard
              title="Suspected Cases"
              value={cumulativeSuspected}
              numericValue={cumulativeSuspected}
              subtitle="Facility-level aggregate"
              icon={<Activity className="w-5 h-5" />}
              accentColor="amber"
            />
            <MetricCard
              title="Confirmed Cases"
              value={cumulativeConfirmed}
              numericValue={cumulativeConfirmed}
              subtitle="Positive diagnostic tests"
              icon={<TrendingUp className="w-5 h-5" />}
              accentColor="red"
            />
            <MetricCard
              title="Patient Recoveries"
              value={cumulativeRecoveries}
              numericValue={cumulativeRecoveries}
              subtitle="Discharged patients"
              icon={<CheckCircle2 className="w-5 h-5" />}
              accentColor="green"
            />
          </>
        )}
      </div>

      {/* Submission Form (Toggleable or Embedded) */}
      {showForm && isVerified && (
        <Card className="border-teal-500/50 shadow-md">
          <CardHeader className="bg-teal-50/50">
            <CardTitle>Submit Daily Epidemiological Report</CardTitle>
            <CardDescription>
              Filing for {facilityName} ({lgaName}). Reports are immediately incorporated into the LGA AI anomaly detection pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Target Disease"
                  required
                  value={formData.disease}
                  onChange={(e) => setFormData({ ...formData, disease: Number(e.target.value) })}
                >
                  <option value={0} disabled>Select Disease...</option>
                  {diseases.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Reporting Date"
                  type="date"
                  max={todayStr}
                  required
                  value={formData.reporting_date}
                  onChange={(e) => setFormData({ ...formData, reporting_date: e.target.value })}
                />

                <Select
                  label="Clinical Status"
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as DiseaseReportStatus })
                  }
                >
                  <option value="SUSPECTED">Suspected Cases</option>
                  <option value="CONFIRMED">Laboratory Confirmed</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Suspected Cases"
                  type="number"
                  min={0}
                  required
                  value={formData.suspected_cases}
                  onChange={(e) =>
                    setFormData({ ...formData, suspected_cases: Number(e.target.value) })
                  }
                />

                <Input
                  label="Confirmed Cases"
                  type="number"
                  min={0}
                  required
                  value={formData.confirmed_cases}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmed_cases: Number(e.target.value) })
                  }
                />

                <Input
                  label="Documented Deaths"
                  type="number"
                  min={0}
                  required
                  value={formData.deaths}
                  onChange={(e) => setFormData({ ...formData, deaths: Number(e.target.value) })}
                />

                <Input
                  label="Documented Recoveries"
                  type="number"
                  min={0}
                  required
                  value={formData.recoveries}
                  onChange={(e) =>
                    setFormData({ ...formData, recoveries: Number(e.target.value) })
                  }
                />
              </div>

              <Textarea
                label="Clinical Notes & Observations (Optional)"
                placeholder="Include symptoms, age clusters, or geographical settlement markers..."
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
                  Submit Report to Surveillance
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Facility Reporting History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Facility Report Archive</h2>
            <p className="text-xs text-slate-500">Historical disease logs filed by {facilityName}</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {reports.length} total submissions
          </span>
        </div>

        <Table
          columns={reportColumns}
          data={reports}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No reports filed yet"
          emptySubtitle="Click 'New Disease Report' above to log your facility's first epidemiological report."
        />
      </div>
    </div>
  );
};

export default FacilityReporterDashboard;
