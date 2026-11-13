
from datetime import date, timedelta
from pathlib import Path

import joblib

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.models import LocalGovernmentArea
from intelligence.services.daily_features import extract_lga_daily_features
from intelligence.services.anomaly_detection import score_anomaly


class Command(BaseCommand):
    help = "Test the trained PlateauCare anomaly-detection model"

    def handle(self, *args, **options):

        model_path = (
            settings.BASE_DIR
            / "intelligence"
            / "ml_models"
            / "plateaucare_isolation_forest.joblib"
        )

        if not Path(model_path).exists():
            raise CommandError(
                "Model file not found. Train the model first."
            )

        artifact = joblib.load(model_path)

        # Use the latest completed day.
        test_date = date.today() - timedelta(days=1)

        test_lgas = [
            "Jos North",
            "Jos South",
            "Barkin Ladi",
        ]

        self.stdout.write(
            self.style.SUCCESS("PLATEAUCARE AI MODEL TEST")
        )
        self.stdout.write(f"Test date: {test_date}")
        self.stdout.write(f"Algorithm: {artifact['model_name']}")
        self.stdout.write("")

        for name in test_lgas:

            try:
                lga = LocalGovernmentArea.objects.get(name=name)
            except LocalGovernmentArea.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"LGA not found: {name}")
                )
                continue

            rows = extract_lga_daily_features(
                lga.id,
                test_date,
                test_date,
            )

            if not rows:
                self.stdout.write(
                    self.style.WARNING(f"No observation found for {name}")
                )
                continue

            result = score_anomaly(rows[0], artifact)

            self.stdout.write(f"LGA: {name}")
            self.stdout.write(
                f"Anomaly percentile: {result['anomaly_percentile']}%"
            )
            self.stdout.write(
                f"Risk category: {result['risk_level']}"
            )
            self.stdout.write(
                f"Anomaly detected: {result['is_anomaly']}"
            )
            self.stdout.write("Explanation:")

            for explanation in result["explanation"]:
                self.stdout.write(f" - {explanation}")

            self.stdout.write("-" * 50)

        self.stdout.write(
            self.style.WARNING(
                "Demonstration only: these scores are not validated "
                "clinical or outbreak predictions."
            )
        )
