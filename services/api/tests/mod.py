"""
from services/
python3 -m unittest api/tests/mod.py
"""

import sys
import json

sys.path.append("./")
import unittest
from api.content_mod.resolvers import Disputes, Dispute, Reviews, Review
from api.bridged_round.resolvers import BridgedCommunities
from api.resolvers import Personas, Communities, Posts
from api.tests import TestBase, get_context, test_values
import api.resolvers as resolvers


class TestModerationMethods(TestBase):
    @classmethod
    def setUpClass(cls):
        TestBase().setUpClass()
        cls.persona_idx = 13
        cls.context = get_context()
        cls.cid = test_values["communities"][0]["id"]
        ##### < LOCAL setUp
        cls.community = Communities.get(cls.context, id=cls.cid)
        for i in range(4):
            pid = test_values["personas"][cls.persona_idx + i]["id"]
            Personas.get(cls.context, persona_id=pid).join_community(cls.community)
        cls.members = cls.community.members
        cls.community.add_flag("enable_content_moderation_moderator_actions")
        cls.community.add_flag("enable_content_moderation_persona_actions")
        cls.community.add_flag("enable_bridged_round")
        cls.community.handle_role(cls.members[0], "moderator", "add")
        cls.community.handle_role(cls.members[1], "moderator", "add")
        cls.posts = [
            Posts.get(cls.context, id=test_values["posts"][i]["id"]) for i in range(4)
        ]
        ##### LOCAL setUp >

    @classmethod
    def tearDownClass(cls):
        ##### < LOCAL tearDown
        cls.community.remove_flag("enable_content_moderation_moderator_actions")
        cls.community.remove_flag("enable_content_moderation_persona_actions")
        cls.community.remove_flag("enable_bridged_round")
        cls.community.handle_role(cls.members[0], "moderator", "revoke")
        cls.community.handle_role(cls.members[1], "moderator", "revoke")
        ##### LOCAL tearDown >
        TestBase().tearDownClass()

    def test_mod_submits_remove_review(self):
        disputed_post = self.posts[-1]
        Disputes.persona_create(
            context=self.context,
            post_id=disputed_post.id,
            disputer_id=self.members[0].id,
            comment="wt hell",
            ctype="a",
            community_id=self.community.id,
            request_mod_reviews=True,
        )
        pending_disputes = disputed_post.moderator_pending_disputes
        pending_review = pending_disputes[0].reviews[0]
        self.assertEqual(pending_review._mod_submits_review("remove", {}), None)
        post = pending_disputes[0].post
        self.assertEqual(post.mod_metadata_dict[self.cid], "hide")
        self.assertEqual(post.mod_removed, True)

    def test_mod_submits_release_review(self):
        disputed_post = self.posts[-2]
        Disputes.persona_create(
            context=self.context,
            post_id=disputed_post.id,
            disputer_id=self.members[0].id,
            comment="wt hell",
            ctype="a",
            community_id=self.community.id,
            request_mod_reviews=True,
        )
        pending_disputes = disputed_post.moderator_pending_disputes
        pending_review = pending_disputes[0].reviews[0]
        self.assertEqual(pending_review._mod_submits_review("release", {}), None)
        post = pending_disputes[0].post
        self.assertEqual(post.mod_metadata_dict[self.cid], "show")
        self.assertEqual(post.mod_removed, False)


