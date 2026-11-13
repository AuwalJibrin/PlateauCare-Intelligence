
from django.urls import path

from .views import (
    LocalGovernmentAreaListView,
    HealthFacilityListView,
    CurrentUserProfileView,
)

from .auth_views import (
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    LogoutView,
)


urlpatterns = [
    path(
        "lgas/",
        LocalGovernmentAreaListView.as_view(),
        name="lga-list",
    ),
    path(
        "health-facilities/",
        HealthFacilityListView.as_view(),
        name="health-facility-list",
    ),
    path(
        "me/",
        CurrentUserProfileView.as_view(),
        name="current-user-profile",
    ),
    path(
        "auth/forgot-password/",
        ForgotPasswordView.as_view(),
        name="forgot-password",
    ),
    path(
        "auth/reset-password/",
        ResetPasswordView.as_view(),
        name="reset-password",
    ),
    path(
        "auth/change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),
    path(
        "auth/logout/",
        LogoutView.as_view(),
        name="logout",
    ),
]
