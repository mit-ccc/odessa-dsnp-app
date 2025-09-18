import json
import logging

import sqlalchemy
from db.models import mod_reviews

from api.content_mod import moderation_required
from api.resolvers import Personas
from api.time import time

logger = logging.getLogger("api.mod_reviews")


class Reviews:
    def __init__(self, context):
        stmt = sqlalchemy.select(mod_reviews)
        stmt = stmt.order_by(mod_reviews.c.id)
        conn = context["db-conn"]
        self._reviews = [Review(context, r._asdict()) for r in conn.execute(stmt)]

    def all(self):
        return self._reviews

    @staticmethod
    def get(context, id=None):
        """
        This method returs a Review.
        """
        stmt = sqlalchemy.select(mod_reviews).where(mod_reviews.c.id == id)
        review = context["db-conn"].execute(stmt).fetchone()
        if review is None:
            raise Exception(f"Review.id {id} doesn't exist")
        return Review(context, review._asdict())

    @classmethod
    @moderation_required
    def create(_, context, dispute_id, reviewer_id, metadata=""):
        values = {
            "status": "requested",  # in ['requested', 'pending', 'resolved']
            "dispute_id": dispute_id,
            "reviewer_id": reviewer_id,
            "metadata": metadata,
            "creation_time": time.now(),
        }
        conn = context["db-conn"]
        stmt = sqlalchemy.insert(mod_reviews).values(values)
        result = conn.execute(stmt)
        new_review_id = result.inserted_primary_key[0]
        return new_review_id


class Review:
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
    def status(self):
        return self._fields["status"]

    @status.setter
    def status(self, value):
        if not self._initializing:
            conn = self._context["db-conn"]
            stmt = (
                sqlalchemy.update(mod_reviews)
                .where(mod_reviews.c.id == self.id)
                .values(status=value)
            )
            conn.execute(stmt)
        self._fields["status"] = value

    @property
    def dispute(self):
        from api.content_mod.resolvers import Disputes

        return Disputes.get(self._context, self.dispute_id)

    @property
    def reviewer(self):
        return Personas.get(self._context, self.reviewer_id)

    @property
    def note_by_reviewer(self):
        """
        self.metadata looks like
        {
            "action":"remove",
            "sub_actions": {"note to author": "belen test"}
        }
        """
        if self.metadata:
            actions_dict = json.loads(self.metadata)
            sub_actions = actions_dict.get("sub_actions", None)
            if sub_actions:
                note_to_author = sub_actions.get("note to author")
                if type(note_to_author) is str:
                    return note_to_author
                with_note = sub_actions.get("with note")
                if type(with_note) is str:
                    return with_note
        return None

    @property
    def action(self):
        if self.metadata:
            actions_dict = json.loads(self.metadata)
            return actions_dict.get("action")

    @moderation_required
    def _author_submits_review(self, action, actions_dict):
        dispute = self.dispute
        if action == "release":
            dispute.request_mod_reviews()
        if action == "remove":
            dispute.post.mod_removed = True
            dispute.post.update_mod_cid_flag(dispute.policy_cid, "hide")
            dispute.status = "resolved"

            # resolves disputes pending by author for same post, null metadata for these
            # post = dispute.post
            # for d in post.author_pending_disputes:
            #     if d.status != "resolved":
            #         d.status = "resolved"
            #         for r in d.reviews:
            #             if r.status != "resolved" and r.reviewer_id == post.author_id:
            #                 r.status = "resolved"

        self.status = "resolved"

    @moderation_required
    def _mod_submits_review(self, action, actions_dict):
        # TODO(bcsaldias): mod. TEST.
        dispute = self.dispute
        community = dispute.post.community

        # Community: any moderator can resolve Dispute.
        if not community.is_bridge:
            if action == "remove":
                dispute.post.mod_removed = True
                dispute.post.update_mod_cid_flag(dispute.policy_cid, "hide")
            if action == "release":
                dispute.post.mod_removed = False
                dispute.post.update_mod_cid_flag(dispute.policy_cid, "show")
            dispute.status = "resolved"
            self.status = "resolved"
            return

        # BridgedCommunity: one mod from each bridge must agree to resolve Dispute.
        is_bridged_dispute = dispute.is_bridged_dispute
        if not is_bridged_dispute:
            if action == "remove":
                dispute.post.mod_removed = False
                dispute.post.update_mod_cid_flag(dispute.policy_cid, "hide")
            if action == "release":
                dispute.post.mod_removed = False
                dispute.post.update_mod_cid_flag(dispute.policy_cid, "show")
            dispute.status = "resolved"
            self.status = "resolved"
            return

        if is_bridged_dispute:
            conditions = {
                "release": {cid: 0 for cid in community.bridge_ids},
                "remove": {cid: 0 for cid in community.bridge_ids},
            }
            for r in dispute.reviews:
                if r.action:
                    mod_in_c0 = r.reviewer.role_in_community(community.bridges[0])
                    mod_in_c1 = r.reviewer.role_in_community(community.bridges[1])
                    if "moderator" in mod_in_c0:
                        conditions[r.action][community.bridge_ids[0]] += 1
                    if "moderator" in mod_in_c1:
                        conditions[r.action][community.bridge_ids[1]] += 1

            release_post = all([v > 0 for v in conditions["release"].values()])
            if release_post:
                dispute.post.mod_removed = False
                dispute.post.update_mod_cid_flag(dispute.policy_cid, "show")
                dispute.status = "resolved"

            remove_post = all([v > 0 for v in conditions["remove"].values()])
            if remove_post:
                dispute.post.mod_removed = False
                dispute.post.update_mod_cid_flag(dispute.policy_cid, "hide")
                dispute.status = "resolved"

            self.status = "resolved"
            return

    @moderation_required
    def _act_on_metadata(self, actions_dict):
        """
        actions_dict:
        {
            "action":"remove",
            "sub_actions": {"note to author": "belen test"}
        }
        """
        action = actions_dict.get("action")
        assert action in [
            "release",
            "remove",
        ], "action must be in ['release', 'remove']"
        post = self.dispute.post
        if post.author_id == self.reviewer_id:
            self._author_submits_review(action, actions_dict)
        else:
            self._mod_submits_review(action, actions_dict)

    @property
    def metadata_dict(self):
        return json.loads(self.metadata)

    @moderation_required
    def update_metadata(self, metadata):
        # return string
        conn = self._context["db-conn"]
        stmt = (
            sqlalchemy.update(mod_reviews)
            .where(mod_reviews.c.id == self.id)
            .values(metadata=metadata)
        )
        conn.execute(stmt)
        conn.commit()
        actions_dict = json.loads(metadata)
        self._act_on_metadata(actions_dict)
        return "Done."
