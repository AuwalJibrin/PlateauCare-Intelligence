
from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):

    list_display = (
        "timestamp",
        "actor",
        "action",
        "content_type",
        "object_id",
        "source",
    )

    list_filter = (
        "action",
        "source",
        "timestamp",
    )

    search_fields = (
        "actor__username",
        "object_id",
    )

    readonly_fields = (
        "actor",
        "action",
        "content_type",
        "object_id",
        "changed_fields",
        "source",
        "timestamp",
    )

    ordering = ("-timestamp",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "actor",
            "content_type",
        )

    # Only superusers can inspect audit records.
    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    # Audit entries cannot be manually created or modified.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    # Audit entries cannot be deleted through Django admin.
    def has_delete_permission(self, request, obj=None):
        return False
