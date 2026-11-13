from rest_framework.views import APIView
from rest_framework.response import Response

from .serializers import CurrentUserProfileSerializer
from rest_framework import generics

from rest_framework.permissions import IsAuthenticated

from .models import LocalGovernmentArea, HealthFacility
from .permissions import (
    IsPublicHealthOfficer,
    IsHealthFacilityReporter,
    IsWorkforceReporter,
    IsCommunityReporter,
)
from .serializers import (
    LocalGovernmentAreaSerializer,
    HealthFacilitySerializer,
)


class LocalGovernmentAreaListView(generics.ListAPIView):
    """
    Returns LGAs to users with an assigned authorised role.
    """

    queryset = LocalGovernmentArea.objects.all().order_by("name")
    serializer_class = LocalGovernmentAreaSerializer

    permission_classes = [
        IsAuthenticated,
        (
            IsPublicHealthOfficer
            | IsHealthFacilityReporter
            | IsWorkforceReporter
            | IsCommunityReporter
        ),
    ]


class HealthFacilityListView(generics.ListAPIView):
    """
    Public-health officers can view all facilities.
    Facility reporters can only view their assigned facility.
    """

    serializer_class = HealthFacilitySerializer

    permission_classes = [
        IsAuthenticated,
        IsPublicHealthOfficer | IsHealthFacilityReporter,
    ]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile

        queryset = HealthFacility.objects.select_related("lga").all()

        if profile.role == "HEALTH_FACILITY_REPORTER":
            facility = profile.health_facility

            if (
                facility is None
                or facility.verification_status != "VERIFIED"
                or not facility.is_active
            ):
                return queryset.none()

            queryset = queryset.filter(pk=facility.pk)

        lga_id = self.request.query_params.get("lga")

        if lga_id:
            queryset = queryset.filter(lga_id=lga_id)

        verification_status = self.request.query_params.get(
            "verification_status"
        )

        if verification_status:
            queryset = queryset.filter(
                verification_status=verification_status.upper()
            )

        return queryset.order_by("name")




class CurrentUserProfileView(APIView):
    """
    Returns the authenticated user's account and assigned role.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "profile", None)

        if profile is None:
            return Response(
                {
                    "detail": (
                        "Your account has no assigned profile. "
                        "Contact the system administrator."
                    )
                },
                status=403,
            )

        serializer = CurrentUserProfileSerializer(profile)

        return Response(serializer.data)
