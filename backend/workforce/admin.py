from django.contrib import admin
from .models import WorkforceHealthRecord


@admin.register(WorkforceHealthRecord)
class WorkforceHealthRecordAdmin(admin.ModelAdmin):

    list_display = (
        "organization_name",
        "lga",
        "reporting_date",
        "total_workforce",
        "sickness_absences",
        "workplace_incidents",
        "occupational_exposures",
        "heat_related_incidents",
    )

    list_filter = (
        "lga",
        "reporting_date",
    )

    search_fields = (
        "organization_name",
        "lga__name",
    )

    date_hierarchy = "reporting_date"
