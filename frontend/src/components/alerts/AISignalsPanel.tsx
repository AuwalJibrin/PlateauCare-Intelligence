
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import intelligenceService from '../../services/intelligenceService';
import type { HealthRiskAssessment } from '../../types';

const getRiskStyles = (level: string) => {
  if (level === 'CRITICAL') {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  return 'border-orange-200 bg-orange-50 text-orange-800';
};

const getFactors = (assessment: HealthRiskAssessment): string[] => {
  const factors: unknown = assessment.contributing_factors;

  if (Array.isArray(factors)) {
    return factors.filter(
      (item): item is string => typeof item === 'string'
    );
  }

  if (typeof factors === 'string') {
    return [factors];
  }

  return [];
};

export default function AISignalsPanel() {
  const [assessments, setAssessments] = useState<HealthRiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const results = await intelligenceService.getRiskAssessments();
      setAssessments(Array.isArray(results) ? results : []);
    } catch {
      setError('Unable to load AI assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const reviewSignals = assessments
    .filter(
      (assessment) =>
        assessment.risk_level === 'HIGH' ||
        assessment.risk_level === 'CRITICAL'
    )
    .sort((a, b) => {
  const priority: Record<string, number> = {
    CRITICAL: 2,
    HIGH: 1,
  };

  return (
    (priority[b.risk_level] ?? 0) -
    (priority[a.risk_level] ?? 0)
  );
});

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              AI Signals Requiring Review
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            High and critical AI risk assessments that may need public-health
            officer attention.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAssessments()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <p className="py-6 text-center text-sm text-slate-500">
          Loading AI assessments...
        </p>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => void loadAssessments()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && reviewSignals.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-500" />
          <div>
            <p className="font-medium text-slate-800">
              No high or critical AI signals currently require review.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              This means no qualifying assessments were returned by the AI
              assessment service. It does not mean that disease risk is zero.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && reviewSignals.length > 0 && (
        <div className="space-y-3">
          {reviewSignals.map((assessment) => {
            const factors = getFactors(assessment);
            const score = Number(assessment.risk_score);

            return (
              <article
                key={assessment.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {assessment.lga_name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Assessment date: {assessment.assessment_date}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskStyles(
                      assessment.risk_level
                    )}`}
                  >
                    {assessment.risk_level} — Review recommended
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700">
                    Anomaly percentile score
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {Number.isFinite(score)
                      ? `${(score * 100).toFixed(1)}%`
                      : 'Unavailable'}
                  </p>
                </div>

                {assessment.explanation && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700">
                      AI explanation
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {assessment.explanation}
                    </p>
                  </div>
                )}

                {factors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700">
                      Notable statistical indicators
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {factors.map((factor, index) => (
                        <li key={`${assessment.id}-factor-${index}`}>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  This is an AI-generated review signal, not a confirmed
                  outbreak or a persisted public-health alert. The anomaly
                  score is not an outbreak probability, and the indicators do
                  not establish causation. Officer review is required.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
