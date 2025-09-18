from sqlalchemy import (
    MetaData,
    Table,
    Column,
    Integer,
    String,
    ForeignKey,
    Boolean,
    Float,
    Enum,
    Index,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy_utils import ArrowType
from sqlalchemy.sql import false

metadata = MetaData()

# See README.md for elaboration on the models.


personas = Table(
    "personas",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("bio", String, nullable=False),
    Column("pkh", String, unique=True, nullable=False),
    Column("image_id", Integer, ForeignKey("images.id"), nullable=True),
)

frequency_metadata = Table(
    "frequency_metadata",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("msa_id", String, nullable=False, unique=True),
    Column("persona_id", Integer, ForeignKey("personas.id"), nullable=False, unique=True),
    Column("creation_time", ArrowType, nullable=False)
)

fcm_tokens = Table(
    "fcm_tokens",
    metadata,
    Column("id", Integer, primary_key=True, nullable=False, autoincrement=True),
    Column("token", String, nullable=False, unique=True),
    Column("persona_id", Integer, ForeignKey("personas.id"), nullable=False),
    Column("creation_time", ArrowType, nullable=False),
)
Index("pair_index", fcm_tokens.c.token, fcm_tokens.c.persona_id, unique=True)
Index("token_index", fcm_tokens.c.token, unique=True)

communities = Table(
    "communities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("description", String, nullable=False),
    Column("members_desc", String, nullable=True),
    Column("metadata", String, nullable=True),
    Column("creator_id", Integer, ForeignKey("personas.id"), nullable=True),
    Column(
        "access", Enum("public", "private", "bridged", native_enum=False), nullable=True
    ),
    Column("bridge_id", Integer, ForeignKey("community_bridges.id"), nullable=True),
)
# constrain, if access == "bridged" then bridge_id not null


# many-to-many relationship between personas and communities
memberships = Table(
    "memberships",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("persona_id", Integer, ForeignKey("personas.id"), nullable=False),
    Column("community_id", Integer, ForeignKey("communities.id"), nullable=False),
)
Index(
    "membership_index",
    memberships.c.persona_id,
    memberships.c.community_id,
    unique=True,
)


posts = Table(
    "posts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("text", String, nullable=False),
    Column("audio_id", Integer, ForeignKey("audios.id"), nullable=True),
    Column("community_id", Integer, ForeignKey("communities.id"), nullable=False),
    Column("author_id", Integer, ForeignKey("personas.id"), nullable=False),
    Column("foraConv_id", Integer, nullable=True),
    Column("in_reply_to", Integer, nullable=True),
    Column("creation_time", ArrowType, nullable=False),
    Column("ai_mod_output", String, nullable=True),
    Column("mod_removed", Boolean, nullable=False, default=False),
    Column("mod_metadata", String, nullable=True, default=""),
)

audios = Table(
    "audios",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("info", String, nullable=True),
    Column("duration", Float, nullable=True),
    Column("creation_time", ArrowType, nullable=False),
    Column(
        "available_mp3", Boolean, nullable=False, default=False, server_default=false()
    ),
)

images = Table(
    "images",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("creation_time", ArrowType, nullable=False),
    Column("description", String, nullable=True),
)

prompts = Table(
    "prompts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("post_id", Integer, ForeignKey("posts.id"), nullable=False),
    Column("priority", Integer, nullable=True),
    Column(
        "status", Enum("eligible", "used", "removed", native_enum=False), nullable=False
    ),
    # CheckConstraint("status IN ('eligible', 'used', 'removed')", name='status_in'),
)

rounds = Table(
    "rounds",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("prompt_id", Integer, ForeignKey("prompts.id"), nullable=False),
    Column("creation_time", ArrowType, nullable=False),
    Column("start_time", ArrowType, nullable=True),
    Column(
        "completion_time", ArrowType, nullable=True
    ),  # right now not yet being utilized in backend
    Column("end_time", ArrowType, nullable=True),
    Column("community_id", Integer, ForeignKey("communities.id"), nullable=False),
    # CheckConstraint("end_time > completion_time", name='et>ct'),
    # CheckConstraint("completion_time > start_time", name='ct>st'),
    # CheckConstraint("start_time >= creation_time", name='st>=ct'),
    Column("start_notif_sent", Boolean, nullable=True),
    Column("completion_notif_sent", Boolean, nullable=True),
)

available_roles = ("owner", "moderator", "trustee", "facilitator")
community_roles = Table(
    "community_roles",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column(
        "membership_id",
        Integer,
        ForeignKey("memberships.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("role", Enum(*available_roles, native_enum=False), nullable=False),
)
Index(
    "role_unique_pair",
    community_roles.c.membership_id,
    community_roles.c.role,
    unique=True,
)


perm_modes = ("grant", "revoke")
permissions = Table(
    "permissions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column(
        "membership_id",
        Integer,
        ForeignKey("memberships.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("perm", String, nullable=False),
    Column("mode", Enum(*perm_modes, native_enum=False), nullable=False),
)
Index("perm_index", permissions.c.membership_id, permissions.c.perm, unique=True)


community_flags = Table(
    "community_flags",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("community_id", Integer, ForeignKey("communities.id"), nullable=False),
    Column("label", String, nullable=False),
)
Index(
    "community_flags_index",
    community_flags.c.community_id,
    community_flags.c.label,
    unique=True,
)


mod_disputes = Table(
    "mod_disputes",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("post_id", Integer, ForeignKey("posts.id"), nullable=False),
    Column("disputer_id", Integer, ForeignKey("personas.id"), nullable=True),
    Column("status", Enum("pending", "resolved", native_enum=False), nullable=False),
    Column("metadata", String, nullable=True),
    Column("creation_time", ArrowType, nullable=False),
    Column("resolved_time", ArrowType, nullable=True),  # TODO: unused.
    # Column("disputed_text", String, nullable=True),
)

# one-to-many relationship between dispute-to-reviews
mod_reviews = Table(
    "mod_reviews",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("dispute_id", Integer, ForeignKey("mod_disputes.id"), nullable=False),
    Column("reviewer_id", Integer, ForeignKey("personas.id"), nullable=False),
    Column(
        "status",
        Enum("requested", "resolved", native_enum=False),
        nullable=False,
    ),  # TODO: pending not used. "pending",
    Column("metadata", String, nullable=True),
    Column("creation_time", ArrowType, nullable=False),
)


# allowing bridges only among two communities. Wrappers defined in the corresponding resolvers
# could allow for more flexibility if this model is upgraded.
community_bridges = Table(
    "community_bridges",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("community_a_id", Integer, ForeignKey("communities.id"), nullable=False),
    Column("community_b_id", Integer, ForeignKey("communities.id"), nullable=False),
    UniqueConstraint('community_a_id', 'community_b_id', name='bridge_distinct_communities'),
    CheckConstraint('community_a_id <> community_b_id', name='community_a_not_equal_b')
)
Index(
    "bridge_index",
    community_bridges.c.community_a_id,
    community_bridges.c.community_b_id,
    unique=True,
)
