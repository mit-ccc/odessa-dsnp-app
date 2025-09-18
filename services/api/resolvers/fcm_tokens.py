import logging

import db.models as models
from sqlalchemy import func, insert, select, update

import api.resolvers as resolvers
from api.notification_handlers import handle_revoke_token
from api.time import time

logger = logging.getLogger("api.fcm_tokens")


class FCMTokens:
    # Firebase Cloud Messaging (FCM)
    @classmethod
    def get(_, context, id=None, token=None):
        if id is not None:
            stmt = select(models.fcm_tokens).where(models.fcm_tokens.c.id == id)
        elif token:
            stmt = select(models.fcm_tokens).where(models.fcm_tokens.c.token == token)
        fetched_token = context["db-conn"].execute(stmt).fetchone()
        if fetched_token is None:
            # raise Exception(f"FCMToken.id {id} doesn't exist")
            return None
        return FCMToken(context, fetched_token._asdict())

    @classmethod
    def get_by_user_id(_, context, user_id=None, most_recent=False):
        conn = context["db-conn"]
        tokens_model = models.fcm_tokens
        stmt = select(tokens_model).where(tokens_model.c.persona_id == user_id)

        fetched_user = conn.execute(stmt).fetchone()
        if fetched_user is None:
            return None

        if most_recent:
            time_stmt = select(func.max(tokens_model.c.creation_time)).where(
                tokens_model.c.persona_id == user_id
            )
            most_resent_time = conn.execute(time_stmt).fetchone()
            if most_resent_time:
                stmt = stmt.where(tokens_model.c.creation_time == most_resent_time)

        fetched_tokens = [FCMToken(context, t._asdict()) for t in conn.execute(stmt)]
        if len(fetched_tokens) == 0:
            raise Exception(f"FCMTokens for persona {user_id} don't exist")

        if most_recent:
            return fetched_tokens[0]

        return fetched_tokens

    @classmethod
    def create(_, context, user_id, token):
        persona = resolvers.Personas.get(context, persona_id=user_id)

        # in case frontend tries to create a token before a persona
        if persona is None:
            return False

        token_object = persona.notification_token
        if token_object:
            current_token = token_object.token
        else:
            current_token = None

        if current_token == token:
            # This is already the persona's curret FCMToken.
            # TODO(bcsaldias): update timestamp every so often to follow good practices.
            return False

        # check token is unique
        exists = FCMTokens.get(context, token=token)
        if exists:
            # need to deprecate when different persona logins
            # to same installed app (this also revokes).
            if not FCMTokens.deprecate(context, token=token):
                return False

        if current_token and token:
            # if persona is updating their own token.
            if not handle_revoke_token(context, current_token):
                return False

        # if all conditions above are successfull then update token
        conn = context["db-conn"]
        stmt = insert(models.fcm_tokens).values(
            token=token,
            persona_id=user_id,
            creation_time=time.utcnow(),
        )
        conn.execute(stmt)
        conn.commit()
        return True

    @classmethod
    def deprecate(_, context, token):
        # deprecate and unregister.
        conn = context["db-conn"]
        tokens_model = models.fcm_tokens
        prefix = f"deprecated_{time.timestamp()}"
        stmt = (
            update(tokens_model)
            .where(tokens_model.c.token == token)
            .values({"token": f"{prefix}___{token}"})
        )
        conn.execute(stmt)
        conn.commit()
        return handle_revoke_token(context, token)


class FCMToken:
    def __init__(self, context, fields):
        self._context = context
        self._fields = fields
        for k, v in fields.items():
            setattr(self, k, v)
