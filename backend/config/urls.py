"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/intelligence/",
        include("intelligence.api_urls"),
        ),

    path("api/core/", include("core.urls")),

    path("api/community/", include("community.urls")),

    path("api/response/", include("response.urls")),

    path(
    "api/surveillance/",
    include("surveillance.urls"),
        ),

    path("api/workforce/", include("workforce.urls")),

    path(
        "api/environment/",
    include("environment_monitoring.urls"),
    ),
    path(
    "api/auth/token/",
    obtain_auth_token,
    name="api-token-auth",
),
]
