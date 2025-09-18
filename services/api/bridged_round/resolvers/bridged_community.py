import logging
from api.resolvers import Communities, Community
import db.models
import sqlalchemy
from sqlalchemy import and_, or_

logger = logging.getLogger("api.b_community")


class BridgedCommunities(Communities):
    def __init__(self, context, start=None, limit=None, og_ids=None):
        if og_ids is None or len(og_ids) == 0:
            self._communities = []
            return
        self._fetched_bridges = None

        communities = sqlalchemy.select(db.models.communities).where(
            db.models.communities.c.bridge_id != None  # noqa: E711
        )
        community_bridges = db.models.community_bridges
        all_bridges = (
            sqlalchemy.select(community_bridges)
            .where(
                or_(
                    community_bridges.c.community_a_id.in_(og_ids),
                    community_bridges.c.community_b_id.in_(og_ids),
                ),
            )
            .subquery()
        )
        all_communities = (
            sqlalchemy.select(db.models.communities)
            .select_from(db.models.communities)
            .join(
                all_bridges,
                db.models.communities.c.bridge_id == all_bridges.c.id,
            )
            .select_from(communities)
        )

        stmt = all_communities.distinct()

        if start is not None:
            stmt = stmt.where(db.models.communities.c.id >= start)

        stmt = stmt.order_by(db.models.communities.c.id)

        if limit is not None:
            stmt = stmt.limit(limit)

        conn = context["db-conn"]
        self._communities = [
            BridgedCommunity(context, c._asdict()) for c in conn.execute(stmt)
        ]

    @classmethod
    def get(_, context, id=None, ids=None):
        """
        This method returs a BridgedCommunity.
        """
        if ids is not None:
            community_bridges = db.models.community_bridges
            stmt = sqlalchemy.select(community_bridges).where(
                or_(
                    and_(
                        community_bridges.c.community_a_id == ids[0],
                        community_bridges.c.community_b_id == ids[1],
                    ),
                    and_(
                        community_bridges.c.community_a_id == ids[1],
                        community_bridges.c.community_b_id == ids[0],
                    ),
                )
            )
            fetched_community = context["db-conn"].execute(stmt).fetchone()
            if fetched_community is None:
                return None
            return Communities.get(context, bridge_id=fetched_community.id)
        elif id is not None:
            return Communities.get(context, id=id)

        return BridgedCommunity(context, fetched_community._asdict())

    @classmethod
    def create(_, context, author_id, community_ids, id=None):
        community_bridges = db.models.community_bridges
        stmt = sqlalchemy.insert(community_bridges).values(
            community_a_id=community_ids[0], community_b_id=community_ids[1]
        )
        conn = context["db-conn"]
        result = conn.execute(stmt)
        conn.commit()
        bridge_id = result.inserted_primary_key[0]

        id0, id1 = community_ids
        c0 = Communities.get(context, id0)
        c1 = Communities.get(context, id1)

        name = (f"{c0.name[:10]} <> {c1.name[:10]}",)
        description = ""  # TODO(bcsaldias)
        # members = "" # TODO(bcsaldias)
        # metadata = "{}"
        values = {
            "name": name,
            "description": description,
            # "metadata": json.dumps({"behaviors": json.loads(metadata)}),
            "creator_id": author_id,
            "access": "bridged",
            "bridge_id": bridge_id,
        }
        if id:
            values["id"] = id

        new_id = Communities.create(context, **values)
        new_community = BridgedCommunities.get(context, new_id)
        return new_community


class BridgedCommunity(Community):
    @property
    def bridges(self):
        id0, id1 = self.bridge_ids
        c0 = Communities.get(self._context, id0)
        c1 = Communities.get(self._context, id1)
        return [c0, c1]

    @property
    def bridge_ids(self):
        if not hasattr(self, "_fetched_bridges"):
            self._fetched_bridges = None

        if self._fetched_bridges is None:
            conn = self._context["db-conn"]
            community_bridges = db.models.community_bridges
            stmt = sqlalchemy.select(community_bridges).where(
                community_bridges.c.id == self.bridge_id
            )
            fetched_bridges = conn.execute(stmt).fetchone()
            if fetched_bridges is None:
                return []
            self._fetched_bridges = [
                fetched_bridges.community_a_id,
                fetched_bridges.community_b_id,
            ]
        return self._fetched_bridges

    @property
    def members_desc(self):
        communities = self.bridges
        assert len(communities) == 2, "must bridge two communities"
        c0, c1 = communities
        desc = f"\n{c0.name}: {c0.members_desc}\n{c1.name}: {c1.members_desc}"
        return desc

    @members_desc.setter
    def members_desc(self, _):
        pass

    @property
    def notif_all_members_topic(self):
        return f"cid_{self.id}_all_members"

    def know_each_other(self, a, b):
        if a.id == b.id:
            return True
        # for c in self.bridges:
        #     if a.is_in_community(c) and b.is_in_community(c):
        #         return True
        # return False

        session = self._context["session"]
        communities = db.models.communities
        memberships = db.models.memberships
        stmt1 = (
            sqlalchemy.select(communities.c.id)
            .join(memberships, communities.c.id == memberships.c.community_id)
            .filter(
                memberships.c.persona_id == a.id,
                communities.c.bridge_id == None,  # noqa: E711
                memberships.c.community_id.in_(self.bridge_ids),
            )
        )
        stmt2 = (
            sqlalchemy.select(communities.c.id)
            .join(memberships, communities.c.id == memberships.c.community_id)
            .filter(
                memberships.c.persona_id == b.id,
                communities.c.bridge_id == None,  # noqa: E711
                memberships.c.community_id.in_(self.bridge_ids),
            )
        )
        intersect_stmt = stmt1.intersect(stmt2)
        result = session.execute(intersect_stmt).fetchall()
        return len(result) > 0

    @property
    def members(self):
        communities = self.bridges
        assert len(communities) == 2, "must bridge two communities"
        members_c0 = communities[0].members
        c0_ids = [p.id for p in members_c0]
        members_c1 = communities[1].members
        members_c1 = [p for p in members_c1 if p.id not in c0_ids]
        members = members_c0 + members_c1
        logger.info(f"MEMBERS len {len(members)}")
        return members

    @property
    def flags(self):
        """Returns intersection of flags"""
        # flags_self = super().flags
        communities = self.bridges
        flags_c0 = set(communities[0].flags)
        flags_c1 = set(communities[1].flags)
        bridged_flags = flags_c0.intersection(flags_c1)
        # return list(set(flags_self + bridged_flags))
        return bridged_flags

    def get_personas_id_by_role(self, role):
        """Returns union of roles"""
        communities = self.bridges
        pid_c0 = communities[0].get_personas_id_by_role(role)
        pid_c1 = communities[1].get_personas_id_by_role(role)
        return list(set(pid_c0 + pid_c1))

    def handle_registration(self, *args, **kargs):
        """Cannot register personas to bridged community"""
        raise Exception("BridgedCommunity cannot register personas.")

    @property
    def policies(self):
        c0, c1 = self.bridges
        _policies = []
        _policies.append({"ctype": "a", "policy": c0.behaviors, "cid": c0.id})
        _policies.append({"ctype": "a", "policy": c1.behaviors, "cid": c1.id})
        _policies.append({"ctype": "ab", "policy": self.behaviors, "cid": self.id})
        return _policies
