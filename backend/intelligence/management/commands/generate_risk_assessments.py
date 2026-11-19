
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

    REQUIRED_ARTIFACT_FIELDS = {
        "pipeline",
        "features",
        "training_scores",
        "medians",
        "iqrs",
        "model_version",
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            dest="assessment_date",
            type=str,
            help="Assessment date in YYYY-MM-DD format.",
        )

    def get_existing_assessment(self, lga, assessment_date):
        """
        Retrieve an existing assessment without modifying or
        deleting its historical record.
        """
        return HealthRiskAssessment.objects.filter(
            lga=lga,
            assessment_date=assessment_date,
        ).first()

    def load_model_artifact(self):
        """
        Load and validate the trained Isolation Forest artifact.
        """
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

        if not isinstance(artifact, dict):
            raise CommandError(
                "The AI model artifact must be a dictionary."
            )

        missing_fields = (
            self.REQUIRED_ARTIFACT_FIELDS - set(artifact.keys())
        )

        if missing_fields:
            raise CommandError(
                "The model artifact is incomplete. Missing fields: "
                + ", ".join(sorted(missing_fields))
            )

        if artifact["pipeline"] is None:
            raise CommandError(
                "The trained AI model pipeline is missing."
            )

        if not artifact["features"]:
            raise CommandError(
                "The model artifact contains no feature definitions."
            )

        if not artifact["model_version"]:
            raise CommandError(
                "The model artifact has no model version."
            )

        return artifact

    def get_assessment_date(self, supplied_date):
        """
        Validate the supplied date or use today's local date.
        """
        if not supplied_date:
            return timezone.localdate()

        try:
            return date.fromisoformat(supplied_date)

        except ValueError:
            raise CommandError(
                "Invalid date. Use YYYY-MM-DD format."
            )

    def handle(self, *args, **options):

        # --------------------------------------------------
        # 1. Determine the assessment date.
        # --------------------------------------------------

        assessment_date = self.get_assessment_date(
            options.get("assessment_date")
        )

        # --------------------------------------------------
        # 2. Load the trained AI model.
        # --------------------------------------------------

        artifact = self.load_model_artifact()

        self.stdout.write(
            self.style.SUCCESS(
                f"Generating health-risk assessments for "
                f"{assessment_date}..."
            )
        )

        # --------------------------------------------------
        # 3. Initialize counters.
        # --------------------------------------------------

        lgas = LocalGovernmentArea.objects.all().order_by("name")

        total_lgas = lgas.count()

        created_count = 0
        updated_count = 0
        skipped_count = 0
        no_data_count = 0
        quality_skip_count = 0
        preserved_count = 0
        alert_count = 0

        # --------------------------------------------------
        # 4. Process each Local Government Area.
        # --------------------------------------------------

        for lga in lgas:

            self.stdout.write(
                f"\nProcessing {lga.name}..."
            )

            # ----------------------------------------------
            # 4A. Extract daily population-health features.
            # ----------------------------------------------

            try:
                rows = extract_lga_daily_features(
                    lga.id,
                    assessment_date,
                    assessment_date,
                )

            except Exception as exc:
                raise CommandError(
                    f"Feature extraction failed for "
                    f"{lga.name}: {exc}"
                )

            # ----------------------------------------------
            # 4B. Handle missing daily feature data.
            # ----------------------------------------------

            if not rows:

                skipped_count += 1
                no_data_count += 1

                existing_assessment = (
                    self.get_existing_assessment(
                        lga,
                        assessment_date,
                    )
                )

                if existing_assessment:
                    preserved_count += 1

                    preservation_message = (
                        "Existing assessment preserved."
                    )

                else:
                    preservation_message = (
                        "No previous assessment exists."
                    )

                self.stdout.write(
                    self.style.WARNING(
                        f"SKIPPED: {lga.name} | "
                        "No daily feature data available. "
                        f"{preservation_message}"
                    )
                )

                continue

            row = rows[-1]

            # ----------------------------------------------
            # 4C. Evaluate data quality.
            # ----------------------------------------------

            try:
                quality = assess_data_quality(row)

            except Exception as exc:
                raise CommandError(
                    f"Data-quality assessment failed for "
                    f"{lga.name}: {exc}"
                )

            if not quality["eligible_for_assessment"]:

                skipped_count += 1
                quality_skip_count += 1

                existing_assessment = (
                    self.get_existing_assessment(
                        lga,
                        assessment_date,
                    )
                )

                if existing_assessment:
                    preserved_count += 1

                    preservation_message = (
                        "Existing assessment preserved."
                    )

                else:
                    preservation_message = (
                        "No previous assessment exists."
                    )

                self.stdout.write(
                    self.style.WARNING(
                        f"SKIPPED: {lga.name} | "
                        f"Data completeness: "
                        f"{quality['data_completeness']}% | "
                        f"Available sources: "
                        f"{quality['available_sources']} | "
                        f"Missing sources: "
                        f"{quality['missing_sources']} | "
                        f"Stale sources: "
                        f"{quality['stale_sources']} | "
                        f"Invalid sources: "
                        f"{quality['invalid_sources']} | "
                        f"{preservation_message}"
                    )
                )

                continue

            # ----------------------------------------------
            # 4D. Calculate the anomaly score.
            # ----------------------------------------------

            try:
                result = score_anomaly(row, artifact)

            except Exception as exc:
                raise CommandError(
                    f"AI assessment failed for {lga.name}: {exc}"
                )

            # ----------------------------------------------
            # 4E. Prepare the explanation.
            # ----------------------------------------------

            explanations = result.get("explanation", [])

            if explanations is None:
                explanations = []

            if isinstance(explanations, str):
                explanations = [explanations]

            explanation_text = "\n".join(
                str(item) for item in explanations
            )

            if not explanation_text:
                explanation_text = (
                    "The AI model completed an anomaly assessment. "
                    "Further review of the source data is recommended."
                )

            # ----------------------------------------------
            # 4F. Save or update the assessment.
            # ----------------------------------------------

            try:
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

            except Exception as exc:
                raise CommandError(
                    f"Could not save the assessment for "
                    f"{lga.name}: {exc}"
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

            # ----------------------------------------------
            # 4G. Generate alerts when necessary.
            # ----------------------------------------------

            try:
                alert, alert_created = (
                    generate_alert_for_assessment(assessment)
                )

            except Exception as exc:
                raise CommandError(
                    f"Alert generation failed for "
                    f"{lga.name}: {exc}"
                )

            if alert_created:
                alert_count += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"ALERT GENERATED: {lga.name} | "
                        f"Risk: {assessment.risk_level}"
                    )
                )

        # --------------------------------------------------
        # 5. Display the assessment summary.
        # --------------------------------------------------

        self.stdout.write("\n")

        self.stdout.write(
            self.style.SUCCESS(
                "HEALTH-RISK ASSESSMENT SUMMARY"
            )
        )

        self.stdout.write(
            f"Assessment date: {assessment_date}"
        )

        self.stdout.write(
            f"Total LGAs processed: {total_lgas}"
        )

        self.stdout.write(
            f"New assessments: {created_count}"
        )

        self.stdout.write(
            f"Updated assessments: {updated_count}"
        )

        self.stdout.write(
            f"Skipped LGAs: {skipped_count}"
        )

        self.stdout.write(
            f"  - No daily data: {no_data_count}"
        )

        self.stdout.write(
            f"  - Failed data quality: {quality_skip_count}"
        )

        self.stdout.write(
            f"Existing assessments preserved: {preserved_count}"
        )

        self.stdout.write(
            f"New public-health alerts: {alert_count}"
        )

        self.stdout.write("\n")

        self.stdout.write(
            self.style.WARNING(
                "IMPORTANT: The anomaly score is not a probability "
                "of a disease outbreak. Missing or insufficient "
                "data does not cause previous assessments to be "
                "deleted. Existing assessments are retained for "
                "historical review. All assessments require "
                "appropriate public-health review and verification."
            )
        )
