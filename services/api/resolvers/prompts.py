import db.models as models
import sqlalchemy
from sqlalchemy import and_, insert

import api.resolvers as resolvers
import logging

logger = logging.getLogger("api.prompts")


class Prompts:
    def __init__(self, context, start=None, limit=None):
        stmt = sqlalchemy.select(models.prompts)
        if start is not None:
            stmt = stmt.where(models.prompts.c.id >= start)
        stmt = stmt.order_by(models.prompts.c.id)
        if limit:
            stmt = stmt.limit(limit)

        conn = context["db-conn"]
        self._prompts = [Prompt(context, p._asdict()) for p in conn.execute(stmt)]

    def all(self):
        return self._prompts

    @classmethod
    def get(_, context, id=None, post_id=None):
        """
        This method returs a Prompt.
        """
        if id is not None:
            stmt = sqlalchemy.select(models.prompts).where(models.prompts.c.id == id)
        elif post_id:
            stmt = sqlalchemy.select(models.prompts).where(
                models.prompts.c.post_id == post_id
            )
        fetched_prompt = context["db-conn"].execute(stmt).fetchone()
        if fetched_prompt is None:
            raise Exception(f"Prompt.id {id} or post_id {post_id} don't exist")
        return Prompt(context, fetched_prompt._asdict())


class Prompt:
    def __init__(self, context, fields):
        self._context = context
        self._fields = fields
        for k, v in fields.items():
            setattr(self, k, v)
        # status e ('eligible', 'used', 'removed')

    @property
    def _db_conn(self):
        return self._context["db-conn"]

    @property
    def post(self):
        posts = models.posts
        stmt = sqlalchemy.select(posts).where(posts.c.id == self.post_id)
        result = self._db_conn.execute(stmt).fetchone()
        return resolvers.posts.Post(self._context, result._asdict())

    @property
    def replies(self):
        return self.get_replies()

    def get_replies(self, first=5, after=None):
        conn = self._context["db-conn"]
        db_posts = models.posts

        # Convert the 'after' cursor to an integer offset
        offset = int(after) if after else 0

        reply_stmt = (
            sqlalchemy.select(db_posts)
            .where(
                db_posts.c.in_reply_to == self.post_id,
                db_posts.c.mod_removed == False,  # noqa: E712
            )
            .order_by(db_posts.c.id)
            .limit(first)
            .offset(offset)
        )

        resolverPost = resolvers.posts.Post
        if self.post.community.is_bridge:
            from api.bridged_round.resolvers.bridged_post import BridgedPost

            resolverPost = BridgedPost

        objs = [
            {
                "cursor": str(offset + i + 1),
                "node": resolverPost(self._context, p._asdict()),
            }
            for i, p in enumerate(conn.execute(reply_stmt))
        ]

        has_next_page = len(objs) == first

        return {
            "edges": objs,
            "pageInfo": {
                "endCursor": objs[-1]["cursor"] if objs else None,
                "hasNextPage": has_next_page,
            },
        }

    @property
    def num_replies(self):
        conn = self._context["db-conn"]

        try:
            round = self.round
        except:  # noqa: E722
            return 0

        if round.archived:
            result = conn.execute(
                sqlalchemy.text("""
                                    SELECT
                                        p.id AS post_id,
                                        COUNT(r.id) AS reply_count
                                    FROM
                                        posts p
                                    LEFT JOIN
                                        posts r ON r.in_reply_to = p.id
                                    LEFT JOIN
                                        mod_disputes d ON d.post_id = r.id AND d.status != 'resolved'
                                    LEFT JOIN
                                        audios a ON a.id = r.audio_id
                                    WHERE
                                        p.id = :post_id
                                        AND r.mod_removed <> true
                                        AND r.in_reply_to IS NOT NULL
                                        AND d.id IS NULL
                                        AND a.available_mp3 = true
                                    GROUP BY
                                        p.id
                                """),
                {"post_id": self.post_id},
            ).fetchall()
            if len(result) == 1:
                return result[0][1]

        result = conn.execute(
            sqlalchemy.text(
                """
                    SELECT
                        count(*)
                    FROM
                        posts p
                    LEFT JOIN
                        audios a ON a.id = p.audio_id
                    WHERE
                        p.in_reply_to = :post_id
                        AND p.mod_removed <> true
                        AND a.available_mp3 = true
            """
            ),
            {"post_id": self.post_id},
        )
        return [row._asdict()["count"] for row in result][0]

    @property
    def author(self):
        return resolvers.personas.Personas.get(self._context, self.post.author_id)

    @property
    def round(self):
        rounds = models.rounds
        stmt = sqlalchemy.select(rounds).where(rounds.c.prompt_id == self.id)
        result = self._db_conn.execute(stmt).fetchone()
        return resolvers.rounds.Round(self._context, result._asdict())

    @property
    def is_active(self):
        return self.status == "active"


def create_prompt_with_post(
    context, text, community_id, author_id, foraConv_id, in_reply_to, priority
):
    # Create a new post first
    in_reply_to = None
    new_post = resolvers.posts.create_post(
        context=context,
        text=text,
        community_id=community_id,
        author_id=author_id,
        foraConv_id=foraConv_id,
        in_reply_to=in_reply_to,
    )

    # Once the post is created, create a new prompt associated with the post
    conn = context["db-conn"]
    stmt = insert(models.prompts).values(
        post_id=new_post.id, priority=priority, status="eligible"
    )  # You can set other prompt attributes here

    result = conn.execute(stmt)

    # Fetch the ID of the newly inserted prompt
    new_prompt_id = result.inserted_primary_key[0]

    conn.commit()  # FIXME shouldn't this commit go before the queried result?

    # Return the IDs of the newly created prompt and post
    return {"prompt_id": new_prompt_id, "post_id": new_post.id}


# Fetch the lowest priority prompt which hasn't been selected yet
def get_lowest_priority_prompt(context, community_id):
    conn = context["db-conn"]
    prompts = models.prompts
    posts = models.posts
    stmt = (
        sqlalchemy.select(prompts)
        .select_from(
            prompts.join(
                posts, prompts.c.post_id == posts.c.id
            )  # Adjust the join condition based on your schema
        )
        .where(
            and_(
                prompts.c.status == "eligible",
                posts.c.community_id == community_id,  # The second condition
            )
        )
        .order_by(prompts.c.priority)
        .limit(1)
    )
    result = conn.execute(stmt).fetchone()
    if result:
        prompt = resolvers.prompts.Prompt(context, result._asdict())
        return prompt
    else:
        return None
