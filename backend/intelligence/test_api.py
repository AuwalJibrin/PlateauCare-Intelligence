
from datetime import date, timedelta

from django.test import TestCase

from core.models import LocalGovernmentArea
from workforce.models import WorkforceHealthRecord
from community.models import CommunityHealthRecord

from intelligence.models import HealthRiskAssessment
from intelligence.management.commands.generate_risk_assessments import Command

from intelligence.services.daily_features import (
    extract_lga_daily_features,
)

from intelligence.services.anomaly_detection import (
    assess_data_quality,
)

from response.models import PublicHealthAlert


# ============================================================
# DAILY FEATURE FRESHNESS TESTS
# ============================================================

class DailyFeatureFreshnessTests(TestCase):

    def setUp(self):
        self.lga = LocalGovernmentArea.objects.create(
            name="Test LGA",
            code="TEST-LGA",
        )

        self.target_date = date(2026, 11, 8)

    def create_workforce_record(self, age):
        WorkforceHealthRecord.objects.create(
            organization_name="Test Organization",
            lga=self.lga,
            reporting_date=self.target_date - timedelta(days=age),
            total_workforce=100,
            sickness_absences=5,
            workplace_incidents=2,
            occupational_exposures=3,
            heat_related_incidents=1,
        )

    def create_community_record(self, age):
        CommunityHealthRecord.objects.create(
            community_name="Test Community",
            lga=self.lga,
            reporting_date=self.target_date - timedelta(days=age),
            population_covered=500,
            people_screened=200,
            people_referred=20,
            reported_health_concerns=10,
            people_reached_through_awareness=300,
        )

    def extract_features(self):
        return extract_lga_daily_features(
            self.lga.id,
            self.target_date,
            self.target_date,
        )[0]

    def test_workforce_report_is_accepted_at_seven_days(self):
        self.create_workforce_record(7)

        row = self.extract_features()

        self.assertEqual(row["total_workforce"], 100)
        self.assertEqual(row["workforce_days_since_update"], 7)

    def test_workforce_report_is_stale_at_eight_days(self):
        self.create_workforce_record(8)

        row = self.extract_features()

        self.assertIsNone(row["total_workforce"])
        self.assertEqual(row["workforce_days_since_update"], 8)

    def test_community_report_is_accepted_at_seven_days(self):
        self.create_community_record(7)

        row = self.extract_features()

        self.assertEqual(row["population_covered"], 500)
        self.assertEqual(row["community_days_since_update"], 7)

    def test_community_report_is_stale_at_eight_days(self):
        self.create_community_record(8)

        row = self.extract_features()

        self.assertIsNone(row["population_covered"])
        self.assertEqual(row["community_days_since_update"], 8)


# ============================================================
# DATA QUALITY TESTS
# ============================================================

