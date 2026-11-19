from collections import defaultdict
from datetime import timedelta

from core.models import LocalGovernmentArea
from surveillance.models import DiseaseReport
from environment_monitoring.models import EnvironmentalObservation
from workforce.models import WorkforceHealthRecord
from community.models import CommunityHealthRecord


MAX_SUPPORTING_REPORT_AGE_DAYS = 7


def extract_lga_daily_features(lga_id, start_date, end_date):
    disease_by_day = defaultdict(list)
    environment_by_day = defaultdict(list)

    # Disease reports for the requested period.
    disease_records = DiseaseReport.objects.filter(
        lga_id=lga_id,
        reporting_date__range=(start_date, end_date),
    )

    for record in disease_records:
        disease_by_day[record.reporting_date].append(record)

    # Environmental observations for the requested period.
    environment_records = EnvironmentalObservation.objects.filter(
        lga_id=lga_id,
        observation_date__range=(start_date, end_date),
    )

    for record in environment_records:
        environment_by_day[record.observation_date].append(record)

    # Latest workforce records available up to the end date.
    workforce_records = list(
        WorkforceHealthRecord.objects.filter(
            lga_id=lga_id,
            reporting_date__lte=end_date,
        ).order_by("reporting_date")
    )

    # Latest community records available up to the end date.
    community_records = list(
        CommunityHealthRecord.objects.filter(
            lga_id=lga_id,
            reporting_date__lte=end_date,
        ).order_by("reporting_date")
    )

    rows = []

    workforce_index = 0
    community_index = 0

    latest_workforce = None
    latest_community = None

    current_date = start_date

    while current_date <= end_date:

        # Update the latest workforce record.
        while (
            workforce_index < len(workforce_records)
            and workforce_records[workforce_index].reporting_date
            <= current_date
        ):
            latest_workforce = workforce_records[workforce_index]
            workforce_index += 1

        # Update the latest community record.
        while (
            community_index < len(community_records)
            and community_records[community_index].reporting_date
            <= current_date
        ):
            latest_community = community_records[community_index]
            community_index += 1

        daily_disease = disease_by_day.get(current_date, [])
        daily_environment = environment_by_day.get(current_date, [])

        # Calculate averages using available measurements only.
        def average_environment_field(field):
            values = [
                getattr(record, field)
                for record in daily_environment
                if getattr(record, field) is not None
            ]

            return sum(values) / len(values) if values else None

        # Disease indicators.
        if daily_disease:
            disease = {
                "suspected_cases": sum(
                    record.suspected_cases for record in daily_disease
                ),
                "confirmed_cases": sum(
                    record.confirmed_cases for record in daily_disease
                ),
                "deaths": sum(
                    record.deaths for record in daily_disease
                ),
                "recoveries": sum(
                    record.recoveries for record in daily_disease
                ),
            }
        else:
            disease = {
                "suspected_cases": None,
                "confirmed_cases": None,
                "deaths": None,
                "recoveries": None,
            }

        # Environmental indicators.
        environment = {
            "rainfall_mm": average_environment_field("rainfall_mm"),
            "temperature_celsius": average_environment_field(
                "temperature_celsius"
            ),
            "humidity_percentage": average_environment_field(
                "humidity_percentage"
            ),
            "air_quality_index": average_environment_field(
                "air_quality_index"
            ),
            "flood_occurrences": sum(
                1 for record in daily_environment if record.flood_occurred
            ),
            "environmental_reports_received": len(daily_environment),
        }

        # Workforce reporting freshness.
        workforce_age = (
            (current_date - latest_workforce.reporting_date).days
            if latest_workforce else None
        )

        workforce_is_current = (
            workforce_age is not None
            and workforce_age <= MAX_SUPPORTING_REPORT_AGE_DAYS
        )

        # Community reporting freshness.
        community_age = (
            (current_date - latest_community.reporting_date).days
            if latest_community else None
        )

        community_is_current = (
            community_age is not None
            and community_age <= MAX_SUPPORTING_REPORT_AGE_DAYS
        )

        row = {
            "date": current_date,

            # Disease indicators.
            **disease,
            "disease_reports_received": len(daily_disease),

            # Environmental indicators.
            **environment,

            # Workforce indicators.
            "total_workforce": (
                latest_workforce.total_workforce
                if workforce_is_current else None
            ),
            "sickness_absences": (
                latest_workforce.sickness_absences
                if workforce_is_current else None
            ),
            "workplace_incidents": (
                latest_workforce.workplace_incidents
                if workforce_is_current else None
            ),
            "occupational_exposures": (
                latest_workforce.occupational_exposures
                if workforce_is_current else None
            ),
            "heat_related_incidents": (
                latest_workforce.heat_related_incidents
                if workforce_is_current else None
            ),
            "workforce_days_since_update": workforce_age,

            # Community indicators.
            "population_covered": (
                latest_community.population_covered
                if community_is_current else None
            ),
            "people_screened": (
                latest_community.people_screened
                if community_is_current else None
            ),
            "people_referred": (
                latest_community.people_referred
                if community_is_current else None
            ),
            "reported_health_concerns": (
                latest_community.reported_health_concerns
                if community_is_current else None
            ),
            "people_reached": (
                latest_community.people_reached_through_awareness
                if community_is_current else None
            ),
            "community_days_since_update": community_age,
        }

        rows.append(row)
        current_date += timedelta(days=1)

    return rows


def extract_all_lga_daily_features(start_date, end_date):
    all_rows = []

    for lga in LocalGovernmentArea.objects.all():
        rows = extract_lga_daily_features(
            lga.id,
            start_date,
            end_date,
        )

        for row in rows:
            row["lga_id"] = lga.id
            row["lga_name"] = lga.name

        all_rows.extend(rows)

    return all_rows