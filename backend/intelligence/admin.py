from django.contrib import admin
from .models import HealthRiskAssessment


@admin.register(HealthRiskAssessment)
class HealthRiskAssessmentAdmin(admin.ModelAdmin):

    list_display = (
        "lga",
        "assessment_date",
        "risk_score",
        "risk_level",
        "model_version",
    )

    list_filter = (
        "risk_level",
        "lga",
        "assessment_date",
    )

    search_fields = (
        "lga__name",
        "explanation",
    )

    date_hierarchy = "assessment_date"

    readonly_fields = ("created_at",)