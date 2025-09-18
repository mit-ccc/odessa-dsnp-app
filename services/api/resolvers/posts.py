import json
import logging
import os

import db.models
import sqlalchemy
from dotenv import load_dotenv
from sqlalchemy import insert

import api.resolvers
from api.resolvers import Personas, Persona, Community, Communities
from api.bridged_round.resolvers import BridgedCommunity
from api.assets import AudioBucket
from api.content_mod import (
    assistant_checks_post,
    moderation_except,
    moderation_required,
)
from api.time import time

load_dotenv()

PROCESS_NEW_POST_IN_SERIES = os.environ.get("PROCESS_NEW_POST_IN_SERIES") == "true"

logger = logging.getLogger("api.posts")


class Posts:
    def __init__(self, context, start=None, limit=None, community_id=None):
        stmt = sqlalchemy.select(db.models.posts)
        if start is not None:
            stmt = stmt.where(db.models.posts.c.id >= start)

        if community_id is not None:
            stmt = stmt.where(db.models.posts.c.community_id == community_id)

        stmt = stmt.order_by(db.models.posts.c.id)

        if limit:
            stmt = stmt.limit(limit)

        conn = context["db-conn"]

        resolverPost = Post
        community = Communities.get(context, id=community_id)
        if community.is_bridge:
            from api.bridged_round.resolvers.bridged_post import BridgedPost

            resolverPost = BridgedPost

        self._posts = [resolverPost(context, p._asdict()) for p in conn.execute(stmt)]

    def all(self):
        return self._posts

    @classmethod
    def get(_, context, id=None):
        """
        This method returs a Post.
        """
        if id is not None:
            stmt = sqlalchemy.select(db.models.posts).where(db.models.posts.c.id == id)
        fetched_post = context["db-conn"].execute(stmt).fetchone()
        if fetched_post is None:
            raise Exception(f"Post.id {id} doesn't exist")

        post = Post(context, fetched_post._asdict())

        if post.community.is_bridge:
            from api.bridged_round.resolvers.bridged_post import BridgedPost

            return BridgedPost(post._context, post._fields)

        return post


