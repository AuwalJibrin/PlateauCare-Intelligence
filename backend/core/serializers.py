
from rest_framework import serializers
from .models import LocalGovernmentArea, HealthFacility


class LocalGovernmentAreaSerializer(serializers.ModelSerializer):
    health_facility_count = serializers.IntegerField(
        source="health_facilities.count",
        read_only=True
    )

    class Meta:
        model = LocalGovernmentArea
        fields = [
            "id",
            "name",
            "code",
            "health_facility_count",
            "created_at",
        ]


class HealthFacilitySerializer(serializers.ModelSerializer):
    lga_name = serializers.CharField(
        source="lga.name",
        read_only=True
    )

    class Meta:
        model = HealthFacility
        fields = [
            "id",
            "name",
            "facility_type",
            "lga",
            "lga_name",
            "address",
            "latitude",
            "longitude",
            "contact_email",
            "verification_status",
            "is_active",
            "created_at",
        ]



class CurrentUserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="user.id")
    username = serializers.CharField(source="user.username")
    email = serializers.EmailField(source="user.email", allow_blank=True)
    first_name = serializers.CharField(source="user.first_name", allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", allow_blank=True)
    is_active = serializers.BooleanField(source="user.is_active")

    role = serializers.CharField()
    role_display = serializers.CharField(source="get_role_display")

    lga_id = serializers.IntegerField(allow_null=True)
    lga_name = serializers.CharField(
        source="lga.name",
        allow_null=True,
    )

    health_facility_id = serializers.IntegerField(allow_null=True)
    health_facility_name = serializers.CharField(
        source="health_facility.name",
        allow_null=True,
    )
    facility_verification_status = serializers.CharField(
        source="health_facility.verification_status",
        allow_null=True,
    )
