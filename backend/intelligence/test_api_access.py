from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from core.models import LocalGovernmentArea, UserProfile
from intelligence.models import HealthRiskAssessment


User = get_user_model()


class HealthRiskAssessmentAccessTests(APITestCase):

    def setUp(self):
        self.lga = LocalGovernmentArea.objects.create(
            name="Intelligence Test LGA",
            code="INT-TEST-1",
        )

        self.second_lga = LocalGovernmentArea.objects.create(
            name="Second Intelligence LGA",
            code="INT-TEST-2",
        )

        self.assessment = HealthRiskAssessment.objects.create(
            lga=self.lga,
            assessment_date="2026-11-18",
            risk_score=0.75,
            risk_level="HIGH",
            contributing_factors=["Elevated test indicators"],
            explanation="Test assessment for access-control validation.",
            model_version="test-model",
        )

        self.second_assessment = HealthRiskAssessment.objects.create(
            lga=self.second_lga,
            assessment_date="2026-11-18",
            risk_score=0.35,
            risk_level="LOW",
            contributing_factors=["Normal test indicators"],
            explanation="Second test assessment.",
            model_version="test-model",
        )

        self.url = reverse("risk-assessment-list")

    def create_role_client(self, username, role, lga=None):
        user = User.objects.create_user(
            username=username,
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=user,
            role=role,
            lga=lga,
        )

        client = APIClient()
        client.force_authenticate(user=user)

        return client

    def test_public_health_officer_only_sees_assigned_lga_assessments(self):
        client = self.create_role_client(
            "intelligence_officer",
            "PUBLIC_HEALTH_OFFICER",
            self.lga,
        )

        response = client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.lga.id)

    def test_public_health_officer_cannot_bypass_scope_with_lga_filter(self):
        client = self.create_role_client(
            "intelligence_filter_officer",
            "PUBLIC_HEALTH_OFFICER",
            self.lga,
        )

        response = client.get(
            self.url,
            {"lga": self.second_lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_public_health_officer_without_lga_sees_no_assessments(self):
        client = self.create_role_client(
            "intelligence_unassigned_officer",
            "PUBLIC_HEALTH_OFFICER",
        )

        response = client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_system_admin_can_view_assessments_across_lgas(self):
        client = self.create_role_client(
            "intelligence_admin",
            "SYSTEM_ADMIN",
        )

        response = client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_system_admin_can_filter_assessments_by_lga(self):
        client = self.create_role_client(
            "intelligence_admin_filter",
            "SYSTEM_ADMIN",
        )

        response = client.get(
            self.url,
            {"lga": self.second_lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.second_lga.id)

    def test_non_authorized_reporter_cannot_view_assessments(self):
        client = self.create_role_client(
            "intelligence_workforce_reporter",
            "WORKFORCE_REPORTER",
            self.lga,
        )

        response = client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_view_assessments(self):
        response = self.client.get(self.url)

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )
