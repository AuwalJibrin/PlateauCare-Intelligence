from django.db import transaction

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsPublicHealthOfficer

from auditlog.models import AuditLog
from auditlog.services import record_audit_event

from .models import EnvironmentalObservation
from .serializers import EnvironmentalObservationSerializer


class EnvironmentalObservationListView(generics.ListCreateAPIView):
    """
    System administrators have statewide access.

    Public-health officers can access observations
    belonging to their assigned LGA only.
    """

    serializer_class = EnvironmentalObservationSerializer

    permission_classes = [
        IsAuthenticated,
        IsPublicHealthOfficer,
    ]

    def get_queryset(self):
        profile = self.request.user.profile

        queryset = EnvironmentalObservation.objects.select_related(
            "lga"
        ).all()

        if profile.role == "SYSTEM_ADMIN":
            pass

        elif profile.role == "PUBLIC_HEALTH_OFFICER":
            if profile.lga_id is None:
                return queryset.none()

            queryset = queryset.filter(lga_id=profile.lga_id)

        else:
            return queryset.none()

        # Apply filters after the access restriction.
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
        profile = self.request.user.profile

        if profile.role == "PUBLIC_HEALTH_OFFICER":
            if profile.lga_id is None:
                raise ValidationError({
                    "lga": "Your account must be assigned to an LGA."
                })

            submitted_lga = serializer.validated_data.get("lga")

            if (
                submitted_lga is not None
                and submitted_lga.pk != profile.lga_id
            ):
                raise ValidationError({
                    "lga": "You can only submit observations for your assigned LGA."
                })

            observation = serializer.save(lga=profile.lga)

        elif profile.role == "SYSTEM_ADMIN":
            observation = serializer.save()

        else:
            raise ValidationError({
                "detail": "You are not authorised to submit observations."
            })

        record_audit_event(
            actor=self.request.user,
            action=AuditLog.Action.CREATE,
            instance=observation,
            changed_fields=[
                *serializer.validated_data.keys(),
                "lga",
            ],
            source=AuditLog.Source.API,
        )
