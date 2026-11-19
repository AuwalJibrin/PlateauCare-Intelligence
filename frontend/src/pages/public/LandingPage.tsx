
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import {
  Activity,
  CloudRain,
  Briefcase,
  Users,
  BrainCircuit,
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { PlateauStateMap } from '../../components/map/PlateauStateMap';

import {
  FadeIn,
  SlideUp,
  StaggerContainer,
  StaggerItem,
} from '../../components/animations/MotionContainer';

// ==========================================
// HERO BACKGROUND SLIDESHOW
// ==========================================

const heroSlides = [
  {
    image: '/images/img10.jpg',
    label: 'Disease Surveillance',
  },
  {
    image: '/images/img9.jpg',
    label: 'Community Health',
  },
  {
    image: '/images/img2.webp',
    label: 'Healthcare Response',
  },
  {
    image: '/images/img6.jpg',
    label: 'Public Health Monitoring',
  },
  {
    image: '/images/img5.jpg',
    label: 'Environmental Health',
  },
  {
    image: '/images/img4.webp',
    label: 'Healthcare Services',
  },
];

const HeroBackgroundSlideshow: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [shouldReduceMotion]);

  const changeSlide = (direction: number) => {
    setActiveIndex(
      (current) =>
        (current + direction + heroSlides.length) % heroSlides.length
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div
          key={heroSlides[activeIndex].image}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.2, ease: 'easeInOut' },
            scale: { duration: 5.5, ease: 'linear' },
          }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${heroSlides[activeIndex].image}")`,
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
          }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20" />

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
        <button
          type="button"
          onClick={() => changeSlide(-1)}
          aria-label="Previous background image"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-slate-950/50 text-white transition-colors hover:bg-teal-600"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${slide.label}`}
              aria-current={activeIndex === index ? 'true' : undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === index
                  ? 'w-7 bg-teal-400'
                  : 'w-2 bg-white/70 hover:bg-white'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => changeSlide(1)}
          aria-label="Next background image"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-slate-950/50 text-white transition-colors hover:bg-teal-600"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// MAIN LANDING PAGE
// ==========================================

export const LandingPage: React.FC = () => {
  const monitoringStreams = [
    {
      title: 'Disease Surveillance',
      description:
        'Organise and monitor reported suspected, confirmed, and recovered disease cases to help public-health teams follow changing health trends.',
      icon: <Activity className="h-6 w-6" />,
      iconStyle: 'bg-teal-50 text-teal-700',
      number: '01',
    },
    {
      title: 'Environmental Monitoring',
      description:
        'Bring together reported environmental indicators such as rainfall, temperature, humidity, air quality, and flood occurrences.',
      icon: <CloudRain className="h-6 w-6" />,
      iconStyle: 'bg-blue-50 text-blue-700',
      number: '02',
    },
    {
      title: 'Workforce Health',
      description:
        'Monitor workplace health indicators, including sickness absence, occupational incidents, exposure reports, and heat-related events.',
      icon: <Briefcase className="h-6 w-6" />,
      iconStyle: 'bg-amber-50 text-amber-700',
      number: '03',
    },
    {
      title: 'Community Health',
      description:
        'Capture community screening, referrals, outreach activity, and reported concerns to provide a broader view of population health.',
      icon: <Users className="h-6 w-6" />,
      iconStyle: 'bg-emerald-50 text-emerald-700',
      number: '04',
    },
  ];

  const workflowSteps = [
    {
      number: '01',
      title: 'Collect health information',
      description:
        'Authorised reporters submit information from disease surveillance, environmental monitoring, workforce health, and community activities.',
    },
    {
      number: '02',
      title: 'Bring indicators together',
      description:
        'The platform organises available reports into a shared view of health indicators across Local Government Areas.',
    },
    {
      number: '03',
      title: 'Identify unusual patterns',
      description:
        'The AI model analyses available indicators and highlights patterns that differ from the learned baseline.',
    },
    {
      number: '04',
      title: 'Support informed action',
      description:
        'Public-health teams can review assessments, examine notable indicators, and use the information to guide further investigation.',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* HERO */}
      <section className="relative flex min-h-[82vh] items-center overflow-hidden bg-slate-950 text-white">
        <HeroBackgroundSlideshow />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-7 text-center">
            <FadeIn delay={0.1}>
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-slate-950/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-teal-200 backdrop-blur-sm">
                <HeartPulse className="h-4 w-4" />
                <span>Public Health Intelligence</span>
              </div>
            </FadeIn>

            <SlideUp delay={0.2}>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
                See Health Risks Earlier.
                <span className="mt-2 block bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                  Make Better Decisions.
                </span>
              </h1>
            </SlideUp>

            <SlideUp delay={0.3}>
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
                PlateauCare Intelligence brings disease, environmental,
                workforce, and community health information together to
                support early warning and better public-health decisions
                across Plateau State, Nigeria.
              </p>
            </SlideUp>

            <SlideUp delay={0.4}>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link to="/login">
                  <Button
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                  >
                    Authorised User Sign In
                  </Button>
                </Link>
              </div>
            </SlideUp>

            <FadeIn delay={0.6}>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-5 text-sm text-slate-200">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-300" />
                  Role-based access
                </span>
                <span className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-teal-300" />
                  AI-assisted insights
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-300" />
                  Plateau State focus
                </span>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* THE CHALLENGE */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <FadeIn>
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Why connected health information matters
            </span>

            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Better visibility. Earlier awareness. Stronger decisions.
            </h2>

            <p className="text-base leading-relaxed text-slate-600">
              Public-health decisions depend on information from many
              sources. When reports are difficult to view together, it can
              be harder to recognise changing patterns and understand where
              further attention may be needed.
            </p>

            <p className="text-base leading-relaxed text-slate-600">
              PlateauCare Intelligence is designed to bring these different
              indicators into one decision-support environment for
              authorised public-health teams.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StaggerItem>
            <Card className="h-full border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900">Connected signals</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                View information from multiple health-monitoring areas in
                one platform.
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="h-full border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900">Earlier awareness</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Highlight unusual patterns that may deserve public-health
                review.
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="h-full border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900">Local perspective</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Organise health information around Plateau State's Local
                Government Areas.
              </p>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="h-full border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900">Controlled access</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Provide platform access according to assigned user roles
                and responsibilities.
              </p>
            </Card>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* MONITORING CAPABILITIES */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              One connected platform
            </span>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              A broader view of public health
            </h2>

            <p className="text-base leading-relaxed text-slate-600">
              Four connected monitoring areas help public-health teams
              understand health indicators from different parts of the
              population and its environment.
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {monitoringStreams.map((stream) => (
              <StaggerItem key={stream.number}>
                <Card className="group flex h-full flex-col border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-6 flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${stream.iconStyle}`}
                    >
                      {stream.icon}
                    </div>
                    <span className="font-mono text-sm font-bold text-slate-300">
                      {stream.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {stream.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                    {stream.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-teal-700">
                    <span>Monitoring capability</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* AI EARLY WARNING */}
      <section className="overflow-hidden bg-slate-950 py-20 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <FadeIn>
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300">
                <BrainCircuit className="h-4 w-4" />
                AI-powered early warning
              </div>

              <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Turn health indicators into useful insights.
              </h2>

              <p className="text-base leading-relaxed text-slate-300">
                PlateauCare Intelligence uses an Isolation Forest machine
                learning model to identify unusual patterns across
                available health indicators.
              </p>

              <p className="text-base leading-relaxed text-slate-300">
                Assessments include notable statistical deviations to help
                officers understand what may have contributed to an unusual
                result and decide whether further investigation is needed.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Highlights unusual patterns across available indicators.',
                  'Provides explanations based on statistical deviations.',
                  'Supports human review rather than replacing professional judgement.',
                  'Recognises when available information is insufficient for an assessment.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
                    <span className="text-sm leading-relaxed text-slate-200">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <SlideUp delay={0.15}>
            <div className="relative">
              <div className="absolute -inset-5 rounded-3xl bg-teal-500/10 blur-2xl" />

              <Card className="relative border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl sm:p-8">
                <div className="flex items-center gap-3 border-b border-slate-700 pb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
                    <BrainCircuit className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      Explainable AI Assessment
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Understanding unusual health patterns
                    </p>
                  </div>
                </div>

                <div className="space-y-5 py-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      What the model looks for
                    </p>
                    <div className="mt-3 space-y-3">
                      {[
                        'Changes in reported disease indicators',
                        'Unusual environmental measurements',
                        'Workforce health deviations',
                        'Changes in community health reports',
                      ].map((item, index) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-xs font-bold text-teal-300">
                            0{index + 1}
                          </span>
                          <span className="text-sm text-slate-200">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-4">
                    <p className="text-sm font-semibold text-teal-200">
                      Decision-support, not diagnosis
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      An anomaly score indicates how unusual an observation
                      is relative to the model's learned patterns. It is
                      not the probability that an outbreak will occur.
                      Public-health professionals remain responsible for
                      reviewing and interpreting the findings.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4 text-xs text-slate-400">
                  AI assessments depend on the availability and quality of
                  submitted information.
                </div>
              </Card>
            </div>
          </SlideUp>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl space-y-10 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            How it works
          </span>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            From information to informed action
          </h2>

          <p className="text-base leading-relaxed text-slate-600">
            A structured process helps transform submitted health
            information into insights that public-health teams can review.
          </p>
        </div>

        <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step) => (
            <StaggerItem key={step.number}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="font-mono text-4xl font-black text-teal-600/25">
                  {step.number}
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* PLATEAU STATE */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              Built around local needs
            </span>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              A Plateau State perspective
            </h2>

            <p className="text-base leading-relaxed text-slate-600">
              The platform organises health information around the
              state's 17 Local Government Areas, helping authorised teams
              review available indicators in their geographical context.
            </p>
          </div>

          <Card className="overflow-hidden border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
            <PlateauStateMap />
          </Card>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            The map represents the platform's geographical scope. The
            availability of assessments and reports may vary by LGA and
            reporting period.
          </p>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-900 to-slate-950 px-6 py-14 text-center text-white shadow-xl sm:px-12 sm:py-16">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <HeartPulse className="h-7 w-7 text-teal-200" />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Better information. Stronger public-health decisions.
            </h2>

            <p className="text-base leading-relaxed text-teal-50/90">
              Access a connected environment for public-health monitoring,
              AI-assisted insights, and coordinated review across Plateau
              State.
            </p>

            <div className="flex justify-center pt-2">
              <Link to="/login">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  Access PlateauCare
                </Button>
              </Link>
            </div>

            <p className="text-xs text-teal-100/70">
              Access is intended for authorised platform users.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
