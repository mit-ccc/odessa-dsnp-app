import logging

logger = logging.getLogger("api.permissions")


class Permissions:
    """
    These permissions are assigned per community.
    These can be assigned based on a ROLE or based on individual PERMISSIONS.
    Groups do not face the user or persona, they are for admin purposes.

    metadata = {
        'roles': {role_name: [list of groups]}

        'groups': {group_name: [list of permissions]}

        'permissions': [list of permissions]
    }

    How these work:

    community.handle_role(persona, role, 'add'|'remove')
        # this method inserts or remove a register in DB Table `community_roles`.

    community.handle_permission(persona, perm, 'grant'|'revoke')
        # this method inserts or updates a register in DB Table `permissions`.

    persona.user_perm_basal(community)
        # returns list of `permissions` for each `role` assigned in DB Table `community_roles`,
        # based in `permissions` defined in `metadata['permissions']` in this file (permissions.py).
        # returns basal_role_perms

    persona.user_perm_patches(community)
        # returns list of permissions patched in DB Table `permissions`
        # returns patch_perms

    persona.user_permissions(community)
        # returns list of permissions, where permission patches in `patch_perms`
        # are APPLIED TO `basal_role_perms`
    """

    metadata = {
        # any groups assigned to a role must be defined in 'groups'
        # else set_permissions will trigger an assert.
        "roles": {
            "owner": ["__all__", "__community_creator__"],
            "moderator": [
                "__moderator__",
            ],
            "trustee": [
                "__trustee__",
            ],
            "facilitator": [
                "__facilitator__",
            ],
            "member": [
                "__member__",
            ],
            "persona": [
                "__persona__",
            ],
            # '__all__': [
            #     '__all__'
            # ]
        },
        # any permission assigned to a group must be defined in 'permissions'
        # else set_permissions will trigger an assert.
        # group names must start and end with '__'
        "groups": {
            "__all__": ["__all__"],
            "__moderator__": [
                "community.round.force_next_round",
                "community.round.force_stop_current_round",
                # 'community.post.start_quarantine',
                # 'community.post.release_quarantine',
                # 'community.persona.role.add_trustee',
                # 'community.persona.permission.post.grant',
                # 'community.persona.permission.post.revoke',
                "community.mod.disputes.review",
                "community.edit",
            ],
            "__trustee__": [
                "community.persona.add",
                "community.persona.delete",
                "community.persona.swap",
                "community.members.pkh.read",
            ],
            "__facilitator__": [],
            "__member__": [
                "persona.community.prompt.add",
                "persona.community.prompt.delete",
                "persona.community.post.add",
            ],
            "__persona__": [
                "persona.view_pkh",
                "persona.view_pkh_qr",
            ],
            "__community_creator__": [
                "community.create",
                "community.flag.add",
                "community.flag.delete",
                "community.edit",
            ],
        },
        "permissions": [
            "__all__",
            "community.members.pkh.read",
            "community.persona.add",
            "community.persona.delete",
            "community.persona.swap",
            "community.persona.role.add",
            # 'community.persona.role.add_trustee',
            "community.persona.role.delete",
            "community.persona.permission.grant",
            "community.persona.permission.revoke",
            # 'community.persona.permission.post.grant',
            # 'community.persona.permission.post.revoke',
            # 'community.post.start_quarantine',
            # 'community.post.release_quarantine',
            "community.round.force_next_round",
            "community.round.force_stop_current_round",
            "persona.community.post.add",
            # 'persona.community.post.upvode',
            # 'persona.community.post.downvote',
            "persona.community.prompt.add",
            "persona.community.prompt.delete",
            # 'persona.community.prompt.upvote',
            # 'persona.community.prompt.downvote',
            "persona.view_pkh",
            "persona.view_pkh_qr",
            "community.create",
            "community.edit",
            "community.mod.disputes.review",
            "community.flag.add",
            "community.flag.delete",
        ],
    }

    @staticmethod
    def set_permissions(verbose=False, allow_all=True):
        """
        Checks 'foreign keys'.
        """
        metadata = Permissions.metadata

        if allow_all:
            if verbose:
                print("POPULATING __all__")
            for role in metadata["roles"]:
                for group in metadata["roles"][role]:
                    if group == "__all__":
                        metadata["roles"][role] = list(metadata["groups"])
                    for perm in metadata["groups"][group]:
                        if perm == "__all__":
                            metadata["groups"][group] = list(metadata["permissions"])

        if verbose:
            print("role")
            print("\t\tgroup")
            print("\t\t\t\tpermission")
            print("========================================================")
        for role in metadata["roles"]:
            if verbose:
                print(role)
            for group in metadata["roles"][role]:
                if verbose:
                    print("\t\t", group)
                assert group in metadata["groups"], f"{group} not in 'groups'."
                assert group.startswith("__") and group.endswith(
                    "__"
                ), f"Type error `{group}`. Group name must start and end with '__'."
                for perm in metadata["groups"][group]:
                    if verbose:
                        print("\t\t\t\t", perm)
                    assert (
                        perm in metadata["permissions"]
                    ), f"{perm} not in 'permissions'."
            if verbose:
                print("========================================================")

    @staticmethod
    def set_role(name, groups=None):
        metadata = Permissions.metadata
        if groups is None:
            groups = []
        metadata["roles"][name] = groups

    @staticmethod
    def set_group(name, permissions=None):
        metadata = Permissions.metadata
        if permissions is None:
            permissions = []
        metadata["groups"][name] = permissions

    @staticmethod
    def add_permission(name):
        metadata = Permissions.metadata
        metadata["permissions"].append(name)


if __name__ == "__main__":
    Permissions.add_permission("test_permission_1")
    Permissions.add_permission("test_permission_2")
    Permissions.set_group(
        "__test_permission__", ["test_permission_1", "test_permission_2"]
    )
    Permissions.set_role("test_role", ["__test_permission__"])
    # Permissions.set_permissions(verbose = True)

Permissions.set_permissions(verbose=False)
