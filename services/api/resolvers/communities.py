import json
import logging

import db.models
import sqlalchemy
from sqlalchemy import and_

import api.resolvers
from api.notifications import send_new_round_notification
from api.resolvers.flags import Flags
from api.resolvers.permissions import Permissions
from api.time import time

logger = logging.getLogger("api.communities")


class Communities:
    def __init__(
        self, context, start=None, limit=None, my=None, access=None, bridges=False
    ):
        # FIXME: what is my?
        stmt = sqlalchemy.select(db.models.communities)
        persona_pkhs = context.get("auth0", [])
        if my:
            # join personas <-> memberships
            all_memberships = db.models.memberships.join(
                db.models.personas,
                db.models.memberships.c.persona_id == db.models.personas.c.id,
            )
            # join personas <-> memberships <-> communities
            all_communities = db.models.communities.join(
                all_memberships,
                db.models.communities.c.id == db.models.memberships.c.community_id,
            )

            stmt = (
                sqlalchemy.select(db.models.communities)
                .select_from(all_communities)
                .where(db.models.personas.c.pkh.in_(persona_pkhs))
            )
        if start is not None:
            stmt = stmt.where(db.models.communities.c.id >= start)

        if access is not None:
            stmt = stmt.where(db.models.communities.c.access == access)

        stmt = stmt.order_by(db.models.communities.c.id)

        if limit is not None:
            stmt = stmt.limit(limit)

        conn = context["db-conn"]
        self._communities = [
            Community(context, c._asdict()) for c in conn.execute(stmt)
        ]

        if bridges and access != "bridged":
            from api.bridged_round.resolvers import BridgedCommunities

            bridged_communities = BridgedCommunities(
                context,
                start=start,
                limit=limit,
                og_ids=[c.id for c in self._communities],
            ).all()
            unique_bridged = [
                c
                for c in bridged_communities
                if c.id not in [_.id for _ in self._communities]
            ]
            self._communities = self._communities + unique_bridged

    def all(self):
        return self._communities

    @classmethod
    def get(_, context, id=None, bridge_id=None):
        """
        This method returs a Community.
        """
        if id is not None:
            stmt = sqlalchemy.select(db.models.communities).where(
                db.models.communities.c.id == id
            )
        elif bridge_id is not None:
            stmt = sqlalchemy.select(db.models.communities).where(
                db.models.communities.c.bridge_id == bridge_id
            )
        fetched_community = context["db-conn"].execute(stmt).fetchone()
        if fetched_community is None:
            raise None  # Exception(f"Community.id {id} doesn't exist")

        if fetched_community.bridge_id is not None:
            from api.bridged_round.resolvers import BridgedCommunity

            return BridgedCommunity(context, fetched_community._asdict())

        return Community(context, fetched_community._asdict())

    @classmethod
    def create(_, context, **kargs):
        conn = context["db-conn"]
        stmt = sqlalchemy.insert(db.models.communities).values(**kargs)
        result = conn.execute(stmt)
        conn.commit()
        new_community_id = result.inserted_primary_key[0]
        return new_community_id

    @classmethod
    def update(_, context, id, values):
        """
        This method updates a Community.
        """

        allowed_keys = {"name", "description", "members_desc", "metadata"}
        forbidden_keys = set(values.keys()) - allowed_keys
        assert len(forbidden_keys) == 0, f"Can't update Communities.{forbidden_keys}."

        conn = context["db-conn"]
        stmt = (
            sqlalchemy.update(db.models.communities)
            .where(db.models.communities.c.id == id)
            .values(**values)
        )
        conn.execute(stmt)
        conn.commit()
        return Communities.get(context, id)


