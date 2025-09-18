import sqlalchemy
from sqlalchemy import update, insert

import db.models
import api.resolvers
from api.time import time
from api.notifications import send_round_has_closed_notification

import logging

logger = logging.getLogger("api.rounds")


# how many dictates the last how many rounds you should get, if none return all rounds
# returns the rounds to you in latest to current order
class Rounds:
    def __init__(self, context, how_many, status, prompt_id, community_id):
        conn = context["db-conn"]
        assert community_id is not None, "You must provide a Community.id"

        stmt = sqlalchemy.select(db.models.rounds).where(
            db.models.rounds.c.community_id == community_id
        )

        if prompt_id is not None:
            stmt = stmt.where(db.models.rounds.c.prompt_id == prompt_id)

        stmt = stmt.order_by(sqlalchemy.desc(db.models.rounds.c.id))

        # FIXME(bcsaldias): ideally we'll have a lazy field in Round that calculates the status
        rounds = [Round(context, r._asdict()) for r in conn.execute(stmt)]

        if status is not None:
            rounds = list(filter(lambda r: r.status == status, rounds))
        if how_many is not None:
            # stmt = stmt.limit(how_many)
            rounds = rounds[:how_many]

        # order by recency, and only return requested amount if relevant
        self._rounds = rounds

    def all(self):
        return self._rounds

    @classmethod
    def get(_, context, id=None):
        """
        This method returs a Round.
        """
        if id is not None:
            stmt = sqlalchemy.select(db.models.rounds).where(
                db.models.rounds.c.id == id
            )
        fetched_round = context["db-conn"].execute(stmt).fetchone()
        if fetched_round is None:
            raise Exception(f"Round.id {id} doesn't exist")
        return Round(context, fetched_round._asdict())

    @classmethod
    def create(
        _, context, prompt_id, community_id, start_time, completion_time, end_time
    ):
        conn = context["db-conn"]
        rounds = db.models.rounds
        stmt = insert(rounds).values(
            prompt_id=prompt_id,
            community_id=community_id,
            creation_time=time.utcnow(),
            start_time=start_time,
            completion_time=completion_time,
            end_time=end_time,
        )
        result = conn.execute(stmt)
        new_round_id = result.inserted_primary_key[0]
        conn.commit()
        return new_round_id


class Round:
    def __init__(self, context, fields):
        self._context = context
        self._fields = fields
        for k, v in fields.items():
            setattr(self, k, v)

    @property
    def prompt(self):
        conn = self._context["db-conn"]
        prompts = db.models.prompts
        stmt = sqlalchemy.select(prompts).where(prompts.c.id == self.prompt_id)
        result = conn.execute(stmt).fetchone()
        return api.resolvers.prompts.Prompt(self._context, result._asdict())

    @property
    def community(self):
        return self.prompt.post.community

    @property
    def recording_constraint(self):
        # in seconds
        response = {"length": 120, "alert_length": 10}
        return response

    def mark_prompt_status(self, status="used"):
        conn = self._context["db-conn"]
        stmt = (
            update(db.models.prompts)
            .where(db.models.prompts.c.id == self.prompt.id)
            .values(status=status)
        )
        conn.execute(stmt)
        conn.commit()
        return self.id

    @property
    def status(self):
        if self.archived:
            return "archived"
        if self.completed:
            return "completed"
        if self.accept_answers:
            return "accept_answers"
        if self.eligible:
            return "eligible"
        return "erroneous"

    @property
    def eligible(self):
        return self.start_time is None or time.utcnow() < self.start_time

    @property
    def accept_answers(self):
        return (
            time.utcnow() >= self.start_time
            and not self.completed
            and not self.archived
        )

    @property
    def completed(self):
        value = time.utcnow() >= self.completion_time and not self.archived
        if value and not self.completion_notif_sent:
            send_round_has_closed_notification(self, self.community)
        return value

    @property
    def closed(self):
        return self.completed

    @property
    def archived(self):
        return time.utcnow() >= self.end_time

    def archive_now(self):
        if self.archived:
            return False

        self.close_now()

        conn = self._context["db-conn"]
        stmt = (
            update(db.models.rounds)
            .where(db.models.rounds.c.id == self.id)
            .values(end_time=time.utcnow())
        )
        conn.execute(stmt)
        conn.commit()
        return True

    def close_now(self):
        if self.completed:
            return False

        if not self.completion_notif_sent:
            send_round_has_closed_notification(self, self.community)

        conn = self._context["db-conn"]
        stmt = (
            update(db.models.rounds)
            .where(db.models.rounds.c.id == self.id)
            .values(completion_time=time.utcnow())
        )
        conn.execute(stmt)
        conn.commit()
        return True

    def mark_notification_as_sent(self, notif):
        # FIXME(bcsaldias): I'm sure there is a smarter way.
        # Quick prototype here.
        conn = self._context["db-conn"]
        if notif == "start_notif_sent":
            stmt = (
                update(db.models.rounds)
                .where(db.models.rounds.c.id == self.id)
                .values(start_notif_sent=True)
            )
        if notif == "completion_notif_sent":
            stmt = (
                update(db.models.rounds)
                .where(db.models.rounds.c.id == self.id)
                .values(completion_notif_sent=True)
            )
        conn.execute(stmt)
        conn.commit()
        return True

    def allows_answering_by(self, persona):
        """
        This function is designed per community.
        This also allows to block specific users.
        """
        if self.completed or self.archived:
            return False

        num_posts = persona.num_posts_to(self)
        # TODO(bcsaldias): allowing 10 answers per persona -- could allow 1!
        if num_posts >= 5:
            return False
        return True

    def allows_playing_by(self, persona):
        """
        User can only play community content if they replied.
        """
        return True
        if self.completed or self.archived:
            if persona.num_posts_to(self) < 1:
                return False
            return True

        return False
