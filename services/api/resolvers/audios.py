import json
import logging

import db.models as models
import sqlalchemy

from api.assets import AudioBucket
from api.exceptions import AudioUploadError
from api.time import time

logger = logging.getLogger("api.audios")


class Audios:
    def __init__(self, context, start, limit):
        self._context = context
        stmt = sqlalchemy.select(models.audios)
        if start is not None:
            stmt = stmt.where(models.audios.c.id >= start)
        stmt = stmt.limit(limit)
        self._audios = [
            Audio(context, p._asdict()) for p in self._db_conn.execute(stmt)
        ]

    @property
    def _db_conn(self):
        return self._context["db-conn"]

    @property
    def all(self):
        return self._audios

    @classmethod
    def create(_, context, audio_file):
        """This method receives an audio file, stores it in S3 raw and processed,
        saves it in our DB, and returns the created Audio object.

        When we receive the audio_file, it's base64 encoded and holds
        a prefix header that looks something like
        'data:audio/mp4;base64,'.

        """

        logger.info("creating and uploading audio")
        conn = context["db-conn"]
        stmt = sqlalchemy.insert(models.audios).values(creation_time=time.utcnow())
        result = conn.execute(stmt)
        audio_id = result.inserted_primary_key[0]
        conn.commit()

        logger.info("setting up AudioBucket")
        bucket = AudioBucket()
        logger.info("upload into S3")
        cdict = bucket.upload_file(audio_file, audio_id, context=context)
        logger.info("upload triggered")

        if not cdict["created_raw"]:
            raise AudioUploadError("could not upload RAW audio to S3")

        return Audios.get(context, audio_id)

    @classmethod
    def get(_, context, id):
        """
        This method returs an Audio.
        """
        stmt = sqlalchemy.select(models.audios).where(models.audios.c.id == id)
        fetched_audio = context["db-conn"].execute(stmt).fetchone()
        if fetched_audio is None:
            return Audio(
                context,
                {
                    "id": None,
                    "public_url": None,
                    "duration": None,
                    "wave_values": None,
                    "transcripts": None,
                },
            )
            # raise Exception(f"Audio.id {id} doesn't exist")

        return Audio(context, fetched_audio._asdict())

    @classmethod
    def update(_, context, id, values):
        """
        This method updates an Audio.
        """
        conn = context["db-conn"]
        stmt = (
            sqlalchemy.update(models.audios)
            .where(models.audios.c.id == id)
            .values(**values)
        )
        conn.execute(stmt)
        conn.commit()
        return Audios.get(context, id)


class Audio:
    def __init__(self, context, fields):
        self._context = context
        self._fields = fields
        self._bucket = AudioBucket()
        for k, v in fields.items():
            setattr(self, k, v)

    @property
    def post(self):
        conn = self._context["db-conn"]
        posts = models.posts
        stmt = sqlalchemy.select(posts).where(posts.c.audio_id == self.id)
        result = conn.execute(stmt).fetchone()
        if result:
            from api.resolvers import Post

            return Post(self._context, result._asdict())

    @property
    def _db_conn(self):
        return self._context["db-conn"]

    @property
    def public_url(self):
        return f"/{self._bucket.path}/{self.id}_full.mp3"

    @property
    def raw_url(self):
        return self._bucket.get_file_url(self.id, suffix="_raw")

    @property
    def audio_url(self):
        return self._bucket.get_file_url(self.id, suffix="_full", ctype="mp3")

    @property
    def info_dict(self):
        if self.info:
            return json.loads(self.info)
        return {}

    @property
    def wave_values(self):
        return self.info_dict.get("wave_values", [])

    @property
    def transcripts(self):
        return self.info_dict.get("transcripts_vtt", [])

    @property
    def plain_transcript(self):
        return " ".join(_["text"] for _ in self.transcripts).strip()

    @property
    def mp3(self):
        if self.available_mp3:
            return True

        s3_url_audio = self._bucket._get_file_name(self.id, suffix="_full", ctype="mp3")
        exist_now = self._bucket.object_exist(s3_url_audio)

        if exist_now:
            values = {"available_mp3": True}
            Audios.update(self._context, self.id, values)
            return True
