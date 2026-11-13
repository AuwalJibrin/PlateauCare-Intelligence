
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import models


class AuditLog(models.Model):

    class Action(models.TextChoices):
        CREATE = "CREATE", "Created"
        UPDATE = "UPDATE", "Updated"
        DELETE = "DELETE", "Deleted"
        ACKNOWLEDGE = "ACKNOWLEDGE", "Alert acknowledged"
        RESOLVE = "RESOLVE", "Alert resolved"
        DISMISS = "DISMISS", "Alert dismissed"
        VERIFY = "VERIFY", "Verified"

    class Source(models.TextChoices):
        API = "API", "API"
        ADMIN = "ADMIN", "Django Admin"
        SYSTEM = "SYSTEM", "System"

    # User responsible for the action.
    # Null is allowed for automated system actions.
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )

    action = models.CharField(
        max_length=20,
        choices=Action.choices,
    )

    # Identifies the affected Django model and record.
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )

    object_id = models.CharField(
        max_length=100,
        blank=True,
    )

    # Store field names only, not sensitive field values.
    changed_fields = models.JSONField(default=list, blank=True)

    source = models.CharField(
        max_length=10,
        choices=Source.choices,
        default=Source.API,
    )

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(
                fields=["-timestamp"],
                name="audit_timestamp_idx",
            ),
            models.Index(
                fields=["actor", "-timestamp"],
                name="audit_actor_time_idx",
            ),
            models.Index(
                fields=["content_type", "object_id"],
                name="audit_object_idx",
            ),
        ]

    def __str__(self):
        username = self.actor.username if self.actor else "System"
        return f"{self.action} by {username} at {self.timestamp}"
