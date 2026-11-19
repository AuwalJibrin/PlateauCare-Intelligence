import React, { useEffect, useState } from 'react';
import {
  Users,
  HeartHandshake,
  PlusCircle,
  RefreshCw,
  MapPin,
  FileCheck2,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import communityService from '../../services/communityService';
import type {
  CommunityHealthRecord,
  CommunityHealthRecordCreatePayload,
} from '../../types';
import { MetricCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table } from '../../components/common/Table';
import type { Column } from '../../components/common/Table';
import { Input, Textarea } from '../../components/common/FormControls';
import { AlertBanner } from '../../components/common/AlertBanner';
import { MetricSkeleton } from '../../components/common/LoadingSkeleton';

export const CommunityReporterDashboard: React.FC = () => {
  const { user } = useAuth();

  const assignedLgaId = user?.lga_id;
  const assignedLgaName = user?.lga_name || 'Unassigned LGA';

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [records, setRecords] = useState<CommunityHealthRecord[]>([]);
  const [showForm, setShowForm] = useState(false);

  const getLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
};

const todayStr = getLocalDate();
  const [formData, setFormData] = useState<CommunityHealthRecordCreatePayload>({
    community_name: '',
    lga: assignedLgaId || 0,
    reporting_date: todayStr,
    population_covered: 0,
    people_screened: 0,
    people_referred: 0,
    reported_health_concerns: 0,
    people_reached_through_awareness: 0,
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await communityService.getRecords();
      setRecords(data);
    } catch {
      setError('Unable to retrieve community outreach records.');
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

    if (!formData.community_name.trim()) {
      setError('Please provide a community, settlement, or ward name.');
      return;
    }

    if (formData.population_covered <= 0) {
      setError('Estimated population covered must be greater than zero.');
      return;
    }

    // Validation rules matching backend model clean()
    if (formData.people_screened > formData.population_covered) {
      setError('People screened cannot exceed the population covered.');
      return;
    }
    if (formData.people_referred > formData.people_screened) {
      setError('People referred cannot exceed the number of people screened.');
      return;
    }
    if (formData.people_reached_through_awareness > formData.population_covered) {
      setError('People reached through awareness campaigns cannot exceed the population covered.');
      return;
    }

    setIsSubmitting(true);
    try {
      await communityService.createRecord({
        ...formData,
        lga: assignedLgaId,
      });
      setSuccessMessage('Community health record successfully logged into surveillance.');
      setShowForm(false);
      setFormData({
        community_name: '',
        lga: assignedLgaId,
        reporting_date: todayStr,
        population_covered: 0,
        people_screened: 0,
        people_referred: 0,
        reported_health_concerns: 0,
        people_reached_through_awareness: 0,
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
        setError('Submission failed. Check network and LGA authorization.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics from actual records
  const totalOutreaches = records.length;
  const cumulativePopulation = records.reduce((acc, r) => acc + (r.population_covered || 0), 0);
  const cumulativeScreened = records.reduce((acc, r) => acc + (r.people_screened || 0), 0);
  const cumulativeReferred = records.reduce((acc, r) => acc + (r.people_referred || 0), 0);

  // Table columns
  const recordColumns: Column<CommunityHealthRecord>[] = [
    {
      key: 'reporting_date',
      header: 'Reporting Date',
      render: (r) => <span className="font-mono text-xs">{r.reporting_date}</span>,
    },
    {
      key: 'community_name',
      header: 'Community / Settlement',
      render: (r) => <span className="font-semibold text-slate-900">{r.community_name}</span>,
    },
    {
      key: 'population_covered',
      header: 'Pop. Covered',
      render: (r) => <span className="font-mono text-slate-700">{r.population_covered.toLocaleString()}</span>,
    },
    {
      key: 'people_screened',
      header: 'Screened',
      render: (r) => <span className="text-teal-700 font-bold">{r.people_screened.toLocaleString()}</span>,
    },
    {
      key: 'people_referred',
      header: 'Referred to PHC',
      render: (r) => <span className="text-amber-700 font-bold">{r.people_referred.toLocaleString()}</span>,
    },
    {
      key: 'reported_health_concerns',
      header: 'Concerns Logged',
      render: (r) => <span className="text-red-700 font-semibold">{r.reported_health_concerns}</span>,
    },
    {
      key: 'people_reached_through_awareness',
      header: 'Awareness Reach',
      render: (r) => <span className="text-emerald-700 font-medium">{r.people_reached_through_awareness.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Community Health Reporter Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200">
              Grassroots Outreach
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
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
              {showForm ? 'Close Form' : 'New Community Outreach'}
            </Button>
          )}
        </div>
      </div>

      {!assignedLgaId && (
        <AlertBanner
          type="danger"
          title="No LGA Assigned"
          message="Your account is not linked to an LGA. Contact the system administrator to assign a Plateau State LGA to your community reporter account."
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
          title="Outreach Logged"
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
              title="Outreach Records"
              value={totalOutreaches}
              numericValue={totalOutreaches}
              subtitle="Community sessions logged"
              icon={<FileCheck2 className="w-5 h-5" />}
              accentColor="teal"
            />
            <MetricCard
              title="Population Reached"
              value={cumulativePopulation.toLocaleString()}
              subtitle="Catchment area coverage"
              icon={<Users className="w-5 h-5" />}
              accentColor="green"
            />
            <MetricCard
              title="People Screened"
              value={cumulativeScreened.toLocaleString()}
              subtitle="Proactive syndromic triage"
              icon={<Stethoscope className="w-5 h-5" />}
              accentColor="navy"
            />
            <MetricCard
              title="Patients Referred"
              value={cumulativeReferred.toLocaleString()}
              subtitle="Escalated to clinics & PHCs"
              icon={<HeartHandshake className="w-5 h-5" />}
              accentColor="amber"
            />
          </>
        )}
      </div>

      {/* Submission Form */}
      {showForm && assignedLgaId && (
        <Card className="border-emerald-400/60 shadow-md">
          <CardHeader className="bg-emerald-50/50">
            <CardTitle>Log Community Health Outreach Activity</CardTitle>
            <CardDescription>
              Filing for {assignedLgaName}. Community monitoring feeds grassroots alerts into the central AI early warning system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Community / Settlement Name"
                  required
                  placeholder="e.g. Tudun Wada, Angwan Rogo, Vom..."
                  value={formData.community_name}
                  onChange={(e) =>
                    setFormData({ ...formData, community_name: e.target.value })
                  }
                />

                <Input
                  label="Activity Date"
                  type="date"
                  max={todayStr}
                  required
                  value={formData.reporting_date}
                  onChange={(e) =>
                    setFormData({ ...formData, reporting_date: e.target.value })
                  }
                />

                <Input
                  label="Catchment Population Covered"
                  type="number"
                  min={1}
                  required
                  value={formData.population_covered || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, population_covered: Number(e.target.value) })
                  }
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Input
                  label="Individuals Screened"
                  type="number"
                  min={0}
                  required
                  value={formData.people_screened}
                  onChange={(e) =>
                    setFormData({ ...formData, people_screened: Number(e.target.value) })
                  }
                />

                <Input
                  label="Patients Referred to PHC"
                  type="number"
                  min={0}
                  required
                  value={formData.people_referred}
                  onChange={(e) =>
                    setFormData({ ...formData, people_referred: Number(e.target.value) })
                  }
                />

                <Input
                  label="Reported Health Concerns"
                  type="number"
                  min={0}
                  required
                  value={formData.reported_health_concerns}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reported_health_concerns: Number(e.target.value),
                    })
                  }
                />

                <Input
                  label="People Reached (Awareness)"
                  type="number"
                  min={0}
                  required
                  value={formData.people_reached_through_awareness}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      people_reached_through_awareness: Number(e.target.value),
                    })
                  }
                />
              </div>

              <Textarea
                label="Community Notes & Concerns (Optional)"
                placeholder="Mention water source complaints, rumors of febrile illnesses, or vaccine hesitancy..."
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
                  Submit Community Record
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
            <h2 className="text-lg font-bold text-slate-900">Community Outreach Archive</h2>
            <p className="text-xs text-slate-500">Historical screening & awareness sessions for {assignedLgaName}</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {records.length} sessions logged
          </span>
        </div>

        <Table
          columns={recordColumns}
          data={records}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No community outreach records logged yet"
          emptySubtitle="Click 'New Community Outreach' above to submit your first grassroots health record."
        />
      </div>
    </div>
  );
};

export default CommunityReporterDashboard;
