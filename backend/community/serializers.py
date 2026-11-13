
from rest_framework import serializers

from .models import CommunityHealthRecord


class CommunityHealthRecordSerializer(serializers.ModelSerializer):
    lga_name = serializers.CharField(
        source="lga.name",
        read_only=True,
    )

    class Meta:
        model = CommunityHealthRecord

        fields = [
            "id",
            "community_name",
            "lga",
            "lga_name",
            "reporting_date",
            "population_covered",
            "people_screened",
            "people_referred",
            "reported_health_concerns",
            "people_reached_through_awareness",
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

    def validate(self, attrs):
        instance = self.instance

        population = attrs.get(
            "population_covered",
            instance.population_covered if instance else 0,
        )

        screened = attrs.get(
            "people_screened",
            instance.people_screened if instance else 0,
        )

        referred = attrs.get(
            "people_referred",
            instance.people_referred if instance else 0,
        )

        reached = attrs.get(
            "people_reached_through_awareness",
            instance.people_reached_through_awareness if instance else 0,
        )

        errors = {}

        if screened > population:
            errors["people_screened"] = (
                "People screened cannot exceed the population covered."
            )

        if referred > screened:
            errors["people_referred"] = (
                "People referred cannot exceed the number of people screened."
            )

        if reached > population:
            errors["people_reached_through_awareness"] = (
                "People reached cannot exceed the population covered."
            )

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
