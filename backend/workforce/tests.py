
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from auditlog.models import AuditLog
from core.models import LocalGovernmentArea, UserProfile
from workforce.models import WorkforceHealthRecord


User = get_user_model()


class WorkforceAPITests(APITestCase):

    def setUp(self):
        self.lga = LocalGovernmentArea.objects.create(
            name="Workforce Test LGA",
            code="WORK-TEST",
        )

        self.second_lga = LocalGovernmentArea.objects.create(
            name="Second Workforce LGA",
            code="WORK-TEST-2",
        )

        self.user = User.objects.create_user(
            username="workforce_test_user",
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=self.user,
            role="WORKFORCE_REPORTER",
            lga=self.lga,
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.record = WorkforceHealthRecord.objects.create(
            organization_name="Test Health Organisation",
            lga=self.lga,
            reporting_date="2026-11-03",
            total_workforce=100,
            sickness_absences=10,
            workplace_incidents=5,
            occupational_exposures=3,
            heat_related_incidents=2,
        )

        self.second_record = WorkforceHealthRecord.objects.create(
            organization_name="Second Health Organisation",
            lga=self.second_lga,
            reporting_date="2026-11-03",
            total_workforce=80,
            sickness_absences=8,
            workplace_incidents=4,
            occupational_exposures=2,
            heat_related_incidents=1,
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

    def test_workforce_reporter_only_sees_assigned_lga_records(self):
        response = self.client.get(
            reverse("workforce-record-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        self.assertEqual(
            response.data[0]["lga"],
            self.lga.id,
        )

    def test_workforce_reporter_cannot_view_another_lga(self):
        response = self.client.get(
            reverse("workforce-record-list"),
            {"lga": self.second_lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_records_can_be_filtered_by_assigned_lga(self):
        response = self.client.get(
            reverse("workforce-record-list"),
            {"lga": self.lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_records_can_be_filtered_by_date(self):
        response = self.client.get(
            reverse("workforce-record-list"),
            {"date": "2026-11-03"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_workforce_reporter_can_submit_record_for_assigned_lga(self):
        data = {
            "organization_name": "New Health Organisation",
            "lga": self.lga.id,
            "reporting_date": "2026-11-04",
            "total_workforce": 50,
            "sickness_absences": 5,
            "workplace_incidents": 2,
            "occupational_exposures": 1,
            "heat_related_incidents": 1,
        }

        response = self.client.post(
            reverse("workforce-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_workforce_reporter_cannot_submit_for_another_lga(self):
        data = {
            "organization_name": "Other LGA Organisation",
            "lga": self.second_lga.id,
            "reporting_date": "2026-11-04",
            "total_workforce": 50,
            "sickness_absences": 5,
            "workplace_incidents": 2,
            "occupational_exposures": 1,
            "heat_related_incidents": 1,
        }

        response = self.client.post(
            reverse("workforce-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_sickness_absences_cannot_exceed_workforce(self):
        data = {
            "organization_name": "Invalid Organisation",
            "lga": self.lga.id,
            "reporting_date": "2026-11-04",
            "total_workforce": 10,
            "sickness_absences": 15,
            "workplace_incidents": 1,
            "occupational_exposures": 1,
            "heat_related_incidents": 1,
        }

        response = self.client.post(
            reverse("workforce-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_public_health_officer_only_sees_assigned_lga_records(self):
        client = self.create_role_client(
            "public_health_user",
            "PUBLIC_HEALTH_OFFICER",
            self.lga,
        )

        response = client.get(reverse("workforce-record-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.lga.id)

    def test_public_health_officer_cannot_bypass_lga_scope_with_filter(self):
        client = self.create_role_client(
            "public_health_filter_user",
            "PUBLIC_HEALTH_OFFICER",
            self.lga,
        )

        response = client.get(
            reverse("workforce-record-list"),
            {"lga": self.second_lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_public_health_officer_without_lga_sees_no_records(self):
        client = self.create_role_client(
            "public_health_unassigned",
            "PUBLIC_HEALTH_OFFICER",
        )

        response = client.get(reverse("workforce-record-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_system_admin_can_view_all_records(self):
        client = self.create_role_client(
            "system_admin_user",
            "SYSTEM_ADMIN",
        )

        response = client.get(reverse("workforce-record-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_public_health_officer_cannot_submit_records(self):
        client = self.create_role_client(
            "public_health_writer",
            "PUBLIC_HEALTH_OFFICER",
        )

        response = client.post(
            reverse("workforce-record-list"),
            {
                "organization_name": "Officer Organisation",
                "lga": self.lga.id,
                "reporting_date": "2026-11-04",
                "total_workforce": 20,
                "sickness_absences": 2,
                "workplace_incidents": 1,
                "occupational_exposures": 1,
                "heat_related_incidents": 1,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_system_admin_cannot_submit_records(self):
        client = self.create_role_client(
            "admin_writer",
            "SYSTEM_ADMIN",
        )

        response = client.post(
            reverse("workforce-record-list"),
            {
                "organization_name": "Admin Organisation",
                "lga": self.lga.id,
                "reporting_date": "2026-11-04",
                "total_workforce": 20,
                "sickness_absences": 2,
                "workplace_incidents": 1,
                "occupational_exposures": 1,
                "heat_related_incidents": 1,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_other_reporter_roles_cannot_access_workforce_records(self):
        roles = [
            "HEALTH_FACILITY_REPORTER",
            "COMMUNITY_REPORTER",
        ]

        for index, role in enumerate(roles):
            client = self.create_role_client(
                f"restricted_user_{index}",
                role,
                self.lga,
            )

            response = client.get(
                reverse("workforce-record-list")
            )

            self.assertEqual(
                response.status_code,
                status.HTTP_403_FORBIDDEN,
            )

    def test_unassigned_user_cannot_access_workforce_records(self):
        client = self.create_role_client(
            "unassigned_workforce_user",
            "UNASSIGNED",
        )

        response = client.get(reverse("workforce-record-list"))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_user_without_profile_cannot_access_workforce_records(self):
        user = User.objects.create_user(
            username="no_profile_user",
            password="TestPassword123!",
        )

        token = Token.objects.create(user=user)

        client = APIClient()

        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = client.get(reverse("workforce-record-list"))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_access_workforce_records(self):
        self.client.credentials()

        response = self.client.get(
            reverse("workforce-record-list")
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    # Additional audit and validation tests

    def test_successful_submission_creates_audit_log(self):
        data = {
            "organization_name": "Audited Organisation",
            "lga": self.lga.id,
            "reporting_date": "2026-11-05",
            "total_workforce": 50,
            "sickness_absences": 5,
            "workplace_incidents": 2,
            "occupational_exposures": 1,
            "heat_related_incidents": 1,
        }

        response = self.client.post(
            reverse("workforce-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        content_type = ContentType.objects.get_for_model(
            WorkforceHealthRecord
        )

        audit_log = AuditLog.objects.get(
            actor=self.user,
            action=AuditLog.Action.CREATE,
            source=AuditLog.Source.API,
            content_type=content_type,
            object_id=str(response.data["id"]),
        )

        self.assertIn(
            "organization_name",
            audit_log.changed_fields,
        )

        self.assertIn(
            "total_workforce",
            audit_log.changed_fields,
        )

    def test_workplace_incidents_cannot_exceed_workforce(self):
        data = {
            "organization_name": "Invalid Incidents Organisation",
            "lga": self.lga.id,
            "reporting_date": "2026-11-05",
            "total_workforce": 10,
            "sickness_absences": 2,
            "workplace_incidents": 15,
            "occupational_exposures": 1,
            "heat_related_incidents": 1,
        }

        response = self.client.post(
            reverse("workforce-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_occupational_exposures_cannot_exceed_workforce(self):
        data = {
            "organization_name": "Invalid Exposures Organisation",
            "lga": self.lga.id,
            "reporting_date": "2026-11-05",
            "total_workforce": 10,
            "sickness_absences": 2,
            "workplace_incidents": 1,
            "occupational_exposures": 15,
            "heat_related_incidents": 1,
        }

        response = self.client.post(
            reverse("workforce-record-list"),
            data,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_workforce_submission_rejects_future_reporting_date(self):
        response = self.client.post(
            reverse("workforce-record-list"),
            {
                "organization_name": "Future Date Test Organisation",
                "lga": self.lga.id,
                "reporting_date": "2026-11-20",
                "total_workforce": 50,
                "sickness_absences": 5,
                "workplace_incidents": 2,
                "occupational_exposures": 1,
                "heat_related_incidents": 1,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            response.data,
        )
        self.assertIn("reporting_date", response.data)
