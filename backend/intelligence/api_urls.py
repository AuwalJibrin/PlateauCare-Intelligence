
from django.urls import path

from intelligence.api_views import HealthRiskAssessmentListAPIView

urlpatterns = [
    path(
        "risk-assessments/",
        HealthRiskAssessmentListAPIView.as_view(),
        name="risk-assessment-list",
    ),
]
