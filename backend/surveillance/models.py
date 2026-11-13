
from django.db import models
from django.core.exceptions import ValidationError
from core.models import HealthFacility, LocalGovernmentArea


class Disease(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DiseaseReport(models.Model):

    class ReportStatus(models.TextChoices):
        SUSPECTED = "SUSPECTED", "Suspected"
        CONFIRMED = "CONFIRMED", "Confirmed"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"

    disease = models.ForeignKey(
        Disease,
        on_delete=models.PROTECT,
        related_name="reports",
    )

    health_facility = models.ForeignKey(
        HealthFacility,
        on_delete=models.PROTECT,
        related_name="disease_reports",
    )

    lga = models.ForeignKey(
        LocalGovernmentArea,
        on_delete=models.PROTECT,
        related_name="disease_reports",
    )

    reporting_date = models.DateField()
    suspected_cases = models.PositiveIntegerField(default=0)
    confirmed_cases = models.PositiveIntegerField(default=0)
    deaths = models.PositiveIntegerField(default=0)
    recoveries = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=20,
        choices=ReportStatus.choices,
        default=ReportStatus.SUSPECTED,
    )

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-reporting_date"]

        indexes = [
            models.Index(fields=["disease", "reporting_date"]),
            models.Index(fields=["lga", "reporting_date"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["disease", "health_facility", "reporting_date"],
                name="unique_facility_disease_report_date",
            ),
        ]

    def clean(self):
        errors = {}

        # Ensure the facility belongs to the selected LGA
        if self.health_facility_id and self.lga_id:
            facility_lga_id = self.health_facility.lga_id

            if facility_lga_id != self.lga_id:
                errors["lga"] = (
                    "The selected LGA does not match "
                    "the health facility's registered LGA."
                )

        # Validate numerical values
        numerical_fields = [
            "suspected_cases",
            "confirmed_cases",
            "deaths",
            "recoveries",
        ]

        for field in numerical_fields:
            value = getattr(self, field)

            if value is not None and value < 0:
                errors[field] = "This value cannot be negative."

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.disease.name} - {self.reporting_date}"
