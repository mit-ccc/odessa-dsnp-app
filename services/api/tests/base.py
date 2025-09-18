import os
import unittest
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy.orm import sessionmaker
from api.time import time
import sys

sys.path.append("./")
import db.models

load_dotenv()
engine_name = f"postgresql+psycopg2://{os.environ['DB_CONNECTION_STRING']}"

test_values = {
    "communities": [
        {
            "id": -100000000 - i,
            "name": "unittest_community",
            "description": "test community",
        }
        for i in range(4)
    ],
    "personas": [
        {
            "id": -100000000 - i,
            "name": f"unittest_persona_{i}",
            "bio": f"test persona {i}",
            "pkh": f"unittest_pkh_{i}",
        }
        for i in range(50)
    ],
    "audios": [
        {
            "id": -100000000 - i,
            "creation_time": time.utcnow(),
            "info": "{}",
            "duration": 20,
        }
        for i in range(20)
    ],
    "posts": [
        {
            "id": -100000000 - i,
            "text": "",
            "audio_id": -100000000 - i,
            "community_id": -100000000,
            "author_id": -100000000 - i,
            "creation_time": time.utcnow(),
        }
        for i in range(20)
    ],
}


def get_context():
    engine = sqlalchemy.create_engine(engine_name)
    context = {}
    context["db-conn"] = engine.connect()
    Session = sessionmaker()
    Session.configure(bind=engine)
    context["session"] = Session()
    return context


class TestBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # return
        context = get_context()
        communities = test_values["communities"]
        personas = test_values["personas"]
        audios = test_values["audios"]
        posts = test_values["posts"]
        with context["db-conn"] as conn:
            # create community
            for community in communities:
                conn.execute(
                    sqlalchemy.insert(db.models.communities).values(**community)
                )
                conn.commit()

            # create persona
            for persona in personas:
                conn.execute(sqlalchemy.insert(db.models.personas).values(**persona))
                conn.commit()
            # create audio
            for audio in audios:
                conn.execute(sqlalchemy.insert(db.models.audios).values(**audio))
                conn.commit()
            # create post
            for post in posts:
                conn.execute(sqlalchemy.insert(db.models.posts).values(**post))
                conn.commit()

    @classmethod
    def tearDownClass(cls):
        context = get_context()
        community = test_values["communities"][0]
        persona = test_values["personas"][0]
        post = test_values["posts"][0]
        audio = test_values["audios"][0]
        with context["db-conn"] as conn:
            # remove reviews
            conn.execute(
                sqlalchemy.text("""
                    DELETE FROM mod_reviews
                    WHERE dispute_id IN (
                        SELECT id FROM mod_disputes
                        WHERE post_id IN (
                            SELECT id FROM posts
                            WHERE id <= :post_id
                        )
                    );
            """),
                {"post_id": post["id"]},
            )
            conn.commit()
            # remove disputes
            conn.execute(
                sqlalchemy.text("""
                        DELETE FROM mod_disputes
                        WHERE post_id IN (
                            SELECT id FROM posts
                            WHERE id <= :post_id
                        );
            """),
                {"post_id": post["id"]},
            )
            conn.commit()
            # remove posts
            stmt = sqlalchemy.delete(db.models.posts).where(
                db.models.posts.c.id <= post["id"]
            )
            conn.execute(stmt)
            conn.commit()
            # remove audios
            stmt = sqlalchemy.delete(db.models.audios).where(
                db.models.audios.c.id <= audio["id"]
            )
            conn.execute(stmt)
            conn.commit()
            # remove personas from community
            stmt = sqlalchemy.delete(db.models.memberships).where(
                db.models.memberships.c.community_id <= community["id"]
            )
            conn.execute(stmt)
            conn.commit()
            # remove personas
            stmt = sqlalchemy.delete(db.models.personas).where(
                db.models.personas.c.id <= persona["id"]
            )
            conn.execute(stmt)
            conn.commit()
            # remove community flags
            stmt = sqlalchemy.delete(db.models.community_flags).where(
                db.models.community_flags.c.community_id <= community["id"]
            )
            conn.execute(stmt)
            conn.commit()

            # remove community bridge_id
            stmt = (
                sqlalchemy.update(db.models.communities)
                .where(db.models.communities.c.id <= community["id"])
                .values(bridge_id=None)
            )
            conn.execute(stmt)
            conn.commit()

            # remove community_bridges
            stmt = sqlalchemy.delete(db.models.community_bridges).where(
                db.models.community_bridges.c.community_a_id <= community["id"]
            )
            conn.execute(stmt)
            conn.commit()
            stmt = sqlalchemy.delete(db.models.community_bridges).where(
                db.models.community_bridges.c.community_b_id <= community["id"]
            )
            conn.execute(stmt)
            conn.commit()

            # remove communities
            stmt = sqlalchemy.delete(db.models.communities).where(
                db.models.communities.c.id <= community["id"]
            )
            conn.execute(stmt)
            conn.commit()
        del context

    def test_init(self):
        pass
