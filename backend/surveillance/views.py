
from django.db import transaction

from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from core.permissions import (
    IsPublicHealthOfficer,
    IsHealthFacilityReporter,
)

from auditlog.models import AuditLog
from auditlog.services import record_audit_event

from .models import Disease, DiseaseReport
from .serializers import (
    DiseaseSerializer,
    DiseaseReportSerializer,
)


class DiseaseListView(generics.ListAPIView):
    """
    Returns active diseases to authorised public-health users
    and health-facility reporters.
    """

    serializer_class = DiseaseSerializer

    permission_classes = [
        IsAuthenticated,
        IsPublicHealthOfficer | IsHealthFacilityReporter,
    ]

    def get_queryset(self):
        return Disease.objects.filter(
            is_active=True
        ).order_by("name")


class DiseaseReportListView(generics.ListCreateAPIView):
    """
    System administrators can view reports statewide.

    Public-health officers can view reports from their assigned LGA.

    Verified health-facility reporters can view and submit reports
    for their own assigned facility only.
    """

    serializer_class = DiseaseReportSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            permission_classes = [
                IsAuthenticated,
                IsHealthFacilityReporter,
            ]
        else:
            permission_classes = [
                IsAuthenticated,
                IsPublicHealthOfficer | IsHealthFacilityReporter,
            ]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        profile = self.request.user.profile

        queryset = DiseaseReport.objects.select_related(
            "disease",
            "health_facility",
            "lga",
        ).all()

        # System administrators have statewide access.
        if profile.role == "SYSTEM_ADMIN":
            pass

        # Public-health officers are restricted to their assigned LGA.
        elif profile.role == "PUBLIC_HEALTH_OFFICER":
            if profile.lga_id is None:
                return queryset.none()

            queryset = queryset.filter(
                lga_id=profile.lga_id
            )

        # Facility reporters are restricted to their assigned facility.
        elif profile.role == "HEALTH_FACILITY_REPORTER":
            facility = profile.health_facility

            if (
                facility is None
                or facility.verification_status != "VERIFIED"
                or not facility.is_active
            ):
                return queryset.none()

            queryset = queryset.filter(
                health_facility=facility
            )

        else:
            return queryset.none()

        # Optional filters are applied after access restrictions.
        lga_id = self.request.query_params.get("lga")
        disease_id = self.request.query_params.get("disease")
        report_date = self.request.query_params.get("date")
        report_status = self.request.query_params.get("status")

        if lga_id:
            queryset = queryset.filter(lga_id=lga_id)

        if disease_id:
            queryset = queryset.filter(disease_id=disease_id)

        if report_date:
            queryset = queryset.filter(
                reporting_date=report_date
            )

        if report_status:
            queryset = queryset.filter(
                status=report_status.upper()
            )

        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        profile = self.request.user.profile
        facility = profile.health_facility

        if (
            facility is None
            or facility.verification_status != "VERIFIED"
            or not facility.is_active
        ):
            raise ValidationError({
                "health_facility": (
                    "Your account must be assigned to a verified, "
                    "active health facility."
                )
            })

        # Facility and LGA are assigned by the backend,
        # never trusted from the submitted request.
        record = serializer.save(
            health_facility=facility,
            lga=facility.lga,
        )

        record_audit_event(
            actor=self.request.user,
            action=AuditLog.Action.CREATE,
            instance=record,
            changed_fields=[
                *serializer.validated_data.keys(),
                "health_facility",
                "lga",
            ],
            source=AuditLog.Source.API,
        )
