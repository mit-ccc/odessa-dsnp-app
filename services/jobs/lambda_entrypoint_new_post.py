import os
import logging
import logging.config

import sqlalchemy
from sqlalchemy.orm import sessionmaker

from api.assets import AudioBucket
from api.version import VERSION

config_path = "/var/task/log-production.ini"
if os.path.exists("/var/task/log-production.ini"):
    logging.config.fileConfig(config_path, disable_existing_loggers=True)

logger = logging.getLogger("new-post-worker")
# logger.addHandler(logging.StreamHandler(sys.stdout)) # FIXME: this line caused to log twice.
logger.setLevel(logging.INFO)

CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
engine = sqlalchemy.create_engine(f"postgresql+psycopg2://{CONNECTION_STRING}")
logger.info("Connecting to sqlalchemy engine")


def handler(event, context):
    logger.info("backend-version %s", VERSION)

    # This is executed once a minute.
    with engine.connect() as conn:
        context = {"db-conn": conn}
        Session = sessionmaker()
        Session.configure(bind=engine)
        context["session"] = Session()

        # logger.info(f"new-post-worker event: {event}")

        records = event.get("Records", [])
        for r in records:
            file_name = r["s3"]["object"]["key"]
            logger.info(file_name)

            # format: assets/prod/audio/INT_raw
            is_prod_audio = file_name.startswith("assets/prod/audio/")
            is_raw_audio = file_name.endswith("_raw")
            if is_prod_audio and is_raw_audio:
                file_id = file_name.split("_raw")[0].split("/")[-1]
                logger.info(f"new post processing file_id {file_id}")
                audio = process_audio(context, int(file_id))
                logger.info(
                    f"processing_status_dict {file_id} {audio.post.processing_status_dict}"
                )

        context["db-conn"].commit()
        context["session"].commit()
        context["db-conn"].close()
        context["session"].close()
        del context["session"]


def process_audio(context, audio_id):
    bucket = AudioBucket()
    audio = bucket.process_audio_from_aws(
        audio_id, context=context, request_author_reviews=True
    )
    return audio
