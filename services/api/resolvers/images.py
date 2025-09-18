import sqlalchemy
import db.models as models
from api.assets import ImageBucket
from api.time import time

import logging

logger = logging.getLogger("api.images")


class Images:
    def __init__(self, context, start, limit):
        self._context = context
        stmt = sqlalchemy.select(models.images)
        if start is not None:
            stmt = stmt.where(models.images.c.id >= start)
        stmt = stmt.limit(limit)
        self._images = [
            Image(context, p._asdict()) for p in self._db_conn.execute(stmt)
        ]

    @property
    def _db_conn(self):
        return self._context["db-conn"]

    @property
    def all(self):
        return self._images

    @classmethod
    def create(_, context, image_file):
        """
        This method receives an image file, stores it in S3 raw and processed,
        saves it in our DB, and returns the created Image object.
        """

        conn = context["db-conn"]
        stmt = sqlalchemy.insert(models.images).values(creation_time=time.utcnow())
        result = conn.execute(stmt)
        conn.commit()
        image_id = result.inserted_primary_key[0]

        bucket = ImageBucket()
        cdict = bucket.upload_file(image_file, image_id)
        if not all(cdict["created_image"].values()):
            raise Exception("Image couldn't be created")

        return Images.get(context, image_id)

    @classmethod
    def get(_, context, id, w=None, h=None):
        """
        This method returs an Image.
        """
        stmt = sqlalchemy.select(models.images).where(models.images.c.id == id)
        fetched_image = context["db-conn"].execute(stmt).fetchone()
        if fetched_image is None:
            raise Exception(f"Image.id {id} doesn't exist")

        return Image(context, fetched_image._asdict(), w, h)


class Image:
    def __init__(self, context, fields, w=None, h=None):
        self._context = context
        self._fields = fields
        self._bucket = ImageBucket()
        self._size = self._w = self._h = self._set_size(w, h)
        for k, v in fields.items():
            setattr(self, k, v)

    @property
    def public_url(self):
        return f"{self._bucket.path}/{self.id}_{self._size}.png"

    def _map_size(self, size):
        # returns the closest bigger available image
        for s in self._bucket._available_sizes:
            if s >= size:
                return s
        return self._default_size

    def _set_size(self, w, h):
        # set dimensions to be a square
        if w is None and h is None:
            _w = _h = self._default_size
        elif w is None:
            _w = _h = h
        elif h is None:
            _w = _h = w
        else:
            _w = _h = min(w, h)
        assert _w == _h

        size = self._map_size(_w)
        return size

    @property
    def _default_size(self):
        return 300

    @property
    def w(self):
        return self._w

    @property
    def h(self):
        return self._h
