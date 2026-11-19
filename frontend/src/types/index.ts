
// ============================================================================
// PLATEAUCARE INTELLIGENCE — DOMAIN TYPES & API INTERFACES
// Built strictly to match verified Django REST Framework serializers
// ============================================================================

export type UserRole =
  | 'UNASSIGNED'
  | 'SYSTEM_ADMIN'
  | 'PUBLIC_HEALTH_OFFICER'
  | 'HEALTH_FACILITY_REPORTER'
  | 'WORKFORCE_REPORTER'
  | 'COMMUNITY_REPORTER';

export interface CurrentUserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: UserRole;
  role_display: string;
  lga_id: number | null;
  lga_name: string | null;
  health_facility_id: number | null;
  health_facility_name: string | null;
  facility_verification_status: string | null;
}

export interface LocalGovernmentArea {
  id: number;
  name: string;
  code: string;
  health_facility_count: number;
  created_at: string;
}

export type FacilityType = 'HOSPITAL' | 'PHC' | 'CLINIC' | 'LAB' | 'OTHER';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface HealthFacility {
  id: number;
  name: string;
  facility_type: FacilityType;
  lga: number;
  lga_name: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  contact_email: string;
  verification_status: VerificationStatus;
  is_active: boolean;
  created_at: string;
}

export interface Disease {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export type DiseaseReportStatus = 'SUSPECTED' | 'CONFIRMED' | 'UNDER_REVIEW';

export interface DiseaseReport {
  id: number;
  disease: number;
  disease_name: string;
  health_facility: number;
  health_facility_name: string;
  lga: number;
  lga_name: string;
  reporting_date: string;
  suspected_cases: number;
  confirmed_cases: number;
  deaths: number;
  recoveries: number;
  status: DiseaseReportStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DiseaseReportCreatePayload {
  disease: number;
  reporting_date: string;
  suspected_cases: number;
  confirmed_cases: number;
  deaths: number;
  recoveries: number;
  status: DiseaseReportStatus;
  notes?: string;
}

export interface EnvironmentalObservation {
  id: number;
  lga: number;
  lga_name: string;
  observation_date: string;
  rainfall_mm: number | null;
  temperature_celsius: number | null;
  humidity_percentage: number | null;
  air_quality_index: number | null;
  flood_occurred: boolean;
  source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentalObservationCreatePayload {
  lga: number;
  observation_date: string;
  rainfall_mm?: number | null;
  temperature_celsius?: number | null;
  humidity_percentage?: number | null;
  air_quality_index?: number | null;
  flood_occurred?: boolean;
  source?: string;
  notes?: string;
}

export interface WorkforceHealthRecord {
  id: number;
  organization_name: string;
  lga: number;
  lga_name: string;
  reporting_date: string;
  total_workforce: number;
  sickness_absences: number;
  workplace_incidents: number;
  occupational_exposures: number;
  heat_related_incidents: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WorkforceHealthRecordCreatePayload {
  organization_name: string;
  lga: number;
  reporting_date: string;
  total_workforce: number;
  sickness_absences: number;
  workplace_incidents: number;
  occupational_exposures: number;
  heat_related_incidents: number;
  notes?: string;
}

export interface CommunityHealthRecord {
  id: number;
  community_name: string;
  lga: number;
  lga_name: string;
  reporting_date: string;
  population_covered: number;
  people_screened: number;
  people_referred: number;
  reported_health_concerns: number;
  people_reached_through_awareness: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityHealthRecordCreatePayload {
  community_name: string;
  lga: number;
  reporting_date: string;
  population_covered: number;
  people_screened: number;
  people_referred: number;
  reported_health_concerns: number;
  people_reached_through_awareness: number;
  notes?: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface HealthRiskAssessment {
  id: number;
  lga: number;
  lga_name: string;
  assessment_date: string;
  risk_score: number;
  risk_level: RiskLevel;
  /** Descriptive statistical deviation messages returned by the AI assessment API */
  contributing_factors: string[];
  explanation: string;
  model_version: string;
  created_at: string;
}

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface PublicHealthAlert {
  id: number;
  title: string;
  description: string;
  recommended_action: string;
  status: AlertStatus;
  lga_name: string;
  assessment_date: string;
  risk_level: RiskLevel;
  risk_score: number;
  /** Descriptive statistical deviation messages linked to the health risk assessment */
  contributing_factors: string[];
  explanation: string;
  acknowledged_by: number | null;
  acknowledged_by_username: string | null;
  acknowledged_at: string | null;
  resolved_by: number | null;
  resolved_by_username: string | null;
  resolved_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  token: string;
}
