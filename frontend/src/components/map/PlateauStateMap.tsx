
import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';

import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { PathOptions } from 'leaflet';

import { Activity, Info, MapPin, AlertTriangle } from 'lucide-react';

import { PLATEAU_LGAS } from '../../utils/plateauLGAs';
import type { PlateauLGAInfo } from '../../utils/plateauLGAs';

import type {
  HealthRiskAssessment,
  PublicHealthAlert,
  RiskLevel,
} from '../../types';

import { RiskBadge } from '../common/Badge';
import { Card } from '../common/Card';

interface BoundaryProperties {
  shapeName?: string;
  shapeGroup?: string;
  shapeType?: string;
}

type LgaBoundaryFeature = Feature<Geometry, BoundaryProperties>;

interface PlateauStateMapProps {
  assessments?: HealthRiskAssessment[];
  alerts?: PublicHealthAlert[];
  selectedLgaName?: string | null;

  onSelectLga?: (
    lga: PlateauLGAInfo,
    assessment?: HealthRiskAssessment
  ) => void;

  onSelectAlert?: (alert: PublicHealthAlert) => void;

  className?: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MODERATE: '#fbbf24',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
  NONE: '#94a3b8',
};

const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getRiskColor = (level?: RiskLevel): string =>
  level ? RISK_COLORS[level] || RISK_COLORS.NONE : RISK_COLORS.NONE;

const isActiveAlert = (alert: PublicHealthAlert): boolean =>
  alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED';

/**
 * Convert an assessment date into a comparable timestamp.
 * Invalid dates are treated as older than valid dates.
 */
const getAssessmentTimestamp = (
  assessment: HealthRiskAssessment
): number => {
  const timestamp = new Date(assessment.assessment_date).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

/**
 * Check whether an LGA coordinate falls inside a GeoJSON polygon ring.
 * GeoJSON coordinates are [longitude, latitude].
 */
const pointInRing = (
  lat: number,
  lng: number,
  ring: number[][]
): boolean => {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Check whether the supplied LGA centre coordinate is inside
 * a Polygon or MultiPolygon boundary.
 */
const geometryContainsPoint = (
  geometry: Geometry,
  lat: number,
  lng: number
): boolean => {
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates as unknown as number[][][][][0];

    return (
      coordinates.length > 0 &&
      pointInRing(lat, lng, coordinates[0])
    );
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates as unknown as number[][][][][];

    return polygons.some(
      (polygon) =>
        polygon.length > 0 &&
        polygon[0].length > 0 &&
        pointInRing(lat, lng, polygon[0][0])
    );
  }

  return false;
};

const MapViewportController: React.FC<{
  selectedLga: PlateauLGAInfo | undefined;
}> = ({ selectedLga }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedLga) return;

    map.flyTo(
      [selectedLga.coordinates.lat, selectedLga.coordinates.lng],
      Math.max(map.getZoom(), 8),
      { duration: 0.6 }
    );
  }, [map, selectedLga]);

  return null;
};

