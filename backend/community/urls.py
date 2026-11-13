
from django.urls import path

from .views import CommunityHealthRecordListCreateView


urlpatterns = [
    path(
        "records/",
        CommunityHealthRecordListCreateView.as_view(),
        name="community-record-list",
    ),
]
