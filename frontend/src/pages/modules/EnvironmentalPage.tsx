
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import environmentService from '../../services/environmentService';
import coreService from '../../services/coreService';
import type {
  EnvironmentalObservation,
  EnvironmentalObservationCreatePayload,
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
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  Waves,
  PlusCircle,
  RefreshCw,
  Filter,
  CalendarDays,
  ClipboardList,
  X,
} from 'lucide-react';

interface Filters {
  lga: string;
  date: string;
}

interface ObservationForm {
  lga: string;
  observation_date: string;
  rainfall_mm: string;
  temperature_celsius: string;
  humidity_percentage: string;
  air_quality_index: string;
  flood_occurred: boolean;
  source: string;
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

const INITIAL_FORM: ObservationForm = {
  lga: '',
  observation_date: getLocalDate(),
  rainfall_mm: '',
  temperature_celsius: '',
  humidity_percentage: '',
  air_quality_index: '',
  flood_occurred: false,
  source: 'Manual observation',
  notes: '',
};

const toOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === '') return undefined;
  return Number(value);
};

export const EnvironmentalPage: React.FC = () => {
  const { role } = useAuth();

  const canCreateObservation =
    role === 'SYSTEM_ADMIN' || role === 'PUBLIC_HEALTH_OFFICER';

  const [lgas, setLgas] = useState<LocalGovernmentArea[]>([]);
  const [observations, setObservations] = useState<EnvironmentalObservation[]>([]);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ObservationForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchReferenceData = useCallback(async () => {
    try {
      const data = await coreService.getLGAs();
      setLgas(data);
    } catch {
      setError('Unable to load the LGA list. Please refresh the page.');
    }
  }, []);

  const fetchObservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: { lga?: number; date?: string } = {};

      if (filters.lga) params.lga = Number(filters.lga);
      if (filters.date) params.date = filters.date;

      const data = await environmentService.getObservations(params);

      const sorted = [...data].sort((a, b) =>
        b.observation_date.localeCompare(a.observation_date)
      );

      setObservations(sorted);
    } catch {
      setError(
        'Unable to retrieve environmental observations. Check your connection and access permissions.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const updateForm = <K extends keyof ObservationForm>(
    key: K,
    value: ObservationForm[K]
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFormErrors((previous) => ({ ...previous, [key]: '' }));
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.lga) {
      errors.lga = 'Select a Local Government Area.';
    }

    if (!form.observation_date) {
      errors.observation_date = 'Observation date is required.';
    }

    const rainfall = toOptionalNumber(form.rainfall_mm);
    const temperature = toOptionalNumber(form.temperature_celsius);
    const humidity = toOptionalNumber(form.humidity_percentage);
    const aqi = toOptionalNumber(form.air_quality_index);

    if (
      form.rainfall_mm.trim() &&
      (!Number.isFinite(rainfall) || rainfall! < 0)
    ) {
      errors.rainfall_mm = 'Rainfall must be zero or greater.';
    }

    if (
      form.temperature_celsius.trim() &&
      (!Number.isFinite(temperature) ||
        temperature! < -90 ||
        temperature! > 65)
    ) {
      errors.temperature_celsius =
        'Temperature must be between -90 and 65 °C.';
    }

    if (
      form.humidity_percentage.trim() &&
      (!Number.isFinite(humidity) || humidity! < 0 || humidity! > 100)
    ) {
      errors.humidity_percentage =
        'Humidity must be between 0 and 100%.';
    }

    if (
      form.air_quality_index.trim() &&
      (!Number.isFinite(aqi) || aqi! < 0)
    ) {
      errors.air_quality_index =
        'Air quality index must be zero or greater.';
    }

    const hasAtLeastOneReading =
      form.rainfall_mm.trim() ||
      form.temperature_celsius.trim() ||
      form.humidity_percentage.trim() ||
      form.air_quality_index.trim() ||
      form.flood_occurred;

    if (!hasAtLeastOneReading) {
      errors.readings =
        'Enter at least one environmental reading or report a flood incident.';
    }

    setFormErrors(errors);
    return Object.values(errors).every((value) => !value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (!validateForm()) return;

    const payload: EnvironmentalObservationCreatePayload = {
      lga: Number(form.lga),
      observation_date: form.observation_date,
      flood_occurred: form.flood_occurred,
      source: form.source.trim() || 'Manual observation',
      notes: form.notes.trim(),
    };

    const rainfall = toOptionalNumber(form.rainfall_mm);
    const temperature = toOptionalNumber(form.temperature_celsius);
    const humidity = toOptionalNumber(form.humidity_percentage);
    const aqi = toOptionalNumber(form.air_quality_index);

    if (rainfall !== undefined) payload.rainfall_mm = rainfall;
    if (temperature !== undefined) payload.temperature_celsius = temperature;
    if (humidity !== undefined) payload.humidity_percentage = humidity;
    if (aqi !== undefined) payload.air_quality_index = aqi;

    setIsSubmitting(true);

    try {
      await environmentService.createObservation(payload);

      setSuccess('Environmental observation submitted successfully.');
      setForm({ ...INITIAL_FORM, observation_date: getLocalDate() });
      setFormErrors({});
      setShowForm(false);

      await fetchObservations();
    } catch {
      setSubmitError(
        'The observation could not be submitted. Check your access permissions and the entered values.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFloodReports = observations.filter(
    (item) => item.flood_occurred
  ).length;

  const average = (values: (number | null)[]): string => {
    const valid = values.filter(
      (value): value is number => value !== null
    );

    if (!valid.length) return 'N/A';

    return (
      valid.reduce((sum, value) => sum + value, 0) / valid.length
    ).toFixed(1);
  };

  const averageRainfall = average(
    observations.map((item) => item.rainfall_mm)
  );

  const averageTemperature = average(
    observations.map((item) => item.temperature_celsius)
  );

  const averageHumidity = average(
    observations.map((item) => item.humidity_percentage)
  );

  const averageAqi = average(
    observations.map((item) => item.air_quality_index)
  );

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

  const formLgaOptions = useMemo(
    () => [
      { value: '', label: 'Select LGA' },
      ...lgas.map((lga) => ({
        value: String(lga.id),
        label: lga.name,
      })),
    ],
    [lgas]
  );

  const columns: Column<EnvironmentalObservation>[] = [
    {
      key: 'observation_date',
      header: 'Observation Date',
      render: (item) => (
        <span className="font-mono text-xs text-slate-700">
          {item.observation_date}
        </span>
      ),
    },
    {
      key: 'lga_name',
      header: 'Local Government',
      render: (item) => (
        <span className="font-semibold text-slate-900">
          {item.lga_name}
        </span>
      ),
    },
    {
      key: 'rainfall_mm',
      header: 'Rainfall',
      render: (item) => (
        <span className="text-xs">
          {item.rainfall_mm === null ? 'N/A' : `${item.rainfall_mm} mm`}
        </span>
      ),
    },
    {
      key: 'temperature_celsius',
      header: 'Temperature',
      render: (item) => (
        <span className="text-xs">
          {item.temperature_celsius === null
            ? 'N/A'
            : `${item.temperature_celsius} °C`}
        </span>
      ),
    },
    {
      key: 'humidity_percentage',
      header: 'Humidity',
      render: (item) => (
        <span className="text-xs">
          {item.humidity_percentage === null
            ? 'N/A'
            : `${item.humidity_percentage}%`}
        </span>
      ),
    },
    {
      key: 'air_quality_index',
      header: 'Air Quality',
      render: (item) => (
        <span className="text-xs">
          {item.air_quality_index === null
            ? 'N/A'
            : item.air_quality_index}
        </span>
      ),
    },
    {
      key: 'flood_occurred',
      header: 'Flood Status',
      render: (item) =>
        item.flood_occurred ? (
          <Badge variant="amber" size="sm">
            Flood reported
          </Badge>
        ) : (
          <Badge variant="green" size="sm">
            No flood
          </Badge>
        ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (item) => (
        <span className="text-xs text-slate-600">
          {item.source || 'Not specified'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CloudRain className="h-6 w-6 text-sky-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Environmental Monitoring
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Monitor rainfall, temperature, humidity, air quality, and flood
            incidents across Plateau State.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchObservations}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>

          {canCreateObservation && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowForm((previous) => !previous);
                setSubmitError(null);
              }}
              leftIcon={
                showForm ? (
                  <X className="h-4 w-4" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )
              }
            >
              {showForm ? 'Close Form' : 'New Observation'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <AlertBanner
          type="danger"
          title="Environmental Data Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {success && (
        <AlertBanner
          type="success"
          title="Submission Successful"
          message={success}
          onDismiss={() => setSuccess(null)}
        />
      )}

      {showForm && canCreateObservation && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Environmental Observation</CardTitle>
            <CardDescription>
              Enter verified environmental readings for a Plateau State LGA.
              Leave unavailable readings blank.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <AlertBanner
                  type="danger"
                  title="Submission Failed"
                  message={submitError}
                  onDismiss={() => setSubmitError(null)}
                />
              )}

              {formErrors.readings && (
                <p className="text-sm font-medium text-red-600">
                  {formErrors.readings}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Local Government Area"
                  required
                  value={form.lga}
                  options={formLgaOptions}
                  onChange={(event) =>
                    updateForm('lga', event.target.value)
                  }
                  error={formErrors.lga}
                />

                <Input
                  label="Observation Date"
                  type="date"
                  required
                  value={form.observation_date}
                  onChange={(event) =>
                    updateForm('observation_date', event.target.value)
                  }
                  error={formErrors.observation_date}
                />

                <Input
                  label="Rainfall (mm)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 12.5"
                  value={form.rainfall_mm}
                  onChange={(event) =>
                    updateForm('rainfall_mm', event.target.value)
                  }
                  error={formErrors.rainfall_mm}
                />

                <Input
                  label="Temperature (°C)"
                  type="number"
                  min="-90"
                  max="65"
                  step="0.1"
                  placeholder="e.g. 27.5"
                  value={form.temperature_celsius}
                  onChange={(event) =>
                    updateForm('temperature_celsius', event.target.value)
                  }
                  error={formErrors.temperature_celsius}
                />

                <Input
                  label="Humidity (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 65"
                  value={form.humidity_percentage}
                  onChange={(event) =>
                    updateForm('humidity_percentage', event.target.value)
                  }
                  error={formErrors.humidity_percentage}
                />

                <Input
                  label="Air Quality Index (AQI)"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 45"
                  value={form.air_quality_index}
                  onChange={(event) =>
                    updateForm('air_quality_index', event.target.value)
                  }
                  error={formErrors.air_quality_index}
                />

                <Input
                  label="Observation Source"
                  placeholder="e.g. Field officer, weather station"
                  value={form.source}
                  onChange={(event) =>
                    updateForm('source', event.target.value)
                  }
                />
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.flood_occurred}
                  onChange={(event) =>
                    updateForm('flood_occurred', event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />

                <span>
                  <span className="block text-sm font-semibold text-amber-900">
                    Flood incident reported
                  </span>

                  <span className="mt-1 block text-xs text-amber-800">
                    Tick this only when a flood incident has been observed or
                    reliably reported.
                  </span>
                </span>
              </label>

              <Textarea
                label="Additional Notes"
                placeholder="Add location details, observation context, or relevant notes..."
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  updateForm('notes', event.target.value)
                }
              />

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setForm({
                      ...INITIAL_FORM,
                      observation_date: getLocalDate(),
                    });
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
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                >
                  Submit Observation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <MetricSkeleton key={index} />
          ))
        ) : (
          <>
            <MetricCard
              title="Average Rainfall"
              value={
                averageRainfall === 'N/A'
                  ? 'N/A'
                  : `${averageRainfall} mm`
              }
              subtitle="Across available observations"
              icon={<CloudRain className="h-5 w-5" />}
              accentColor="teal"
            />

            <MetricCard
              title="Average Temperature"
              value={
                averageTemperature === 'N/A'
                  ? 'N/A'
                  : `${averageTemperature} °C`
              }
              subtitle="Across available observations"
              icon={<Thermometer className="h-5 w-5" />}
              accentColor="amber"
            />

            <MetricCard
              title="Average Humidity"
              value={
                averageHumidity === 'N/A'
                  ? 'N/A'
                  : `${averageHumidity}%`
              }
              subtitle="Across available observations"
              icon={<Droplets className="h-5 w-5" />}
              accentColor="teal"
            />

            <MetricCard
              title="Flood Reports"
              value={totalFloodReports}
              numericValue={totalFloodReports}
              subtitle={`${observations.length} observations in current view`}
              icon={<Waves className="h-5 w-5" />}
              accentColor={totalFloodReports > 0 ? 'red' : 'green'}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Environmental Observation Records</CardTitle>
              <CardDescription>
                Review recorded environmental conditions by LGA and date.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ClipboardList className="h-4 w-4" />
              {observations.length} records
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4">
            <Select
              label="Filter by LGA"
              value={filters.lga}
              options={lgaOptions}
              onChange={(event) =>
                handleFilterChange('lga', event.target.value)
              }
            />

            <Input
              label="Filter by Observation Date"
              type="date"
              value={filters.date}
              onChange={(event) =>
                handleFilterChange('date', event.target.value)
              }
              leftIcon={<CalendarDays className="h-4 w-4" />}
            />

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={resetFilters}
                leftIcon={<Filter className="h-4 w-4" />}
              >
                Clear Filters
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={fetchObservations}
                isLoading={isLoading}
              >
                Apply
              </Button>
            </div>
          </div>

          {!isLoading && observations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Average AQI</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {averageAqi}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Flood Incidents</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {totalFloodReports}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">LGAs Represented</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {new Set(observations.map((item) => item.lga)).size}
                </p>
              </div>
            </div>
          )}

          <Table
            columns={columns}
            data={observations}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyMessage="No environmental observations found"
            emptySubtitle="Try changing the filters or submit a new observation if you are authorized."
          />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <Wind className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />

          <div>
            <h3 className="text-sm font-semibold text-sky-950">
              Environmental data and public-health early warning
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-sky-900">
              Environmental observations provide context for population-health
              monitoring. They are not, by themselves, proof of an outbreak or
              evidence that an environmental condition caused a disease event.
              AI assessments are displayed separately in the Intelligence
              Centre when sufficient data is available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalPage;
