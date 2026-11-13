
from response.models import PublicHealthAlert


def generate_alert_for_assessment(assessment):
    """
    Generate a public-health alert for HIGH or CRITICAL
    health-risk assessments.

    LOW and MODERATE assessments do not generate alerts.
    Existing alerts are preserved without changing their status.
    """

    if assessment.risk_level not in {"HIGH", "CRITICAL"}:
        return None, False

    lga_name = assessment.lga.name
    risk_level = assessment.risk_level

    title = (
        f"{risk_level.title()} health risk detected in {lga_name}"
    )

    description = (
        f"The PlateauCare Intelligence system identified a "
        f"{risk_level.lower()} health-risk assessment for "
        f"{lga_name} on {assessment.assessment_date}. "
        f"The anomaly score is {assessment.risk_score:.4f}. "
        f"This score is not a probability of an outbreak.\n\n"
        f"Assessment explanation:\n{assessment.explanation}\n\n"
        f"Contributing factors:\n"
        f"{assessment.contributing_factors}"
    )

    if risk_level == "CRITICAL":
        recommended_action = (
            "URGENT REVIEW: Escalate this assessment to the "
            "responsible public-health surveillance team. "
            "Verify the source reports with relevant health "
            "facilities and assess whether an immediate field "
            "investigation or response is warranted."
        )
    else:
        recommended_action = (
            "PRIORITY REVIEW: Request review by the relevant "
            "LGA surveillance team. Verify the reported indicators "
            "with submitting health facilities and determine "
            "whether further investigation is necessary."
        )

    alert, created = PublicHealthAlert.objects.get_or_create(
        assessment=assessment,
        defaults={
            "title": title,
            "description": description,
            "recommended_action": recommended_action,
        },
    )

    return alert, created
