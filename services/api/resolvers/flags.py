import logging

logger = logging.getLogger("api.flags")


class Flags:
    """
    These flags are assigned per community.
    These are to be used in the frontend or backend to determine community-level
    availability of features.

    In theory each flag can be designed as a set of permissions that are added or
    removed on top of `Permissions.metadata`.
    """

    # flags that define stable features available for all communities.
    # {'long_name': 'short_name'}
    basal_flags = {
        "enable_display_community_behaviors": "enable_display_behaviors"
    }

    # flags that define development features available to flagged communities.
    # {'long_name': 'short_name'}
    # note that development short names can be queried as community.flags as in
    # community._FLAG_<short_name>
    development_flags = {
        "enable_create_new_community": "enabled_new_community",
        "enable_content_moderation_moderator_actions": "enabled_mod_actions",
        "enable_content_moderation_persona_actions": "enabled_mod_per_actions",
        "enable_bridged_round": "enable_bridged_round",
    }
