from django.contrib import admin
from .models import CommunityHealthRecord


@admin.register(CommunityHealthRecord)
class CommunityHealthRecordAdmin(admin.ModelAdmin):

    list_display = (
        "community_name",
        "lga",
        "reporting_date",
        "population_covered",
        "people_screened",
        "people_referred",
        "reported_health_concerns",
        "people_reached_through_awareness",
    )

    list_filter = (
        "lga",
        "reporting_date",
    )

    search_fields = (
        "community_name",
        "lga__name",
    )

    date_hierarchy = "reporting_date"