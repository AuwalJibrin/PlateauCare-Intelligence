
from django.contrib import admin

from .models import (
    LocalGovernmentArea,
    HealthFacility,
    UserProfile,
)


@admin.register(LocalGovernmentArea)
class LocalGovernmentAreaAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "created_at")
    search_fields = ("name", "code")
    ordering = ("name",)


@admin.register(HealthFacility)
class HealthFacilityAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "facility_type",
        "lga",
        "verification_status",
        "is_active",
    )

    list_filter = (
        "facility_type",
        "verification_status",
        "is_active",
        "lga",
    )

    search_fields = ("name", "address", "contact_email")
    ordering = ("name",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "lga",
        "health_facility",
        "created_at",
    )

    list_filter = ("role", "lga")

    search_fields = (
        "user__username",
        "user__email",
        "health_facility__name",
        "lga__name",
    )

    # Only Django superusers can access profile management.
    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    # Validate profile assignments before saving.
    def save_model(self, request, obj, form, change):
        obj.full_clean()
        super().save_model(request, obj, form, change)
