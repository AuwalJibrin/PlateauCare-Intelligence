
from rest_framework import serializers

from django.utils import timezone

from .models import Disease, DiseaseReport


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields


class DiseaseReportSerializer(serializers.ModelSerializer):
    disease_name = serializers.CharField(
        source="disease.name",
        read_only=True,
    )

    health_facility_name = serializers.CharField(
        source="health_facility.name",
        read_only=True,
    )

    lga_name = serializers.CharField(
        source="lga.name",
        read_only=True,
    )

    class Meta:
        model = DiseaseReport

        fields = [
            "id",
            "disease",
            "disease_name",
            "health_facility",
            "health_facility_name",
            "lga",
            "lga_name",
            "reporting_date",
            "suspected_cases",
            "confirmed_cases",
            "deaths",
            "recoveries",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "health_facility",
            "health_facility_name",
            "lga",
            "lga_name",
            "created_at",
            "updated_at",
        ]

        # Duplicate submissions are checked in validate().
        validators = []

    def validate(self, attrs):
        reporting_date = attrs.get("reporting_date")

        if reporting_date and reporting_date > timezone.localdate():
            raise serializers.ValidationError({
                "reporting_date": "Reporting date cannot be in the future."
            })

        numerical_fields = [
            "suspected_cases",
            "confirmed_cases",
            "deaths",
            "recoveries",
        ]

        # Reject negative case counts
        for field in numerical_fields:
            value = attrs.get(field, 0)

            if value is not None and value < 0:
                raise serializers.ValidationError({
                    field: "This value cannot be negative."
                })

        # Validate deaths and recoveries against confirmed cases
        confirmed_cases = attrs.get("confirmed_cases", 0)
        deaths = attrs.get("deaths", 0)
        recoveries = attrs.get("recoveries", 0)

        if deaths > confirmed_cases:
            raise serializers.ValidationError({
                "deaths": (
                    "Deaths cannot exceed confirmed cases."
                )
            })

        if recoveries > confirmed_cases:
            raise serializers.ValidationError({
                "recoveries": (
                    "Recoveries cannot exceed confirmed cases."
                )
            })

        # Check for duplicate disease reports
        request = self.context.get("request")

        if request and request.method == "POST":
            profile = request.user.profile
            facility = profile.health_facility

            disease = attrs.get("disease")
            reporting_date = attrs.get("reporting_date")

            if disease and reporting_date and facility:
                duplicate = DiseaseReport.objects.filter(
                    disease=disease,
                    health_facility=facility,
                    reporting_date=reporting_date,
                ).exists()

                if duplicate:
                    raise serializers.ValidationError({
                        "reporting_date": (
                            "A report for this disease, facility "
                            "and date already exists."
                        )
                    })

        return attrs
