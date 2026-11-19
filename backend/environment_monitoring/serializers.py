from rest_framework import serializers
from django.utils import timezone

from .models import EnvironmentalObservation


class EnvironmentalObservationSerializer(serializers.ModelSerializer):
    lga_name = serializers.CharField(
        source="lga.name",
        read_only=True
    )

    class Meta:
        model = EnvironmentalObservation
        fields = [
            "id",
            "lga",
            "lga_name",
            "observation_date",
            "rainfall_mm",
            "temperature_celsius",
            "humidity_percentage",
            "air_quality_index",
            "flood_occurred",
            "source",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "lga_name",
            "created_at",
            "updated_at",
        ]

    def validate_observation_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError(
                "Observation date cannot be in the future."
            )
        return value

    def validate_rainfall_mm(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Rainfall cannot be negative."
            )
        return value

    def validate_temperature_celsius(self, value):
        if value is not None and not -90 <= value <= 65:
            raise serializers.ValidationError(
                "Temperature must be between -90 and 65 degrees Celsius."
            )
        return value

    def validate_humidity_percentage(self, value):
        if value is not None and not 0 <= value <= 100:
            raise serializers.ValidationError(
                "Humidity must be between 0 and 100 percent."
            )
        return value

    def validate_air_quality_index(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Air Quality Index cannot be negative."
            )
        return value
