
from django.core.management.base import BaseCommand, CommandError
from core.models import LocalGovernmentArea, HealthFacility


class Command(BaseCommand):
    help = "Create clearly labelled simulated health facilities for all Plateau State LGAs"

    def handle(self, *args, **options):
        lgas = LocalGovernmentArea.objects.all().order_by("name")

        if not lgas.exists():
            raise CommandError(
                "No LGAs found. Create the LGA records before running this command."
            )

        created_count = 0
        existing_count = 0

        for lga in lgas:
            facility_name = (
                f"SIMULATED - {lga.name} Test Health Centre"
            )

            facility, created = HealthFacility.objects.get_or_create(
                name=facility_name,
                lga=lga,
                defaults={
                    "facility_type": (
                        HealthFacility.FacilityType.PRIMARY_HEALTH_CENTRE
                    ),
                    "verification_status": (
                        HealthFacility.VerificationStatus.VERIFIED
                    ),
                    "is_active": True,
                    "address": (
                        "SIMULATED TEST FACILITY - NOT A REAL HEALTH CENTRE"
                    ),
                },
            )

            if created:
                created_count += 1
                action = "Created"
            else:
                existing_count += 1
                action = "Already exists"

            self.stdout.write(
                self.style.SUCCESS(
                    f"{action}: {facility.name}"
                )
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Setup completed. Created: {created_count} | "
                f"Already existed: {existing_count} | "
                f"Total LGAs: {lgas.count()}"
            )
        )
