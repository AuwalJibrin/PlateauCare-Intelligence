
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from django.contrib.contenttypes.models import ContentType
from auditlog.models import AuditLog

from core.models import LocalGovernmentArea, UserProfile
from intelligence.models import HealthRiskAssessment
from response.models import PublicHealthAlert
from response.services.alert_generation import (
    generate_alert_for_assessment,
)


User = get_user_model()


class PublicHealthAlertModelTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="health_officer",
            password="TestPassword123!",
        )

        self.lga = LocalGovernmentArea.objects.create(
            name="Alert Test LGA",
            code="ALERT-TEST",
        )

        self.assessment = HealthRiskAssessment.objects.create(
            lga=self.lga,
            assessment_date=date(2026, 11, 8),
            risk_score=0.97,
            risk_level="CRITICAL",
            contributing_factors=[
                "High suspected disease cases",
                "Increased environmental risk",
            ],
            explanation="Test AI risk assessment.",
            model_version="test-model",
        )

    def create_alert(self):
        return PublicHealthAlert.objects.create(
            assessment=self.assessment,
            title="Critical health risk detected",
            description="Unusual health indicators detected.",
            recommended_action=(
                "Request immediate review by public-health authorities."
            ),
        )

    def test_alert_can_be_created(self):
        alert = self.create_alert()

        self.assertEqual(alert.assessment, self.assessment)
        self.assertEqual(alert.status, "OPEN")
        self.assertEqual(
            alert.title,
            "Critical health risk detected",
        )

    def test_alert_is_linked_to_its_assessment(self):
        alert = self.create_alert()

        self.assertEqual(
            alert.assessment.lga.name,
            "Alert Test LGA",
        )

        self.assertEqual(self.assessment.alert, alert)

    def test_duplicate_alert_for_same_assessment_is_prevented(self):
        self.create_alert()

        with self.assertRaises(Exception):
            self.create_alert()

    def test_alert_can_be_acknowledged(self):
        alert = self.create_alert()

        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_by = self.user
        alert.save()

        alert.refresh_from_db()

        self.assertEqual(alert.status, "ACKNOWLEDGED")
        self.assertEqual(alert.acknowledged_by, self.user)

    def test_alert_can_be_resolved(self):
        alert = self.create_alert()

        alert.status = "RESOLVED"
        alert.resolved_by = self.user
        alert.save()

        alert.refresh_from_db()

        self.assertEqual(alert.status, "RESOLVED")
        self.assertEqual(alert.resolved_by, self.user)

    def test_alert_can_be_dismissed(self):
        alert = self.create_alert()

        alert.status = "DISMISSED"
        alert.save()

        alert.refresh_from_db()

        self.assertEqual(alert.status, "DISMISSED")


