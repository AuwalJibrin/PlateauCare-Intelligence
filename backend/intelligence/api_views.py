
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsPublicHealthOfficer

from intelligence.models import HealthRiskAssessment
from intelligence.serializers import HealthRiskAssessmentSerializer


class HealthRiskAssessmentListAPIView(generics.ListAPIView):

    serializer_class = HealthRiskAssessmentSerializer

    permission_classes = [
        IsAuthenticated,
        IsPublicHealthOfficer,
    ]

    def get_queryset(self):
        queryset = (
            HealthRiskAssessment.objects
            .select_related("lga")
            .order_by("-assessment_date", "lga__name")
        )

        lga_id = self.request.query_params.get("lga")
        assessment_date = self.request.query_params.get("date")

        if lga_id:
            queryset = queryset.filter(lga_id=lga_id)

        if assessment_date:
            queryset = queryset.filter(
                assessment_date=assessment_date
            )

        return queryset
