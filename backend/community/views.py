
from django.db import transaction

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from core.permissions import (
    IsPublicHealthOfficer,
    IsCommunityReporter,
)

from auditlog.models import AuditLog
from auditlog.services import record_audit_event

from .models import CommunityHealthRecord
from .serializers import CommunityHealthRecordSerializer


class CommunityHealthRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = CommunityHealthRecordSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            permission_classes = [
                IsAuthenticated,
                IsCommunityReporter,
            ]
        else:
            permission_classes = [
                IsAuthenticated,
                IsPublicHealthOfficer | IsCommunityReporter,
            ]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        profile = self.request.user.profile

        queryset = CommunityHealthRecord.objects.select_related(
            "lga"
        ).all()

        if profile.role == "COMMUNITY_REPORTER":
            if profile.lga_id is None:
                return queryset.none()

            queryset = queryset.filter(lga_id=profile.lga_id)

        lga_id = self.request.query_params.get("lga")
        reporting_date = self.request.query_params.get("date")

        if lga_id:
            queryset = queryset.filter(lga_id=lga_id)

        if reporting_date:
            queryset = queryset.filter(
                reporting_date=reporting_date
            )

        return queryset.order_by("-reporting_date")

    @transaction.atomic
    def perform_create(self, serializer):
        profile = self.request.user.profile

        if profile.lga_id is None:
            raise ValidationError({
                "lga": "Your account has no assigned LGA."
            })

        submitted_lga = serializer.validated_data.get("lga")

        if submitted_lga != profile.lga:
            raise ValidationError({
                "lga": "You can only submit records for your assigned LGA."
            })

        record = serializer.save()

        record_audit_event(
            actor=self.request.user,
            action=AuditLog.Action.CREATE,
            instance=record,
            changed_fields=list(serializer.validated_data.keys()),
            source=AuditLog.Source.API,
        )
