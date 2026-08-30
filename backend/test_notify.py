from unittest.mock import MagicMock, patch
from app.notifications import service as notif_service

@patch("app.notifications.service.get_service_client")
def test_it(mock_client):
    mock_db = MagicMock()
    mock_client.return_value = mock_db

    # Fake queue info
    mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "q1",
        "organizations": {"name": "Test Clinic"},
        "services": {"average_service_minutes": 5},
    }

    # Fake list of 6 people waiting
    waiting_entries = [
        {"id": f"e{i}", "user_id": f"u{i}", "token_label": f"A-{i:03d}",
         "token_number": i, "requeue_after_token": None, "approaching_notified": False}
        for i in range(6)
    ]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = waiting_entries

    with patch("app.notifications.service.notify_approaching") as mock_notify:
        notif_service.check_approaching_for_queue("q1")
        print("Was notify_approaching called?", mock_notify.called)
        print("Called with:", mock_notify.call_args)

test_it()