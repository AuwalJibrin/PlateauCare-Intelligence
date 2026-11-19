
from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token


urlpatterns = [
    path("admin/", admin.site.urls),

    # Authentication
    path(
        "api/auth/token/",
        obtain_auth_token,
        name="api-token-auth",
    ),

    # Core
    path("api/core/", include("core.urls")),

    # Health data modules
    path("api/surveillance/", include("surveillance.urls")),
    path("api/environment/", include("environment_monitoring.urls")),
    path("api/workforce/", include("workforce.urls")),
    path("api/community/", include("community.urls")),

    # AI and response
    path("api/intelligence/", include("intelligence.api_urls")),
    path("api/response/", include("response.urls")),
]
