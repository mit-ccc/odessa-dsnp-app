import logging

import sqlalchemy
import db.models
from db.models import mod_disputes, mod_reviews
from api.resolvers import Communities, Post, Persona, Personas, create_persona
from api.content_mod import moderation_required
from api.time import time
import json

logger = logging.getLogger("api.mod_disputes")


class Disputes:
    def __init__(
        self,
        context,
        community=None,
        disputer=None,
        poster=None,
        reviewer=None,
        reviewer_ids=None,
        post=None,
        reviews_status=None,
        status="pending",
    ):
        conn = context["db-conn"]
        self._community = community

        if not any([community, disputer, poster, post]):
            stmt = sqlalchemy.select(mod_disputes)

        selected_posts = None
        posts = db.models.posts
        if post:
            # go by post
            selected_posts = sqlalchemy.select(posts).where(
                (posts.c.id == post.id) & (posts.c.mod_metadata.isnot(None))
            )
        elif community:
            # go by community to find all posts in a community.
            selected_posts = sqlalchemy.select(posts).where(
                (posts.c.community_id == community.id)
                & (posts.c.mod_metadata.isnot(None))
            )
        elif poster:
            # go by poster
            selected_posts = sqlalchemy.select(posts).where(
                (posts.c.author_id == poster.id) & (posts.c.mod_metadata.isnot(None))
            )

        if selected_posts is not None:
            # find all disputes for the selected_posts
            selected_posts_subquery = selected_posts.subquery()
            post_disputes = mod_disputes.join(
                selected_posts_subquery,
                mod_disputes.c.post_id == selected_posts_subquery.c.id,
            )
            stmt = sqlalchemy.select(post_disputes)

        if disputer:
            stmt_subquery = stmt.subquery()
            stmt = sqlalchemy.select(mod_disputes.join(stmt_subquery)).where(
                mod_disputes.c.disputer_id == disputer.id
            )

        if reviewer:
            stmt_subquery = stmt.subquery()
            stmt = (
                sqlalchemy.select(mod_disputes)
                .join(mod_reviews)
                .where(mod_reviews.c.dispute_id == mod_disputes.c.id)
                .select_from(stmt_subquery)
                .where(mod_reviews.c.reviewer_id == reviewer.id)
            )

        if reviewer_ids:
            stmt_subquery = stmt.subquery()
            stmt = (
                sqlalchemy.select(mod_disputes)
                .join(mod_reviews)
                .where(mod_reviews.c.dispute_id == mod_disputes.c.id)
                .select_from(stmt_subquery)
                .where(mod_reviews.c.reviewer_id.in_(reviewer_ids))
            )

        if status:
            stmt = stmt.where(mod_disputes.c.status == status).order_by(
                mod_disputes.c.id
            )

        if reviews_status:
            aliases = set()
            for from_obj in stmt.get_final_froms():
                for column in from_obj.columns:
                    aliases.add(column.key)
            if "reviewer_id" not in aliases:
                stmt = stmt.join(mod_reviews).where(
                    mod_reviews.c.status == reviews_status
                )
            else:
                stmt = stmt.where(mod_reviews.c.status == reviews_status)

        stmt = stmt.distinct()

        self._disputes = [
            Dispute(context, d._asdict(), community, reviews_status)
            for d in conn.execute(stmt)
        ]

    def all(self):
        return self._disputes

    @staticmethod
    def get(context, id=None, community=None):
        """
        This method returs a Dispute.
        """
        stmt = sqlalchemy.select(mod_disputes).where(mod_disputes.c.id == id)
        dispute = context["db-conn"].execute(stmt).fetchone()
        if dispute is None:
            raise Exception(f"Dispute.id {id} doesn't exist")
        return Dispute(context, dispute._asdict(), community)

    @classmethod
    @moderation_required
    def create(
        _,
        context,
        post_id,
        disputer_id,
        metadata="",
        request_mod_reviews=False,
        request_author_reviews=False,
    ):
        values = {
            "status": "pending",  # in ['pending', 'resolved']
            "post_id": post_id,
            "disputer_id": disputer_id,
            "metadata": json.dumps(metadata),
            "creation_time": time.now(),
        }
        conn = context["db-conn"]
        stmt = sqlalchemy.insert(mod_disputes).values(values)
        result = conn.execute(stmt)
        new_dispute_id = result.inserted_primary_key[0]

        dispute = Disputes.get(context, new_dispute_id)
        dispute.post.update_mod_cid_flag(metadata["cid"], "hide")

        if request_mod_reviews or request_author_reviews:
            if request_mod_reviews:
                dispute.request_mod_reviews()
            if request_author_reviews:
                dispute.request_author_reviews()

        return new_dispute_id

    @staticmethod
    def get_or_create_ai_persona(context):
        placeholder_id, placeholder_str = -1000000, "MOD-BOT"
        ai_persona = Personas.get(context, persona_id=placeholder_id)
        if ai_persona is None:
            logger.info(f"creating AI persona with id {placeholder_id}")
            ai_persona = create_persona(
                context=context,
                name=placeholder_str,
                bio=placeholder_str,
                pkh=placeholder_str,
                assigned_id=placeholder_id,
            )
        return ai_persona

    @classmethod
    @moderation_required
    def ai_create(
        _,
        context,
        post_id,
        metadata={},
        request_mod_reviews=False,
        request_author_reviews=False,
    ):
        ai_persona = Disputes.get_or_create_ai_persona(context)

        params = {
            "context": context,
            "post_id": post_id,
            "disputer_id": ai_persona.id,
            "metadata": metadata,
            "request_mod_reviews": request_mod_reviews,
            "request_author_reviews": request_author_reviews,
        }
        Disputes.trigger_creation(params)

    @classmethod
    @moderation_required
    def persona_create(
        _,
        context,
        post_id,
        disputer_id,
        comment,
        ctype,
        community_id,
        request_mod_reviews=False,
        request_author_reviews=False,
    ):
        metadata = [
            {
                "ctype": ctype,
                "reason": {"report_comment": comment},
                "cid": community_id,
            }
        ]

        params = {
            "context": context,
            "post_id": post_id,
            "disputer_id": disputer_id,
            "metadata": metadata,
            "request_mod_reviews": request_mod_reviews,
            "request_author_reviews": request_author_reviews,
        }
        Disputes.trigger_creation(params)

    @classmethod
    # @moderation_required
    def trigger_creation(_, params):
        """Triggers creation of Disputes based on list metadata."""
        assert type(params["metadata"]) == list, "metadata must be of type list."  # noqa: E721
        metadata = params["metadata"]
        for single_behav in metadata:
            params["metadata"] = single_behav
            Disputes.create(**params)


