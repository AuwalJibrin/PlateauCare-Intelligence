from auditlog.models import AuditLog
from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from core.models import LocalGovernmentArea, UserProfile
from .models import EnvironmentalObservation


User = get_user_model()


class EnvironmentalObservationAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="environment_test",
            password="TestPassword123!"
        )

        self.client.force_authenticate(user=self.user)

        self.lga1 = LocalGovernmentArea.objects.create(
            name="Test Jos North",
            code="TEST-JN"
        )

        self.lga2 = LocalGovernmentArea.objects.create(
            name="Test Jos South",
            code="TEST-JS"
        )

        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
            lga=self.lga1,
        )

        self.observation1 = EnvironmentalObservation.objects.create(
            lga=self.lga1,
            observation_date=date(2026, 11, 1),
            rainfall_mm=25.5,
            temperature_celsius=28.0,
            humidity_percentage=65.0,
            air_quality_index=40.0,
            flood_occurred=False,
            source="Test source"
        )

        self.observation2 = EnvironmentalObservation.objects.create(
            lga=self.lga2,
            observation_date=date(2026, 11, 2),
            rainfall_mm=40.0,
            temperature_celsius=30.0,
            humidity_percentage=75.0,
            air_quality_index=55.0,
            flood_occurred=True,
            source="Test source"
        )

        self.url = reverse("environmental-observation-list")

    def create_user_client(self, username, role, lga=None):
        user = User.objects.create_user(
            username=username,
            password="TestPassword123!"
        )

        UserProfile.objects.create(
            user=user,
            role=role,
            lga=lga,
        )

        client = APIClient()
        client.force_authenticate(user=user)

        return client

    def test_authenticated_user_can_view_observations(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.lga1.id)

    def test_filter_observations_by_lga(self):
        response = self.client.get(
            self.url,
            {"lga": self.lga1.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.lga1.id)

    def test_filter_observations_by_date(self):
        response = self.client.get(
            self.url,
            {"date": "2026-11-01"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["observation_date"],
            "2026-11-01"
        )

    def test_officer_cannot_bypass_lga_scope_with_filter(self):
        response = self.client.get(
            self.url,
            {"lga": self.lga2.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_officer_without_lga_sees_no_observations(self):
        client = self.create_user_client(
            "environment_officer_without_lga",
            UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        response = client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_officer_cannot_submit_observation_for_another_lga(self):
        response = self.client.post(
            self.url,
            {
                "lga": self.lga2.id,
                "observation_date": "2026-11-05",
                "rainfall_mm": 20.0,
                "temperature_celsius": 27.0,
                "humidity_percentage": 60.0,
                "air_quality_index": 35.0,
                "flood_occurred": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn("lga", response.data)

    def test_officer_without_lga_cannot_submit_observation(self):
        client = self.create_user_client(
            "environment_unassigned_officer",
            UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        response = client.post(
            self.url,
            {
                "lga": self.lga1.id,
                "observation_date": "2026-11-06",
                "rainfall_mm": 20.0,
                "temperature_celsius": 27.0,
                "humidity_percentage": 60.0,
                "air_quality_index": 35.0,
                "flood_occurred": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_unauthenticated_user_cannot_view_observations(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

    def test_system_admin_can_view_observations(self):
        client = self.create_user_client(
            "environment_admin",
            UserProfile.Role.SYSTEM_ADMIN,
        )

        response = client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_health_facility_reporter_cannot_view_observations(self):
        client = self.create_user_client(
            "environment_facility_reporter",
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
        )

        response = client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_workforce_reporter_cannot_view_observations(self):
        client = self.create_user_client(
            "environment_workforce_reporter",
            UserProfile.Role.WORKFORCE_REPORTER,
        )

        response = client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_community_reporter_cannot_view_observations(self):
        client = self.create_user_client(
            "environment_community_reporter",
            UserProfile.Role.COMMUNITY_REPORTER,
        )

        response = client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_user_without_profile_cannot_view_observations(self):
        user = User.objects.create_user(
            username="environment_unassigned",
            password="TestPassword123!"
        )

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_public_health_officer_can_submit_observation(self):
        response = self.client.post(
            self.url,
            {
                "lga": self.lga1.id,
                "observation_date": "2026-11-03",
                "rainfall_mm": 35.5,
                "temperature_celsius": 29.0,
                "humidity_percentage": 70.0,
                "air_quality_index": 45.0,
                "flood_occurred": False,
                "source": "Test weather station",
                "notes": "Test environmental submission",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data
        )

        self.assertEqual(
            response.data["lga"],
            self.lga1.id
        )

    def test_environmental_submission_rejects_negative_rainfall(self):
        response = self.client.post(
            self.url,
            {
                "lga": self.lga1.id,
                "observation_date": "2026-11-03",
                "rainfall_mm": -5,
                "temperature_celsius": 29.0,
                "humidity_percentage": 70.0,
                "air_quality_index": 45.0,
                "flood_occurred": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

        self.assertIn("rainfall_mm", response.data)

    def test_health_facility_reporter_cannot_submit_observation(self):
        client = self.create_user_client(
            "environment_submit_reporter",
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
        )

        response = client.post(
            self.url,
            {
                "lga": self.lga1.id,
                "observation_date": "2026-11-03",
                "rainfall_mm": 25.0,
                "temperature_celsius": 28.0,
                "humidity_percentage": 65.0,
                "air_quality_index": 40.0,
                "flood_occurred": False,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_environmental_submission_creates_audit_log(self):
        response = self.client.post(
            self.url,
            {
                "lga": self.lga1.id,
                "observation_date": "2026-11-04",
                "rainfall_mm": 20.0,
                "temperature_celsius": 27.0,
                "humidity_percentage": 60.0,
                "air_quality_index": 35.0,
                "flood_occurred": False,
                "source": "Test weather station",
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
            "environment_test"
        )

    def test_environmental_submission_rejects_future_observation_date(self):
        response = self.client.post(
            self.url,
            {
                "lga": self.lga1.id,
                "observation_date": "2026-11-20",
                "rainfall_mm": 20.0,
                "temperature_celsius": 27.0,
                "humidity_percentage": 60.0,
                "air_quality_index": 35.0,
                "flood_occurred": False,
                "source": "Test weather station",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            response.data,
        )
        self.assertIn("observation_date", response.data)