export const PlateauStateMap: React.FC<PlateauStateMapProps> = ({
  assessments = [],
  alerts = [],
  selectedLgaName,
  onSelectLga,
  onSelectAlert,
  className = '',
}) => {
  const [internalSelectedLga, setInternalSelectedLga] =
    useState<string | null>('Jos North');

  const [boundaryFeatures, setBoundaryFeatures] =
    useState<LgaBoundaryFeature[]>([]);

  const [boundaryLoading, setBoundaryLoading] = useState(true);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  const [tileProvider, setTileProvider] = useState<'osm' | 'carto'>('osm');

  const activeSelectedName =
    selectedLgaName !== undefined
      ? selectedLgaName
      : internalSelectedLga;

  // Load Nigeria's LGA GeoJSON boundaries.
  useEffect(() => {
    let cancelled = false;

    const loadBoundaries = async () => {
      try {
        setBoundaryLoading(true);
        setBoundaryError(null);

        const response = await fetch('/data/nigeria-lgas.geojson');

        if (!response.ok) {
          throw new Error(
            `Could not load the geographical boundary file (${response.status}).`
          );
        }

        const data =
          (await response.json()) as FeatureCollection<
            Geometry,
            BoundaryProperties
          >;

        if (!Array.isArray(data.features)) {
          throw new Error('The geographical boundary file is invalid.');
        }

        const nigeriaLgaFeatures = data.features.filter(
          (feature) =>
            feature.properties?.shapeGroup === 'NGA' &&
            feature.properties?.shapeType === 'ADM2'
        );

        if (!cancelled) {
          setBoundaryFeatures(nigeriaLgaFeatures);

          if (nigeriaLgaFeatures.length === 0) {
            setBoundaryError(
              'No Nigerian LGA boundaries were found in the geographical file.'
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setBoundaryError(
            error instanceof Error
              ? error.message
              : 'Unable to load geographical boundaries.'
          );
        }
      } finally {
        if (!cancelled) {
          setBoundaryLoading(false);
        }
      }
    };

    loadBoundaries();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Match assessments to LGAs.
   *
   * IMPORTANT:
   * If multiple assessments exist for one LGA, always retain
   * the assessment with the newest assessment_date.
   *
   * This prevents an older API record from replacing a newer
   * assessment simply because it appears later in the response.
   */
  const assessmentMap = useMemo(() => {
    const map = new Map<string, HealthRiskAssessment>();

    assessments.forEach((assessment) => {
      const key = normalizeName(assessment.lga_name);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, assessment);
        return;
      }

      const currentTimestamp = getAssessmentTimestamp(existing);
      const incomingTimestamp = getAssessmentTimestamp(assessment);

      if (incomingTimestamp >= currentTimestamp) {
        map.set(key, assessment);
      }
    });

    return map;
  }, [assessments]);

  const getLgaAssessment = (
    lgaName: string
  ): HealthRiskAssessment | undefined =>
    assessmentMap.get(normalizeName(lgaName));

  // Match public-health alerts to their respective LGAs.
  const alertMap = useMemo(() => {
    const map = new Map<string, PublicHealthAlert[]>();

    alerts.forEach((alert) => {
      const key = normalizeName(alert.lga_name);
      const existing = map.get(key) || [];

      map.set(key, [...existing, alert]);
    });

    return map;
  }, [alerts]);

  const getLgaAlerts = (lgaName: string): PublicHealthAlert[] =>
    alertMap.get(normalizeName(lgaName)) || [];

  // Only OPEN and ACKNOWLEDGED alerts are active.
  const getActiveLgaAlerts = (
    lgaName: string
  ): PublicHealthAlert[] =>
    getLgaAlerts(lgaName).filter(isActiveAlert);

  /**
   * Match each Plateau LGA to its geographical polygon.
   * Coordinate containment helps resolve duplicate names
   * such as Bassa.
   */
  const plateauBoundaries = useMemo(() => {
    return PLATEAU_LGAS.map((lga) => {
      const candidates = boundaryFeatures.filter(
        (feature) =>
          normalizeName(feature.properties?.shapeName || '') ===
          normalizeName(lga.name)
      );

      const matchedFeature = candidates.find((feature) =>
        geometryContainsPoint(
          feature.geometry,
          lga.coordinates.lat,
          lga.coordinates.lng
        )
      );

      const feature =
        matchedFeature ||
        (candidates.length === 1 ? candidates[0] : undefined);

      return {
        lga,
        feature,
      };
    }).filter(
      (
        item
      ): item is {
        lga: PlateauLGAInfo;
        feature: LgaBoundaryFeature;
      } => Boolean(item.feature)
    );
  }, [boundaryFeatures]);

  const selectedLgaInfo = PLATEAU_LGAS.find(
    (lga) => lga.name === activeSelectedName
  );

  const selectedAssessment = selectedLgaInfo
    ? getLgaAssessment(selectedLgaInfo.name)
    : undefined;

  const selectedLgaAlerts = selectedLgaInfo
    ? getLgaAlerts(selectedLgaInfo.name)
    : [];

  const handleLgaClick = (lga: PlateauLGAInfo) => {
    setInternalSelectedLga(lga.name);

    const assessment = getLgaAssessment(lga.name);

    onSelectLga?.(lga, assessment);
  };

  const getBoundaryStyle = (
    lga: PlateauLGAInfo
  ): PathOptions => {
    const assessment = getLgaAssessment(lga.name);
    const isSelected = activeSelectedName === lga.name;

    return {
      color: isSelected ? '#0f766e' : '#64748b',
      weight: isSelected ? 3 : 1.3,
      opacity: 0.9,
      fillColor: getRiskColor(assessment?.risk_level),
      fillOpacity: isSelected ? 0.35 : 0.18,
    };
  };

  // Calculate the latest assessment status across all 17 LGAs.
  const riskCounts = useMemo(() => {
    const counts = {
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      CRITICAL: 0,
      NONE: 0,
    };

    PLATEAU_LGAS.forEach((lga) => {
      const assessment = assessmentMap.get(normalizeName(lga.name));

      if (!assessment) {
        counts.NONE++;
        return;
      }

      switch (assessment.risk_level) {
        case 'LOW':
          counts.LOW++;
          break;

        case 'MODERATE':
          counts.MODERATE++;
          break;

        case 'HIGH':
          counts.HIGH++;
          break;

        case 'CRITICAL':
          counts.CRITICAL++;
          break;

        default:
          counts.NONE++;
          break;
      }
    });

    return counts;
  }, [assessmentMap]);

  const formatScore = (score: number): string =>
    Number.isFinite(score)
      ? `${(score * 100).toFixed(1)}%`
      : 'Unavailable';

  const contributingFactors = selectedAssessment
    ? Array.isArray(selectedAssessment.contributing_factors)
      ? selectedAssessment.contributing_factors
      : typeof selectedAssessment.contributing_factors === 'string'
        ? [selectedAssessment.contributing_factors]
        : []
    : [];

  const activeAlertCount = alerts.filter(isActiveAlert).length;

  const handleTileError = () => {
    if (tileProvider === 'osm') {
      setTileProvider('carto');
    }
  };

  const tileUrl =
    tileProvider === 'osm'
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const tileAttribution =
    tileProvider === 'osm'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      : '&copy; OpenStreetMap contributors &copy; CARTO';

  return (
    <div className={`space-y-4 ${className}`}>
      <style>
        {`
          .leaflet-container {
            font-family: inherit;
            z-index: 0;
          }

          .leaflet-interactive.active-alert-open {
            animation: plateauRiskPulse 1.2s ease-in-out infinite;
          }

          .leaflet-interactive.active-alert-acknowledged {
            animation: plateauRiskPulse 2s ease-in-out infinite;
          }

          @keyframes plateauRiskPulse {
            0%, 100% {
              stroke-opacity: 1;
              stroke-width: 2;
            }
            50% {
              stroke-opacity: 0.45;
              stroke-width: 7;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .leaflet-interactive.active-alert-open,
            .leaflet-interactive.active-alert-acknowledged {
              animation: none;
            }
          }
        `}
      </style>

      {/* Map heading and legend */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-teal-700" />

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Plateau State Early-Warning Map
              </h3>

              <p className="text-xs text-slate-500">
                Geographical view of all 17 Local Government Areas
              </p>
            </div>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {boundaryLoading
              ? 'Loading boundaries...'
              : `${plateauBoundaries.length} of 17 boundaries loaded`}
          </span>
        </div>

        {/* Risk legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {[
            ['LOW', 'Low'],
            ['MODERATE', 'Moderate'],
            ['HIGH', 'High'],
            ['CRITICAL', 'Critical'],
            ['NONE', 'No Assessment'],
          ].map(([level, label]) => (
            <div key={level} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: RISK_COLORS[level] }}
              />

              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Risk statistics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            {
              label: 'Low',
              value: riskCounts.LOW,
              color: 'text-emerald-700',
            },
            {
              label: 'Moderate',
              value: riskCounts.MODERATE,
              color: 'text-amber-700',
            },
            {
              label: 'High',
              value: riskCounts.HIGH,
              color: 'text-orange-700',
            },
            {
              label: 'Critical',
              value: riskCounts.CRITICAL,
              color: 'text-red-700',
            },
            {
              label: 'No assessment',
              value: riskCounts.NONE,
              color: 'text-slate-600',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className={`text-lg font-bold ${item.color}`}>
                {item.value}
              </div>

              <div className="text-[10px] text-slate-500">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Active alert summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />

            <span className="text-xs font-semibold text-slate-700">
              Active public-health alerts
            </span>
          </div>

          <span className="text-sm font-bold text-slate-900">
            {activeAlertCount}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Geographical map */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-slate-900">
              Interactive LGA Boundary Map
            </h4>

            <p className="text-xs text-slate-500">
              Select an LGA boundary or coloured marker to inspect its
              assessment and public-health alerts.
            </p>
          </div>

          {boundaryError ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />

              <p className="text-sm font-semibold text-slate-800">
                Map boundaries could not be loaded
              </p>

              <p className="max-w-md text-xs text-slate-500">
                {boundaryError}
              </p>

              <p className="text-xs text-slate-400">
                Check that public/data/nigeria-lgas.geojson exists.
              </p>
            </div>
          ) : (
            <div className="relative">
              <MapContainer
                center={[9.2, 9.3]}
                zoom={8}
                minZoom={7}
                maxZoom={13}
                scrollWheelZoom={false}
                style={{
                  height: '520px',
                  width: '100%',
                  background: '#eaf2f5',
                }}
              >
                <MapViewportController selectedLga={selectedLgaInfo} />

                <TileLayer
                  key={tileProvider}
                  attribution={tileAttribution}
                  url={tileUrl}
                  eventHandlers={{
                    tileerror: handleTileError,
                  }}
                />

                {plateauBoundaries.map(({ lga, feature }) => {
                  const assessment = getLgaAssessment(lga.name);
                  const isSelected = activeSelectedName === lga.name;

                  const lgaAlerts = getLgaAlerts(lga.name);
                  const activeAlerts = getActiveLgaAlerts(lga.name);

                  const hasOpenAlert = activeAlerts.some(
                    (alert) => alert.status === 'OPEN'
                  );

                  const hasAcknowledgedAlert = activeAlerts.some(
                    (alert) => alert.status === 'ACKNOWLEDGED'
                  );

                  const pulseClass = hasOpenAlert
                    ? 'active-alert-open'
                    : hasAcknowledgedAlert
                      ? 'active-alert-acknowledged'
                      : '';

                  return (
                    <React.Fragment key={lga.code}>
                      <GeoJSON
                        data={feature}
                        style={() => getBoundaryStyle(lga)}
                        eventHandlers={{
                          click: () => handleLgaClick(lga),
                        }}
                      />

                      <CircleMarker
                        center={[
                          lga.coordinates.lat,
                          lga.coordinates.lng,
                        ]}
                        radius={isSelected ? 11 : 8}
                        pathOptions={{
                          color: '#ffffff',
                          weight: 2,
                          fillColor: getRiskColor(assessment?.risk_level),
                          fillOpacity: 0.88,
                          className: pulseClass,
                        }}
                        eventHandlers={{
                          click: () => handleLgaClick(lga),
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -8]}>
                          <strong>{lga.name}</strong>

                          <br />

                          {assessment
                            ? `${assessment.risk_level} assessment`
                            : 'No assessment'}

                          <br />

                          {activeAlerts.length > 0
                            ? `${activeAlerts.length} active alert(s)`
                            : 'No active alerts'}
                        </Tooltip>

                        <Popup>
                          <div className="min-w-[180px] space-y-1">
                            <strong className="text-sm">
                              {lga.name}
                            </strong>

                            <div className="text-xs">
                              {assessment ? (
                                <>
                                  <div>
                                    Risk level: {assessment.risk_level}
                                  </div>

                                  <div>
                                    Anomaly score:{' '}
                                    {formatScore(assessment.risk_score)}
                                  </div>

                                  <div>
                                    Assessment date:{' '}
                                    {assessment.assessment_date}
                                  </div>
                                </>
                              ) : (
                                <div>No assessment available</div>
                              )}
                            </div>

                            {lgaAlerts.length > 0 && (
                              <div className="mt-2 border-t border-slate-200 pt-2">
                                <strong className="text-xs">
                                  Public Health Alerts ({lgaAlerts.length})
                                </strong>

                                <div className="mt-2 space-y-2">
                                  {lgaAlerts.map((alert) => (
                                    <div
                                      key={alert.id}
                                      className="rounded-md bg-slate-50 p-2"
                                    >
                                      <div className="text-xs font-semibold">
                                        {alert.title}
                                      </div>

                                      <div className="mt-1 text-[11px] text-slate-600">
                                        Status: {alert.status}
                                      </div>

                                      <div className="mt-1 text-[11px] text-slate-600">
                                        Risk: {alert.risk_level}
                                      </div>

                                      {onSelectAlert && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectAlert(alert)}
                                          className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900"
                                        >
                                          View alert details
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="pt-1 text-[11px] text-teal-700">
                              Select the LGA to view details
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>

              {boundaryLoading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70">
                  <div className="rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow">
                    Loading Plateau State boundaries...
                  </div>
                </div>
              )}

              {!boundaryLoading && plateauBoundaries.length > 0 && (
                <div className="absolute bottom-3 left-3 z-[500] rounded-md bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow-sm">
                  Map tiles: {tileProvider === 'osm' ? 'OpenStreetMap' : 'CARTO'}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            Boundary data: geoBoundaries Nigeria ADM2, 2022 (CC BY 4.0).
            Map tiles: {tileProvider === 'osm'
              ? 'OpenStreetMap contributors.'
              : 'OpenStreetMap contributors and CARTO.'}
          </div>
        </div>

        {/* Selected LGA information */}
        <div className="xl:col-span-1">
          {selectedLgaInfo ? (
            <Card className="h-full overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                      {selectedLgaInfo.zone}
                    </span>

                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {selectedLgaInfo.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Headquarters: {selectedLgaInfo.headquarters}
                      {' '}• Code: {selectedLgaInfo.code}
                    </p>
                  </div>

                  {selectedAssessment && (
                    <RiskBadge
                      level={selectedAssessment.risk_level}
                      size="sm"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-5 p-5">
                {selectedAssessment ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          Anomaly percentile score
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {selectedAssessment.model_version}
                        </span>
                      </div>

                      <div className="mt-2 text-3xl font-bold text-slate-900">
                        {formatScore(selectedAssessment.risk_score)}
                      </div>

                      <p className="mt-2 text-[11px] text-slate-500">
                        Assessment date:{' '}
                        {selectedAssessment.assessment_date}
                      </p>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                        <Activity className="h-4 w-4 text-teal-600" />
                        Notable Statistical Indicators
                      </h4>

                      {contributingFactors.length > 0 ? (
                        <ul className="space-y-2">
                          {contributingFactors.map((factor, index) => (
                            <li
                              key={`${index}-${factor}`}
                              className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700"
                            >
                              <span className="mt-0.5 text-teal-600">
                                •
                              </span>

                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs italic text-slate-400">
                          No notable statistical indicators were supplied
                          with this assessment.
                        </p>
                      )}
                    </div>

                    {selectedAssessment.explanation && (
                      <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                        <h4 className="mb-1 text-xs font-semibold text-teal-900">
                          AI Interpretation
                        </h4>

                        <p className="text-xs leading-relaxed text-teal-900">
                          {selectedAssessment.explanation}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Info className="h-6 w-6 text-slate-400" />
                    </div>

                    <h4 className="text-sm font-semibold text-slate-700">
                      No Assessment Available
                    </h4>

                    <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                      No AI risk assessment is currently available for
                      {` ${selectedLgaInfo.name}`}. This does not mean that
                      the LGA is confirmed to be low risk.
                    </p>
                  </div>
                )}

                {/* Alerts for the selected LGA */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Public Health Alerts ({selectedLgaAlerts.length})
                  </h4>

                  {selectedLgaAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {selectedLgaAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="text-xs font-semibold text-slate-800">
                            {alert.title}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-600">
                            Status: {alert.status}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-600">
                            Risk level: {alert.risk_level}
                          </p>

                          {onSelectAlert && (
                            <button
                              type="button"
                              onClick={() => onSelectAlert(alert)}
                              className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900"
                            >
                              View alert details
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No public-health alerts are recorded for this LGA.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex justify-between gap-3 text-[11px] text-slate-500">
                  <span>
                    Lat: {selectedLgaInfo.coordinates.lat.toFixed(4)}° N
                  </span>

                  <span>
                    Lng: {selectedLgaInfo.coordinates.lng.toFixed(4)}° E
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />

              <p className="text-xs">
                Select an LGA on the map to inspect its assessment.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* AI interpretation disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-900">
            Important AI Assessment Notice
          </h4>

          <p className="text-xs leading-relaxed text-amber-900">
            The anomaly percentile score indicates how unusual the observed
            data pattern is relative to the model's reference data. It is
            not the probability of an outbreak. Notable statistical
            indicators describe deviations, not proven causes. High or
            Critical assessments require review by authorised public-health
            personnel and do not independently confirm an outbreak.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlateauStateMap;
