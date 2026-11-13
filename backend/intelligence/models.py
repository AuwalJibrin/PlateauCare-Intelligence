from django.db import models


class HealthRiskAssessment(models.Model):

    RISK_LEVELS = [
        ("LOW", "Low"),
        ("MODERATE", "Moderate"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    lga = models.ForeignKey(
        "core.LocalGovernmentArea",
        on_delete=models.PROTECT,
        related_name="risk_assessments"
    )

    assessment_date = models.DateField()

    risk_score = models.FloatField(default=0.0)

    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVELS,
        default="LOW"
    )

    contributing_factors = models.JSONField(default=dict, blank=True)

    explanation = models.TextField(blank=True)

    model_version = models.CharField(
        max_length=100,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assessment_date"]
        indexes = [
            models.Index(fields=["lga", "assessment_date"]),
        ]

    def __str__(self):
        return f"{self.lga.name} - {self.risk_level}"