class AlertGenerationServiceTests(PublicHealthAlertModelTests):

    def test_high_assessment_generates_alert(self):
        self.assessment.risk_level = "HIGH"
        self.assessment.save()

        alert, created = generate_alert_for_assessment(
            self.assessment
        )

        self.assertTrue(created)
        self.assertIsNotNone(alert)
        self.assertEqual(alert.status, "OPEN")
        self.assertIn("High", alert.title)

    def test_critical_assessment_generates_alert(self):
        alert, created = generate_alert_for_assessment(
            self.assessment
        )

        self.assertTrue(created)
        self.assertEqual(alert.status, "OPEN")
        self.assertIn("URGENT REVIEW", alert.recommended_action)

    def test_low_assessment_does_not_generate_alert(self):
        self.assessment.risk_level = "LOW"
        self.assessment.save()

        alert, created = generate_alert_for_assessment(
            self.assessment
        )

        self.assertIsNone(alert)
        self.assertFalse(created)

    def test_moderate_assessment_does_not_generate_alert(self):
        self.assessment.risk_level = "MODERATE"
        self.assessment.save()

        alert, created = generate_alert_for_assessment(
            self.assessment
        )

        self.assertIsNone(alert)
        self.assertFalse(created)

    def test_existing_alert_is_not_duplicated_or_reset(self):
        first_alert, first_created = (
            generate_alert_for_assessment(self.assessment)
        )

        first_alert.status = "DISMISSED"
        first_alert.save()

        second_alert, second_created = (
            generate_alert_for_assessment(self.assessment)
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(first_alert.id, second_alert.id)
        self.assertEqual(second_alert.status, "DISMISSED")


class PublicHealthAlertAPITests(APITestCase):

    def setUp(self):
        self.officer = User.objects.create_user(
            username="alert_officer",
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=self.officer,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        self.admin = User.objects.create_user(
            username="alert_admin",
            password="TestPassword123!",
        )

        UserProfile.objects.create(
            user=self.admin,
            role=UserProfile.Role.SYSTEM_ADMIN,
        )

        self.lga = LocalGovernmentArea.objects.create(
            name="API Alert Test LGA",
            code="API-ALERT-TEST",
        )

        self.assessment = HealthRiskAssessment.objects.create(
            lga=self.lga,
            assessment_date=date(2026, 11, 8),
            risk_score=0.97,
            risk_level="CRITICAL",
            contributing_factors=["High suspected cases"],
            explanation="Test API assessment.",
            model_version="test-model",
        )

        self.alert = PublicHealthAlert.objects.create(
            assessment=self.assessment,
            title="Critical health risk detected",
            description="Unusual health indicators detected.",
            recommended_action="Request urgent review.",
        )

        self.list_url = reverse("public-health-alert-list")

        self.detail_url = reverse(
            "public-health-alert-detail",
            kwargs={"pk": self.alert.pk},
        )

        self.officer_token = Token.objects.create(
            user=self.officer
        )

        self.admin_token = Token.objects.create(
            user=self.admin
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.officer_token.key}"
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

    def test_public_health_officer_can_list_alerts(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_public_health_officer_can_view_alert_details(self):
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["lga_name"], self.lga.name)
        self.assertEqual(response.data["risk_level"], "CRITICAL")

    def test_system_admin_can_list_alerts(self):
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.admin_token.key}"
        )

        response = client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_reporter_roles_cannot_view_alerts(self):
        denied_roles = [
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
            UserProfile.Role.WORKFORCE_REPORTER,
            UserProfile.Role.COMMUNITY_REPORTER,
            UserProfile.Role.UNASSIGNED,
        ]

        for index, role in enumerate(denied_roles):
            client = self.create_role_client(
                f"alert_denied_user_{index}",
                role,
            )

            response = client.get(self.list_url)

            self.assertEqual(
                response.status_code,
                status.HTTP_403_FORBIDDEN,
            )

    def test_user_without_profile_cannot_view_alerts(self):
        user = User.objects.create_user(
            username="alert_no_profile",
            password="TestPassword123!",
        )

        token = Token.objects.create(user=user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_unauthenticated_user_cannot_view_alerts(self):
        self.client.credentials()

        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_alerts_can_be_filtered_by_status(self):
        response = self.client.get(
            self.list_url,
            {"status": "OPEN"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_alerts_can_be_filtered_by_risk_level(self):
        response = self.client.get(
            self.list_url,
            {"risk_level": "CRITICAL"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_alerts_can_be_filtered_by_lga(self):
        response = self.client.get(
            self.list_url,
            {"lga": self.lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_officer_can_acknowledge_open_alert(self):
        url = reverse(
            "public-health-alert-acknowledge",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.alert.refresh_from_db()

        self.assertEqual(self.alert.status, "ACKNOWLEDGED")
        self.assertEqual(self.alert.acknowledged_by, self.officer)
        self.assertIsNotNone(self.alert.acknowledged_at)

    def test_reporter_cannot_acknowledge_alert(self):
        client = self.create_role_client(
            "alert_reporter",
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
        )

        url = reverse(
            "public-health-alert-acknowledge",
            kwargs={"pk": self.alert.pk},
        )

        response = client.post(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_acknowledged_alert_cannot_be_acknowledged_again(self):
        self.alert.status = "ACKNOWLEDGED"
        self.alert.save()

        url = reverse(
            "public-health-alert-acknowledge",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_officer_can_resolve_acknowledged_alert(self):
        self.alert.status = "ACKNOWLEDGED"
        self.alert.acknowledged_by = self.officer
        self.alert.save()

        url = reverse(
            "public-health-alert-resolve",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.alert.refresh_from_db()

        self.assertEqual(self.alert.status, "RESOLVED")
        self.assertEqual(self.alert.resolved_by, self.officer)
        self.assertIsNotNone(self.alert.resolved_at)

    def test_officer_can_dismiss_open_alert(self):
        url = reverse(
            "public-health-alert-dismiss",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.alert.refresh_from_db()

        self.assertEqual(self.alert.status, "DISMISSED")
        self.assertIsNotNone(self.alert.dismissed_at)

    def test_resolved_alert_cannot_be_dismissed(self):
        self.alert.status = "RESOLVED"
        self.alert.save()

        url = reverse(
            "public-health-alert-dismiss",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_users_cannot_create_alerts_through_api(self):
        response = self.client.post(
            self.list_url,
            {"title": "Unauthorized manual alert"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def test_users_cannot_delete_alerts_through_api(self):
        response = self.client.delete(self.detail_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )


    def test_acknowledging_alert_creates_audit_log(self):
        url = reverse(
            "public-health-alert-acknowledge",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_log = AuditLog.objects.get(
            action=AuditLog.Action.ACKNOWLEDGE,
            object_id=str(self.alert.pk),
        )

        self.assertEqual(audit_log.actor, self.officer)
        self.assertEqual(audit_log.source, AuditLog.Source.API)
        self.assertIn("status", audit_log.changed_fields)

    def test_resolving_alert_creates_audit_log(self):
        self.alert.status = "ACKNOWLEDGED"
        self.alert.acknowledged_by = self.officer
        self.alert.save()

        url = reverse(
            "public-health-alert-resolve",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_log = AuditLog.objects.get(
            action=AuditLog.Action.RESOLVE,
            object_id=str(self.alert.pk),
        )

        self.assertEqual(audit_log.actor, self.officer)
        self.assertEqual(audit_log.source, AuditLog.Source.API)
        self.assertIn("resolved_at", audit_log.changed_fields)

    def test_dismissing_alert_creates_audit_log(self):
        url = reverse(
            "public-health-alert-dismiss",
            kwargs={"pk": self.alert.pk},
        )

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_log = AuditLog.objects.get(
            action=AuditLog.Action.DISMISS,
            object_id=str(self.alert.pk),
        )

        self.assertEqual(audit_log.actor, self.officer)
        self.assertEqual(audit_log.source, AuditLog.Source.API)
        self.assertIn("dismissed_at", audit_log.changed_fields)