class TestBridgedModerationMethods(TestBase):
    @classmethod
    def setUpClass(cls):
        TestBase().setUpClass()
        cls.persona_idx = 20
        cls.context = get_context()
        cls.cids = [test_values["communities"][i]["id"] for i in range(1, 3)]
        cls.communities = [Communities.get(cls.context, id=cid) for cid in cls.cids]
        ##### < LOCAL setUp
        for i in range(4):
            pid = test_values["personas"][cls.persona_idx + i]["id"]
            Personas.get(cls.context, persona_id=pid).join_community(cls.communities[0])
        for i in range(4):
            pid = test_values["personas"][cls.persona_idx + i + 4]["id"]
            Personas.get(cls.context, persona_id=pid).join_community(cls.communities[1])

        for c in cls.communities:
            c.add_flag("enable_content_moderation_moderator_actions")
            c.add_flag("enable_content_moderation_persona_actions")
            c.add_flag("enable_bridged_round")
            c.handle_role(c.members[0], "moderator", "add")
            c.handle_role(c.members[1], "moderator", "add")

        bridged_community_id = min(cls.cids) - 100000
        print("bridged_community_id", bridged_community_id)
        BridgedCommunities.create(
            cls.context,
            author_id=None,
            community_ids=cls.cids,
            id=bridged_community_id,
        )

        metadata = {
            "behaviors": {
                "encourage": "",
                "ban": "1. Don't share sad stories.\n2. Don't share personal information.",
            }
        }
        values = {"metadata": json.dumps(metadata)}
        c = Communities.update(cls.context, id=cls.cids[0], values=values)
        cls.communities[0] = c

        metadata = {
            "behaviors": {
                "encourage": "",
                "ban": "1. You an only share where you are from but no other personal information.",
            }
        }
        values = {"metadata": json.dumps(metadata)}
        c = Communities.update(cls.context, id=cls.cids[1], values=values)
        cls.communities[1] = c

        metadata = {
            "behaviors": {
                "encourage": "",
                "ban": "1. Don't share personal information.",
            }
        }
        values = {"metadata": json.dumps(metadata)}
        c = Communities.update(cls.context, id=bridged_community_id, values=values)
        cls.bridged_community = c

        new_post = resolvers.posts.create_post(
            context=cls.context,
            author_id=c.members[0].id,
            text="",
            community_id=bridged_community_id,
            id=test_values["posts"][-1]["id"] - 1,
        )
        cls.disputed_post_0 = new_post

        new_post = resolvers.posts.create_post(
            context=cls.context,
            author_id=c.members[0].id,
            text="",
            community_id=bridged_community_id,
            id=test_values["posts"][-1]["id"] - 2,
        )
        cls.disputed_post_1 = new_post

        ##### LOCAL setUp >

    @classmethod
    def tearDownClass(cls):
        ##### < LOCAL tearDown
        for c in cls.communities:
            c.remove_flag("enable_content_moderation_moderator_actions")
            c.remove_flag("enable_content_moderation_persona_actions")
            c.remove_flag("enable_bridged_round")
            c.handle_role(c.members[0], "moderator", "revoke")
            c.handle_role(c.members[1], "moderator", "revoke")
        ##### LOCAL tearDown >
        TestBase().tearDownClass()

    def test_not_is_bridged_dispute_remove(self):
        disputed_post = self.disputed_post_0
        selected_community = self.bridged_community.bridges[0]
        Disputes.persona_create(
            context=self.context,
            post_id=disputed_post.id,
            disputer_id=selected_community.members[0].id,
            comment="wt hell",
            ctype="a",
            community_id=selected_community.id,
            request_mod_reviews=True,
        )
        pending_disputes = disputed_post.moderator_pending_disputes
        pending_review = pending_disputes[0].reviews[0]
        self.assertEqual(pending_review._mod_submits_review("remove", {}), None)
        post = pending_disputes[0].post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "hide")
        self.assertEqual(post.mod_removed, False)

    def test_not_is_bridged_dispute_release(self):
        disputed_post = self.disputed_post_0
        selected_community = self.bridged_community.bridges[0]
        Disputes.persona_create(
            context=self.context,
            post_id=disputed_post.id,
            disputer_id=selected_community.members[0].id,
            comment="wt hell",
            ctype="a",
            community_id=selected_community.id,
            request_mod_reviews=True,
        )
        pending_disputes = disputed_post.moderator_pending_disputes
        pending_review = pending_disputes[0].reviews[0]
        self.assertEqual(pending_review._mod_submits_review("release", {}), None)
        post = pending_disputes[0].post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "show")
        self.assertEqual(post.mod_removed, False)

    def test_is_bridged_dispute_remove(self):
        disputed_post = self.disputed_post_1
        selected_community = self.bridged_community
        Disputes.persona_create(
            context=self.context,
            post_id=disputed_post.id,
            disputer_id=selected_community.members[0].id,
            comment="wt hell",
            ctype="ab",
            community_id=selected_community.id,
            request_mod_reviews=True,
        )
        pending_disputes = disputed_post.moderator_pending_disputes
        pending_dispute = pending_disputes[0]
        pending_reviews = pending_dispute.reviews

        self.assertEqual(len(pending_disputes), 1)
        self.assertEqual(len(pending_reviews), 3)  # 2 + 2 - 1

        c0 = self.bridged_community.bridges[0]
        c0_mods = c0.members[:2]
        for m in c0_mods:
            self.assertIn("moderator", m.role_in_community(c0))

        c1 = self.bridged_community.bridges[1]
        c1_mods = c1.members[:2]
        for m in c1_mods:
            self.assertIn("moderator", m.role_in_community(c1))

        reviews_per_comm = {c0.id: [], c1.id: []}
        for pr in pending_reviews:
            reviewer = pr.reviewer
            if "moderator" in reviewer.role_in_community(c0):
                reviews_per_comm[c0.id].append(pr)
            if "moderator" in reviewer.role_in_community(c1):
                reviews_per_comm[c1.id].append(pr)

        selected_pr = reviews_per_comm[c0.id][0]
        place_holder_metadata = json.dumps(
            {"action": "remove", "sub_actions": {"with note": "test case"}}
        )
        selected_pr.update_metadata(place_holder_metadata)
        post = pending_dispute.post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "hide")
        self.assertEqual(post.mod_removed, False)
        dispute = Disputes.get(self.context, id=pending_dispute.id)
        self.assertNotEqual(dispute.status, "resolved")

        selected_pr = reviews_per_comm[c1.id][0]
        place_holder_metadata = json.dumps(
            {"action": "release", "sub_actions": {"with note": "test case"}}
        )
        selected_pr.update_metadata(place_holder_metadata)
        post = pending_dispute.post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "hide")
        self.assertEqual(post.mod_removed, False)
        dispute = Disputes.get(self.context, id=pending_dispute.id)
        self.assertNotEqual(dispute.status, "resolved")

        selected_pr = reviews_per_comm[c1.id][1]
        place_holder_metadata = json.dumps(
            {"action": "remove", "sub_actions": {"with note": "test case"}}
        )
        selected_pr.update_metadata(place_holder_metadata)
        post = pending_dispute.post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "hide")
        self.assertEqual(post.mod_removed, False)
        dispute = Disputes.get(self.context, id=pending_dispute.id)
        self.assertEqual(dispute.status, "resolved")

    def test_is_bridged_dispute_release(self):
        disputed_post = self.disputed_post_1
        selected_community = self.bridged_community
        Disputes.persona_create(
            context=self.context,
            post_id=disputed_post.id,
            disputer_id=selected_community.members[0].id,
            comment="wt hell",
            ctype="ab",
            community_id=selected_community.id,
            request_mod_reviews=True,
        )
        pending_disputes = disputed_post.moderator_pending_disputes
        pending_dispute = pending_disputes[0]
        pending_reviews = pending_dispute.reviews

        self.assertEqual(len(pending_disputes), 1)
        self.assertEqual(len(pending_reviews), 3)  # 2 + 2 - 1

        c0 = self.bridged_community.bridges[0]
        c0_mods = c0.members[:2]
        for m in c0_mods:
            self.assertIn("moderator", m.role_in_community(c0))

        c1 = self.bridged_community.bridges[1]
        c1_mods = c1.members[:2]
        for m in c1_mods:
            self.assertIn("moderator", m.role_in_community(c1))

        reviews_per_comm = {c0.id: [], c1.id: []}
        for pr in pending_reviews:
            reviewer = pr.reviewer
            if "moderator" in reviewer.role_in_community(c0):
                reviews_per_comm[c0.id].append(pr)
            if "moderator" in reviewer.role_in_community(c1):
                reviews_per_comm[c1.id].append(pr)

        selected_pr = reviews_per_comm[c0.id][0]
        place_holder_metadata = json.dumps(
            {"action": "release", "sub_actions": {"with note": "test case"}}
        )
        selected_pr.update_metadata(place_holder_metadata)
        post = pending_dispute.post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "hide")
        self.assertEqual(post.mod_removed, False)
        dispute = Disputes.get(self.context, id=pending_dispute.id)
        self.assertNotEqual(dispute.status, "resolved")

        selected_pr = reviews_per_comm[c1.id][0]
        place_holder_metadata = json.dumps(
            {"action": "remove", "sub_actions": {"with note": "test case"}}
        )
        selected_pr.update_metadata(place_holder_metadata)
        post = pending_dispute.post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "hide")
        self.assertEqual(post.mod_removed, False)
        dispute = Disputes.get(self.context, id=pending_dispute.id)
        self.assertNotEqual(dispute.status, "resolved")

        selected_pr = reviews_per_comm[c1.id][1]
        place_holder_metadata = json.dumps(
            {"action": "release", "sub_actions": {"with note": "test case"}}
        )
        selected_pr.update_metadata(place_holder_metadata)
        post = pending_dispute.post
        self.assertEqual(post.mod_metadata_dict[selected_community.id], "show")
        self.assertEqual(post.mod_removed, False)
        dispute = Disputes.get(self.context, id=pending_dispute.id)
        self.assertEqual(dispute.status, "resolved")


if __name__ == "__main__":
    unittest.main(verbosity=1)
