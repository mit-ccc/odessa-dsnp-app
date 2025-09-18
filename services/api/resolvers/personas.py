import logging
import random

import db.models
import sqlalchemy
from sqlalchemy import and_, delete, insert, select, update

import api.resolvers
from api.content_mod import moderation_required
from api.exceptions import UnauthorizedError
from api.notification_handlers import handle_community_notification
from api.resolvers import Communities
from api.resolvers.permissions import Permissions
from api.resolvers.siwf_accounts import SIWFAccounts

logger = logging.getLogger("api.personas")


class Personas:
    def __init__(self, context, start, limit, pkh):
        stmt = sqlalchemy.select(db.models.personas)
        if start is not None:
            stmt = stmt.where(db.models.personas.c.id >= start)
        if pkh:
            stmt = stmt.where(db.models.personas.c.pkh == pkh)
        stmt = stmt.order_by(db.models.personas.c.id)
        if limit:
            stmt = stmt.limit(limit)

        conn = context["db-conn"]
        self._personas = [Persona(context, p._asdict()) for p in conn.execute(stmt)]

    def all(self):
        return self._personas

    @staticmethod
    def get(context, persona_id=None, pkh=None):
        """Returns a Persona object for the requested persona id."""

        stmt = sqlalchemy.select(db.models.personas)
        if pkh is None:
            stmt = stmt.where(db.models.personas.c.id == persona_id)
        else:
            stmt = stmt.where(db.models.personas.c.pkh == pkh)

        conn = context["db-conn"]
        fetched_persona = conn.execute(stmt).fetchone()
        if fetched_persona is None:
            return None
        return Persona(context, fetched_persona._asdict())

    @classmethod
    def update_profile_pic(_, context, pkh, image_id):
        if pkh not in context["auth0"]:
            logger.warn("received unauthorized attempt to update %s", pkh)
            raise UnauthorizedError(f"unauthorized attempt to update {pkh}")

        conn = context["db-conn"]
        stmt = (
            update(db.models.personas)
            .where(db.models.personas.c.pkh == pkh)
            .values(image_id=image_id)
        )
        conn.execute(stmt)
        conn.commit()
        logger.info("Updating profile picture to id %s", image_id)
        return Personas.get(context, pkh=pkh)

    @classmethod
    def remove_profile_pic(_, context, pkh):
        if pkh not in context["auth0"]:
            logger.warn("received unauthorized attempt to update %s", pkh)
            raise UnauthorizedError(f"unauthorized attempt to update {pkh}")

        conn = context["db-conn"]
        stmt = (
            update(db.models.personas)
            .where(db.models.personas.c.pkh == pkh)
            .values(image_id=None)
        )
        conn.execute(stmt)
        conn.commit()
        logger.info("Removing profile picture to user.")
        return Personas.get(context, pkh=pkh)

    @classmethod
    def remove_persona_prompt(_, context, pkh, prompt_id):
        # FIXME: the following code should be a decorator or smthng.
        if pkh not in context["auth0"]:
            logger.warn("received unauthorized attempt to update %s", pkh)
            raise UnauthorizedError(f"unauthorized attempt to update {pkh}")

        prompt = api.resolvers.prompts.Prompts.get(context, prompt_id)

        if prompt.status != "eligible":
            logger.info("PROMPT not eligible to be removed.")
            return prompt

        conn = context["db-conn"]
        stmt = (
            update(db.models.prompts)
            .where(db.models.prompts.c.id == prompt_id)
            .values(status="removed")
        )
        conn.execute(stmt)
        conn.commit()
        logger.info("Removing prompt to user.")
        prompt = api.resolvers.prompts.Prompts.get(context, prompt_id)
        return prompt


