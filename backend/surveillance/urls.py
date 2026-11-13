
from django.urls import path

from .views import (
    DiseaseListView,
    DiseaseReportListView,
)


urlpatterns = [
    path(
        "diseases/",
        DiseaseListView.as_view(),
        name="disease-list",
    ),
    path(
        "reports/",
        DiseaseReportListView.as_view(),
        name="disease-report-list",
    ),
]