class Community:
    def __init__(self, context, fields):
        self._context = context
        self._fields = fields
        for k, v in fields.items():
            setattr(self, k, v)
        self._update_flags_attr()

    def __str__(self):
        return str(self._fields)

    @property
    def is_bridge(self):
        return self.bridge_id is not None

    @property
    def behaviors(self):
        values = {"encourage": "", "discourage": "", "ban": ""}
        try:
            if self.metadata:
                values = json.loads(self.metadata).get("behaviors")
            else:
                values["encourage"] = "1. Be polite"
                values["ban"] = "1. Disrespectful content"
            return values
        except:  # noqa: E722 (disable ruff linting for this line)
            # FIXME: add generic and update to specific exception
            return values

    @property
    def policies(self):
        return [{"ctype": "a", "policy": self.behaviors, "cid": self.id}]

    @property
    def notif_all_members_topic(self):
        return f"cid_{self.id}_all_members"

    @property
    def members(self):
        conn = self._context["db-conn"]
        personas = db.models.personas
        memberships = db.models.memberships
        stmt = (
            sqlalchemy.select(personas)
            .join(memberships, personas.c.id == memberships.c.persona_id)
            .filter(memberships.c.community_id == self.id)
        )
        objs = [
            api.resolvers.personas.Persona(self._context, p._asdict())
            for p in conn.execute(stmt)
        ]
        return objs

    @property
    def posts(self):
        conn = self._context["db-conn"]
        posts = db.models.posts
        stmt = sqlalchemy.select(posts).where(
            posts.c.community_id == self.id,
            posts.c.mod_removed != True,  # noqa: E712
        )
        objs = [
            api.resolvers.posts.Post(self._context, p._asdict())
            for p in conn.execute(stmt)
        ]
        return objs

    @property
    def prompts(self):
        prompts = map(lambda x: x.prompt, filter(lambda x: x.is_prompt, self.posts))
        return prompts

    @property
    def rounds(self):
        conn = self._context["db-conn"]
        stmt = sqlalchemy.select(db.models.rounds).where(
            db.models.rounds.c.community_id == self.id
        )
        objs = [
            api.resolvers.rounds.Round(self._context, p._asdict())
            for p in conn.execute(stmt)
        ]
        return objs

    @property
    def flags(self):
        conn = self._context["db-conn"]
        flags = db.models.community_flags
        stmt = sqlalchemy.select(flags).where(flags.c.community_id == self.id)
        flags = conn.execute(stmt).mappings().all()
        labels = [row["label"] for row in flags]
        community_flags = list(set(list(Flags.basal_flags) + labels))
        return community_flags

    def add_flag(self, label):
        allowed_flags = list(Flags.development_flags)
        assert (
            label in allowed_flags
        ), f"{label} not in Flags.development_flags, chose from {allowed_flags}"
        stmt = sqlalchemy.insert(db.models.community_flags).values(
            {
                "community_id": self.id,
                "label": label,
            }
        )
        self._context["db-conn"].execute(stmt)
        self._context["db-conn"].commit()
        return True

    def remove_flag(self, label):
        flags = db.models.community_flags
        stmt = sqlalchemy.delete(flags).where(
            (flags.c.community_id == self.id) & (flags.c.label == label)
        )
        self._context["db-conn"].execute(stmt)
        self._context["db-conn"].commit()
        return True

    def _update_flags_attr(self):
        # NOTE: only setting development_flags as attr
        _flags = self.flags
        for dev_flag in Flags.development_flags.items():
            long_name, short_name = dev_flag
            setattr(self, f"_FLAG_{long_name}", long_name in _flags)
            setattr(self, f"_FLAG_{short_name}", long_name in _flags)

    @property
    def active_prompt(self):
        active_round = self.active_round
        return active_round.prompt

    @property
    def active_rounds(self):
        now = time.now()
        conn = self._context["db-conn"]
        stmt = (
            sqlalchemy.select(db.models.rounds)
            .where(db.models.rounds.c.community_id == self.id)
            .where(db.models.rounds.c.start_time <= now)
            .where(db.models.rounds.c.end_time > now)
        )
        objs = [
            api.resolvers.rounds.Round(self._context, p._asdict())
            for p in conn.execute(stmt)
        ]
        assert len(objs) <= 1, "each community must have at most 1 active round"
        return objs

    @property
    def active_round(self):
        active_rounds = self.active_rounds
        if len(active_rounds) == 1:
            active_round = active_rounds[0]
            active_status = ["accept_answers", "completed"]
            assert (
                active_round.status in active_status
            ), f"round.status = {active_round.status}"
            return active_round
        return None

    @property
    def up_next(self):
        """
        Has up to three rounds in stock, which are displayed in the
        community landing page.

        Each round has a community member associated.

        If the community member has an eligible prompt, then
        their picture is bright; else, their picture is gray-scale.

        Force next round must check 'up_next' as a method (?)

        start_time is set to None -> eligible.
        prompt_id -> null (must be made nullable=True)
        persona_id -> assigns the order (must add to revisions)
        """
        pass

    @property
    def is_active(self):
        if self.active_round is None:
            return False
        return True

    @property
    def _completion_time_replace(self):
        """This function is to design for control of
        completion_time.

        Returns and unpackable dict.
        """
        replace = {"hour": 22, "minute": 0, "second": 0, "microsecond": 0}
        return replace

    @property
    def _end_time_shift(self):
        """This function is to design for control of
        end_time.

        Returns and unpackable dict.
        """
        replace = {"days": 1}
        return replace

    def _get_completion_time(self, start_time, duration):
        """This function is to design for control of
        completion_time.

        If a duration is provided, then that defines completion_time.
        Else, sets completion_time to either today or tomorrow at the
        time indicated in self._completion_time_replace, whatever is
        in the nearest future.
        """
        today_at = start_time.replace(**self._completion_time_replace)
        if duration:
            return start_time.shift(**duration)
        if today_at <= start_time:
            tomorrow_at = today_at.shift(days=1)
            return tomorrow_at
        return today_at

    def _get_end_time(self, start_time, completion_time):
        """This function is to design for control of
        end_time.

        Defaults to start_time + self._end_time_shift if
        completion_time is earlier than that else it's set
        to completion_time.
        """

        in_one_day = start_time.shift(**self._end_time_shift)
        if in_one_day <= completion_time:
            return completion_time
        return in_one_day

    def create_and_start_round(self, prompt, duration=None):
        # start time (set to one minute ago so it's active
        # right away)
        # Warning, next lne must be time.now() since we are
        # replacing fields on a given timezone.
        start_time = time.now()
        # completion_time active/accept_answer -> complete
        completion_time = self._get_completion_time(start_time, duration)
        # end_time this is no longer the current round.
        end_time = self._get_end_time(start_time, completion_time)

        round_id = api.resolvers.rounds.Rounds.create(
            context=self._context,
            prompt_id=prompt.id,
            community_id=self.id,
            start_time=start_time,
            completion_time=completion_time,
            end_time=end_time,
        )

        new_round = api.resolvers.Rounds.get(self._context, round_id)
        new_round.mark_prompt_status("used")
        return new_round

    def close_active_round(self, force=False, printfn=print):
        # FIXME(bcsaldias): force not being used yet.
        active_round = self.active_round
        if active_round:
            if active_round.status != "completed":
                active_round.close_now()
        return active_round

    def move_to_next_round(
        self, force=False, method="lowest_priority", printfn=print, duration=None
    ):
        """
        Closes currently active round and sets a new round.

        Warning: this should remain an atomic method.
        """

        printfn(f"Community.id {self.id} calling move_to_next_round")
        methods = {
            "lowest_priority": api.resolvers.prompts.get_lowest_priority_prompt,
            "random": None,  # TODO: can implement different methods.
        }

        if method not in methods:
            msg = f"method {method} not allowed. Chose from {methods.keys()}"
            printfn(msg)
            return {"error": msg}

        # chose next prompt
        # Fetch the lowest priority prompt for each community
        prompt = methods[method](self._context, self.id)
        if not prompt:
            msg = f"Community.id {self.id} no more prompts to pick"
            printfn(msg)
            return {"error": msg}

        active_round = self.active_round
        if active_round:
            if force:
                active_round.archive_now()
                printfn(f"Community.id {self.id} archived last active round")
            else:
                msg = f"Community.id {self.id} did not update. Try `force=True`"
                printfn(msg)
                return {"error": msg}

        if self.active_round:
            msg = "Error: Only way to activate a round is to have no other active."
            printfn(msg)
            return {"error": msg}

        # activate and return next round
        new_round = self.create_and_start_round(prompt, duration)
        printfn(f"Community.id {self.id} created new_round")
        printfn(new_round.__dict__)

        send_new_round_notification(new_round, self)
        return {"round": new_round}

    def handle_registration(self, persona, mode):
        # if requester allowed proceed, else return error.
        # requester_pkhs = context.get("auth0", [])

        if mode == "register":
            return persona.join_community(self)

        if mode == "unregister":
            return persona.leave_community(self)

        return "None"

    def handle_role(self, persona, role, mode, cascade=True):
        conn = self._context["db-conn"]
        stmt = sqlalchemy.select(db.models.memberships).where(
            (db.models.memberships.c.persona_id == persona.id)
            & (db.models.memberships.c.community_id == self.id)
        )
        membership = conn.execute(stmt).fetchone()

        if membership is None:
            return "Not part of community"

        if mode == "add":
            if role in persona.role_in_community(self):
                return f"Already has role {role}."
            stmt = sqlalchemy.insert(db.models.community_roles).values(
                membership_id=membership.id,
                role=role,
            )
            conn.execute(stmt)
            conn.commit()
            if cascade:
                self.refresh_permissions(persona)
            return "Added"

        elif mode == "remove":
            if role not in persona.role_in_community(self):
                return f"Didn't have role {role}."
            stmt = sqlalchemy.delete(db.models.community_roles).where(
                (db.models.community_roles.c.role == role)
                & (db.models.community_roles.c.membership_id == membership.id)
            )
            conn.execute(stmt)
            conn.commit()
            return "Removed"

    def handle_permission(self, persona, perm, mode):
        assert mode in ["grant", "revoke"], f"mode '{mode}' not allowed."
        if perm not in Permissions.metadata["permissions"]:
            return f"perm '{perm}' unknown perm type."

        conn = self._context["db-conn"]
        stmt = sqlalchemy.select(db.models.memberships).where(
            (db.models.memberships.c.persona_id == persona.id)
            & (db.models.memberships.c.community_id == self.id)
        )
        membership = conn.execute(stmt).fetchone()
        if membership is None:
            return "Not part of community"

        perm_status = persona.user_perm_status(self, perm)
        in_role = perm_status["in_role"]
        is_granted = perm_status["is_granted"]
        is_revoked = perm_status["is_revoked"]

        has_perm = is_granted or (in_role and not is_revoked)
        doesnt_have_perm = not in_role or is_revoked
        # assert (has_perm and not doesnt_have_perm) or (not has_perm and doesnt_have_perm)

        where_perm = (
            sqlalchemy.select(db.models.permissions.c.id)
            .join(db.models.memberships)
            .where(
                and_(
                    db.models.memberships.c.id == membership.id,
                    db.models.permissions.c.perm == perm,
                )
            )
        )

        if is_granted and mode == "revoke" and not in_role:
            stmt = (
                sqlalchemy.update(db.models.permissions)
                .where(db.models.permissions.c.id.in_(where_perm))
                .values(mode=mode)
            )
            conn.execute(stmt)
            conn.commit()
            return "revoked."

        # if persona has been granted a new role, need to remove the singular patch
        if in_role and (is_granted or (is_revoked and mode == "grant")):
            stmt = sqlalchemy.delete(db.models.permissions).where(
                db.models.permissions.c.id.in_(where_perm)
            )
            conn.execute(stmt)
            conn.commit()
            if is_revoked and mode == "grant":
                return "granted."

        if mode == "grant" and has_perm:
            return f"Already had perm to {perm}."

        if mode == "revoke" and doesnt_have_perm:
            return f"Already not allowed to {perm}."

        if (is_revoked and mode == "grant") or (is_granted and mode == "revoke"):
            stmt = (
                sqlalchemy.update(db.models.permissions)
                .where(db.models.permissions.c.id.in_(where_perm))
                .values(mode=mode)
            )
            conn.execute(stmt)
            conn.commit()

        if (in_role and mode == "revoke") or (
            not in_role and mode == "grant" and not is_revoked
        ):
            stmt = sqlalchemy.insert(db.models.permissions).values(
                membership_id=membership.id, perm=perm, mode=mode
            )
            conn.execute(stmt)
            conn.commit()

        return {"grant": "granted", "revoke": "revoked"}[mode]

    def refresh_permissions(self, persona):
        # remove patches of granted permissions that are in new role.
        basal_role_perms = persona.user_perm_basal(self)
        patch_perms = persona.user_perm_patches(self)

        conn = self._context["db-conn"]
        stmt = sqlalchemy.select(db.models.memberships).where(
            (db.models.memberships.c.persona_id == persona.id)
            & (db.models.memberships.c.community_id == self.id)
        )
        membership = conn.execute(stmt).fetchone()

        for perm in basal_role_perms["permissions"]:
            if perm in patch_perms["grant"]:
                where_perm = (
                    sqlalchemy.select(db.models.permissions.c.id)
                    .join(db.models.memberships)
                    .where(
                        and_(
                            db.models.memberships.c.id == membership.id,
                            db.models.permissions.c.perm == perm,
                        )
                    )
                )
                stmt = sqlalchemy.delete(db.models.permissions).where(
                    db.models.permissions.c.id.in_(where_perm)
                )
                conn.execute(stmt)
                conn.commit()

    def get_personas_id_by_role(self, role):
        session = self._context["session"]

        mt = db.models.memberships
        crt = db.models.community_roles
        persona_ids = (
            session.query(mt.c.persona_id)
            .join(crt)
            .filter(and_(mt.c.community_id == self.id, crt.c.role == role))
            .all()
        )
        persona_ids = [m.persona_id for m in persona_ids]
        return persona_ids

    @property
    def bridges(self):
        return []

    @property
    def bridge_ids(self):
        return []
