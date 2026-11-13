
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


MIN_DATA_COMPLETENESS = 0.50
MAX_SUPPORTING_REPORT_AGE_DAYS = 7


FEATURE_COLUMNS = [
    "suspected_cases",
    "confirmed_cases",
    "deaths",
    "disease_reports_received",
    "rainfall_mm",
    "temperature_celsius",
    "humidity_percentage",
    "air_quality_index",
    "flood_occurrences",
    "environmental_reports_received",
    "sickness_absences",
    "workplace_incidents",
    "occupational_exposures",
    "heat_related_incidents",
    "workforce_days_since_update",
    "people_screened",
    "people_referred",
    "reported_health_concerns",
    "people_reached",
    "community_days_since_update",
]


FEATURE_LABELS = {
    "suspected_cases": "Suspected disease cases",
    "confirmed_cases": "Confirmed disease cases",
    "deaths": "Reported deaths",
    "disease_reports_received": "Disease reporting frequency",
    "rainfall_mm": "Rainfall",
    "temperature_celsius": "Temperature",
    "humidity_percentage": "Humidity",
    "air_quality_index": "Air quality",
    "flood_occurrences": "Flood occurrences",
    "environmental_reports_received": "Environmental reporting frequency",
    "sickness_absences": "Workforce sickness absences",
    "workplace_incidents": "Workplace incidents",
    "occupational_exposures": "Occupational exposures",
    "heat_related_incidents": "Heat-related incidents",
    "workforce_days_since_update": "Age of workforce report",
    "people_screened": "People screened",
    "people_referred": "People referred",
    "reported_health_concerns": "Community health concerns",
    "people_reached": "People reached through awareness",
    "community_days_since_update": "Age of community report",
}


def assess_data_quality(row):
    """
    Evaluate data completeness and source availability
    before generating an AI risk assessment.
    """

    domains = {
        "disease": {
            "source_count": "disease_reports_received",
            "features": [
                "suspected_cases",
                "confirmed_cases",
                "deaths",
            ],
        },
        "environment": {
            "source_count": "environmental_reports_received",
            "features": [
                "rainfall_mm",
                "temperature_celsius",
                "humidity_percentage",
                "air_quality_index",
                "flood_occurrences",
            ],
        },
        "workforce": {
            "age_field": "workforce_days_since_update",
            "features": [
                "sickness_absences",
                "workplace_incidents",
                "occupational_exposures",
                "heat_related_incidents",
            ],
        },
        "community": {
            "age_field": "community_days_since_update",
            "features": [
                "people_screened",
                "people_referred",
                "reported_health_concerns",
                "people_reached",
            ],
        },
    }

    available_sources = []
    missing_sources = []

    expected_features = 0
    available_features = 0

    for domain, details in domains.items():

        if "source_count" in details:
            source_available = (
                (row.get(details["source_count"]) or 0) > 0
            )
        else:
            age = row.get(details["age_field"])

            source_available = (
                age is not None
                and 0 <= age <= MAX_SUPPORTING_REPORT_AGE_DAYS
            )

        if not source_available:
            missing_sources.append(domain)
            continue

        available_sources.append(domain)

        for feature in details["features"]:
            expected_features += 1

            if row.get(feature) is not None:
                available_features += 1

    completeness = (
        available_features / expected_features
        if expected_features else 0
    )

    eligible = (
        len(available_sources) >= 2
        and completeness >= MIN_DATA_COMPLETENESS
    )

    return {
        "data_completeness": round(completeness * 100, 2),
        "available_sources": available_sources,
        "missing_sources": missing_sources,
        "eligible_for_assessment": eligible,
    }


def train_anomaly_model(rows, model_path):
    """
    Train an Isolation Forest model using combined daily LGA data.

    The model detects unusual patterns. It does not predict
    the probability of a disease outbreak.
    """

    if len(rows) < 20:
        raise ValueError("At least 20 daily observations are required.")

    dataframe = pd.DataFrame(rows)

    missing_columns = [
        column for column in FEATURE_COLUMNS
        if column not in dataframe.columns
    ]

    if missing_columns:
        raise ValueError(f"Missing features: {missing_columns}")

    X = dataframe[FEATURE_COLUMNS].replace(
        [np.inf, -np.inf], np.nan
    )

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("detector", IsolationForest(
            n_estimators=200,
            contamination=0.05,
            random_state=42,
        )),
    ])

    pipeline.fit(X)

    training_scores = pipeline.decision_function(X)

    imputed_X = pipeline.named_steps["imputer"].transform(X)

    medians = np.median(imputed_X, axis=0)

    iqrs = (
        np.percentile(imputed_X, 75, axis=0)
        - np.percentile(imputed_X, 25, axis=0)
    )

    artifact = {
        "pipeline": pipeline,
        "features": FEATURE_COLUMNS,
        "training_scores": np.sort(training_scores),
        "medians": medians,
        "iqrs": iqrs,
        "training_rows": len(rows),
        "model_name": "Isolation Forest",
        "model_version": "1.0-simulated",
    }

    model_path = Path(model_path)
    model_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(artifact, model_path)

    return artifact


def score_anomaly(row, artifact):
    """
    Score one daily LGA observation and explain unusual indicators.
    """

    features = artifact["features"]

    X = pd.DataFrame(
        [[row.get(column) for column in features]],
        columns=features,
    ).replace([np.inf, -np.inf], np.nan)

    pipeline = artifact["pipeline"]

    decision_score = float(pipeline.decision_function(X)[0])

    sorted_scores = artifact["training_scores"]

    position = np.searchsorted(
        sorted_scores,
        decision_score,
        side="right",
    )

    anomaly_percentile = (
        100 * (1 - position / len(sorted_scores))
    )

    anomaly_percentile = round(
        max(0.0, min(100.0, anomaly_percentile)), 2
    )

    if anomaly_percentile >= 99:
        risk_level = "CRITICAL"
    elif anomaly_percentile >= 95:
        risk_level = "HIGH"
    elif anomaly_percentile >= 90:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    imputed_row = pipeline.named_steps["imputer"].transform(X)[0]

    deviations = []

    for index, feature in enumerate(features):

        # Do not explain missing values that were imputed.
        original_value = row.get(feature)

        if original_value is None or pd.isna(original_value):
            continue

        iqr = artifact["iqrs"][index]

        if iqr <= 0:
            continue

        deviation = abs(
            imputed_row[index] - artifact["medians"][index]
        ) / iqr

        if deviation > 0.5:

            direction = (
                "above"
                if imputed_row[index] > artifact["medians"][index]
                else "below"
            )

            deviations.append({
                "feature": feature,
                "label": FEATURE_LABELS.get(feature, feature),
                "direction": direction,
                "deviation": round(float(deviation), 2),
            })

    deviations.sort(
        key=lambda item: item["deviation"],
        reverse=True,
    )

    explanation = [
        f"{item['label']} is {item['direction']} its "
        f"training median (relative deviation: "
        f"{item['deviation']})."
        for item in deviations[:3]
    ]

    if not explanation:
        explanation = [
            "The model detected an unusual combination of indicators. "
            "Further human review is needed."
        ]

    return {
        "anomaly_percentile": anomaly_percentile,
        "risk_score": round(anomaly_percentile / 100, 4),
        "risk_level": risk_level,
        "is_anomaly": risk_level != "LOW",
        "decision_score": round(decision_score, 4),
        "explanation": explanation,
        "model_version": artifact["model_version"],
    }
