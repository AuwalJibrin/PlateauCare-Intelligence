
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Layers,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  CloudRain,
  Briefcase,
  Users,
  BrainCircuit,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

const AboutPage: React.FC = () => {
  const problems = [
    {
      title: 'Delayed Outbreak Detection',
      description:
        'Public-health teams need timely information about suspected cases and unusual disease patterns to investigate potential threats before they become more widespread.',
      icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
    },
    {
      title: 'Fragmented Health Information',
      description:
        'Disease reports, environmental observations, workforce health information, and community outreach records can exist in separate reporting channels.',
      icon: <Layers className="w-5 h-5 text-amber-600" />,
    },
    {
      title: 'Local Public-Health Challenges',
      description:
        'Different communities across Plateau State experience different environmental and health conditions. Public-health monitoring needs to consider local information and LGA-level differences.',
      icon: <MapPin className="w-5 h-5 text-teal-600" />,
    },
  ];

  const fourDomains = [
    {
      name: 'Disease Surveillance',
      role: 'Healthcare reporting',
      description:
        'Organises suspected and confirmed disease cases, deaths, and recoveries reported by registered healthcare facilities.',
      icon: <Stethoscope className="w-5 h-5 text-teal-600" />,
      image: '/images/img7.webp',
    },
    {
      name: 'Environmental Monitoring',
      role: 'Environmental indicators',
      description:
        'Tracks rainfall, temperature, humidity, air quality, and reported flood occurrences to provide environmental context for health monitoring.',
      icon: <CloudRain className="w-5 h-5 text-blue-600" />,
      image: '/images/img1.webp',
    },
    {
      name: 'Workforce Health Monitoring',
      role: 'Workplace health signals',
      description:
        'Collects workforce sickness absences, workplace incidents, occupational exposures, and heat-related health information.',
      icon: <Briefcase className="w-5 h-5 text-amber-600" />,
      image: '/images/img10.jpg',
    },
    {
      name: 'Community Health Monitoring',
      role: 'Grassroots health information',
      description:
        'Records community screening, referrals, health concerns, and the reach of health awareness activities.',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      image: '/images/img7.webp',
    },
  ];

  return (
    <div className="space-y-16 py-12">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-[360px] rounded-3xl overflow-hidden bg-slate-950 text-white shadow-xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/images/hero-landscape.svg)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/35" />

          <div className="relative z-10 max-w-3xl p-8 sm:p-14 flex flex-col justify-center min-h-[360px] space-y-5">
            <span className="w-fit px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">
              About PlateauCare Intelligence
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Bringing Health Information Together for Earlier Action
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              PlateauCare Intelligence combines disease, environmental,
              workforce, and community health information to support
              public-health monitoring and decision-making across Plateau State.
            </p>

            <div className="pt-2">
              <Link to="/features">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Platform Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Public Health Challenges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            The Challenge
          </span>

          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Why Connected Public-Health Monitoring Matters
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed">
            Effective health monitoring requires more than individual reports.
            Information from different sources needs to be organised so that
            health professionals can identify unusual patterns and investigate
            concerns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <Card
              key={problem.title}
              className="p-6 border-slate-200 hover:shadow-lg transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                {problem.icon}
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {problem.title}
              </h3>

              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {problem.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Purpose and Vision */}
      <section className="bg-white py-16 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                Our Purpose and Vision
              </span>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Empowering Public-Health Authorities with Holistic Intelligence
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                PlateauCare Intelligence is designed to give public-health
                professionals a more connected view of health indicators across
                Plateau State. By bringing information from different reporting
                domains together, the platform supports earlier investigation
                and more informed decisions.
              </p>

              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Multi-Domain Integration:</strong> Brings together
                    disease, environmental, workforce, and community health
                    information.
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI-Assisted Pattern Detection:</strong> Uses an
                    Isolation Forest model to identify observations that differ
                    from learned historical patterns.
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Understandable Assessments:</strong> Presents
                    notable statistical deviations to help officers understand
                    unusual observations.
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Public-Health Decision Support:</strong> Provides
                    monitoring and alert views to support professional review
                    and follow-up.
                  </span>
                </div>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900">
              <img
                src="/images/img9.jpg"
                alt="Healthcare professionals and health services"
                className="w-full h-[360px] object-cover"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                  PlateauCare Intelligence
                </span>
                <h3 className="text-xl font-bold mt-1">
                  Supporting Connected Healthcare Monitoring
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Designed with Plateau State's 17 Local Government Areas in mind.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Four Monitoring Domains */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Our Monitoring Approach
          </span>

          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Four Health Domains. One Connected Platform.
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed">
            Each domain contributes a different type of information. Together,
            they provide a broader context for understanding population and
            workforce health conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {fourDomains.map((domain) => (
            <Card
              key={domain.name}
              className="overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300"
            >
              <div className="h-48 relative overflow-hidden bg-slate-900">
                <img
                  src={domain.image}
                  alt={domain.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                <div className="absolute top-3 left-3 p-2.5 rounded-xl bg-white/95 shadow-md">
                  {domain.icon}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <span className="w-fit text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                  {domain.role}
                </span>

                <h3 className="text-base font-bold text-slate-900 mt-3">
                  {domain.name}
                </h3>

                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {domain.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Explanation and Limitations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-slate-950 text-white border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-500/10">
              <BrainCircuit className="w-7 h-7 text-teal-400" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-teal-400">
                Artificial Intelligence
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                The Role and Boundaries of Machine Learning
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300 leading-relaxed">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
              <h4 className="font-semibold text-teal-300">
                What the AI Model Does
              </h4>

              <p>
                It examines patterns across available health and environmental
                indicators using an Isolation Forest anomaly-detection model.
              </p>

              <p>
                It produces anomaly scores and risk categories to help identify
                observations that differ from learned patterns.
              </p>

              <p>
                It presents notable statistical deviations that can help
                public-health professionals investigate an assessment.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
              <h4 className="font-semibold text-amber-300">
                Important Scientific Limitations
              </h4>

              <p>
                An anomaly percentile is <strong>not an outbreak probability</strong>.
                It indicates how unusual an observation is within the model's
                assessment framework.
              </p>

              <p>
                Notable indicators represent statistical deviations. They do
                not establish medical or epidemiological causation.
              </p>

              <p>
                AI assessments are decision-support information. Qualified
                public-health professionals must review and verify concerns
                before taking action.
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 max-w-xl">
              The platform is being developed and evaluated using available
              demonstration data. Real-world performance requires further
              validation with appropriate health data.
            </p>

            <Link to="/features">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Explore Platform Features
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
