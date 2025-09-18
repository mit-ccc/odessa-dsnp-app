import functools
import logging
import os

import firebase_admin
from firebase_admin import credentials, messaging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("api.notif")
notifications_alias = os.environ["NOTIFICATIONS_ALIAS"]
all_users_topic = notifications_alias + "allUsers"


def search_file(filename, paths):
    """Searches a set of paths for a file."""

    for path in paths:
        candidate = os.path.join(path, filename)
        if os.path.exists(candidate):
            return os.path.abspath(candidate)

    return None


ALLOW_NOTIFICATIONS = os.environ["ALLOW_NOTIFICATIONS"] == "true"

if ALLOW_NOTIFICATIONS:
    cred = credentials.Certificate(
        search_file(
            "odessa-app-4984a-firebase-adminsdk-rhi9t-02d5b81bb0.json",
            ["credentials", "/var/task/credentials", "../credentials"],
        )
    )
    firebase_admin.initialize_app(cred)


def check_permission(func):
    def wrapper(*args, **kargs):
        if not ALLOW_NOTIFICATIONS:
            return
        return func(*args, **kargs)

    return wrapper


def prevent_concurrency(notif_type):
    prev_calls = set()

    def wrapper(func):
        @functools.wraps(func)
        def wrapper(round, community):
            current_call = round.id
            if current_call in prev_calls:
                return None
            prev_calls.add(current_call)
            return func(round, community)

        return wrapper

    return wrapper


@check_permission
def ping():
    message = messaging.Message(
        notification=messaging.Notification(title="ping", body="pong"),
        topic=all_users_topic,
    )
    messaging.send(message)


@check_permission
@prevent_concurrency("start_notif_sent")
def send_new_round_notification(round, community):
    """
    Intended to be called only when a new round becomes active.
    """
    # FIXME: round should include Round.community
    logger.info(
        "\n\n#########\n"
        + f"CALLING send_new_round_notification for round.id {round.id}, sent {round.start_notif_sent}"
        + "\n##########"
    )

    if round.start_notif_sent:
        return False
    round.mark_notification_as_sent("start_notif_sent")

    title_ = f"{round.prompt.post.author.name} in {community.name}!"
    body_ = f'"{round.prompt.post.text}"'

    message = messaging.Message(
        notification=messaging.Notification(title=title_, body=body_),
        topic=notifications_alias + community.notif_all_members_topic,
    )
    response = messaging.send(message)
    return response


@check_permission
@prevent_concurrency("completion_notif_sent")
def send_round_has_closed_notification(round, community):
    """
    Intended to be called only when a round trasitions to closed.
    """
    # FIXME: round should include Round.community
    logger.info(
        "\n\n#########\n"
        + f"CALLING send_round_has_closed_notification for round.id {round.id}, sent {round.completion_notif_sent}"
        + "\n##########"
    )

    if round.completion_notif_sent:
        return False
    round.mark_notification_as_sent("completion_notif_sent")

    title_ = f"You can now see everyone's replies in {community.name}!"
    body_ = f'"{round.prompt.post.text}"'

    message = messaging.Message(
        notification=messaging.Notification(title=title_, body=body_),
        topic=notifications_alias + community.notif_all_members_topic,
    )
    response = messaging.send(message)
    return response
