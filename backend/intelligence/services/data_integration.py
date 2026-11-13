from surveillance.models import DiseaseReport
from environment_monitoring.models import EnvironmentalObservation
from workforce.models import WorkforceHealthRecord
from community.models import CommunityHealthRecord


def get_lga_health_data(lga_id, start_date, end_date):
    """
    Retrieve health information from all four
    data domains for a selected LGA and date range.
    """

    disease_reports = DiseaseReport.objects.filter(
        lga_id=lga_id,
        reporting_date__range=(start_date, end_date)
    ).select_related("disease", "lga", "health_facility")

    environmental_records = EnvironmentalObservation.objects.filter(
        lga_id=lga_id,
        observation_date__range=(start_date, end_date)
    ).select_related("lga")

    workforce_records = WorkforceHealthRecord.objects.filter(
        lga_id=lga_id,
        reporting_date__range=(start_date, end_date)
    ).select_related("lga")

    community_records = CommunityHealthRecord.objects.filter(
        lga_id=lga_id,
        reporting_date__range=(start_date, end_date)
    ).select_related("lga")

    return {
        "disease_reports": disease_reports,
        "environmental_records": environmental_records,
        "workforce_records": workforce_records,
        "community_records": community_records,
    }