"""
In this file we handle different notification topics, one topic per community.
"""

import os
import logging
from firebase_admin import messaging
from api.resolvers import Communities
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("api.notif_handler")

notif_topic_prefix = os.environ["NOTIFICATIONS_ALIAS"]
logger.info(f"NOTIFICATIONS_ALIAS {notif_topic_prefix}")

# initialize_app(cred)
# No need because app is initialized in notifications.py


def handle_community_notification(persona, community, mode):
    logger.info("CALLING handle_community_notification PRE")
    modes = {
        "register": messaging.subscribe_to_topic,
        "unregister": messaging.unsubscribe_from_topic,
    }

    persona_token = persona.notification_token
    if persona_token is None:
        return False
    persona_token = persona_token.token

    topic = notif_topic_prefix + community.notif_all_members_topic
    response = modes[mode](tokens=[persona_token], topic=topic)

    assert (
        response.failure_count == 0 and response.success_count == 1
    ), f"Coulnd't {mode} FCMToken for Persona.id {persona.id} in topic {topic}."
    logger.info(
        f"Success in {mode} FCMToken for Persona.id {persona.id} in topic {topic}."
    )
    return True


def handle_revoke_token(context, token):
    if revoke_token(token):
        return True

    # TODO: read below.
    # must keep track of all notifications
    # must run when the user logs out!
    communities = Communities(context).all()
    for c in communities:
        topic = notif_topic_prefix + c.notif_all_members_topic
        response = messaging.unsubscribe_from_topic(tokens=[token], topic=topic)
        if response.failure_count != 0:
            logger.error(f"Coulnd't revoke token from topic {topic}.")

    logger.info(f"Success in handle_revoke_token for token {token[:20]}...")
    return True


def revoke_token(token):
    """
    TODO: implement this.
    Wondering if there is a more efficient method to revoke tokens.

    Also, it's important to save the token to the server and update the
    timestamp whenever it changes, such as when:

    The app is restored on a new device
    The user uninstalls/reinstall the app
    The user clears app data.

    src: https://firebase.google.com/docs/cloud-messaging/manage-tokens
    """
    return False
