

from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from intelligence.services.daily_features import extract_all_lga_daily_features
from intelligence.services.anomaly_detection import train_anomaly_model


class Command(BaseCommand):
    help = "Train the PlateauCare simulated anomaly-detection model"

    def handle(self, *args, **options):

        end_date = date.today() - timedelta(days=1)
        start_date = end_date - timedelta(days=89)

        self.stdout.write(
            f"Preparing data from {start_date} to {end_date}..."
        )

        all_rows = extract_all_lga_daily_features(
            start_date,
            end_date,
        )

        # Only include LGAs with actual simulated disease and
        # environmental observations.
        rows = [
            row for row in all_rows
            if (
                row["disease_reports_received"] > 0
                or row["environmental_reports_received"] > 0
            )
        ]

        lga_count = len(set(row["lga_id"] for row in rows))

        if len(rows) < 20 or lga_count < 2:
            raise CommandError(
                "Insufficient reported data for model training."
            )

        model_path = (
            settings.BASE_DIR
            / "intelligence"
            / "ml_models"
            / "plateaucare_isolation_forest.joblib"
        )

        try:
            artifact = train_anomaly_model(rows, model_path)
        except (ValueError, OSError) as error:
            raise CommandError(str(error))

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS("AI MODEL TRAINED SUCCESSFULLY")
        )
        self.stdout.write(f"Algorithm: {artifact['model_name']}")
        self.stdout.write(f"Training observations: {artifact['training_rows']}")
        self.stdout.write(f"LGAs represented: {lga_count}")
        self.stdout.write(f"Model saved to: {model_path}")
        self.stdout.write(
            "Reminder: Training data is simulated and for demonstration only."
        )
