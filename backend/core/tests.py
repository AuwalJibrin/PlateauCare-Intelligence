from django.core import mail
from urllib.parse import urlparse, parse_qs
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from .models import LocalGovernmentArea, HealthFacility, UserProfile

from .permissions import (
    IsSystemAdmin,
    IsPublicHealthOfficer,
    IsHealthFacilityReporter,
    IsWorkforceReporter,
    IsCommunityReporter,
)


User = get_user_model()


class CoreAPITestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="core_test_user",
            password="TestPassword123!"
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.lga = LocalGovernmentArea.objects.create(
            name="Jos North",
            code="JOS-N"
        )

        self.second_lga = LocalGovernmentArea.objects.create(
            name="Jos South",
            code="JOS-S"
        )

        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
            lga=self.lga,
        )

        self.facility = HealthFacility.objects.create(
            name="Test Health Centre",
            facility_type="PHC",
            lga=self.lga,
            verification_status="VERIFIED",
            is_active=True
        )

        self.second_facility = HealthFacility.objects.create(
            name="Second Health Centre",
            facility_type="PHC",
            lga=self.second_lga,
            verification_status="VERIFIED",
            is_active=True
        )

    def create_reporter_client(self, username, role):
        reporter = User.objects.create_user(
            username=username,
            password="TestPassword123!"
        )

        UserProfile.objects.create(
            user=reporter,
            role=role,
            lga=self.lga,
            health_facility=(
                self.facility
                if role == UserProfile.Role.HEALTH_FACILITY_REPORTER
                else None
            ),
        )

        token = Token.objects.create(user=reporter)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        return client

    def test_authenticated_user_can_list_lgas(self):
        response = self.client.get(reverse("lga-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_authenticated_user_can_list_health_facilities(self):
        response = self.client.get(
            reverse("health-facility-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.lga.id)

    def test_health_facilities_can_be_filtered_by_lga(self):
        response = self.client.get(
            reverse("health-facility-list"),
            {"lga": self.lga.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["lga"], self.lga.id)

    def test_health_facilities_can_be_filtered_by_verification(self):
        response = self.client.get(
            reverse("health-facility-list"),
            {"verification_status": "VERIFIED"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_unauthenticated_user_cannot_access_lgas(self):
        self.client.credentials()

        response = self.client.get(reverse("lga-list"))

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN
            ]
        )

    def test_public_health_officer_cannot_bypass_lga_scope_with_filter(self):
        response = self.client.get(
            reverse("health-facility-list"),
            {"lga": self.second_lga.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_public_health_officer_without_lga_sees_no_facilities(self):
        user = User.objects.create_user(
            username="unassigned_health_officer",
            password="TestPassword123!",
        )
        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get(reverse("health-facility-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_system_admin_can_view_facilities_across_lgas(self):
        client = self.create_reporter_client(
            "core_system_admin",
            UserProfile.Role.SYSTEM_ADMIN,
        )

        response = client.get(reverse("health-facility-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_facility_reporter_only_sees_assigned_facility(self):
        client = self.create_reporter_client(
            "facility_reporter",
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
        )

        response = client.get(
            reverse("health-facility-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            self.facility.id
        )

    def test_facility_reporter_cannot_view_another_lga_facilities(self):
        client = self.create_reporter_client(
            "facility_reporter_two",
            UserProfile.Role.HEALTH_FACILITY_REPORTER,
        )

        response = client.get(
            reverse("health-facility-list"),
            {"lga": self.second_lga.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_workforce_reporter_cannot_access_facility_directory(self):
        client = self.create_reporter_client(
            "workforce_reporter",
            UserProfile.Role.WORKFORCE_REPORTER,
        )

        response = client.get(
            reverse("health-facility-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_community_reporter_cannot_access_facility_directory(self):
        client = self.create_reporter_client(
            "community_reporter",
            UserProfile.Role.COMMUNITY_REPORTER,
        )

        response = client.get(
            reverse("health-facility-list")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )

    def test_user_without_profile_cannot_access_lgas(self):
        ordinary_user = User.objects.create_user(
            username="unassigned_core_user",
            password="TestPassword123!"
        )

        token = Token.objects.create(user=ordinary_user)

        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = client.get(reverse("lga-list"))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN
        )


class RolePermissionTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="role_test_user",
            password="TestPassword123!",
        )

        self.request = SimpleNamespace(user=self.user)

    def assign_role(self, role):
        UserProfile.objects.create(
            user=self.user,
            role=role,
        )

    def test_system_admin_permission(self):
        self.assign_role(UserProfile.Role.SYSTEM_ADMIN)

        permission = IsSystemAdmin()
        self.assertTrue(
            permission.has_permission(self.request, None)
        )

    def test_public_health_officer_permission(self):
        self.assign_role(UserProfile.Role.PUBLIC_HEALTH_OFFICER)

        permission = IsPublicHealthOfficer()
        self.assertTrue(
            permission.has_permission(self.request, None)
        )

    def test_system_admin_can_access_public_health_permissions(self):
        self.assign_role(UserProfile.Role.SYSTEM_ADMIN)

        permission = IsPublicHealthOfficer()
        self.assertTrue(
            permission.has_permission(self.request, None)
        )

    def test_health_facility_reporter_permission(self):
        self.assign_role(UserProfile.Role.HEALTH_FACILITY_REPORTER)

        permission = IsHealthFacilityReporter()
        self.assertTrue(
            permission.has_permission(self.request, None)
        )

    def test_workforce_reporter_permission(self):
        self.assign_role(UserProfile.Role.WORKFORCE_REPORTER)

        permission = IsWorkforceReporter()
        self.assertTrue(
            permission.has_permission(self.request, None)
        )

    def test_community_reporter_permission(self):
        self.assign_role(UserProfile.Role.COMMUNITY_REPORTER)

        permission = IsCommunityReporter()
        self.assertTrue(
            permission.has_permission(self.request, None)
        )

    def test_user_without_profile_is_denied(self):
        permission = IsSystemAdmin()

        self.assertFalse(
            permission.has_permission(self.request, None)
        )

    def test_wrong_role_is_denied(self):
        self.assign_role(UserProfile.Role.WORKFORCE_REPORTER)

        permission = IsSystemAdmin()

        self.assertFalse(
            permission.has_permission(self.request, None)
        )



from django.contrib import admin
from django.test import RequestFactory


class UserProfileAdminPermissionTests(APITestCase):

    def setUp(self):
        self.factory = RequestFactory()

        self.profile_admin = admin.site._registry[UserProfile]

        self.superuser = User.objects.create_superuser(
            username="admin_test_user",
            email="admin_test@example.com",
            password="TestPassword123!",
        )

        self.staff_user = User.objects.create_user(
            username="ordinary_staff",
            password="TestPassword123!",
            is_staff=True,
        )

    def test_superuser_can_manage_profiles(self):
        request = self.factory.get("/admin/")
        request.user = self.superuser

        self.assertTrue(
            self.profile_admin.has_module_permission(request)
        )
        self.assertTrue(
            self.profile_admin.has_view_permission(request)
        )
        self.assertTrue(
            self.profile_admin.has_add_permission(request)
        )
        self.assertTrue(
            self.profile_admin.has_change_permission(request)
        )
        self.assertTrue(
            self.profile_admin.has_delete_permission(request)
        )

    def test_ordinary_staff_cannot_manage_profiles(self):
        request = self.factory.get("/admin/")
        request.user = self.staff_user

        self.assertFalse(
            self.profile_admin.has_module_permission(request)
        )
        self.assertFalse(
            self.profile_admin.has_view_permission(request)
        )
        self.assertFalse(
            self.profile_admin.has_add_permission(request)
        )
        self.assertFalse(
            self.profile_admin.has_change_permission(request)
        )
        self.assertFalse(
            self.profile_admin.has_delete_permission(request)
        )




class CurrentUserProfileAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="profile_api_user",
            email="profile@example.com",
            first_name="Test",
            last_name="Officer",
            password="TestPassword123!",
        )

        self.lga = LocalGovernmentArea.objects.create(
            name="Profile Test LGA",
            code="PROFILE-LGA",
        )

        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
            lga=self.lga,
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

    def test_authenticated_user_can_view_own_profile(self):
        response = self.client.get(
            reverse("current-user-profile")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "profile_api_user")
        self.assertEqual(
            response.data["role"],
            "PUBLIC_HEALTH_OFFICER",
        )
        self.assertEqual(response.data["lga_name"], "Profile Test LGA")
        self.assertIsNone(response.data["health_facility_id"])

    def test_unauthenticated_user_cannot_view_profile(self):
        self.client.credentials()

        response = self.client.get(
            reverse("current-user-profile")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_user_without_profile_receives_clear_error(self):
        user_without_profile = User.objects.create_user(
            username="no_profile_user",
            password="TestPassword123!",
        )

        token = Token.objects.create(user=user_without_profile)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {token.key}"
        )

        response = self.client.get(
            reverse("current-user-profile")
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("no assigned profile", response.data["detail"])



class AuthenticationAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="auth_test_user",
            email="auth_test@example.com",
            password="OriginalPassword123!",
        )

        UserProfile.objects.create(
            user=self.user,
            role=UserProfile.Role.PUBLIC_HEALTH_OFFICER,
        )

        self.token = Token.objects.create(user=self.user)

    def test_forgot_password_sends_reset_email(self):
        response = self.client.post(
            "/api/core/auth/forgot-password/",
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset-password", mail.outbox[0].body)

    def test_unknown_email_gets_generic_response(self):
        response = self.client.post(
            "/api/core/auth/forgot-password/",
            {"email": "unknown@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_reset_password_changes_password_and_invalidates_token(self):
        self.client.post(
            "/api/core/auth/forgot-password/",
            {"email": self.user.email},
            format="json",
        )

        reset_link = mail.outbox[0].body.splitlines()
        reset_link = next(
            line for line in reset_link
            if "reset-password?" in line
        )

        parsed_url = urlparse(reset_link)
        query = parse_qs(parsed_url.query)

        response = self.client.post(
            "/api/core/auth/reset-password/",
            {
                "uid": query["uid"][0],
                "token": query["token"][0],
                "new_password": "Different!Password928",
                "confirm_password": "Different!Password928",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()

        self.assertTrue(
            self.user.check_password("Different!Password928")
        )

        self.assertFalse(
            Token.objects.filter(user=self.user).exists()
        )

    def test_invalid_reset_token_is_rejected(self):
        response = self.client.post(
            "/api/core/auth/reset-password/",
            {
                "uid": "MQ",
                "token": "invalid-token",
                "new_password": "Different!Password928",
                "confirm_password": "Different!Password928",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_change_password_replaces_old_token(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        response = self.client.post(
            "/api/core/auth/change-password/",
            {
                "old_password": "OriginalPassword123!",
                "new_password": "Different!Password928",
                "confirm_password": "Different!Password928",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

        self.assertFalse(
            Token.objects.filter(key=self.token.key).exists()
        )

        self.assertTrue(
            Token.objects.filter(
                key=response.data["token"],
                user=self.user,
            ).exists()
        )

    def test_logout_invalidates_current_token(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        response = self.client.post(
            "/api/core/auth/logout/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(
            Token.objects.filter(user=self.user).exists()
        )
