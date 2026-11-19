
import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from core.models import HealthFacility
from surveillance.models import Disease, DiseaseReport
from environment_monitoring.models import EnvironmentalObservation
from workforce.models import WorkforceHealthRecord
from community.models import CommunityHealthRecord


class Command(BaseCommand):
    help = "Generate clearly labelled simulated health data for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--refresh",
            action="store_true",
            help="Refresh existing records explicitly labelled as simulated.",
        )

    def update_existing(self, record, values, is_simulated, refresh):
        """
        Update only explicitly labelled simulated records.
        Never overwrite records that are not identified as simulated.
        """
        if refresh and is_simulated:
            for field, value in values.items():
                setattr(record, field, value)

            record.save()
            return "updated"

        return "preserved"

    def handle(self, *args, **options):
        random.seed(2026)
        refresh = options["refresh"]

        facilities = list(
            HealthFacility.objects.filter(
                name__startswith="SIMULATED",
                is_active=True,
            ).select_related("lga")
        )

        diseases = list(Disease.objects.filter(is_active=True))

        if not facilities:
            raise CommandError("No active simulated health facilities found.")

        if not diseases:
            raise CommandError(
                "No active diseases found in the disease catalogue."
            )

        lgas = {
            facility.lga_id: facility.lga
            for facility in facilities
        }

        self.stdout.write("Starting simulated data generation...")

        if refresh:
            self.stdout.write(
                self.style.WARNING(
                    "REFRESH MODE: Only explicitly labelled simulated "
                    "records will be updated."
                )
            )

        counts = {
            "disease": {"created": 0, "updated": 0, "preserved": 0},
            "environment": {"created": 0, "updated": 0, "preserved": 0},
            "workforce": {"created": 0, "updated": 0, "preserved": 0},
            "community": {"created": 0, "updated": 0, "preserved": 0},
        }

        today = date.today()
        start_date = today - timedelta(days=89)

        status_choices = list(
            DiseaseReport._meta.get_field("status").choices
        )

        for day_number in range(90):
            reporting_date = start_date + timedelta(days=day_number)

            # 1. Disease surveillance records
            for facility in facilities:
                disease = random.choice(diseases)

                suspected = random.randint(2, 15)

                # Simulate a temporary increase in cases.
                if 45 <= day_number <= 65:
                    suspected += random.randint(5, 15)

                confirmed = random.randint(0, suspected)
                deaths = random.randint(0, min(1, confirmed))
                recoveries = random.randint(0, confirmed)

                status = status_choices[0][0] if status_choices else ""

                for value, label in status_choices:
                    if confirmed > 0 and "confirm" in str(label).lower():
                        status = value
                        break
                    if confirmed == 0 and "suspect" in str(label).lower():
                        status = value
                        break

                values = {
                    "lga": facility.lga,
                    "suspected_cases": suspected,
                    "confirmed_cases": confirmed,
                    "deaths": deaths,
                    "recoveries": recoveries,
                    "status": status,
                    "notes": "SIMULATED DATA - NOT A REAL HEALTH REPORT",
                }

                record, created = DiseaseReport.objects.get_or_create(
                    disease=disease,
                    health_facility=facility,
                    reporting_date=reporting_date,
                    defaults=values,
                )

                if created:
                    counts["disease"]["created"] += 1
                else:
                    result = self.update_existing(
                        record,
                        values,
                        record.notes.startswith("SIMULATED DATA"),
                        refresh,
                    )
                    counts["disease"][result] += 1

            # 2. Environmental records: one per LGA per day
            for lga in lgas.values():
                values = {
                    "rainfall_mm": round(random.uniform(0, 35), 2),
                    "temperature_celsius": round(random.uniform(20, 36), 2),
                    "humidity_percentage": round(random.uniform(35, 90), 2),
                    "air_quality_index": random.randint(20, 150),
                    "flood_occurred": (
                        random.random() < 0.08
                        or (
                            45 <= day_number <= 65
                            and random.random() < 0.25
                        )
                    ),
                    "source": "SIMULATED TEST DATA",
                    "notes": "SIMULATED ENVIRONMENTAL OBSERVATION",
                }

                record, created = (
                    EnvironmentalObservation.objects.get_or_create(
                        lga=lga,
                        observation_date=reporting_date,
                        defaults=values,
                    )
                )

                if created:
                    counts["environment"]["created"] += 1
                else:
                    is_simulated = (
                        record.source == "SIMULATED TEST DATA"
                        and record.notes == "SIMULATED ENVIRONMENTAL OBSERVATION"
                    )

                    result = self.update_existing(
                        record,
                        values,
                        is_simulated,
                        refresh,
                    )
                    counts["environment"][result] += 1

            # 3 and 4. Workforce and community records: once per week
            if day_number % 7 == 0:
                for lga in lgas.values():

                    workforce_values = {
                        "total_workforce": 250,
                        "sickness_absences": random.randint(2, 20),
                        "workplace_incidents": random.randint(0, 5),
                        "occupational_exposures": random.randint(0, 10),
                        "heat_related_incidents": random.randint(0, 4),
                        "notes": "SIMULATED WORKFORCE DATA",
                    }

                    workforce, created = (
                        WorkforceHealthRecord.objects.get_or_create(
                            organization_name="SIMULATED - Test Workforce",
                            lga=lga,
                            reporting_date=reporting_date,
                            defaults=workforce_values,
                        )
                    )

                    if created:
                        counts["workforce"]["created"] += 1
                    else:
                        is_simulated = (
                            workforce.organization_name
                            == "SIMULATED - Test Workforce"
                            and workforce.notes == "SIMULATED WORKFORCE DATA"
                        )

                        result = self.update_existing(
                            workforce,
                            workforce_values,
                            is_simulated,
                            refresh,
                        )
                        counts["workforce"][result] += 1

                    screened = random.randint(20, 100)

                    community_values = {
                        "population_covered": 1000,
                        "people_screened": screened,
                        "people_referred": random.randint(0, screened),
                        "reported_health_concerns": random.randint(0, 30),
                        "people_reached_through_awareness": random.randint(50, 500),
                        "notes": "SIMULATED COMMUNITY HEALTH DATA",
                    }

                    community, created = (
                        CommunityHealthRecord.objects.get_or_create(
                            community_name="SIMULATED - Test Community",
                            lga=lga,
                            reporting_date=reporting_date,
                            defaults=community_values,
                        )
                    )

                    if created:
                        counts["community"]["created"] += 1
                    else:
                        is_simulated = (
                            community.community_name
                            == "SIMULATED - Test Community"
                            and community.notes == "SIMULATED COMMUNITY HEALTH DATA"
                        )

                        result = self.update_existing(
                            community,
                            community_values,
                            is_simulated,
                            refresh,
                        )
                        counts["community"][result] += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS("SIMULATED DATA GENERATION COMPLETED")
        )

        for category, values in counts.items():
            self.stdout.write(
                f"{category.title()}: "
                f"Created {values['created']} | "
                f"Updated {values['updated']} | "
                f"Preserved {values['preserved']}"
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "All generated records are clearly labelled as simulated test data."
            )
        )

        if refresh:
            self.stdout.write(
                "Existing non-simulated records were not overwritten."
            )
