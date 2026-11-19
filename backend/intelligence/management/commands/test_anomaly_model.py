
from datetime import date, timedelta
from pathlib import Path

import joblib

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.models import LocalGovernmentArea

from intelligence.services.daily_features import (
    extract_lga_daily_features,
)

from intelligence.services.anomaly_detection import (
    assess_data_quality,
    score_anomaly,
)


class Command(BaseCommand):
    help = (
        "Validate data eligibility and demonstrate the "
        "trained PlateauCare anomaly-detection model."
    )

    def handle(self, *args, **options):

        model_path = (
            Path(settings.BASE_DIR)
            / "intelligence"
            / "ml_models"
            / "plateaucare_isolation_forest.joblib"
        )

        if not model_path.exists():
            raise CommandError(
                "Model file not found. Train the model first."
            )

        try:
            artifact = joblib.load(model_path)
        except Exception as exc:
            raise CommandError(
                f"Could not load the AI model: {exc}"
            )

        if (
            not isinstance(artifact, dict)
            or "pipeline" not in artifact
        ):
            raise CommandError(
                "The model artifact is invalid or incomplete."
            )

        # Use the latest completed day.
        test_date = date.today() - timedelta(days=1)

        test_lgas = [
            "Jos North",
            "Jos South",
            "Barkin Ladi",
        ]

        self.stdout.write(
            self.style.SUCCESS(
                "PLATEAUCARE AI MODEL VALIDATION"
            )
        )

        self.stdout.write(f"Test date: {test_date}")
        self.stdout.write(
            f"Algorithm: {artifact.get('model_name', 'Unknown')}"
        )
        self.stdout.write(
            f"Model version: {artifact.get('model_version', 'Unknown')}"
        )
        self.stdout.write("")

        eligible_count = 0
        rejected_count = 0
        anomaly_count = 0

        for name in test_lgas:

            try:
                lga = LocalGovernmentArea.objects.get(
                    name=name
                )
            except LocalGovernmentArea.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"LGA not found: {name}"
                    )
                )
                rejected_count += 1
                continue

            rows = extract_lga_daily_features(
                lga.id,
                test_date,
                test_date,
            )

            if not rows:
                self.stdout.write(
                    self.style.WARNING(
                        f"REJECTED: {name} | "
                        "No observation available."
                    )
                )
                rejected_count += 1
                continue

            row = rows[0]

            # Apply exactly the same data-quality rules
            # used by daily risk assessment generation.
            quality = assess_data_quality(row)

            self.stdout.write(f"LGA: {name}")
            self.stdout.write(
                f"Data completeness: "
                f"{quality['data_completeness']}%"
            )
            self.stdout.write(
                f"Available sources: "
                f"{quality['available_sources']}"
            )
            self.stdout.write(
                f"Missing sources: "
                f"{quality['missing_sources']}"
            )

            if not quality["eligible_for_assessment"]:
                self.stdout.write(
                    self.style.WARNING(
                        "RESULT: NOT ELIGIBLE FOR AI SCORING"
                    )
                )

                rejected_count += 1

                self.stdout.write(
                    "-" * 55
                )
                continue

            # Only eligible observations reach the model.
            try:
                result = score_anomaly(row, artifact)
            except Exception as exc:
                raise CommandError(
                    f"AI assessment failed for {name}: {exc}"
                )

            eligible_count += 1

            if result.get("is_anomaly"):
                anomaly_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    "RESULT: ELIGIBLE FOR AI SCORING"
                )
            )

            self.stdout.write(
                f"Anomaly percentile: "
                f"{result['anomaly_percentile']}%"
            )

            self.stdout.write(
                f"Risk category: {result['risk_level']}"
            )

            self.stdout.write(
                f"Anomaly detected: "
                f"{result['is_anomaly']}"
            )

            self.stdout.write("AI-noted indicators:")

            explanations = result.get("explanation", [])

            if explanations:
                for explanation in explanations:
                    self.stdout.write(
                        f" - {explanation}"
                    )
            else:
                self.stdout.write(
                    " - No notable deviations identified."
                )

            self.stdout.write("-" * 55)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "VALIDATION SUMMARY"
            )
        )

        self.stdout.write(
            f"Eligible LGAs: {eligible_count}"
        )
        self.stdout.write(
            f"Rejected LGAs: {rejected_count}"
        )
        self.stdout.write(
            f"Anomalies detected: {anomaly_count}"
        )

        self.stdout.write(
            self.style.WARNING(
                "IMPORTANT: This is a data-eligibility and "
                "inference demonstration. It is not a formal "
                "clinical validation or an evaluation of "
                "outbreak-prediction accuracy. All current "
                "training data is simulated."
            )
        )
