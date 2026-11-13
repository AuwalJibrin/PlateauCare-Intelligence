from intelligence.services.data_integration import get_lga_health_data


def extract_lga_features(lga_id, start_date, end_date):
    """
    Convert records from all four health domains
    into numerical features for machine learning.
    """

    records = get_lga_health_data(
        lga_id,
        start_date,
        end_date
    )

    disease_reports = records["disease_reports"]
    environmental_records = records["environmental_records"]
    workforce_records = records["workforce_records"]
    community_records = records["community_records"]

    features = {
        # Disease surveillance
        "total_suspected_cases": sum(
            report.suspected_cases for report in disease_reports
        ),

        "total_confirmed_cases": sum(
            report.confirmed_cases for report in disease_reports
        ),

        "total_deaths": sum(
            report.deaths for report in disease_reports
        ),

        # Environmental monitoring
        "average_rainfall": _average(
            [record.rainfall_mm for record in environmental_records]
        ),

        "average_temperature": _average(
            [record.temperature_celsius for record in environmental_records]
        ),

        "average_humidity": _average(
            [record.humidity_percentage for record in environmental_records]
        ),

        "average_air_quality": _average(
            [record.air_quality_index for record in environmental_records]
        ),

        "flood_occurrences": sum(
            record.flood_occurred for record in environmental_records
        ),

        # Workforce health
        "total_workforce": sum(
            record.total_workforce for record in workforce_records
        ),

        "total_sickness_absences": sum(
            record.sickness_absences for record in workforce_records
        ),

        "total_workplace_incidents": sum(
            record.workplace_incidents for record in workforce_records
        ),

        "total_occupational_exposures": sum(
            record.occupational_exposures for record in workforce_records
        ),

        "total_heat_related_incidents": sum(
            record.heat_related_incidents for record in workforce_records
        ),

        # Community health
        "total_population_covered": sum(
            record.population_covered for record in community_records
        ),

        "total_people_screened": sum(
            record.people_screened for record in community_records
        ),

        "total_people_referred": sum(
            record.people_referred for record in community_records
        ),

        "total_health_concerns": sum(
            record.reported_health_concerns for record in community_records
        ),

        "total_people_reached": sum(
            record.people_reached_through_awareness
            for record in community_records
        ),
    }

    return features


def _average(values):
    valid_values = [
        value for value in values
        if value is not None
    ]

    if not valid_values:
        return None

    return sum(valid_values) / len(valid_values)