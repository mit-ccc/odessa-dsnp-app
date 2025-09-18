import json
import os
import subprocess
import sys
from datetime import datetime

import sqlalchemy
from dotenv import dotenv_values, load_dotenv
from invoke import task
from sqlalchemy.sql import text

sys.path.append("../")

from tasks_test import *  # noqa: F403
from tasks_mod import *  # noqa: F403
from tasks_admin import *  # noqa: F403
import db.models

load_dotenv()


@task
def psql(c):
    subprocess.run(f"psql postgresql://{os.environ['DB_CONNECTION_STRING']}".split())


@task
def seed_dev_data(c):
    engine = sqlalchemy.create_engine(
        f"postgresql+psycopg2://{os.environ['DB_CONNECTION_STRING']}"
    )

    # delete in the proper order as necessitated by foreign key relationships
    # unfortunately, due to autoincrement tables not reseting, this still doesn't work
    with engine.connect() as conn:
        conn.execute(sqlalchemy.delete(db.models.rounds))  # FK = prompts
        conn.execute(sqlalchemy.delete(db.models.prompts))  # FK = posts
        conn.execute(
            sqlalchemy.delete(db.models.posts)
        )  # FK = (audios, communities, personas)
        conn.execute(
            sqlalchemy.delete(db.models.memberships)
        )  # FK = (personas, communities)
        conn.execute(sqlalchemy.delete(db.models.personas))  # FK = images
        conn.execute(sqlalchemy.delete(db.models.images))  # FK = none
        conn.execute(sqlalchemy.delete(db.models.communities))  # FK = none
        conn.execute(sqlalchemy.delete(db.models.audios))  # FK = none
        conn.commit()

    # add images
    images = [
        {
            "id": 1,
            "creation_time": datetime.utcnow(),
            "description": "first image",
        },
        {
            "id": 2,
            "creation_time": datetime.utcnow(),
            "description": "second image",
        },
    ]
    with engine.connect() as conn:
        for p in images:
            conn.execute(sqlalchemy.insert(db.models.images).values(**p))
        seq_reset = text("alter sequence images_id_seq restart with :s").bindparams(
            s=max([t["id"] for t in images]) + 1
        )
        conn.execute(seq_reset)

        conn.commit()

    # These correspond to persona0 and persona1 using the testing seed
    # phrase which can be found in
    # OdessaApp/src/state/LocalState.js. Personas with this set as
    # their pkh will show up when logged in as that user.
    testing_pkh1 = "dbd3e8b08951e44aa00a0924ab279c907d4747d4"
    testing_pkh2 = "eb007c9f920d1621a4ab13978515e6f08e0d0ecb"

    # add personas
    personas = [
        {
            "id": 1,
            "name": "Jack Sparrow",
            "bio": "I'm not a pirate, I'm a misunderstood adventurer of the seven seas!",
            "pkh": "b244e881d0557c621fcf71dbaa99c1b1246e05ba",
            "image_id": None,
        },
        {
            "id": 2,
            "name": "Don Quixote",
            "bio": "Forward, noble hearts, for in the face of adversity, we shall prove the might of our dreams and the valor of our quests!",
            "pkh": "2e7c95d8fefdc3bccfd56b88ae6ae7f526211a8b",
            "image_id": None,
        },
        {
            "id": 3,
            "name": "Mystery Man",
            "bio": "I am a man of mystery.",
            "pkh": testing_pkh1,
            "image_id": None,
        },
        {
            "id": 4,
            "name": "Moar Mystery Man",
            "bio": "I am a man of greater mystery.",
            "pkh": testing_pkh2,
            "image_id": None,
        },
    ]
    with engine.connect() as conn:
        for p in personas:
            conn.execute(sqlalchemy.insert(db.models.personas).values(**p))
        seq_reset = text("alter sequence personas_id_seq restart with :s").bindparams(
            s=max([t["id"] for t in personas]) + 1
        )
        conn.execute(seq_reset)

        conn.commit()

    # add audios
    audios = [
        {
            "id": 1,
            "creation_time": datetime.utcnow(),
            "info": "{}",
            "duration": 20,
        },
        {
            "id": 2,
            "creation_time": datetime.utcnow(),
            "info": "{}",
            "duration": 20,
        },
    ]
    with engine.connect() as conn:
        for p in audios:
            conn.execute(sqlalchemy.insert(db.models.audios).values(**p))
        seq_reset = text("alter sequence audios_id_seq restart with :s").bindparams(
            s=max([t["id"] for t in audios]) + 1
        )
        conn.execute(seq_reset)

        conn.commit()

    # add communities
    communities = [
        {
            "id": 1,
            "name": "MIT CCC",
            "description": "MIT Center for Constructive Communication, where we constructively communicate.",
            "access": "public",
            "metadata": json.dumps(
                {
                    "behaviors": {
                        "ban": "F*ck. Sh*t.",
                        "discourage": "None",
                        "encourage": "Constructive communication.",
                    },
                }
            ),
        },
        {
            "id": 2,
            "name": "Cortico",
            "description": "Community powered understanding.",
            "access": "public",
            "metadata": json.dumps(
                {
                    "behaviors": {
                        "ban": "Rudeness",
                        "discourage": "Arguing",
                        "encourage": "Kindness",
                    },
                }
            ),
        },
        {
            "id": 3,
            "name": "MIT",
            "description": "Massachusetts Institute of Technology.",
            "access": "public",
            "metadata": json.dumps(
                {
                    "behaviors": {
                        "ban": "Harvard talk.",
                        "discourage": "Comparing grades.",
                        "encourage": "Technology topics.",
                    },
                }
            ),
        },
    ]
    with engine.connect() as conn:
        for c in communities:
            conn.execute(sqlalchemy.insert(db.models.communities).values(**c))
        seq_reset = text(
            "alter sequence communities_id_seq restart with :s"
        ).bindparams(s=max([t["id"] for t in communities]) + 1)
        conn.execute(seq_reset)

        conn.commit()

    # add memberships
    memberships = [
        # Jack and Don are both a part of MIT. Only Don is a part of
        # Cortico.
        {
            "id": 1,
            "community_id": 1,
            "persona_id": 1,
        },
        {
            "id": 2,
            "community_id": 1,
            "persona_id": 2,
        },
        {
            "id": 3,
            "community_id": 2,
            "persona_id": 2,
        },
        # Mystery Man is in MIT & CCC, Moar Mystery Man is in Cortico
        {
            "id": 4,
            "community_id": 1,
            "persona_id": 3,
        },
        {
            "id": 5,
            "community_id": 3,
            "persona_id": 3,
        },
        {
            "id": 6,
            "community_id": 2,
            "persona_id": 4,
        },
        {
            "id": 7,
            "community_id": 2,
            "persona_id": 3,
        },
    ]
    with engine.connect() as conn:
        for m in memberships:
            conn.execute(sqlalchemy.insert(db.models.memberships).values(**m))
        seq_reset = text(
            "alter sequence memberships_id_seq restart with :s"
        ).bindparams(s=max([t["id"] for t in memberships]) + 1)
        conn.execute(seq_reset)

        conn.commit()

    # add posts
    posts = [
        {
            "id": 1,
            "text": "a first prompt: linux or macOS",
            "audio_id": 2,
            "community_id": 2,
            "author_id": 1,
            "foraConv_id": 1,
            "creation_time": datetime.utcnow(),
        },
        {
            "id": 2,
            "text": "linux for sureeee",
            "audio_id": 2,
            "community_id": 2,
            "author_id": 2,
            "foraConv_id": 1,
            "in_reply_to": 1,
            "creation_time": datetime.utcnow(),
        },
        {
            "id": 3,
            "text": "Apple owns me",
            "audio_id": 1,
            "community_id": 1,
            "author_id": 3,
            "foraConv_id": 1,
            "in_reply_to": 1,
            "creation_time": datetime.utcnow(),
        },
        {
            "id": 4,
            "text": "a second prompt: Quien es el mejor de todos los tiempos?",
            "audio_id": 2,
            "community_id": 1,
            "author_id": 1,
            "foraConv_id": 1,
            "creation_time": datetime.utcnow(),
        },
        {
            "id": 5,
            "text": "Shakira Shakira",
            "audio_id": 1,
            "community_id": 1,
            "author_id": 2,
            "foraConv_id": 1,
            "in_reply_to": 4,
            "creation_time": datetime.utcnow(),
        },
        {
            "id": 6,
            "text": "King Deb",
            "audio_id": 2,
            "community_id": 1,
            "author_id": 3,
            "foraConv_id": 1,
            "in_reply_to": 4,
            "creation_time": datetime.utcnow(),
        },
        {
            "id": 7,
            "text": "Prompt 3",
            "audio_id": 2,
            "community_id": 2,
            "author_id": 3,
            "foraConv_id": 1,
            "creation_time": datetime.utcnow(),
        },
    ]
    with engine.connect() as conn:
        for m in posts:
            conn.execute(sqlalchemy.insert(db.models.posts).values(**m))
        seq_reset = text("alter sequence posts_id_seq restart with :s").bindparams(
            s=max([t["id"] for t in posts]) + 1
        )
        conn.execute(seq_reset)

        conn.commit()

    # add prompts
    prompts = [
        {
            "id": 1,
            "post_id": 1,
            "priority": 1,
            "status": "used",
        },
        {
            "id": 2,
            "post_id": 4,
            "priority": 2,
            "status": "used",
        },
        {
            "id": 3,
            "post_id": 7,
            "priority": 3,
            "status": "eligible",
        },
    ]
    with engine.connect() as conn:
        for m in prompts:
            conn.execute(sqlalchemy.insert(db.models.prompts).values(**m))
        seq_reset = text("alter sequence prompts_id_seq restart with :s").bindparams(
            s=max([t["id"] for t in prompts]) + 1
        )
        conn.execute(seq_reset)

        conn.commit()

    # add rounds
    # yday = time.utcnow() - timedelta(days=1)
    # today = time.utcnow()
    # tomorrow = time.utcnow() + timedelta(days=1)
    # rounds = [
    # {
    #     "id": 1,
    #     "prompt_id": 1,
    #     "creation_time": yday,
    #     "start_time": yday,
    #     "completion_time": yday + timedelta(hours=17),
    #     "end_time": today,
    #     "community_id": 1,
    # },
    # {
    #     "id": 2,
    #     "prompt_id": 2,
    #     "creation_time": today,
    #     "start_time": today,
    #     "completion_time": today + timedelta(hours=17),
    #     "end_time": tomorrow,
    #     "community_id": 1,
    # },
    # ]
    # with engine.connect() as conn:
    #     for m in rounds:
    #         conn.execute(sqlalchemy.insert(db.models.rounds).values(**m))
    #     seq_reset = text("alter sequence rounds_id_seq restart with :s").bindparams(
    #         s=max([t["id"] for t in rounds]) + 1
    #     )
    #     conn.execute(seq_reset)

    #     conn.commit()


@task
def show_env(c, all=False):
    if all:
        vals = os.environ
    else:
        vals = dotenv_values()

    for k, v in sorted(vals.items()):
        print(f"{k}={v}")