class Persona:
    def __init__(self, context, fields):
        self._context = context
        self._fields = fields
        for k, v in fields.items():
            setattr(self, k, v)
        self.msa_handle = SIWFAccounts.get_msa_handle_for_persona(context, self.id)

    def __str__(self):
        return str(self._fields)

    @property
    def communities(self):
        conn = self._context["db-conn"]
        communities = db.models.communities
        memberships = db.models.memberships
        stmt = (
            sqlalchemy.select(communities)
            .join(memberships, communities.c.id == memberships.c.community_id)
            .filter(memberships.c.persona_id == self.id)
        )
        objs = [
            api.resolvers.communities.Community(self._context, c._asdict())
            for c in conn.execute(stmt)
        ]
        return objs

    @property
    def available_communities(self):
        ## communities available for perona to join
        communities = Communities(context=self._context, access="public").all()
        return communities

    @property
    def posts(self):
        conn = self._context["db-conn"]
        posts = db.models.posts
        stmt = sqlalchemy.select(posts).where(
            posts.c.author_id == self.id,
            posts.c.mod_removed != True,  # noqa: E712
        )
        objs = [
            api.resolvers.posts.Post(self._context, p._asdict())
            for p in conn.execute(stmt)
        ]
        return objs

    @property
    def prompts(self):
        # FIXME: could also add pkh to prompt or backref
        prompts = [post.prompt for post in self.posts if post.is_prompt]
        return prompts

    @property
    def image(self):
        image = api.resolvers.Images.get(self._context, self.image_id)
        return image

    @property
    def known_by_requester(self):
        return self._known_by_requester

    @property
    def notification_token(self):
        return api.resolvers.FCMTokens.get_by_user_id(
            self._context, user_id=self.id, most_recent=True
        )

    def num_posts_to(self, round):
        conn = self._context["db-conn"]
        posts = db.models.posts
        stmt = sqlalchemy.select(
            sqlalchemy.func.count(posts.c.id).label("count")
        ).where(
            sqlalchemy.and_(
                posts.c.author_id == self.id,
                posts.c.in_reply_to == round.prompt.post_id,
                posts.c.mod_removed != True,  # noqa: E712
            )
        )
        return conn.execute(stmt).scalar()

    def can_post_to(self, round):
        return round.allows_answering_by(self)

    def can_play_round(self, round):
        # FIXME: maybe we don't return a round if `archived`
        # but the user didn't respond.
        return round.allows_playing_by(self)

    def is_in_community(self, community):
        conn = self._context["db-conn"]

        community_ids = [community.id]
        if community.is_bridge:
            community_ids = community.bridge_ids

        stmt = select(db.models.memberships).where(
            (db.models.memberships.c.persona_id == self.id)
            & (db.models.memberships.c.community_id.in_(community_ids))
        )
        if conn.execute(stmt).fetchone():
            return True
        return False

    def join_community(self, community):
        if self.is_in_community(community):
            return "already registered"

        stmt = insert(db.models.memberships).values(
            {
                "persona_id": self.id,
                "community_id": community.id,
            }
        )
        self._context["db-conn"].execute(stmt)
        handle_community_notification(self, community, "register")
        return "registered"

    def leave_community(self, community):
        if self.is_in_community(community):
            stmt = delete(db.models.memberships).where(
                (db.models.memberships.c.persona_id == self.id)
                & (db.models.memberships.c.community_id == community.id)
            )
            self._context["db-conn"].execute(stmt)
            handle_community_notification(self, community, "unregister")
            return "unregistered"
        return "already unregistered"

    def user_permissions(self, community):
        # get permissions for each role in community_roles as populaed in permissions.py
        basal_role_perms = self.user_perm_basal(community)

        # get permissions patched in table permissions
        patch_perms = self.user_perm_patches(community)

        # update with added permissions
        basal_role_perms["permissions"] = list(
            set(basal_role_perms["permissions"] + patch_perms["grant"])
        )

        # update with removed permissions
        basal_role_perms["permissions"] = list(
            set(basal_role_perms["permissions"]) - set(patch_perms["revoke"])
        )

        return basal_role_perms

    def user_perm_patches(self, community):
        session = self._context["session"]
        pt = db.models.permissions
        mt = db.models.memberships
        perms = (
            session.query(pt.c.perm, pt.c.mode)
            .join(mt)
            .filter(and_(mt.c.persona_id == self.id, mt.c.community_id == community.id))
            .all()
        )
        patch_perms = {"grant": [], "revoke": []}
        for perm, mode in perms:
            patch_perms[mode].append(perm)
        return patch_perms

    def user_perm_grant(self, community, perm):
        return community.handle_permission(self, perm, "grant")

    def user_perm_revoke(self, community, perm):
        return community.handle_permission(self, perm, "revoke")

    def user_perm_status(self, community, perm):
        basal_role_perms = self.user_perm_basal(community)
        patch_perms = self.user_perm_patches(community)
        response = {
            "in_role": perm in basal_role_perms["permissions"],
            "is_granted": perm in patch_perms["grant"],
            "is_revoked": perm in patch_perms["revoke"],
        }
        return response

    def user_perm_basal(self, community):
        response = {"roles": [], "groups": [], "permissions": []}
        perm_base = Permissions.metadata

        if community is not None:
            response["roles"] = self.role_in_community(community)
        else:
            response["roles"] = ["persona"]

        for role in response["roles"]:
            role_groups = perm_base["roles"].get(role, [])
            response["groups"] += list(role_groups)

            for group in role_groups:
                group_perms = perm_base["groups"].get(group, [])
                response["permissions"] += list(group_perms)

        return response

    @property
    def persona_global_permissions(self):
        return self.user_perm_basal(None)

    def role_in_community(self, community):
        # everyone is a member since role_in_community is associated to membership;
        self._context["db-conn"]
        session = self._context["session"]

        crt = db.models.community_roles
        mt = db.models.memberships

        community_ids = [community.id]
        if community.is_bridge:
            community_ids = community.bridge_ids

        roles = (
            session.query(crt.c.role)
            .join(mt)
            .filter(
                and_(mt.c.persona_id == self.id, mt.c.community_id.in_(community_ids))
            )
            .all()
        )

        if len(roles) == 0 and self.is_in_community(community):
            return ["persona", "member"]
        elif len(roles) == 0:
            return ["persona"]
        roles = ["persona", "member"] + [r.role for r in roles]
        return list(set(roles))

    @moderation_required
    def run_ai_mod(
        self, community, posts, request_mod_reviews=False, request_author_reviews=False
    ):
        mode_mod = "audio.plain_transcript"
        mod_params = (mode_mod, request_mod_reviews, request_author_reviews)
        checks = [
            post.run_ai_mod(*mod_params) for post in posts if not post.ai_mod_output
        ]
        return checks


