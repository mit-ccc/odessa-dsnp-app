import os

import firebase_admin
from firebase_admin import credentials, messaging
from dotenv import load_dotenv

load_dotenv()
notifications_alias = os.environ["NOTIFICATIONS_ALIAS"]
all_users_topic = notifications_alias + "allUsers"


def search_file(filename, paths):
    """Searches a set of paths for a file."""

    for path in paths:
        candidate = os.path.join(path, filename)
        if os.path.exists(candidate):
            return os.path.abspath(candidate)

    return None


cred = credentials.Certificate(
    search_file(
        "odessa-app-4984a-firebase-adminsdk-rhi9t-02d5b81bb0.json",
        ["../credentials", "/var/task/credentials"],
    )
)
firebase_admin.initialize_app(cred)


def send_push_notification():
    # Customize this function based on your notification content needs
    message = messaging.Message(
        notification=messaging.Notification(
            title="Testing Notifications", body="testing notifications to all users"
        ),
        android=messaging.AndroidConfig(
            priority="high",  # Add high priority
            notification=messaging.AndroidNotification(
                channel_id="default"  # Ensure this channel is created in your app with high importance
            ),
        ),
        topic=all_users_topic,  # You can also use topic specific to community if needed
    )

    # Send the message
    response = messaging.send(message)
    print("Successfully sent message:", response)


send_push_notification()
