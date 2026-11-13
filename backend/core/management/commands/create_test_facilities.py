
from django.core.management.base import BaseCommand
from core.models import LocalGovernmentArea, HealthFacility


class Command(BaseCommand):
    help = "Create clearly labelled simulated health facilities for testing"

    def handle(self, *args, **options):
        facilities = [
            {
                "name": "SIMULATED - Jos North Test Health Centre",
                "lga": "Jos North",
            },
            {
                "name": "SIMULATED - Jos South Test Health Centre",
                "lga": "Jos South",
            },
            {
                "name": "SIMULATED - Barkin Ladi Test Health Centre",
                "lga": "Barkin Ladi",
            },
        ]

        for item in facilities:
            lga = LocalGovernmentArea.objects.get(name=item["lga"])

            facility, created = HealthFacility.objects.get_or_create(
                name=item["name"],
                lga=lga,
                defaults={
                    "facility_type": HealthFacility.FacilityType.PRIMARY_HEALTH_CENTRE,
                    "verification_status": HealthFacility.VerificationStatus.VERIFIED,
                    "is_active": True,
                    "address": "SIMULATED TEST FACILITY - NOT A REAL HEALTH CENTRE",
                },
            )

            action = "Created" if created else "Already exists"

            self.stdout.write(
                self.style.SUCCESS(
                    f"{action}: {facility.name}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS("Simulated facility setup completed.")
        )
