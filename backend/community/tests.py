
from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from core.models import LocalGovernmentArea, UserProfile
from community.models import CommunityHealthRecord


User = get_user_model()


class CommunityAPITests(APITestCase):

    def setUp(self):
        self.lga = LocalGovernmentArea.objects.create(
            name="Community Test LGA",
            code="COMM-TEST",
        )

        self.second_lga = LocalGovernmentArea.objects.create(
            name="Second Community LGA",
            code="COMM-TEST-2",
        )

        self.user = User.objects.create_user(
            username="community_test_user",
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=self.user,
            role="COMMUNITY_REPORTER",
            lga=self.lga,
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.record = CommunityHealthRecord.objects.create(
            community_name="Test Community",
            lga=self.lga,
            reporting_date="2026-11-03",
            population_covered=500,
            people_screened=200,
            people_referred=30,
            reported_health_concerns=15,
            people_reached_through_awareness=300,
        )

        self.second_record = CommunityHealthRecord.objects.create(
            community_name="Second Test Community",
            lga=self.second_lga,
            reporting_date="2026-11-03",
            population_covered=400,
            people_screened=150,
            people_referred=20,
            reported_health_concerns=10,
            people_reached_through_awareness=250,
        )

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

        token = Token.objects.create(user=user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        return client

    def test_community_reporter_only_sees_assigned_lga_records(self):
        response = self.client.get(
            reverse("community-record-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["lga"],
            self.lga.id,
        )

    def test_community_reporter_cannot_view_another_lga(self):
        response = self.client.get(
            reverse("community-record-list"),
            {"lga": self.second_lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_records_can_be_filtered_by_lga(self):
        response = self.client.get(
            reverse("community-record-list"),
            {"lga": self.lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_records_can_be_filtered_by_date(self):
        response = self.client.get(
            reverse("community-record-list"),
            {"date": "2026-11-03"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_community_reporter_can_submit_record_for_assigned_lga(self):
        data = {
            "community_name": "New Test Community",
            "lga": self.lga.id,
            "reporting_date": "2026-11-04",
            "population_covered": 1000,
            "people_screened": 400,
            "people_referred": 50,
            "reported_health_concerns": 20,
            "people_reached_through_awareness": 600,
        }

        response = self.client.post(
            reverse("community-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_community_reporter_cannot_submit_for_another_lga(self):
        data = {
            "community_name": "Other LGA Community",
            "lga": self.second_lga.id,
            "reporting_date": "2026-11-04",
            "population_covered": 1000,
            "people_screened": 400,
            "people_referred": 50,
            "reported_health_concerns": 20,
            "people_reached_through_awareness": 600,
        }

        response = self.client.post(
            reverse("community-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_screened_population_cannot_exceed_population_covered(self):
        data = {
            "community_name": "Invalid Community",
            "lga": self.lga.id,
            "reporting_date": "2026-11-04",
            "population_covered": 100,
            "people_screened": 150,
            "people_referred": 10,
            "reported_health_concerns": 5,
            "people_reached_through_awareness": 50,
        }

        response = self.client.post(
            reverse("community-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_referred_people_cannot_exceed_people_screened(self):
        data = {
            "community_name": "Invalid Community",
            "lga": self.lga.id,
            "reporting_date": "2026-11-04",
            "population_covered": 100,
            "people_screened": 20,
            "people_referred": 30,
            "reported_health_concerns": 5,
            "people_reached_through_awareness": 50,
        }

        response = self.client.post(
            reverse("community-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_public_health_officer_can_view_all_records(self):
        client = self.create_role_client(
            "community_public_health",
            "PUBLIC_HEALTH_OFFICER",
        )

        response = client.get(
            reverse("community-record-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_system_admin_can_view_all_records(self):
        client = self.create_role_client(
            "community_system_admin",
            "SYSTEM_ADMIN",
        )

        response = client.get(
            reverse("community-record-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_public_health_officer_cannot_submit_records(self):
        client = self.create_role_client(
            "community_officer_writer",
            "PUBLIC_HEALTH_OFFICER",
        )

        response = client.post(
            reverse("community-record-list"),
            {
                "community_name": "Officer Community",
                "lga": self.lga.id,
                "reporting_date": "2026-11-04",
                "population_covered": 100,
                "people_screened": 50,
                "people_referred": 10,
                "reported_health_concerns": 5,
                "people_reached_through_awareness": 60,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_system_admin_cannot_submit_records(self):
        client = self.create_role_client(
            "community_admin_writer",
            "SYSTEM_ADMIN",
        )

        response = client.post(
            reverse("community-record-list"),
            {
                "community_name": "Admin Community",
                "lga": self.lga.id,
                "reporting_date": "2026-11-04",
                "population_covered": 100,
                "people_screened": 50,
                "people_referred": 10,
                "reported_health_concerns": 5,
                "people_reached_through_awareness": 60,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_other_reporter_roles_cannot_access_community_records(self):
        roles = [
            "HEALTH_FACILITY_REPORTER",
            "WORKFORCE_REPORTER",
        ]

        for index, role in enumerate(roles):
            client = self.create_role_client(
                f"restricted_community_user_{index}",
                role,
                self.lga,
            )

            response = client.get(
                reverse("community-record-list")
            )

            self.assertEqual(
                response.status_code,
                status.HTTP_403_FORBIDDEN,
            )

    def test_unassigned_user_cannot_access_community_records(self):
        client = self.create_role_client(
            "unassigned_community_user",
            "UNASSIGNED",
        )

        response = client.get(
            reverse("community-record-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_user_without_profile_cannot_access_community_records(self):
        user = User.objects.create_user(
            username="community_no_profile",
            password="TestPassword123!",
        )

        token = Token.objects.create(user=user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = client.get(
            reverse("community-record-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_access_community_records(self):
        self.client.credentials()

        response = self.client.get(
            reverse("community-record-list")
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )
