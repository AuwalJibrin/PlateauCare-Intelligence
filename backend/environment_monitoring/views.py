
from django.db import transaction

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsPublicHealthOfficer

from auditlog.models import AuditLog
from auditlog.services import record_audit_event

from .models import EnvironmentalObservation
from .serializers import EnvironmentalObservationSerializer


class EnvironmentalObservationListView(
    generics.ListCreateAPIView
):
    """
    Allows authorised public-health users to view
    and submit environmental observations.
    """

    serializer_class = EnvironmentalObservationSerializer

    permission_classes = [
        IsAuthenticated,
        IsPublicHealthOfficer,
    ]

    def get_queryset(self):
        queryset = EnvironmentalObservation.objects.select_related(
            "lga"
        ).all()

        lga_id = self.request.query_params.get("lga")
        observation_date = self.request.query_params.get("date")

        if lga_id:
            queryset = queryset.filter(lga_id=lga_id)

        if observation_date:
            queryset = queryset.filter(
                observation_date=observation_date
            )

        return queryset.order_by("-observation_date")

    @transaction.atomic
    def perform_create(self, serializer):
        observation = serializer.save()

        record_audit_event(
            actor=self.request.user,
            action=AuditLog.Action.CREATE,
            instance=observation,
            changed_fields=list(serializer.validated_data.keys()),
            source=AuditLog.Source.API,
        )
