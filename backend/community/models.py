
from django.db import models
from django.core.exceptions import ValidationError


class CommunityHealthRecord(models.Model):

    community_name = models.CharField(max_length=200)

    lga = models.ForeignKey(
        "core.LocalGovernmentArea",
        on_delete=models.PROTECT,
        related_name="community_health_records"
    )

    reporting_date = models.DateField()

    population_covered = models.PositiveIntegerField(default=0)

    people_screened = models.PositiveIntegerField(default=0)

    people_referred = models.PositiveIntegerField(default=0)

    reported_health_concerns = models.PositiveIntegerField(default=0)

    people_reached_through_awareness = models.PositiveIntegerField(default=0)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-reporting_date"]

        indexes = [
            models.Index(fields=["lga", "reporting_date"]),
        ]

    def clean(self):
        errors = {}

        # Validate numerical values
        numerical_fields = [
            "population_covered",
            "people_screened",
            "people_referred",
            "reported_health_concerns",
            "people_reached_through_awareness",
        ]

        for field in numerical_fields:
            value = getattr(self, field)

            if value is not None and value < 0:
                errors[field] = "This value cannot be negative."

        # People screened cannot exceed population covered
        if self.people_screened > self.population_covered:
            errors["people_screened"] = (
                "People screened cannot exceed the population covered."
            )

        # People referred cannot exceed people screened
        if self.people_referred > self.people_screened:
            errors["people_referred"] = (
                "People referred cannot exceed the number of people screened."
            )

        # People reached through awareness cannot exceed population covered
        if (
            self.people_reached_through_awareness
            > self.population_covered
        ):
            errors["people_reached_through_awareness"] = (
                "People reached cannot exceed the population covered."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.community_name} - {self.reporting_date}"
