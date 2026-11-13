from rest_framework import serializers

from response.models import PublicHealthAlert


class PublicHealthAlertSerializer(serializers.ModelSerializer):
    lga_name = serializers.CharField(
        source="assessment.lga.name",
        read_only=True,
    )

    assessment_date = serializers.DateField(
        source="assessment.assessment_date",
        read_only=True,
    )

    risk_level = serializers.CharField(
        source="assessment.risk_level",
        read_only=True,
    )

    risk_score = serializers.FloatField(
        source="assessment.risk_score",
        read_only=True,
    )

    contributing_factors = serializers.JSONField(
        source="assessment.contributing_factors",
        read_only=True,
    )

    explanation = serializers.CharField(
        source="assessment.explanation",
        read_only=True,
    )

    acknowledged_by_username = serializers.CharField(
        source="acknowledged_by.username",
        read_only=True,
        allow_null=True,
    )

    resolved_by_username = serializers.CharField(
        source="resolved_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = PublicHealthAlert

        fields = [
            "id",
            "title",
            "description",
            "recommended_action",
            "status",
            "lga_name",
            "assessment_date",
            "risk_level",
            "risk_score",
            "contributing_factors",
            "explanation",
            "acknowledged_by",
            "acknowledged_by_username",
            "acknowledged_at",
            "resolved_by",
            "resolved_by_username",
            "resolved_at",
            "dismissed_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields