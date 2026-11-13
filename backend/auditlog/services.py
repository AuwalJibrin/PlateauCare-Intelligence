
from django.contrib.contenttypes.models import ContentType

from .models import AuditLog


def record_audit_event(
    actor,
    action,
    instance=None,
    changed_fields=None,
    source=AuditLog.Source.API,
):
    """
    Record an important activity without copying sensitive record values.
    """

    # Only store authenticated users.
    if not actor or not getattr(actor, "is_authenticated", False):
        actor = None

    content_type = None
    object_id = ""

    # Identify the affected database record.
    if instance is not None:
        content_type = ContentType.objects.get_for_model(instance)
        object_id = str(instance.pk)

    # Store field names only, never their actual values.
    if changed_fields is None:
        changed_fields = []

    if not isinstance(changed_fields, (list, tuple)):
        raise ValueError("changed_fields must be a list or tuple.")

    if not all(isinstance(field, str) for field in changed_fields):
        raise ValueError("Every changed field must be a string.")

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        content_type=content_type,
        object_id=object_id,
        changed_fields=list(changed_fields),
        source=source,
    )
