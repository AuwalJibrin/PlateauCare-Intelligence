
from django.db import models


class LocalGovernmentArea(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Local Government Area"
        verbose_name_plural = "Local Government Areas"

    def __str__(self):
        return self.name


class HealthFacility(models.Model):

    class FacilityType(models.TextChoices):
        HOSPITAL = "HOSPITAL", "Hospital"
        PRIMARY_HEALTH_CENTRE = "PHC", "Primary Health Centre"
        CLINIC = "CLINIC", "Clinic"
        LABORATORY = "LAB", "Laboratory"
        OTHER = "OTHER", "Other"

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    name = models.CharField(max_length=200)
    facility_type = models.CharField(
        max_length=20,
        choices=FacilityType.choices,
        default=FacilityType.OTHER,
    )

    lga = models.ForeignKey(
        LocalGovernmentArea,
        on_delete=models.PROTECT,
        related_name="health_facilities",
    )

    address = models.TextField(blank=True)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )

    contact_email = models.EmailField(blank=True)

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

from django.conf import settings
from django.core.exceptions import ValidationError


class UserProfile(models.Model):

    class Role(models.TextChoices):
        UNASSIGNED = "UNASSIGNED", "Unassigned"
        SYSTEM_ADMIN = "SYSTEM_ADMIN", "System Administrator"
        PUBLIC_HEALTH_OFFICER = (
            "PUBLIC_HEALTH_OFFICER",
            "Public Health Officer",
        )
        HEALTH_FACILITY_REPORTER = (
            "HEALTH_FACILITY_REPORTER",
            "Health Facility Reporter",
        )
        WORKFORCE_REPORTER = (
            "WORKFORCE_REPORTER",
            "Workforce Reporter",
        )
        COMMUNITY_REPORTER = (
            "COMMUNITY_REPORTER",
            "Community Reporter",
        )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=40,
        choices=Role.choices,
        default=Role.UNASSIGNED,
    )

    lga = models.ForeignKey(
        LocalGovernmentArea,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="user_profiles",
    )

    health_facility = models.ForeignKey(
        HealthFacility,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="user_profiles",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        errors = {}

        if self.role == self.Role.HEALTH_FACILITY_REPORTER:
            if not self.health_facility:
                errors["health_facility"] = (
                    "A health facility must be assigned to this reporter."
                )
            elif self.health_facility.verification_status != (
                HealthFacility.VerificationStatus.VERIFIED
            ) or not self.health_facility.is_active:
                errors["health_facility"] = (
                    "The assigned facility must be verified and active."
                )

        if self.role in [
            self.Role.WORKFORCE_REPORTER,
            self.Role.COMMUNITY_REPORTER,
        ] and not self.lga:
            errors["lga"] = (
                "An LGA must be assigned to this reporter."
            )

        if (
            self.health_facility
            and self.lga
            and self.health_facility.lga_id != self.lga_id
        ):
            errors["lga"] = (
                "The assigned facility must belong to the assigned LGA."
            )

        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
