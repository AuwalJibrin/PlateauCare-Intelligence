
from django.db import models
from django.core.exceptions import ValidationError


class WorkforceHealthRecord(models.Model):

    organization_name = models.CharField(max_length=200)

    lga = models.ForeignKey(
        "core.LocalGovernmentArea",
        on_delete=models.PROTECT,
        related_name="workforce_health_records"
    )

    reporting_date = models.DateField()

    total_workforce = models.PositiveIntegerField(default=0)

    sickness_absences = models.PositiveIntegerField(default=0)

    workplace_incidents = models.PositiveIntegerField(default=0)

    occupational_exposures = models.PositiveIntegerField(default=0)

    heat_related_incidents = models.PositiveIntegerField(default=0)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-reporting_date"]

        indexes = [
            models.Index(
                fields=["lga", "reporting_date"]
            ),
        ]

    def clean(self):
        errors = {}

        # Validate workforce-related numerical values
        numerical_fields = [
            "total_workforce",
            "sickness_absences",
            "workplace_incidents",
            "occupational_exposures",
            "heat_related_incidents",
        ]

        for field in numerical_fields:
            value = getattr(self, field)

            if value is not None and value < 0:
                errors[field] = "This value cannot be negative."

        # Sickness absences cannot exceed total workforce
        if self.sickness_absences > self.total_workforce:
            errors["sickness_absences"] = (
                "Sickness absences cannot exceed the total workforce."
            )

        # Workplace incidents cannot exceed total workforce
        if self.workplace_incidents > self.total_workforce:
            errors["workplace_incidents"] = (
                "Workplace incidents cannot exceed the total workforce."
            )

        # Occupational exposures cannot exceed total workforce
        if self.occupational_exposures > self.total_workforce:
            errors["occupational_exposures"] = (
                "Occupational exposures cannot exceed the total workforce."
            )

        # Heat-related incidents cannot exceed total workforce
        if self.heat_related_incidents > self.total_workforce:
            errors["heat_related_incidents"] = (
                "Heat-related incidents cannot exceed the total workforce."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.organization_name} - {self.reporting_date}"
