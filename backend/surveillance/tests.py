
from django.contrib.auth import get_user_model
from django.urls import reverse

from auditlog.models import AuditLog

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from core.models import (
    LocalGovernmentArea,
    HealthFacility,
    UserProfile,
)

from .models import Disease, DiseaseReport


User = get_user_model()


class SurveillanceAPITestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="surveillance_test_user",
            password="TestPassword123!"
        )

        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.lga = LocalGovernmentArea.objects.create(
            name="Jos North",
            code="JOS-N"
        )

        self.facility = HealthFacility.objects.create(
            name="Test Health Centre",
            facility_type="PHC",
            lga=self.lga,
            verification_status="VERIFIED",
            is_active=True
        )

        self.disease = Disease.objects.create(
            name="Test Malaria",
            description="Test disease",
            is_active=True
        )

        self.inactive_disease = Disease.objects.create(
            name="Inactive Disease",
            is_active=False
        )

        self.report = DiseaseReport.objects.create(
            disease=self.disease,
            health_facility=self.facility,
            lga=self.lga,
            reporting_date="2026-11-01",
            suspected_cases=20,
            confirmed_cases=10,
            deaths=1,
            recoveries=5,
            status="SUSPECTED"
        )

    def create_facility_reporter(self):
        reporter = User.objects.create_user(
            username="facility_reporter",
            password="TestPassword123!"
        )

        UserProfile.objects.create(
            user=reporter,
            role=UserProfile.Role.HEALTH_FACILITY_REPORTER,
            lga=self.lga,
            health_facility=self.facility,
        )

        token = Token.objects.create(user=reporter)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        return client

    def create_report_for_another_facility(self):
        other_lga = LocalGovernmentArea.objects.create(
            name="Jos South",
            code="JOS-S"
        )

        other_facility = HealthFacility.objects.create(
            name="Another Health Centre",
            facility_type="PHC",
            lga=other_lga,
            verification_status="VERIFIED",
            is_active=True
        )

        return DiseaseReport.objects.create(
            disease=self.disease,
            health_facility=other_facility,
            lga=other_lga,
            reporting_date="2026-11-02",
            suspected_cases=15,
            confirmed_cases=8,
            deaths=0,
            recoveries=4,
            status="UNDER_REVIEW"
        )

    # --------------------------------------------------
    # DISEASE LIST TESTS
    # --------------------------------------------------

    def test_authenticated_user_can_list_diseases(self):
        response = self.client.get(reverse("disease-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_inactive_diseases_are_not_listed(self):
        response = self.client.get(reverse("disease-list"))

        disease_names = [
            item["name"] for item in response.data
        ]

        self.assertNotIn(
            self.inactive_disease.name,
            disease_names
        )

    # --------------------------------------------------
    # DISEASE REPORT LIST AND FILTER TESTS
    # --------------------------------------------------

    def test_authenticated_user_can_list_reports(self):
        response = self.client.get(
            reverse("disease-report-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_reports_can_be_filtered_by_lga(self):
        response = self.client.get(
            reverse("disease-report-list"),
            {"lga": self.lga.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_reports_can_be_filtered_by_disease(self):
        response = self.client.get(
            reverse("disease-report-list"),
            {"disease": self.disease.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_reports_can_be_filtered_by_date(self):
        response = self.client.get(
            reverse("disease-report-list"),
            {"date": "2026-11-01"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_reports_can_be_filtered_by_status(self):
        response = self.client.get(
            reverse("disease-report-list"),
            {"status": "SUSPECTED"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    # --------------------------------------------------
    # AUTHENTICATION AND PERMISSION TESTS
    # --------------------------------------------------

    def test_unauthenticated_user_cannot_access_diseases(self):
        self.client.credentials()

        response = self.client.get(reverse("disease-list"))

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN
            ]
        )

    def test_unauthenticated_user_cannot_access_reports(self):
        self.client.credentials()

        response = self.client.get(
            reverse("disease-report-list")
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN
            ]
        )

    def test_user_without_role_cannot_access_disease_reports(self):
        ordinary_user = User.objects.create_user(
            username="ordinary_user",
            password="TestPassword123!"
        )

        token = Token.objects.create(user=ordinary_user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = client.get(
            reverse("disease-report-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    # --------------------------------------------------
    # FACILITY REPORTER ACCESS RESTRICTION TESTS
    # --------------------------------------------------

    def test_facility_reporter_only_sees_assigned_facility_reports(self):
        self.create_report_for_another_facility()
        reporter_client = self.create_facility_reporter()

        response = reporter_client.get(
            reverse("disease-report-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        self.assertEqual(
            response.data[0]["health_facility"],
            self.facility.id
        )

    def test_facility_reporter_cannot_access_another_lga_reports(self):
        other_report = self.create_report_for_another_facility()
        reporter_client = self.create_facility_reporter()

        response = reporter_client.get(
            reverse("disease-report-list"),
            {"lga": other_report.lga_id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    # --------------------------------------------------
    # DISEASE REPORT SUBMISSION TESTS
    # --------------------------------------------------

    def test_facility_reporter_can_submit_disease_report(self):
        reporter_client = self.create_facility_reporter()

        response = reporter_client.post(
            reverse("disease-report-list"),
            {
                "disease": self.disease.id,
                "reporting_date": "2026-11-03",
                "suspected_cases": 25,
                "confirmed_cases": 12,
                "deaths": 1,
                "recoveries": 4,
                "status": "SUSPECTED",
                "notes": "Test submission",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data
        )

        self.assertEqual(
            response.data["health_facility"],
            self.facility.id
        )

        self.assertEqual(
            response.data["lga"],
            self.lga.id
        )

    def test_reporter_cannot_submit_for_another_facility(self):
        other_report = self.create_report_for_another_facility()
        reporter_client = self.create_facility_reporter()

        response = reporter_client.post(
            reverse("disease-report-list"),
            {
                "disease": self.disease.id,
                "health_facility": other_report.health_facility_id,
                "lga": other_report.lga_id,
                "reporting_date": "2026-11-03",
                "suspected_cases": 10,
                "confirmed_cases": 5,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data
        )

        self.assertEqual(
            response.data["health_facility"],
            self.facility.id
        )

        self.assertEqual(
            response.data["lga"],
            self.lga.id
        )

    def test_public_health_officer_cannot_submit_facility_report(self):
        response = self.client.post(
            reverse("disease-report-list"),
            {
                "disease": self.disease.id,
                "reporting_date": "2026-11-03",
                "suspected_cases": 10,
                "confirmed_cases": 5,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_disease_report_submission_creates_audit_log(self):
        reporter_client = self.create_facility_reporter()

        response = reporter_client.post(
            reverse("disease-report-list"),
            {
                "disease": self.disease.id,
                "reporting_date": "2026-11-04",
                "suspected_cases": 15,
                "confirmed_cases": 7,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data
        )

        audit_entry = AuditLog.objects.filter(
            action=AuditLog.Action.CREATE,
            object_id=str(response.data["id"]),
        ).first()

        self.assertIsNotNone(audit_entry)

        self.assertEqual(
            audit_entry.actor.username,
            "facility_reporter"
        )
