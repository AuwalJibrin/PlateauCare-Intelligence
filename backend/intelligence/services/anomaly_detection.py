
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


# An increase in these indicators can warrant public-health investigation.
# This does not establish that an outbreak or harmful event has occurred.
CONCERNING_INCREASES = {
    "suspected_cases",
    "confirmed_cases",
    "deaths",
    "flood_occurrences",
    "air_quality_index",
    "sickness_absences",
    "workplace_incidents",
    "occupational_exposures",
    "heat_related_incidents",
    "reported_health_concerns",
}


# Lower values may indicate gaps in coverage or reporting.
COVERAGE_GAPS = {
    "people_screened",
    "people_reached",
}


# Lower reporting counts can reflect incomplete reporting rather than
# genuinely low disease or environmental activity.
REPORTING_INDICATORS = {
    "disease_reports_received",
    "environmental_reports_received",
}


# These indicators need contextual interpretation.
CONTEXTUAL_INDICATORS = {
    "rainfall_mm",
    "temperature_celsius",
    "humidity_percentage",
    "people_referred",
}


def _is_missing(value):
    """Safely check whether a scalar value is missing."""

    if value is None:
        return True

    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def assess_data_quality(row):
    """
    Evaluate data completeness and source availability.

    Completeness is calculated using the expected features from
    available, sufficiently recent reporting domains.

    Missing and stale domains are explicitly reported but do not
    artificially reduce completeness for other available domains.
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
    stale_sources = []
    invalid_sources = []
    missing_features = []

    expected_features = 0
    available_features = 0

    for domain, details in domains.items():

        # Disease and environmental source availability.
        if "source_count" in details:
            source_count = row.get(details["source_count"])

            if _is_missing(source_count):
                missing_sources.append(domain)
                missing_features.extend(details["features"])
                continue

            try:
                numeric_count = float(source_count)

                if (
                    not np.isfinite(numeric_count)
                    or numeric_count < 0
                ):
                    raise ValueError("Invalid source count")

            except (TypeError, ValueError):
                invalid_sources.append(domain)
                missing_sources.append(domain)
                missing_features.extend(details["features"])
                continue

            if numeric_count <= 0:
                missing_sources.append(domain)
                missing_features.extend(details["features"])
                continue

        # Workforce and community report freshness.
        else:
            age = row.get(details["age_field"])

            if _is_missing(age):
                missing_sources.append(domain)
                missing_features.extend(details["features"])
                continue

            try:
                age = float(age)

                if not np.isfinite(age) or age < 0:
                    raise ValueError("Invalid report age")

            except (TypeError, ValueError):
                invalid_sources.append(domain)
                missing_sources.append(domain)
                missing_features.extend(details["features"])
                continue

            if age > MAX_SUPPORTING_REPORT_AGE_DAYS:
                stale_sources.append(domain)
                missing_sources.append(domain)
                missing_features.extend(details["features"])
                continue

        # This source is available and sufficiently recent.
        available_sources.append(domain)

        # Only available sources contribute to completeness.
        expected_features += len(details["features"])

        for feature in details["features"]:
            value = row.get(feature)

            if _is_missing(value):
                missing_features.append(feature)
                continue

            try:
                numeric_value = float(value)
            except (TypeError, ValueError):
                missing_features.append(feature)
                continue

            if not np.isfinite(numeric_value):
                missing_features.append(feature)
                continue

            available_features += 1

    completeness = (
        available_features / expected_features
        if expected_features > 0
        else 0
    )

    eligible = (
        len(available_sources) >= 2
        and completeness >= MIN_DATA_COMPLETENESS
    )

    return {
        "data_completeness": round(completeness * 100, 2),
        "available_sources": available_sources,
        "missing_sources": missing_sources,
        "stale_sources": stale_sources,
        "invalid_sources": invalid_sources,
        "missing_features": missing_features,
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


def _interpret_deviation(feature, direction):
    """
    Give an indicator-specific interpretation.

    These descriptions are guidance for human review, not
    clinical conclusions or causal explanations.
    """

    label = FEATURE_LABELS.get(feature, feature)

    if feature in CONCERNING_INCREASES and direction == "above":
        return (
            "POTENTIALLY_CONCERNING",
            f"The increase in {label.lower()} may warrant "
            "public-health investigation and source verification."
        )

    if feature in CONCERNING_INCREASES and direction == "below":
        return (
            "UNUSUAL_OBSERVATION",
            f"The value is lower than the training baseline. "
            f"This does not prove that {label.lower()} is absent "
            "or that public-health risk has decreased."
        )

    if feature in COVERAGE_GAPS and direction == "below":
        return (
            "POTENTIAL_COVERAGE_GAP",
            f"The lower value may indicate reduced screening "
            "or awareness coverage. Verify community reach "
            "and reporting completeness."
        )

    if feature in COVERAGE_GAPS and direction == "above":
        return (
            "CONTEXTUAL_OBSERVATION",
            f"The higher value may reflect increased service "
            "or awareness activity. It is not, by itself, "
            "evidence of increased disease risk."
        )

    if feature in REPORTING_INDICATORS and direction == "below":
        return (
            "DATA_QUALITY_CONCERN",
            f"Lower {label.lower()} may reflect incomplete "
            "reporting. Confirm that expected reports were submitted."
        )

    if feature in REPORTING_INDICATORS and direction == "above":
        return (
            "CONTEXTUAL_OBSERVATION",
            f"Higher {label.lower()} may reflect improved "
            "reporting activity rather than increased disease "
            "or environmental risk."
        )

    if feature in CONTEXTUAL_INDICATORS:
        return (
            "UNUSUAL_OBSERVATION",
            f"This {label.lower()} observation needs local "
            "environmental or operational context before "
            "its public-health significance can be determined."
        )

    if feature in {
        "workforce_days_since_update",
        "community_days_since_update",
    }:
        return (
            "DATA_QUALITY_CONCERN",
            "An unusual report age may indicate a reporting "
            "or data freshness issue. Verify the latest submission."
        )

    return (
        "UNUSUAL_OBSERVATION",
        "This indicator differs from the training baseline "
        "and requires contextual review."
    )


def score_anomaly(row, artifact):
    """
    Score one daily LGA observation and explain unusual indicators.

    The anomaly percentile measures how unusual an observation is
    relative to training scores. It is not outbreak probability.

    The existing risk thresholds and return fields are preserved.
    """

    features = artifact["features"]

    X = pd.DataFrame(
        [[row.get(column) for column in features]],
        columns=features,
    ).replace([np.inf, -np.inf], np.nan)

    pipeline = artifact["pipeline"]

    decision_score = float(pipeline.decision_function(X)[0])

    sorted_scores = np.asarray(artifact["training_scores"])

    if len(sorted_scores) == 0:
        raise ValueError("The model has no training scores.")

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

    # Preserve the existing classification thresholds.
    if anomaly_percentile >= 99:
        risk_level = "CRITICAL"
    elif anomaly_percentile >= 95:
        risk_level = "HIGH"
    elif anomaly_percentile >= 90:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    medians = np.asarray(artifact["medians"])
    iqrs = np.asarray(artifact["iqrs"])

    if len(medians) != len(features) or len(iqrs) != len(features):
        raise ValueError(
            "Model artifact feature statistics do not match its features."
        )

    deviations = []

    for index, feature in enumerate(features):

        original_value = row.get(feature)

        if _is_missing(original_value):
            continue

        try:
            observed_value = float(original_value)
        except (TypeError, ValueError):
            continue

        if not np.isfinite(observed_value):
            continue

        median = float(medians[index])
        iqr = float(iqrs[index])

        if not np.isfinite(median) or not np.isfinite(iqr) or iqr <= 0:
            continue

        deviation = abs(observed_value - median) / iqr

        if deviation <= 0.5:
            continue

        direction = (
            "above" if observed_value > median else "below"
        )

        category, interpretation = _interpret_deviation(
            feature,
            direction,
        )

        deviations.append({
            "feature": feature,
            "label": FEATURE_LABELS.get(feature, feature),
            "observed_value": observed_value,
            "training_median": median,
            "direction": direction,
            "deviation": round(float(deviation), 2),
            "category": category,
            "interpretation": interpretation,
        })

    deviations.sort(
        key=lambda item: item["deviation"],
        reverse=True,
    )

    explanation = []
    explanation_details = []

    for item in deviations[:3]:

        explanation.append(
            f"{item['category']}: {item['label']} observed "
            f"value {item['observed_value']:g}, compared with "
            f"training median {item['training_median']:g}. "
            f"It is {item['direction']} the median by "
            f"{item['deviation']} IQR. "
            f"{item['interpretation']}"
        )

        explanation_details.append(item)

    if not explanation:
        explanation = [
            "The model detected an unusual combination of indicators. "
            "No individual indicator exceeded the explanation threshold. "
            "Further human review is recommended."
        ]

    return {
        "anomaly_percentile": anomaly_percentile,
        "risk_score": round(anomaly_percentile / 100, 4),
        "risk_level": risk_level,
        "is_anomaly": risk_level != "LOW",
        "decision_score": round(decision_score, 4),
        "explanation": explanation,
        "explanation_details": explanation_details,
        "model_version": artifact["model_version"],
    }