class DataQualityTests(TestCase):

    def test_two_complete_domains_are_eligible(self):
        row = {
            "disease_reports_received": 2,
            "suspected_cases": 10,
            "confirmed_cases": 5,
            "deaths": 0,
            "environmental_reports_received": 2,
            "rainfall_mm": 20,
            "temperature_celsius": 25,
            "humidity_percentage": 70,
            "air_quality_index": 40,
            "flood_occurrences": 0,
        }

        result = assess_data_quality(row)

        self.assertTrue(result["eligible_for_assessment"])
        self.assertEqual(result["data_completeness"], 100)

        self.assertEqual(
            result["available_sources"],
            ["disease", "environment"],
        )

    def test_one_available_domain_is_not_eligible(self):
        row = {
            "disease_reports_received": 2,
            "suspected_cases": 10,
            "confirmed_cases": 5,
            "deaths": 0,
            "environmental_reports_received": 0,
            "workforce_days_since_update": None,
            "community_days_since_update": None,
        }

        result = assess_data_quality(row)

        self.assertFalse(result["eligible_for_assessment"])

        self.assertEqual(
            result["available_sources"],
            ["disease"],
        )

    def test_stale_workforce_and_community_reports_are_excluded(self):
        row = {
            "disease_reports_received": 0,
            "environmental_reports_received": 0,
            "workforce_days_since_update": 8,
            "sickness_absences": 5,
            "workplace_incidents": 2,
            "occupational_exposures": 3,
            "heat_related_incidents": 1,
            "community_days_since_update": 9,
            "people_screened": 200,
            "people_referred": 20,
            "reported_health_concerns": 10,
            "people_reached": 300,
        }

        result = assess_data_quality(row)

        self.assertFalse(result["eligible_for_assessment"])
        self.assertEqual(result["available_sources"], [])

        self.assertIn(
            "workforce",
            result["missing_sources"],
        )

        self.assertIn(
            "community",
            result["missing_sources"],
        )

    def test_insufficient_measurements_are_not_eligible(self):
        row = {
            "disease_reports_received": 2,
            "suspected_cases": 10,
            "confirmed_cases": None,
            "deaths": None,
            "environmental_reports_received": 2,
            "rainfall_mm": 20,
            "temperature_celsius": None,
            "humidity_percentage": None,
            "air_quality_index": None,
            "flood_occurrences": None,
        }

        result = assess_data_quality(row)

        self.assertFalse(result["eligible_for_assessment"])
        self.assertEqual(result["data_completeness"], 25)

    def test_missing_domains_are_reported(self):
        row = {
            "disease_reports_received": 2,
            "suspected_cases": 10,
            "confirmed_cases": 5,
            "deaths": 0,
            "environmental_reports_received": 0,
            "workforce_days_since_update": None,
            "community_days_since_update": None,
        }

        result = assess_data_quality(row)

        self.assertIn(
            "disease",
            result["available_sources"],
        )

        self.assertIn(
            "environment",
            result["missing_sources"],
        )

        self.assertIn(
            "workforce",
            result["missing_sources"],
        )

        self.assertIn(
            "community",
            result["missing_sources"],
        )


# ============================================================
# HISTORICAL ASSESSMENT PRESERVATION TESTS
# ============================================================

class AssessmentPreservationTests(TestCase):

    def setUp(self):
        self.lga = LocalGovernmentArea.objects.create(
            name="Preservation Test LGA",
            code="PRESERVATION-TEST",
        )

        self.target_date = date(2026, 11, 8)
        self.command = Command()

    def create_assessment(self, assessment_date):
        return HealthRiskAssessment.objects.create(
            lga=self.lga,
            assessment_date=assessment_date,
            risk_score=0.85,
            risk_level="HIGH",
            contributing_factors=["High suspected cases"],
            explanation="Test AI assessment.",
            model_version="test-model",
        )

    def test_same_day_assessment_is_preserved(self):
        assessment = self.create_assessment(
            self.target_date,
        )

        existing = self.command.get_existing_assessment(
            self.lga,
            self.target_date,
        )

        self.assertIsNotNone(existing)
        self.assertEqual(existing.id, assessment.id)

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.risk_level,
            "HIGH",
        )

        self.assertEqual(
            assessment.risk_score,
            0.85,
        )

        self.assertEqual(
            assessment.explanation,
            "Test AI assessment.",
        )

    def test_previous_date_assessment_is_preserved(self):
        previous_date = (
            self.target_date - timedelta(days=1)
        )

        assessment = self.create_assessment(
            previous_date,
        )

        existing = self.command.get_existing_assessment(
            self.lga,
            self.target_date,
        )

        self.assertIsNone(existing)

        self.assertTrue(
            HealthRiskAssessment.objects.filter(
                id=assessment.id
            ).exists()
        )

    def test_no_assessment_returns_none(self):
        existing = self.command.get_existing_assessment(
            self.lga,
            self.target_date,
        )

        self.assertIsNone(existing)

        self.assertEqual(
            HealthRiskAssessment.objects.count(),
            0,
        )

    def test_assessment_with_alert_is_preserved(self):
        assessment = self.create_assessment(
            self.target_date,
        )

        alert = PublicHealthAlert.objects.create(
            assessment=assessment,
            title="High health risk detected",
            description="Test public-health alert.",
            recommended_action="Request public-health review.",
        )

        existing = self.command.get_existing_assessment(
            self.lga,
            self.target_date,
        )

        self.assertIsNotNone(existing)
        self.assertEqual(existing.id, assessment.id)

        self.assertTrue(
            HealthRiskAssessment.objects.filter(
                id=assessment.id
            ).exists()
        )

        self.assertTrue(
            PublicHealthAlert.objects.filter(
                id=alert.id
            ).exists()
        )

        self.assertEqual(
            existing.alert.id,
            alert.id,
        )
