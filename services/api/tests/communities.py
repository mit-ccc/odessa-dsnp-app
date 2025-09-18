"""
from services/
python3 -m unittest api/tests/communities.py
"""

import sys

sys.path.append("./")
import unittest
from api.resolvers import Personas, Communities
from api.tests import TestBase, get_context, test_values


class TestCommunityMethods(TestBase):
    def test_join_leave_community(self, persona_idx=12):
        """
        Testing registering member and unregistering member.
        """
        context = get_context()
        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "registered")

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "already registered")

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "unregistered")

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "already unregistered")


if __name__ == "__main__":
    unittest.main(verbosity=1)
