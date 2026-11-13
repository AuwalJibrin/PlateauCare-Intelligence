from django.urls import path
from .views import EnvironmentalObservationListView

urlpatterns = [
    path(
        "observations/",
        EnvironmentalObservationListView.as_view(),
        name="environmental-observation-list"
    ),
]