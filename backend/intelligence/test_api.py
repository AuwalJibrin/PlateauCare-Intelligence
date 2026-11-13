
from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from core.models import LocalGovernmentArea, UserProfile
from intelligence.models import HealthRiskAssessment


User = get_user_model()


class HealthRiskAssessmentAPITests(APITestCase):

    def setUp(self):
        self.officer = User.objects.create_user(
            username="intelligence_officer",
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=self.officer,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        self.token = Token.objects.create(user=self.officer)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.url = reverse("risk-assessment-list")

        self.lga_one = LocalGovernmentArea.objects.create(
            name="Jos North",
            code="INT-JOS-N",
        )

        self.lga_two = LocalGovernmentArea.objects.create(
            name="Jos South",
            code="INT-JOS-S",
        )

        self.assessment_one = self.create_assessment(
            self.lga_one,
            date(2026, 11, 10),
        )

        self.assessment_two = self.create_assessment(
            self.lga_two,
            date(2026, 11, 11),
        )

    def create_assessment(self, lga, assessment_date):
        return HealthRiskAssessment.objects.create(
            lga=lga,
            assessment_date=assessment_date,
            risk_score=0.85,
            risk_level="HIGH",
            contributing_factors=["High suspected cases"],
            explanation="Test AI risk assessment.",
            model_version="test-model",
        )

    def create_role_client(self, username, role):
        user = User.objects.create_user(
            username=username,
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=user,
            role=role,
        )

        token = Token.objects.create(user=user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        return client

    def test_public_health_officer_can_view_all_assessments(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_system_admin_can_view_all_assessments(self):
        client = self.create_role_client(
            "intelligence_admin",
            UserProfile.Role.SYSTEM_ADMIN,
        )

        response = client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_assessments_can_be_filtered_by_lga(self):
        response = self.client.get(
            self.url,
            {"lga": self.lga_one.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["lga"],
            self.lga_one.id,
        )

    def test_assessments_can_be_filtered_by_date(self):
        response = self.client.get(
            self.url,
            {"date": "2026-11-11"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["assessment_date"],
            "2026-11-11",
        )

    def test_reporter_roles_cannot_view_assessments(self):
        denied_roles = [
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
            UserProfile.Role.WORKFORCE_REPORTER,
            UserProfile.Role.COMMUNITY_REPORTER,
            UserProfile.Role.UNASSIGNED,
        ]

        for index, role in enumerate(denied_roles):
            client = self.create_role_client(
                f"denied_intelligence_user_{index}",
                role,
            )

            response = client.get(self.url)

            self.assertEqual(
                response.status_code,
                status.HTTP_403_FORBIDDEN,
                msg=f"Role {role} should not access risk assessments.",
            )

    def test_user_without_profile_cannot_view_assessments(self):
        user = User.objects.create_user(
            username="no_intelligence_profile",
            password="TestPassword123!",
        )

        token = Token.objects.create(user=user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_view_assessments(self):
        self.client.credentials()

        response = self.client.get(self.url)

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )
