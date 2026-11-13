
from rest_framework import serializers

from intelligence.models import HealthRiskAssessment


class HealthRiskAssessmentSerializer(serializers.ModelSerializer):

    lga_name = serializers.CharField(
        source="lga.name",
        read_only=True
    )

    class Meta:
        model = HealthRiskAssessment
        fields = [
            "id",
            "lga",
            "lga_name",
            "assessment_date",
            "risk_score",
            "risk_level",
            "contributing_factors",
            "explanation",
            "model_version",
            "created_at",
        ]
        read_only_fields = fields
