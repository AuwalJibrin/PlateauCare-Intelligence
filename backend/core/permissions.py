
from rest_framework.permissions import BasePermission


class HasAnyRole(BasePermission):
    """
    Base permission class for checking a user's assigned role.
    """

    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Users without an assigned profile receive no role-based access.
        profile = getattr(user, "profile", None)

        if profile is None:
            return False

        return profile.role in self.allowed_roles


class IsSystemAdmin(HasAnyRole):
    allowed_roles = ("SYSTEM_ADMIN",)


class IsPublicHealthOfficer(HasAnyRole):
    allowed_roles = (
        "SYSTEM_ADMIN",
        "PUBLIC_HEALTH_OFFICER",
    )


class IsHealthFacilityReporter(HasAnyRole):
    allowed_roles = ("HEALTH_FACILITY_REPORTER",)


class IsWorkforceReporter(HasAnyRole):
    allowed_roles = ("WORKFORCE_REPORTER",)


class IsCommunityReporter(HasAnyRole):
    allowed_roles = ("COMMUNITY_REPORTER",)
