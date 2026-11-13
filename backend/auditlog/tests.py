
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase

from core.models import LocalGovernmentArea
from .models import AuditLog
from .services import record_audit_event


User = get_user_model()


class AuditLogServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="audit_test_user",
            password="TestPassword123!",
        )

        self.lga = LocalGovernmentArea.objects.create(
            name="Audit Test LGA",
            code="AUDIT-TEST",
        )

    def test_record_create_event(self):
        event = record_audit_event(
            actor=self.user,
            action=AuditLog.Action.CREATE,
            instance=self.lga,
            changed_fields=["name", "code"],
            source=AuditLog.Source.API,
        )

        self.assertEqual(event.actor, self.user)
        self.assertEqual(event.action, "CREATE")
        self.assertEqual(event.object_id, str(self.lga.pk))
        self.assertEqual(
            event.content_type,
            ContentType.objects.get_for_model(self.lga),
        )
        self.assertEqual(
            event.changed_fields,
            ["name", "code"],
        )

    def test_record_system_event_without_user(self):
        event = record_audit_event(
            actor=None,
            action=AuditLog.Action.CREATE,
            instance=self.lga,
            source=AuditLog.Source.SYSTEM,
        )

        self.assertIsNone(event.actor)
        self.assertEqual(event.source, "SYSTEM")

    def test_reject_invalid_changed_fields(self):
        with self.assertRaises(ValueError):
            record_audit_event(
                actor=self.user,
                action=AuditLog.Action.UPDATE,
                instance=self.lga,
                changed_fields="name",
            )

    def test_reject_non_string_changed_field(self):
        with self.assertRaises(ValueError):
            record_audit_event(
                actor=self.user,
                action=AuditLog.Action.UPDATE,
                instance=self.lga,
                changed_fields=["name", 123],
            )
