
from datetime import date
from pathlib import Path

import joblib

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core.models import LocalGovernmentArea
from intelligence.models import HealthRiskAssessment

from intelligence.services.daily_features import (
    extract_lga_daily_features,
)

from intelligence.services.anomaly_detection import (
    assess_data_quality,
    score_anomaly,
)

from response.services.alert_generation import (
    generate_alert_for_assessment,
)


class Command(BaseCommand):
    help = (
        "Generate daily AI health-risk assessments "
        "for Plateau State LGAs."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            dest="assessment_date",
            type=str,
            help="Assessment date in YYYY-MM-DD format.",
        )

    def withdraw_existing_assessment(self, lga, assessment_date):
        """
        Withdraw an existing assessment when its data is no
        longer eligible, but preserve assessments protected
        by an existing public-health alert.
        """

        assessments = HealthRiskAssessment.objects.filter(
            lga=lga,
            assessment_date=assessment_date,
        )

        protected_assessment = assessments.filter(
            alert__isnull=False
        ).exists()

        if protected_assessment:
            self.stdout.write(
                self.style.WARNING(
                    f"SKIPPED WITHDRAWAL: {lga.name} | "
                    "An existing public-health alert protects "
                    "this assessment."
                )
            )
            return False

        deleted_count, _ = assessments.delete()

        return deleted_count > 0

    def handle(self, *args, **options):
        # Determine the assessment date.
        supplied_date = options.get("assessment_date")

        if supplied_date:
            try:
                assessment_date = date.fromisoformat(supplied_date)
            except ValueError:
                raise CommandError(
                    "Invalid date. Use YYYY-MM-DD format."
                )
        else:
            assessment_date = timezone.localdate()

        # Locate the trained Isolation Forest model.
        model_path = (
            Path(settings.BASE_DIR)
            / "intelligence"
            / "ml_models"
            / "plateaucare_isolation_forest.joblib"
        )

        if not model_path.exists():
            raise CommandError(
                f"Trained AI model not found: {model_path}. "
                "Train the anomaly detection model first."
            )

        try:
            artifact = joblib.load(model_path)
        except Exception as exc:
            raise CommandError(
                f"Could not load the AI model: {exc}"
            )

        if not isinstance(artifact, dict) or "pipeline" not in artifact:
            raise CommandError(
                "The model artifact is invalid or incomplete."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Generating health-risk assessments for "
                f"{assessment_date}..."
            )
        )

        lgas = LocalGovernmentArea.objects.all().order_by("name")

        created_count = 0
        updated_count = 0
        skipped_count = 0
        alert_count = 0

        for lga in lgas:

            # Extract the LGA's daily population-health features.
            rows = extract_lga_daily_features(
                lga.id,
                assessment_date,
                assessment_date,
            )

            if not rows:
                self.withdraw_existing_assessment(
                    lga,
                    assessment_date,
                )

                skipped_count += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"SKIPPED: {lga.name} | "
                        "No daily feature data available."
                    )
                )
                continue

            row = rows[-1]

            # Check whether the available data is sufficient.
            quality = assess_data_quality(row)

            if not quality["eligible_for_assessment"]:
                self.withdraw_existing_assessment(
                    lga,
                    assessment_date,
                )

                skipped_count += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"SKIPPED: {lga.name} | "
                        f"Data completeness: "
                        f"{quality['data_completeness']}% | "
                        f"Available sources: "
                        f"{quality['available_sources']}"
                    )
                )
                continue

            # Calculate the anomaly score using the trained model.
            try:
                result = score_anomaly(row, artifact)
            except Exception as exc:
                raise CommandError(
                    f"AI assessment failed for {lga.name}: {exc}"
                )

            explanations = result.get("explanation", [])

            explanation_text = "\n".join(
                str(item) for item in explanations
            )

            if not explanation_text:
                explanation_text = (
                    "The AI model completed an anomaly assessment. "
                    "Further review of the source data is recommended."
                )

            # Save or update the assessment for this LGA and date.
            assessment, created = (
                HealthRiskAssessment.objects.update_or_create(
                    lga=lga,
                    assessment_date=assessment_date,
                    defaults={
                        "risk_score": result["risk_score"],
                        "risk_level": result["risk_level"],
                        "contributing_factors": explanations,
                        "explanation": explanation_text,
                        "model_version": result["model_version"],
                    },
                )
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"ASSESSED: {lga.name} | "
                    f"Risk: {assessment.risk_level} | "
                    f"Anomaly score: {assessment.risk_score}"
                )
            )

            # Generate an alert if the assessment is HIGH or CRITICAL.
            alert, alert_created = generate_alert_for_assessment(
                assessment
            )

            if alert_created:
                alert_count += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"ALERT GENERATED: {lga.name} | "
                        f"Risk: {assessment.risk_level}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "HEALTH-RISK ASSESSMENT SUMMARY"
            )
        )

        self.stdout.write(f"Assessment date: {assessment_date}")
        self.stdout.write(f"New assessments: {created_count}")
        self.stdout.write(f"Updated assessments: {updated_count}")
        self.stdout.write(f"Skipped LGAs: {skipped_count}")
        self.stdout.write(f"New public-health alerts: {alert_count}")

        self.stdout.write(
            self.style.WARNING(
                "Important: The anomaly score is not a probability "
                "of a disease outbreak. Assessments require "
                "public-health review and verification."
            )
        )
