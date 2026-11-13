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

    def handle(self, *args, **options):
        random.seed(2026)

        facilities = HealthFacility.objects.filter(
            name__startswith="SIMULATED",
            is_active=True,
        ).select_related("lga")

        diseases = list(Disease.objects.filter(is_active=True))

        if not facilities.exists():
            raise CommandError("No active simulated health facilities found.")

        if not diseases:
            raise CommandError("No active diseases found in the disease catalogue.")

        facilities = list(facilities)

        self.stdout.write("Starting simulated data generation...")

        disease_created = 0
        environment_created = 0
        workforce_created = 0
        community_created = 0

        today = date.today()
        start_date = today - timedelta(days=89)

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

                status_field = DiseaseReport._meta.get_field("status")
                status_choices = list(status_field.choices)

                status = status_choices[0][0] if status_choices else ""

                for value, label in status_choices:
                    if confirmed > 0 and "confirm" in str(label).lower():
                        status = value
                        break
                    elif confirmed == 0 and "suspect" in str(label).lower():
                        status = value
                        break

                report, created = DiseaseReport.objects.get_or_create(
                    disease=disease,
                    health_facility=facility,
                    reporting_date=reporting_date,
                    defaults={
                        "lga": facility.lga,
                        "suspected_cases": suspected,
                        "confirmed_cases": confirmed,
                        "deaths": deaths,
                        "recoveries": recoveries,
                        "status": status,
                        "notes": "SIMULATED DATA - NOT A REAL HEALTH REPORT",
                    },
                )

                if created:
                    disease_created += 1

            # 2. Environmental records: one per LGA per day
            lgas = {facility.lga_id: facility.lga for facility in facilities}

            for lga in lgas.values():
                observation, created = EnvironmentalObservation.objects.get_or_create(
                    lga=lga,
                    observation_date=reporting_date,
                    defaults={
                        "rainfall_mm": round(random.uniform(0, 35), 2),
                        "temperature_celsius": round(random.uniform(20, 36), 2),
                        "humidity_percentage": round(random.uniform(35, 90), 2),
                        "air_quality_index": random.randint(20, 150),
                        "flood_occurred": (
                            random.random() < 0.08
                            or (45 <= day_number <= 65 and random.random() < 0.25)
                        ),
                        "source": "SIMULATED TEST DATA",
                        "notes": "SIMULATED ENVIRONMENTAL OBSERVATION",
                    },
                )

                if created:
                    environment_created += 1

            # 3 and 4. Workforce and community records: once per week
            if day_number % 7 == 0:
                for lga in lgas.values():

                    workforce, created = WorkforceHealthRecord.objects.get_or_create(
                        organization_name="SIMULATED - Test Workforce",
                        lga=lga,
                        reporting_date=reporting_date,
                        defaults={
                            "total_workforce": 250,
                            "sickness_absences": random.randint(2, 20),
                            "workplace_incidents": random.randint(0, 5),
                            "occupational_exposures": random.randint(0, 10),
                            "heat_related_incidents": random.randint(0, 4),
                            "notes": "SIMULATED WORKFORCE DATA",
                        },
                    )

                    if created:
                        workforce_created += 1

                    screened = random.randint(20, 100)

                    community, created = CommunityHealthRecord.objects.get_or_create(
                        community_name="SIMULATED - Test Community",
                        lga=lga,
                        reporting_date=reporting_date,
                        defaults={
                            "population_covered": 1000,
                            "people_screened": screened,
                            "people_referred": random.randint(0, screened),
                            "reported_health_concerns": random.randint(0, 30),
                            "people_reached_through_awareness": random.randint(50, 500),
                            "notes": "SIMULATED COMMUNITY HEALTH DATA",
                        },
                    )

                    if created:
                        community_created += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("SIMULATED DATA GENERATION COMPLETED"))
        self.stdout.write(f"Disease reports created: {disease_created}")
        self.stdout.write(f"Environmental records created: {environment_created}")
        self.stdout.write(f"Workforce records created: {workforce_created}")
        self.stdout.write(f"Community records created: {community_created}")
        self.stdout.write("All records are labelled as simulated test data.")