
from django.db import models
from django.core.exceptions import ValidationError
from core.models import LocalGovernmentArea


class EnvironmentalObservation(models.Model):

    lga = models.ForeignKey(
        LocalGovernmentArea,
        on_delete=models.CASCADE,
        related_name="environmental_observations"
    )

    observation_date = models.DateField()

    rainfall_mm = models.FloatField(
        null=True,
        blank=True
    )

    temperature_celsius = models.FloatField(
        null=True,
        blank=True
    )

    humidity_percentage = models.FloatField(
        null=True,
        blank=True
    )

    air_quality_index = models.FloatField(
        null=True,
        blank=True
    )

    flood_occurred = models.BooleanField(default=False)

    source = models.CharField(
        max_length=150,
        blank=True
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-observation_date"]

        indexes = [
            models.Index(
                fields=["lga", "observation_date"]
            ),
        ]

    def clean(self):
        errors = {}

        # Rainfall cannot be negative
        if self.rainfall_mm is not None and self.rainfall_mm < 0:
            errors["rainfall_mm"] = "Rainfall cannot be negative."

        # Check reasonable temperature range
        if self.temperature_celsius is not None:
            if not -90 <= self.temperature_celsius <= 65:
                errors["temperature_celsius"] = (
                    "Temperature must be between -90 and 65 degrees Celsius."
                )

        # Humidity must be between 0 and 100
        if self.humidity_percentage is not None:
            if not 0 <= self.humidity_percentage <= 100:
                errors["humidity_percentage"] = (
                    "Humidity must be between 0 and 100 percent."
                )

        # Air Quality Index cannot be negative
        if self.air_quality_index is not None:
            if self.air_quality_index < 0:
                errors["air_quality_index"] = (
                    "Air Quality Index cannot be negative."
                )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.lga.name} - {self.observation_date}"