class Post:
    def __init__(self, context, fields):
        self._initializing = True
        self._context = context
        self._fields = fields
        for k, v in fields.items():
            setattr(self, k, v)
        self._initializing = False

    def __str__(self):
        return str(self._fields)

    @property
    def community(self):
        conn = self._context["db-conn"]
        communities = db.models.communities
        stmt = sqlalchemy.select(communities).where(
            communities.c.id == self.community_id
        )
        result = conn.execute(stmt).fetchone()
        if result.bridge_id is None:
            return Community(self._context, result._asdict())
        return BridgedCommunity(self._context, result._asdict())

    @property
    def author(self):
        author = Personas.get(self._context, persona_id=self.author_id)
        return author

    @property
    def prompt(self):
        if not self.is_prompt:
            return None
        return api.resolvers.Prompts.get(self._context, post_id=self.id)

    @property
    def audio(self):
        audio = api.resolvers.Audios.get(self._context, self.audio_id)
        return audio

    @property
    def is_prompt(self):
        return self.in_reply_to is None

    @property
    def round(self):
        if self.is_prompt:
            return self.prompt.round

        replied_post = api.resolvers.Posts.get(self._context, id=self.in_reply_to)
        return replied_post.round

    @property
    def processing_status_dict(self):
        # IMPORTANT: frontend requires these flags to be all True to
        # display audio player (in addition to other constraints such
        # as round.allows_playing_by(persona)).
        audio = self.audio
        response = {}

        response["mp3"] = bool(audio.mp3)
        # response['waveform'] = bool(audio.wave_values)

        if self.community._FLAG_enabled_mod_actions:
            response["transcript"] = bool(audio.transcripts)
            response["ai_moderated"] = bool(self.ai_mod_output)

            pending_reviews = self.author_pending_disputes
            response["done_with_author_review"] = not bool(len(pending_reviews))

            if not self.community.is_bridge:
                has_pending_mod_reviews = bool(len(self.moderator_pending_disputes))
                response["done_with_moderator_review"] = not has_pending_mod_reviews

        return response

    @property
    @moderation_except(default=lambda: "{}")
    def display_lenses(self):
        return json.dumps({})

    @moderation_except(default=list)
    def _pending_review(self, reviewer=None, reviewer_ids=None):
        import api.content_mod.resolvers as mod_resolvers

        disputes = mod_resolvers.Disputes(
            self._context,
            post=self,
            reviewer=reviewer,
            reviewer_ids=reviewer_ids,
            reviews_status="requested",
            status="pending",
        ).all()
        return disputes

    @property
    @moderation_except(default=list)
    def author_pending_disputes(self):
        return self._pending_review(reviewer=self.author)

    @property
    @moderation_except(default=list)
    def moderator_pending_disputes(self):
        reviewer_ids = self.community.get_personas_id_by_role("moderator")
        return self._pending_review(reviewer_ids=reviewer_ids)

    @property
    @moderation_except(default=list)
    def all_disputes(self):
        import api.content_mod.resolvers as mod_resolvers

        disputes = mod_resolvers.Disputes(
            self._context,
            post=self,
            status=None,
        ).all()
        return disputes

    @property
    def processing_status(self):
        str_response = json.dumps(self.processing_status_dict)
        return str_response

    @moderation_required
    def ai_moderate(self, mode="audio.plain_transcript"):
        checks = assistant_checks_post(
            community=self.community, post=self, content=mode
        )
        checks = {
            "checks": [{"ctype": "a", "checks": checks, "cid": self.community_id}]
        }
        return checks

    @property
    @moderation_except(default=str)
    def ai_mod_output(self):
        # Not forbidding because graphql consumes it.
        field = self._fields["ai_mod_output"]

        if field:
            checks = json.loads(field).get("checks", [])
            if (len(checks) == 1 and checks[0]["ctype"] == "a") or len(checks) == 3:
                # version > 3.3.7
                return field

            # version <= 3.3.7
            return json.dumps(
                {"checks": [{"ctype": "a", "checks": field, "cid": self.community_id}]}
            )

    @property
    @moderation_required
    def ai_mod_output_dict(self):
        if self.ai_mod_output:
            return json.loads(self.ai_mod_output)
        return {}

    @ai_mod_output.setter
    @moderation_except(default=lambda: None, verbose=False)
    def ai_mod_output(self, value):
        if not self._initializing:
            if self.community._FLAG_enabled_mod_actions:
                conn = self._context["db-conn"]
                stmt = (
                    sqlalchemy.update(db.models.posts)
                    .where(db.models.posts.c.id == self.id)
                    .values(ai_mod_output=value)
                )
                conn.execute(stmt)
                conn.commit()
        self._fields["ai_mod_output"] = value

    @property
    @moderation_except(default=bool)
    def mod_removed(self):
        return self._fields["mod_removed"]

    @mod_removed.setter
    @moderation_except(default=lambda: None, verbose=False)
    def mod_removed(self, value):
        if not self._initializing:
            if self.community._FLAG_enabled_mod_actions:
                conn = self._context["db-conn"]
                stmt = (
                    sqlalchemy.update(db.models.posts)
                    .where(db.models.posts.c.id == self.id)
                    .values(mod_removed=value)
                )
                conn.execute(stmt)
                conn.commit()
        self._fields["mod_removed"] = value

    @moderation_required
    def register_ai_moderation(
        self, checks, request_mod_reviews=False, request_author_reviews=False
    ):
        """
        checks: dict, output from self.ai_moderate
        request_mod_reviews: bool, whether to trigger a dispute
        """
        # commits ai_mod_output value to DB
        self.ai_mod_output = json.dumps(checks)
        if request_mod_reviews or request_author_reviews:
            violation_behaviors = self.ai_violation_behaviors
            self.register_ai_violation_behav(
                violation_behaviors,
                checks["checks"][0]["checks"]["post"],
                request_mod_reviews,
                request_author_reviews,
            )

    @property
    def ai_violation_behaviors(self):
        checks = self.ai_mod_output_dict
        violation_behaviors = []
        for check in checks["checks"]:
            violation_b = check["checks"]["flags"].get("Violation behaviors", {})
            if len(violation_b) > 0:
                violation_behaviors.append(
                    {
                        "ctype": check["ctype"],
                        "reason": violation_b,
                        "cid": check["cid"],
                    }
                )
        return violation_behaviors

    @moderation_required
    def register_ai_violation_behav(
        self,
        behaviors,
        post_info,
        request_mod_reviews=False,
        request_author_reviews=False,
    ):
        # TODO(bcsaldias): mod. 4. include rationale / explanation! post_info {id, text, content}
        from api.content_mod.resolvers import Disputes

        if len(behaviors) == 0:
            return
        Disputes.ai_create(
            self._context,
            post_id=self.id,
            metadata=behaviors,
            request_mod_reviews=request_mod_reviews,
            request_author_reviews=request_author_reviews,
        )

    @moderation_required
    def run_ai_mod(
        self, mode_mod, request_mod_reviews=False, request_author_reviews=False
    ):
        """
        mode_mod: str, what post.field should we used for mod
        request_mod_reviews: bool, whether to trigger a dispute
        request_author_reviews: bool, whether to trigger a dispute
        """

        post = self
        community = post.community
        if community.is_bridge:
            from api.bridged_round.resolvers.bridged_post import BridgedPost

            post = BridgedPost(post._context, post._fields)

        checks = post.ai_moderate(mode=mode_mod)
        post.register_ai_moderation(
            checks,
            request_mod_reviews=request_mod_reviews,
            request_author_reviews=request_author_reviews,
        )
        return checks

    @property
    @moderation_required
    def mod_metadata_dict(self):
        if self.mod_metadata:
            loaded = json.loads(self.mod_metadata)
            return {int(k): loaded[k] for k in loaded.keys()}

        return {}

    @moderation_required
    def update_mod_metadata(self, metadata):
        if type(metadata) == dict:  # noqa: E721
            metadata = json.dumps(metadata)
        conn = self._context["db-conn"]
        stmt = (
            sqlalchemy.update(db.models.posts)
            .where(db.models.posts.c.id == self.id)
            .values(mod_metadata=metadata)
        )
        conn.execute(stmt)
        conn.commit()

    @moderation_required
    def update_mod_cid_flag(self, cid, value):
        assert value in ["hide", "show"], "invalid value."
        current_mod_metadata_dict = self.mod_metadata_dict
        current_mod_metadata_dict[cid] = value
        self.update_mod_metadata(current_mod_metadata_dict)

    @moderation_required
    def get_mod_cid_flag(self, cid):
        return self.mod_metadata_dict.get(cid)


def create_post(context, audio_id=None, **kwargs):
    conn = context["db-conn"]
    values = {
        "text": kwargs.get("text"),
        "audio_id": audio_id,
        "community_id": kwargs.get("community_id"),
        "author_id": kwargs.get("author_id"),
        "foraConv_id": kwargs.get("foraConv_id"),
        "in_reply_to": kwargs.get("in_reply_to"),
        "creation_time": time.utcnow(),
    }
    if kwargs.get("id"):
        values["id"] = kwargs.get("id")

    stmt = insert(db.models.posts).values(**values)

    result = conn.execute(stmt)

    new_post_id = result.inserted_primary_key[0]
    conn.commit()

    logger.info(f"PROCESS_NEW_POST_IN_SERIES {PROCESS_NEW_POST_IN_SERIES}")
    if audio_id and PROCESS_NEW_POST_IN_SERIES:
        logger.info("new-post -> setting up AudioBucket")
        bucket = AudioBucket()
        bucket.process_audio_from_aws(
            audio_id, context=context, request_author_reviews=True
        )

    post = Posts.get(context, new_post_id)
    return post