def create_persona(context, name, bio, pkh, assigned_id=None):
    if len(name) < 2:
        return {"error": "name must have at least 2 characteres."}

    # Pick a random id for privacy reasons. Because SystemRandom draws
    # from OS entropy, the probability of collision should be
    # exceedingly small. If we do collide, this function will throw a
    # database error and the client can retry.
    if assigned_id is None:
        assigned_id = random.SystemRandom().randint(0, 2147483647)
    values = {
        "id": assigned_id,
        "name": name,
        "bio": bio,
        "pkh": pkh,
    }

    with context["db-conn"] as conn:
        stmt = insert(db.models.personas).values(**values)
        conn.execute(stmt)
        conn.commit()

    return Persona(context, values)


def update_persona(context, pkh, name, bio):
    if pkh not in context["auth0"]:
        logger.warn("received unauthorized attempt to update %s", pkh)
        raise UnauthorizedError(f"unauthorized attempt to update {pkh}")

    conn = context["db-conn"]
    # fixme: currently ignoring image_id
    values = {"name": name, "bio": bio, "pkh": pkh}
    stmt = (
        update(db.models.personas)
        .where(db.models.personas.c.pkh == pkh)
        .values(**values)
    )
    conn.execute(stmt)
    conn.commit()

    stmt = select(db.models.personas).where(db.models.personas.c.pkh == pkh)
    persona = conn.execute(stmt).fetchone()
    return Persona(context, persona._asdict())
