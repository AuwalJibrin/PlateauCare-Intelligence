from django.contrib import admin
from .models import Disease, DiseaseReport


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)
    list_filter = ("is_active",)


@admin.register(DiseaseReport)
class DiseaseReportAdmin(admin.ModelAdmin):
    list_display = (
        "disease",
        "health_facility",
        "lga",
        "reporting_date",
        "suspected_cases",
        "confirmed_cases",
        "deaths",
        "status",
    )

    list_filter = (
        "disease",
        "lga",
        "status",
        "reporting_date",
    )

    search_fields = (
        "disease__name",
        "health_facility__name",
        "lga__name",
    )

    date_hierarchy = "reporting_date"