"""
from services/
python3 -m unittest api/tests/permissions.py
"""

import sys

sys.path.append("./")
import unittest

from api.resolvers import Communities, Personas
from api.resolvers.permissions import Permissions
from api.tests import TestBase, get_context, test_values


class TestPermissionsMethods(TestBase):
    def test_grant_single_perm(self, persona_idx=0):
        """
        Tests trying to grant permission to a user who is not
        part of the community.
        """

        context = get_context()

        perm = f"unittest_perm_{persona_idx}"
        Permissions.metadata["permissions"].append(perm)

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        # persona has no permissions
        ps = persona.user_perm_status(community, perm)
        self.assertFalse(ps["in_role"])
        self.assertFalse(ps["is_granted"])
        self.assertFalse(ps["is_revoked"])

        # persona has no permissions
        community.handle_permission(persona, perm, "grant")
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertFalse(perm in persona_permissions)

        # persona has no permissions
        community.handle_permission(persona, perm, "revoke")
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertFalse(perm in persona_permissions)

    def test_grant_in_community_single_perm(self, persona_idx=1):
        """
        Tests granting permission to a user who is
        part of the community.
        """

        context = get_context()

        perm = f"unittest_perm_{persona_idx}"
        Permissions.metadata["permissions"].append(perm)

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        # persona has joined community
        self.assertEqual(m_status, "registered")

        # persona has no permissions
        ps = persona.user_perm_status(community, perm)
        self.assertFalse(ps["in_role"])
        self.assertFalse(ps["is_granted"])
        self.assertFalse(ps["is_revoked"])

        for i in range(2):
            community.handle_permission(persona, perm, "grant")
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has granted permission
            self.assertTrue(perm in persona_permissions)

            community.handle_permission(persona, perm, "revoke")
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona no longer has revoked permission
            self.assertFalse(perm in persona_permissions)

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        # persona has left community
        self.assertEqual(m_status, "unregistered")
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona no longer has permission
        self.assertFalse(perm in persona_permissions)

    def test_revoke_single_perm(self, persona_idx=2):
        """
        Tests trying to revoke permission to a user who is not
        part of the community.
        """

        context = get_context()

        perm = f"unittest_perm_{persona_idx}"
        Permissions.metadata["permissions"].append(perm)

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        # persona has no permissions
        ps = persona.user_perm_status(community, perm)
        self.assertFalse(ps["in_role"])
        self.assertFalse(ps["is_granted"])
        self.assertFalse(ps["is_revoked"])

        # persona has no permissions
        community.handle_permission(persona, perm, "revoke")
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertFalse(perm in persona_permissions)

        # persona has no permissions
        community.handle_permission(persona, perm, "grant")
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertFalse(perm in persona_permissions)

    def test_revoke_in_community_single_perm(self, persona_idx=3):
        """
        Tests revoking permission to a user who is
        part of the community.
        """

        context = get_context()

        perm = f"unittest_perm_{persona_idx}"
        Permissions.metadata["permissions"].append(perm)

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        # persona has joined community
        self.assertEqual(m_status, "registered")

        # persona has no permissions
        ps = persona.user_perm_status(community, perm)
        self.assertFalse(ps["in_role"])
        self.assertFalse(ps["is_granted"])
        self.assertFalse(ps["is_revoked"])

        for i in range(2):
            # persona doesn't have revoked permission
            community.handle_permission(persona, perm, "revoke")
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertFalse(perm in persona_permissions)

            # persona has granted permission
            community.handle_permission(persona, perm, "grant")
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(perm in persona_permissions)

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        # persona has left community
        self.assertEqual(m_status, "unregistered")
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona no longer has permission
        self.assertFalse(perm in persona_permissions)

    def test_add_role(self, persona_idx=4):
        """
        If persona is not part of community it shouldn't have a role.
        """
        context = get_context()

        perms = [
            f"unittest_perm_{persona_idx}_a",
            f"unittest_perm_{persona_idx}_b",
        ]
        group, role = "__unittest_group__", "unittest_role"
        for perm in perms:
            Permissions.add_permission(perm)
        Permissions.set_group(group, perms)
        Permissions.set_role(role, [group])

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        current_roles = persona.role_in_community(community)

        # persona doesn't have a role in community
        self.assertEqual(["persona"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona doesn't have permissions associated to role
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

        for i in range(2):
            community.handle_role(persona, role, "remove")
            current_roles = persona.role_in_community(community)
            # persona still doesn't have a role in community
            self.assertEqual(["persona"], current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona still doesn't have a role permissions in community
            self.assertFalse(any([perm in persona_permissions for perm in perms]))

            community.handle_role(persona, role, "add")
            current_roles = persona.role_in_community(community)
            # persona still doesn't have a role in community
            self.assertEqual(["persona"], current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona still doesn't have a role permissions in community
            self.assertFalse(any([perm in persona_permissions for perm in perms]))

    def test_add_in_community_role(self, persona_idx=5):
        """
        If persona is part of community it can be assigned a role and their permissions.
        """
        context = get_context()

        perms = [
            f"unittest_perm_{persona_idx}_a",
            f"unittest_perm_{persona_idx}_b",
        ]
        group, role = "__unittest_group__", "facilitator"
        for perm in perms:
            Permissions.add_permission(perm)
        Permissions.set_group(group, perms)
        Permissions.set_role(role, [group])

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        current_roles = persona.role_in_community(community)
        # persona doesn't have a role in community
        self.assertEqual(["persona"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona doesn't have permissions associated to role
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        # persona has joined community
        self.assertEqual(m_status, "registered")

        current_roles = persona.role_in_community(community)
        # persona has member role in community
        self.assertEqual(["persona", "member"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona still doesn't have new permissions
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

        for i in range(2):
            community.handle_role(persona, role, "add")
            current_roles = persona.role_in_community(community)
            target_roles = list(set(["persona", "member", role]))
            # persona has new role in community
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has all role associated permissions
            self.assertTrue(all([perm in persona_permissions for perm in perms]))

            community.handle_role(persona, role, "remove")
            current_roles = persona.role_in_community(community)
            # persona no longer has new role in community
            self.assertEqual(["persona", "member"], current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona doesn't have any of the role associated permissions
            self.assertFalse(any([perm in persona_permissions for perm in perms]))

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        # persona has left community
        self.assertEqual(m_status, "unregistered")

        current_roles = persona.role_in_community(community)
        # persona no longer has member role in community
        self.assertEqual(["persona"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona no longer has any associated role permissions
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

    def test_remove_in_community_role(self, persona_idx=7):
        """
        If persona is part of community it can be removed a role and their permissions.
        """
        context = get_context()

        perms = [
            f"unittest_perm_{persona_idx}_a",
            f"unittest_perm_{persona_idx}_b",
        ]
        group, role = "__unittest_group__", "facilitator"
        for perm in perms:
            Permissions.add_permission(perm)
        Permissions.set_group(group, perms)
        Permissions.set_role(role, [group])

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        current_roles = persona.role_in_community(community)
        self.assertEqual(["persona"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "registered")

        current_roles = persona.role_in_community(community)
        self.assertEqual(["persona", "member"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

        for i in range(2):
            community.handle_role(persona, role, "remove")
            current_roles = persona.role_in_community(community)
            # persona still doesn't have new role
            self.assertEqual(["persona", "member"], current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona still doesn't have new role permissions
            self.assertFalse(any([perm in persona_permissions for perm in perms]))

            community.handle_role(persona, role, "add")
            current_roles = persona.role_in_community(community)
            target_roles = list(set(["persona", "member", role]))
            # persona still doesn't have new role
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has all permissions associated to role
            self.assertTrue(all([perm in persona_permissions for perm in perms]))

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "unregistered")

        current_roles = persona.role_in_community(community)
        # persona no longer has member role in community
        self.assertEqual(["persona"], current_roles)
        persona_permissions = persona.user_permissions(community)["permissions"]
        # persona no longer has permissions associated to role after leaving
        self.assertFalse(any([perm in persona_permissions for perm in perms]))

    def test_perm_to_role(self, persona_idx=8):
        """
        Case scenarios
            - persona has role and is granted an unrelated permission
            - persona has role and is granted an associated permission

            - persona has role and is revoked an unrelated permission
            - persona has role and is revoked an associated permission
        """
        context = get_context()

        unrelated_perm = f"unittest_perm_{persona_idx}_u"
        Permissions.add_permission(unrelated_perm)
        perms = [
            f"unittest_perm_{persona_idx}_a",
            f"unittest_perm_{persona_idx}_b",
        ]
        group, role = "__unittest_group__", "facilitator"
        for perm in perms:
            Permissions.add_permission(perm)
        Permissions.set_group(group, perms)
        Permissions.set_role(role, [group])

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "registered")

        community.handle_role(persona, role, "add")

        for i in range(2):
            pre_persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has role and is granted an unrelated permission
            community.handle_permission(persona, unrelated_perm, "grant")
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has roles and unrelated permission
            self.assertTrue(all(perm in persona_permissions for perm in perms))
            self.assertTrue(unrelated_perm in persona_permissions)

            # persona has role and is revoked an unrelated permission
            community.handle_permission(persona, unrelated_perm, "revoke")
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona no longer has unrelated permission
            self.assertFalse(unrelated_perm in persona_permissions)
            # persona still has role permission
            self.assertTrue(all(perm in persona_permissions for perm in perms))

            # persona permissions are as before granting or revoking
            pre_persona_permissions = sorted(pre_persona_permissions)
            persona_permissions = sorted(persona_permissions)
            self.assertEqual(pre_persona_permissions, persona_permissions)

        for i in range(2):
            for j in range(i + 1):
                # persona has role and is granted an associated permission
                community.handle_permission(persona, perms[0], "grant")
                persona_permissions = persona.user_permissions(community)["permissions"]
                # persona has all roles permissions
                self.assertTrue(all(perm in persona_permissions for perm in perms))

            pre_persona_permissions = persona.user_permissions(community)["permissions"]

            for j in range(i + 1):
                # persona has role and is revoked an associated permission
                community.handle_permission(persona, perms[0], "revoke")
                persona_permissions = persona.user_permissions(community)["permissions"]
                # persona has all role permissions except revoked permission
                self.assertFalse(all(perm in persona_permissions for perm in perms))
                self.assertFalse(perms[0] in persona_permissions)
                self.assertTrue(perms[1] in persona_permissions)

            for j in range(i + 1):
                # persona has role and is granted an associated permission
                community.handle_permission(persona, perms[0], "grant")
                persona_permissions = persona.user_permissions(community)["permissions"]
                # persona has all roles permissions
                self.assertTrue(all(perm in persona_permissions for perm in perms))

            # persona permissions are as before granting or revoking
            pre_persona_permissions = sorted(pre_persona_permissions)
            persona_permissions = sorted(persona_permissions)
            self.assertEqual(pre_persona_permissions, persona_permissions)

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "unregistered")

    def test_role_to_perm(self, persona_idx=10):
        # and and remove
        """
        Case scenarios
            - persona has permission and is added an unrelated role
            - persona has permission and is added an associated role

            - persona has permission and is removed an unrelated role
            - persona has permission and is removed an associated role
        """
        context = get_context()

        unrelated_perm = f"unittest_perm_{persona_idx}_u"
        Permissions.add_permission(unrelated_perm)
        perms = [
            f"unittest_perm_{persona_idx}_a",
            f"unittest_perm_{persona_idx}_b",
        ]
        group, role = "__unittest_group__", "facilitator"
        for perm in perms:
            Permissions.add_permission(perm)
        Permissions.set_group(group, perms)
        Permissions.set_role(role, [group])

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "registered")

        community.handle_permission(persona, unrelated_perm, "grant")
        for i in range(2):
            # persona has permission and is removed an unrelated role
            community.handle_role(persona, role, "remove")
            # persona has unrelated permission and no role permissions
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(unrelated_perm in persona_permissions)
            self.assertFalse(any(perm in persona_permissions for perm in perms))

            # persona has permission and is added an unrelated role
            community.handle_role(persona, role, "add")
            # persona has unrelated permission and role permissions
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(unrelated_perm in persona_permissions)
            self.assertTrue(all(perm in persona_permissions for perm in perms))

        community.handle_permission(persona, unrelated_perm, "revoke")

        community.handle_permission(persona, perms[0], "grant")
        persona_permissions = persona.user_permissions(community)["permissions"]
        self.assertTrue(perms[0] in persona_permissions)

        for i in range(2):
            # persona has permission and is removed an associated role
            community.handle_role(persona, role, "remove")
            # persona doesn't have any permissions related to role
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertFalse(any(perm in persona_permissions for perm in perms))

            # persona has permission and is added an associated role
            community.handle_permission(persona, perms[0], "grant")
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(perms[0] in persona_permissions)
            community.handle_role(persona, role, "add")
            # persona has permissions related to role
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(all(perm in persona_permissions for perm in perms))

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "unregistered")

    def test_role_to_role(self, persona_idx=11):
        """
        Case scenarios
            - persona has role and is added a role with associated permissions
            - perosna has two role with associated permissions and  and is removed one of these roles
        """

        context = get_context()

        perms = [
            f"unittest_perm_{persona_idx}_a",
            f"unittest_perm_{persona_idx}_b",
            f"unittest_perm_{persona_idx}_c",
        ]
        for perm in perms:
            Permissions.add_permission(perm)

        group, role3 = "__unittest_group_:3__", "facilitator"
        Permissions.set_group(group, perms[:3])
        Permissions.set_role(role3, [group])

        group, role2 = "__unittest_group_:2__", "trustee"
        Permissions.set_group(group, perms[:2])
        Permissions.set_role(role2, [group])

        pid = test_values["personas"][persona_idx]["id"]
        cid = test_values["communities"][0]["id"]
        persona = Personas.get(context, persona_id=pid)
        community = Communities.get(context, id=cid)

        m_status = persona.join_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "registered")

        for i in range(2):
            community.handle_role(persona, role2, "add")
            current_roles = persona.role_in_community(community)
            target_roles = list(set(["persona", "member", role2]))
            # persona has new role in community
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has all role associated permissions
            self.assertTrue(all([perm in persona_permissions for perm in perms[:2]]))
            self.assertFalse(perms[-1] in persona_permissions)

            response = community.handle_role(persona, role3, "remove")
            self.assertEqual(f"Didn't have role {role3}.", response)

            community.handle_role(persona, role3, "add")
            current_roles = persona.role_in_community(community)
            target_roles = list(set(["persona", "member", role2, role3]))
            # persona has new role in community
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            # persona has all role associated permissions
            self.assertTrue(all([perm in persona_permissions for perm in perms]))
            self.assertTrue(perms[-1] in persona_permissions)

            response = community.handle_role(persona, role3, "add")
            self.assertEqual(f"Already has role {role3}.", response)

            # REMOVE one upperset role
            response = community.handle_role(persona, role3, "remove")
            current_roles = persona.role_in_community(community)
            target_roles = list(set(["persona", "member", role2]))
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(all([perm in persona_permissions for perm in perms[:2]]))
            self.assertFalse(perms[-1] in persona_permissions)

            response = community.handle_role(persona, role3, "add")
            self.assertEqual("Added", response)

            # REMOVE one subset role
            response = community.handle_role(persona, role2, "remove")
            self.assertEqual("Removed", response)
            current_roles = persona.role_in_community(community)
            target_roles = list(set(["persona", "member", role3]))
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertTrue(all([perm in persona_permissions for perm in perms]))

            # Remove last role
            response = community.handle_role(persona, role3, "remove")
            self.assertEqual("Removed", response)
            current_roles = sorted(persona.role_in_community(community))
            target_roles = sorted(["persona", "member"])
            self.assertEqual(target_roles, current_roles)
            persona_permissions = persona.user_permissions(community)["permissions"]
            self.assertFalse(any([perm in persona_permissions for perm in perms]))

        m_status = persona.leave_community(community)
        context["db-conn"].commit()
        self.assertEqual(m_status, "unregistered")


if __name__ == "__main__":
    unittest.main(verbosity=1)
