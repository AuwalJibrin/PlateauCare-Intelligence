
from rest_framework import serializers

from django.utils import timezone

from .models import WorkforceHealthRecord


class WorkforceHealthRecordSerializer(serializers.ModelSerializer):
    lga_name = serializers.CharField(
        source="lga.name",
        read_only=True,
    )

    class Meta:
        model = WorkforceHealthRecord

        fields = [
            "id",
            "organization_name",
            "lga",
            "lga_name",
            "reporting_date",
            "total_workforce",
            "sickness_absences",
            "workplace_incidents",
            "occupational_exposures",
            "heat_related_incidents",
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
        reporting_date = attrs.get("reporting_date")

        if reporting_date and reporting_date > timezone.localdate():
            raise serializers.ValidationError({
                "reporting_date": "Reporting date cannot be in the future."
            })

        instance = self.instance

        total = attrs.get(
            "total_workforce",
            instance.total_workforce if instance else 0,
        )

        fields_to_check = [
            "sickness_absences",
            "workplace_incidents",
            "occupational_exposures",
            "heat_related_incidents",
        ]

        for field in fields_to_check:
            value = attrs.get(
                field,
                getattr(instance, field) if instance else 0,
            )

            if value > total:
                raise serializers.ValidationError({
                    field: (
                        f"{field.replace('_', ' ').capitalize()} "
                        "cannot exceed the total workforce."
                    )
                })

        return attrs
