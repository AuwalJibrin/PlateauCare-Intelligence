
from django.db import transaction
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsPublicHealthOfficer

from auditlog.models import AuditLog
from auditlog.services import record_audit_event

from response.models import PublicHealthAlert
from response.serializers import PublicHealthAlertSerializer


class PublicHealthAlertViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = PublicHealthAlertSerializer

    permission_classes = [
        IsAuthenticated,
        IsPublicHealthOfficer,
    ]

    queryset = PublicHealthAlert.objects.select_related(
        "assessment",
        "assessment__lga",
        "acknowledged_by",
        "resolved_by",
    ).all()

    def get_queryset(self):
        queryset = super().get_queryset()

        profile = self.request.user.profile

        # System administrators can access alerts across all LGAs.
        if profile.role == "SYSTEM_ADMIN":
            pass

        # Public health officers can only access their assigned LGA.
        elif profile.role == "PUBLIC_HEALTH_OFFICER":
            if profile.lga_id:
                queryset = queryset.filter(
                    assessment__lga_id=profile.lga_id
                )
            else:
                queryset = queryset.none()

        else:
            queryset = queryset.none()

        # Optional filters.
        lga = self.request.query_params.get("lga")
        alert_status = self.request.query_params.get("status")
        risk_level = self.request.query_params.get("risk_level")
        assessment_date = self.request.query_params.get("date")

        if lga:
            queryset = queryset.filter(
                assessment__lga_id=lga
            )

        if alert_status:
            queryset = queryset.filter(
                status=alert_status.upper()
            )

        if risk_level:
            queryset = queryset.filter(
                assessment__risk_level=risk_level.upper()
            )

        if assessment_date:
            queryset = queryset.filter(
                assessment__assessment_date=assessment_date
            )

        return queryset

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            IsAuthenticated,
            IsPublicHealthOfficer,
        ],
    )
    @transaction.atomic
    def acknowledge(self, request, pk=None):
        alert = self.get_object()

        if alert.status != "OPEN":
            return Response(
                {"detail": "Only OPEN alerts can be acknowledged."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()

        alert.save(
            update_fields=[
                "status",
                "acknowledged_by",
                "acknowledged_at",
                "updated_at",
            ]
        )

        record_audit_event(
            actor=request.user,
            action=AuditLog.Action.ACKNOWLEDGE,
            instance=alert,
            changed_fields=[
                "status",
                "acknowledged_by",
                "acknowledged_at",
            ],
            source=AuditLog.Source.API,
        )

        return Response(
            self.get_serializer(alert).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            IsAuthenticated,
            IsPublicHealthOfficer,
        ],
    )
    @transaction.atomic
    def resolve(self, request, pk=None):
        alert = self.get_object()

        if alert.status != "ACKNOWLEDGED":
            return Response(
                {
                    "detail": (
                        "Only ACKNOWLEDGED alerts can be resolved."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        alert.status = "RESOLVED"
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()

        alert.save(
            update_fields=[
                "status",
                "resolved_by",
                "resolved_at",
                "updated_at",
            ]
        )

        record_audit_event(
            actor=request.user,
            action=AuditLog.Action.RESOLVE,
            instance=alert,
            changed_fields=[
                "status",
                "resolved_by",
                "resolved_at",
            ],
            source=AuditLog.Source.API,
        )

        return Response(
            self.get_serializer(alert).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[
            IsAuthenticated,
            IsPublicHealthOfficer,
        ],
    )
    @transaction.atomic
    def dismiss(self, request, pk=None):
        alert = self.get_object()

        if alert.status not in {"OPEN", "ACKNOWLEDGED"}:
            return Response(
                {
                    "detail": (
                        "Only OPEN or ACKNOWLEDGED alerts "
                        "can be dismissed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        alert.status = "DISMISSED"
        alert.dismissed_at = timezone.now()

        alert.save(
            update_fields=[
                "status",
                "dismissed_at",
                "updated_at",
            ]
        )

        record_audit_event(
            actor=request.user,
            action=AuditLog.Action.DISMISS,
            instance=alert,
            changed_fields=[
                "status",
                "dismissed_at",
            ],
            source=AuditLog.Source.API,
        )

        return Response(
            self.get_serializer(alert).data,
            status=status.HTTP_200_OK,
        )
