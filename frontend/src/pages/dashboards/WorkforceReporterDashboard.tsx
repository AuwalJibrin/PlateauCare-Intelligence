import React, { useEffect, useState } from 'react';
import {
  Users,
  Flame,
  PlusCircle,
  RefreshCw,
  MapPin,
  FileCheck2,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import workforceService from '../../services/workforceService';
import type {
  WorkforceHealthRecord,
  WorkforceHealthRecordCreatePayload,
} from '../../types';
import { MetricCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import type { Column } from '../../components/common/Table';
import { Input, Textarea } from '../../components/common/FormControls';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';

export const WorkforceReporterDashboard: React.FC = () => {
  const { user } = useAuth();

  const assignedLgaId = user?.lga_id;
  const assignedLgaName = user?.lga_name || 'Unassigned LGA';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [records, setRecords] = useState<WorkforceHealthRecord[]>([]);
  const [showForm, setShowForm] = useState(false);

  const getLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
};

const todayStr = getLocalDate();
  const [formData, setFormData] = useState<WorkforceHealthRecordCreatePayload>({
    organization_name: '',
    lga: assignedLgaId || 0,
    reporting_date: todayStr,
    total_workforce: 0,
    sickness_absences: 0,
    workplace_incidents: 0,
    occupational_exposures: 0,
    heat_related_incidents: 0,
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await workforceService.getRecords();
      setRecords(data);
    } catch {
      setError('Unable to retrieve workforce health logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (assignedLgaId) {
      setFormData((prev) => ({ ...prev, lga: assignedLgaId }));
    }
  }, [assignedLgaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!assignedLgaId) {
      setError('Your account is not assigned to an LGA. Contact the system administrator.');
      return;
    }

    if (!formData.organization_name.trim()) {
      setError('Please provide an organization or employer name.');
      return;
    }

    if (formData.total_workforce <= 0) {
      setError('Total active workforce must be greater than zero.');
      return;
    }

    // Validation rules matching backend clean() method
    if (formData.sickness_absences > formData.total_workforce) {
      setError('Sickness absences cannot exceed the total workforce.');
      return;
    }
    if (formData.workplace_incidents > formData.total_workforce) {
      setError('Workplace incidents cannot exceed the total workforce.');
      return;
    }
    if (formData.occupational_exposures > formData.total_workforce) {
      setError('Occupational exposures cannot exceed the total workforce.');
      return;
    }
    if (formData.heat_related_incidents > formData.total_workforce) {
      setError('Heat-related incidents cannot exceed the total workforce.');
      return;
    }

    setIsSubmitting(true);
    try {
      await workforceService.createRecord({
        ...formData,
        lga: assignedLgaId,
      });
      setSuccessMessage('Workforce health submission successfully logged into surveillance.');
      setShowForm(false);
      setFormData({
        organization_name: '',
        lga: assignedLgaId,
        reporting_date: todayStr,
        total_workforce: 0,
        sickness_absences: 0,
        workplace_incidents: 0,
        occupational_exposures: 0,
        heat_related_incidents: 0,
        notes: '',
      });
      await fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[] | string> } };
      const errData = axiosErr.response?.data;
      if (errData && typeof errData === 'object') {
        const firstKey = Object.keys(errData)[0];
        const val = errData[firstKey];
        setError(Array.isArray(val) ? val[0] : String(val));
      } else {
        setError('Submission failed. Verify connection and authorization.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics from actual records
  const totalSubmissions = records.length;
  const totalEmployeesMonitored = records.reduce((acc, r) => acc + (r.total_workforce || 0), 0);
  const totalAbsences = records.reduce((acc, r) => acc + (r.sickness_absences || 0), 0);
  const totalHeatIncidents = records.reduce((acc, r) => acc + (r.heat_related_incidents || 0), 0);

  // Table columns
  const recordColumns: Column<WorkforceHealthRecord>[] = [
    {
      key: 'reporting_date',
      header: 'Reporting Date',
      render: (r) => <span className="font-mono text-xs">{r.reporting_date}</span>,
    },
    {
      key: 'organization_name',
      header: 'Organization / Employer',
      render: (r) => <span className="font-semibold text-slate-900">{r.organization_name}</span>,
    },
    {
      key: 'total_workforce',
      header: 'Workforce Size',
      render: (r) => <span className="font-mono text-slate-700">{r.total_workforce.toLocaleString()}</span>,
    },
    {
      key: 'sickness_absences',
      header: 'Sickness Absences',
      render: (r) => (
        <span className="text-amber-700 font-bold">
          {r.sickness_absences}{' '}
          <span className="text-[10px] text-slate-400 font-normal">
            ({((r.sickness_absences / (r.total_workforce || 1)) * 100).toFixed(1)}%)
          </span>
        </span>
      ),
    },
    {
      key: 'workplace_incidents',
      header: 'Incidents',
      render: (r) => <span className="text-slate-700">{r.workplace_incidents}</span>,
    },
    {
      key: 'occupational_exposures',
      header: 'Exposures',
      render: (r) => <span className="text-orange-700 font-medium">{r.occupational_exposures}</span>,
    },
    {
      key: 'heat_related_incidents',
      header: 'Heat Stress',
      render: (r) => (
        <span className={r.heat_related_incidents > 0 ? 'text-red-700 font-bold' : 'text-slate-400'}>
          {r.heat_related_incidents}
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
              Workforce Health Reporter Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-xs border border-amber-200">
              Occupational Sentinel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Assigned Jurisdiction: <strong>{assignedLgaName}</strong></span>
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
          {assignedLgaId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(!showForm)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              {showForm ? 'Close Form' : 'New Workforce Log'}
            </Button>
          )}
        </div>
      </div>

      {!assignedLgaId && (
        <AlertBanner
          type="danger"
          title="No LGA Assigned"
          message="Your account does not have an assigned Local Government Area. Contact the system administrator to link your profile to a Plateau State LGA."
        />
      )}

      {error && (
        <AlertBanner
          type="danger"
          title="Submission Notice"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {successMessage && (
        <AlertBanner
          type="success"
          title="Submission Successful"
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
              value={totalSubmissions}
              numericValue={totalSubmissions}
              subtitle="Logged to LGA surveillance"
              icon={<FileCheck2 className="w-5 h-5" />}
              accentColor="amber"
            />
            <MetricCard
              title="Workforce Represented"
              value={totalEmployeesMonitored.toLocaleString()}
              subtitle="Cumulative employment pool"
              icon={<Users className="w-5 h-5" />}
              accentColor="teal"
            />
            <MetricCard
              title="Sickness Absences"
              value={totalAbsences}
              numericValue={totalAbsences}
              subtitle="Early absenteeism warnings"
              icon={<TrendingDown className="w-5 h-5" />}
              accentColor="red"
            />
            <MetricCard
              title="Heat-Related Incidents"
              value={totalHeatIncidents}
              numericValue={totalHeatIncidents}
              subtitle="Thermal stress events"
              icon={<Flame className="w-5 h-5" />}
              accentColor="amber"
            />
          </>
        )}
      </div>

      {/* Submission Form */}
      {showForm && assignedLgaId && (
        <Card className="border-amber-400/60 shadow-md">
          <CardHeader className="bg-amber-50/50">
            <CardTitle>Submit Occupational Health Telemetry</CardTitle>
            <CardDescription>
              Filing for {assignedLgaName}. Occupational absenteeism provides early warning signals of circulating respiratory or gastrointestinal infections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Organization / Company Name"
                  required
                  placeholder="e.g. Grand Cereals Jos, Mining Syndicate..."
                  value={formData.organization_name}
                  onChange={(e) =>
                    setFormData({ ...formData, organization_name: e.target.value })
                  }
                />

                <Input
                  label="Reporting Date"
                  type="date"
                  max={todayStr}
                  required
                  value={formData.reporting_date}
                  onChange={(e) =>
                    setFormData({ ...formData, reporting_date: e.target.value })
                  }
                />

                <Input
                  label="Total Active Workforce"
                  type="number"
                  min={1}
                  required
                  value={formData.total_workforce || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, total_workforce: Number(e.target.value) })
                  }
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Sickness Absences"
                  type="number"
                  min={0}
                  required
                  value={formData.sickness_absences}
                  onChange={(e) =>
                    setFormData({ ...formData, sickness_absences: Number(e.target.value) })
                  }
                />

                <Input
                  label="Workplace Incidents"
                  type="number"
                  min={0}
                  required
                  value={formData.workplace_incidents}
                  onChange={(e) =>
                    setFormData({ ...formData, workplace_incidents: Number(e.target.value) })
                  }
                />

                <Input
                  label="Occupational Exposures"
                  type="number"
                  min={0}
                  required
                  value={formData.occupational_exposures}
                  onChange={(e) =>
                    setFormData({ ...formData, occupational_exposures: Number(e.target.value) })
                  }
                />

                <Input
                  label="Heat-Related Incidents"
                  type="number"
                  min={0}
                  required
                  value={formData.heat_related_incidents}
                  onChange={(e) =>
                    setFormData({ ...formData, heat_related_incidents: Number(e.target.value) })
                  }
                />
              </div>

              <Textarea
                label="Observations & Occupational Context (Optional)"
                placeholder="Mention specific departments, shifts, or environmental conditions..."
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
                  Submit Workforce Log
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Workforce Submissions Archive</h2>
            <p className="text-xs text-slate-500">Historical occupational logs submitted for {assignedLgaName}</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {records.length} submissions logged
          </span>
        </div>

        <Table
          columns={recordColumns}
          data={records}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No workforce logs filed yet"
          emptySubtitle="Click 'New Workforce Log' above to submit your organization's first occupational report."
        />
      </div>
    </div>
  );
};

export default WorkforceReporterDashboard;