class Dispute:
    def __init__(self, context, fields, community=None, reviews_status=None):
        self._initializing = True
        self._context = context
        self._fields = fields
        self._community = community
        self._reviews_status = reviews_status
        for k, v in fields.items():
            setattr(self, k, v)
        self._initializing = False

    def __str__(self):
        str_rep = str(self._fields)
        for r in self.reviews:
            str_rep = str_rep + "\n\t" + str(r)
        return str_rep

    @property
    def status(self):
        return self._fields["status"]

    @status.setter
    def status(self, value):
        if not self._initializing:
            conn = self._context["db-conn"]
            stmt = (
                sqlalchemy.update(mod_disputes)
                .where(mod_disputes.c.id == self.id)
                .values(status=value)
            )
            conn.execute(stmt)
        self._fields["status"] = value

    @property
    def post(self):
        posts = db.models.posts
        stmt = sqlalchemy.select(posts).where(posts.c.id == self.post_id)
        conn = self._context["db-conn"]
        result = conn.execute(stmt).fetchone()
        post = Post(self._context, result._asdict())
        if post.community.is_bridge:
            from api.bridged_round.resolvers.bridged_post import BridgedPost

            return BridgedPost(self._context, result._asdict())
        return post

    @property
    def disputer(self):
        personas = db.models.personas
        stmt = sqlalchemy.select(personas).where(personas.c.id == self.disputer_id)
        conn = self._context["db-conn"]
        result = conn.execute(stmt).fetchone()
        return Persona(self._context, result._asdict())

    @property
    def note_by_disputer(self):
        """
        self.metadata looks like
        {
            "ctype": "a",
            "reason" :
                {
                    "report_comment": "testing tihs :P"
                }
            "cid": int
        }
        when disputed by persona or ai
        """
        # FIXME(bcsaldias): mod. clean format by AI and by persona disputer.
        if self.metadata:
            violation_behaviors = self.metadata_dict.get("violation_behaviors")
            if violation_behaviors:
                return json.dumps(violation_behaviors)
            return json.dumps(self.metadata_dict.get("reason", {}))

        return self.metadata

    @property
    def note_by_ai(self):
        """
        self.metadata looks like
        {
            "ctype": "a",
            "reason" :
                    {
                        "swear words": "uses shit."
                    }
            "cid": int
        }
        when reported by AI.
        """
        if self.metadata:
            return self.metadata
        return None

    @property
    def reviews_status(self):
        # dispute status in 'pending', 'resolved'
        # in no pending reviews, then resolved.
        pass

    @property
    def metadata_dict(self):
        return json.loads(self.metadata)

    @property
    def policy_cid(self):
        return self.metadata_dict.get("cid")

    @property
    def reason(self):
        if self.note_by_disputer:
            return json.loads(self.note_by_disputer)
        return {}

    @property
    def is_bridged_dispute(self):
        return self.metadata_dict.get("ctype") == "ab"

    @moderation_required
    def request_review(self, reviewer_id):
        from api.content_mod.resolvers import Reviews

        # review status in ('requested', 'pending', 'resolved')
        new_review_id = Reviews.create(
            self._context, dispute_id=self.id, reviewer_id=reviewer_id
        )
        return Reviews.get(self._context, new_review_id)

    @moderation_required
    def request_mod_reviews(self, exclude_author=True):
        community = self._community
        if community is None:
            community = self._community = self.post.community

        if community.is_bridge:
            community = Communities.get(self._context, id=self.metadata_dict["cid"])

        mod_ids = community.get_personas_id_by_role("moderator")
        if exclude_author and self.post.author_id in mod_ids:
            mod_ids.pop(mod_ids.index(self.post.author_id))

        for mod_id in mod_ids:
            self.request_review(mod_id)

    @moderation_required
    def request_author_reviews(self):
        author_id = self.post.author_id
        self.request_review(author_id)

    @property
    @moderation_required
    def reviews(self):
        from api.content_mod.resolvers import Review

        conn = self._context["db-conn"]
        stmt = sqlalchemy.select(mod_reviews).where(mod_reviews.c.dispute_id == self.id)
        if self._reviews_status:
            stmt = stmt.where(mod_reviews.c.status == self._reviews_status)
        reviews = [Review(self._context, r._asdict()) for r in conn.execute(stmt)]
        return reviews
