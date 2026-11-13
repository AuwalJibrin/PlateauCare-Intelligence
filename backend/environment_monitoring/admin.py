from django.contrib import admin
from .models import EnvironmentalObservation


@admin.register(EnvironmentalObservation)
class EnvironmentalObservationAdmin(admin.ModelAdmin):

    list_display = (
        "lga",
        "observation_date",
        "rainfall_mm",
        "temperature_celsius",
        "humidity_percentage",
        "air_quality_index",
        "flood_occurred",
    )

    list_filter = (
        "lga",
        "observation_date",
        "flood_occurred",
    )

    search_fields = (
        "lga__name",
        "source",
    )

    date_hierarchy = "observation_date"