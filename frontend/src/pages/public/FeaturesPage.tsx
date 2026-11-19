import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CloudRain,
  Briefcase,
  Users,
  BrainCircuit,
  BellRing,
  CheckCircle2,
  ArrowRight,
  Filter,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RoleBadge } from '../../components/common/Badge';

export const FeaturesPage: React.FC = () => {
  const features = [
    {
      id: 'disease-surveillance',
      title: 'Disease Surveillance Module',
      badge: 'Clinical Tracking',
      icon: <Activity className="w-6 h-6 text-teal-600" />,
      tagline: 'Standardized syndromic and confirmed case reporting from healthcare facilities',
      description: 'Enables registered primary healthcare centres, clinics, and hospitals to file daily epidemiological reports across catalogued priority diseases including Cholera, Lassa Fever, Malaria, and Measles.',
      fields: [
        'Suspected cases & Confirmed cases',
        'Reported deaths & Documented recoveries',
        'Status tracking (Suspected, Confirmed, Under Review)',
        'Automatic LGA and Health Facility linkage',
      ],
      authorizedRoles: ['PUBLIC_HEALTH_OFFICER', 'HEALTH_FACILITY_REPORTER'] as const,
      filters: 'Filterable by LGA, Disease, Date, and Clinical Status',
    },
    {
      id: 'environmental-monitoring',
      title: 'Environmental & Climate Monitoring',
      badge: 'Vector Early Warning',
      icon: <CloudRain className="w-6 h-6 text-blue-600" />,
      tagline: 'Capturing ecological triggers of waterborne and vector-borne outbreaks',
      description: 'Tracks ambient weather and environmental metrics that historically correlate with water contamination and vector proliferation across Plateau State communities.',
      fields: [
        'Rainfall accumulation (mm)',
        'Ambient temperature (°C)',
        'Relative humidity (%)',
        'Air Quality Index (AQI)',
        'Binary flood occurrence verification',
      ],
      authorizedRoles: ['PUBLIC_HEALTH_OFFICER'] as const,
      filters: 'Filterable by LGA and Observation Date',
    },
    {
      id: 'workforce-monitoring',
      title: 'Workforce Health Monitoring',
      badge: 'Occupational Surveillance',
      icon: <Briefcase className="w-6 h-6 text-amber-600" />,
      tagline: 'Early sentinel indicators from major employers and organized labour',
      description: 'Workplace sickness absences and occupational exposures frequently spike before formal hospital visits occur. This module provides early community signals from enterprise workforces.',
      fields: [
        'Total active workforce count',
        'Sickness-related absences',
        'Workplace safety incidents',
        'Occupational chemical or biological exposures',
        'Heat-related medical incidents',
      ],
      authorizedRoles: ['PUBLIC_HEALTH_OFFICER', 'WORKFORCE_REPORTER'] as const,
      filters: 'Filterable by LGA and Reporting Date',
    },
    {
      id: 'community-monitoring',
      title: 'Community Health Monitoring',
      badge: 'Grassroots Reach',
      icon: <Users className="w-6 h-6 text-emerald-600" />,
      tagline: 'Empowering community health mobilizers and rural outreach teams',
      description: 'Records outreach screening volume, health education reach, and grassroots health concerns from village health committees and remote settlements.',
      fields: [
        'Estimated community population covered',
        'Individuals screened for acute symptoms',
        'Patients referred to primary health centres',
        'Logged grassroots health concerns',
        'Citizens reached through health awareness campaigns',
      ],
      authorizedRoles: ['PUBLIC_HEALTH_OFFICER', 'COMMUNITY_REPORTER'] as const,
      filters: 'Filterable by LGA and Reporting Date',
    },
    {
      id: 'ai-intelligence',
      title: 'AI Anomaly Intelligence Centre',
      badge: 'Unsupervised ML',
      icon: <BrainCircuit className="w-6 h-6 text-purple-600" />,
      tagline: 'Isolation Forest pattern detection with explainable factor attribution',
      description: 'Harmonizes all daily indicators into a 20-dimensional feature vector, ranking observations against historical baselines and explaining the top driving features.',
      fields: [
        'Anomaly percentile rank (0% – 100%)',
        'Stratified risk level (Low, Moderate, High, Critical)',
        'Decision scores from Scikit-Learn Isolation Forest pipeline',
        'Relative Interquartile Range (IQR) deviations',
        'Human-readable contributing indicator sentences',
      ],
      authorizedRoles: ['PUBLIC_HEALTH_OFFICER'] as const,
      filters: 'Filterable by LGA and Assessment Date',
    },
    {
      id: 'alerts-response',
      title: 'Public-Health Alerts & Response',
      badge: 'Triage & Containment',
      icon: <BellRing className="w-6 h-6 text-red-600" />,
      tagline: 'Actionable decision support connecting warnings to containment protocols',
      description: 'Translates high-risk anomalies into prioritized action cards. Health officers can acknowledge warnings, deploy investigation teams, and mark alerts as resolved with a full audit trail.',
      fields: [
        'Alert severity linked directly to AI risk score',
        'Recommended immediate public-health containment action',
        'State transition lifecycle (Open → Acknowledged → Resolved / Dismissed)',
        'Timestamped officer attribution for accountability',
      ],
      authorizedRoles: ['PUBLIC_HEALTH_OFFICER'] as const,
      filters: 'Filterable by Status (Open/Acknowledged/Resolved), Risk Level, and Date',
    },
  ];

  return (
    <div className="space-y-16 py-12">
      {/* Header Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white p-8 sm:p-14 border border-slate-800 shadow-xl">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: 'url(/images/hero-landscape.svg)' }}
          />
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider inline-block">
              Platform Architecture & Capabilities
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Comprehensive Health Surveillance Tools
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Explore the dedicated modules and capabilities that make PlateauCare Intelligence a resilient population health monitoring platform.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Modules Detailed List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat) => (
            <Card key={feat.id} className="p-6 flex flex-col justify-between border-slate-200/90 shadow-2xs">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-slate-100 text-slate-800">{feat.icon}</div>
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {feat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{feat.title}</h3>
                  <p className="text-xs font-semibold text-teal-700 mt-1">{feat.tagline}</p>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{feat.description}</p>
                </div>

                {/* Captured Fields */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    <span>Key Monitored Fields</span>
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {feat.fields.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Filters Supported */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{feat.filters}</span>
                </div>
              </div>

              {/* Authorised Access Pill */}
              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium">Authorized Roles:</span>
                  <div className="flex flex-wrap gap-1">
                    {feat.authorizedRoles.map((r) => (
                      <RoleBadge key={r} role={r} size="sm" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Role-Based Governance Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-6">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
              Enterprise Governance
            </span>
            <h3 className="text-2xl font-bold text-white">Strict Role-Based Access Control</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every data submission and alert action is tied to verified credentials. Reporters can only view and submit records within their assigned facility or LGA, protecting medical confidentiality and data integrity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link to="/login">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Sign In to Your Dashboard
              </Button>
            </Link>
            <a
              href="/admin/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
            >
              System Administrator Portal (Django Admin)
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
