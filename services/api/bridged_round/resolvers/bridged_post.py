import logging
import json
from api.resolvers import Personas, Persona, Post
from api.content_mod import (
    assistant_checks_post,
    moderation_required,
    moderation_except,
)

logger = logging.getLogger("api.b_post")


class BridgedPost(Post):
    @moderation_required
    def ai_moderate(self, mode="audio.plain_transcript"):
        cab = self.community
        ca, cb = cab.bridges

        a_checks = assistant_checks_post(community=ca, post=self, content=mode)
        b_checks = assistant_checks_post(community=cb, post=self, content=mode)
        ab_checks = assistant_checks_post(community=cab, post=self, content=mode)

        checks = {
            "checks": [
                {"ctype": "a", "checks": a_checks, "cid": ca.id},
                {"ctype": "a", "checks": b_checks, "cid": cb.id},
                {"ctype": "ab", "checks": ab_checks, "cid": cab.id},
            ]
        }
        return checks

    @property
    def author(self):
        author = Personas.get(self._context, persona_id=self.author_id)
        author._fields["_known_by_requester"] = True
        # TODO(bcsaldias): this could be optimized to be one query.
        requester_pkh = self._context.get("auth0", [])
        if requester_pkh:
            requester = Personas.get(self._context, pkh=requester_pkh[0])
            known_by_requester = self.community.know_each_other(requester, author)
            author._fields["_known_by_requester"] = known_by_requester
        author = Persona(self._context, author._fields)
        return author

    # cached_property
    @property
    @moderation_except(default=lambda: "{}")
    def display_lenses(self):
        """
        Checks pending Disputes.
        """
        community = self.community
        cab_id = community.id
        ca_id, cb_id = community.bridge_ids

        response = {
            ca_id: {"action": self.get_mod_cid_flag(ca_id), "reasons": []},
            cb_id: {"action": self.get_mod_cid_flag(cb_id), "reasons": []},
            cab_id: {"action": self.get_mod_cid_flag(cab_id), "reasons": []},
        }

        for d in self.all_disputes:
            if response[d.policy_cid]["action"] == "hide":
                response[d.policy_cid]["reasons"].append(d.reason)

        response = json.dumps(response)
        return response
