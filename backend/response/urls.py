from rest_framework.routers import DefaultRouter

from response.views import PublicHealthAlertViewSet


router = DefaultRouter()

router.register(
    "alerts",
    PublicHealthAlertViewSet,
    basename="public-health-alert",
)

urlpatterns = router.urls