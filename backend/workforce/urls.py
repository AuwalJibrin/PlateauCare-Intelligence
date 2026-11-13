
from django.urls import path

from .views import WorkforceHealthRecordListCreateView


urlpatterns = [
    path(
        "records/",
        WorkforceHealthRecordListCreateView.as_view(),
        name="workforce-record-list",
    ),
]
