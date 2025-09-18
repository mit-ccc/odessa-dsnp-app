import json
import logging
import os

import sqlalchemy
from ariadne import gql, make_executable_schema, upload_scalar
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLHTTPHandler
from ariadne.types import Extension
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from requests import Response
from sqlalchemy.orm import sessionmaker

from api.auth import v1_auth_middleware
from api.exceptions import UnauthorizedError
from api.query import mutation, query
from api.time import time
from api.version import VERSION

from .routers import audio_router, image_router

# Linting complains about unused imports if you don't explicitly list them below
__all__ = ["UnauthorizedError"]


load_dotenv()

logger = logging.getLogger("api")


def load_defs():
    path = os.path.join(os.path.dirname(__file__), "type_defs.graphql")
    with open(path, "rt") as finp:
        type_defs = gql(finp.read())

        return type_defs


type_defs = load_defs()

engine = sqlalchemy.create_engine(
    f"postgresql+psycopg2://{os.environ['DB_CONNECTION_STRING']}",
    pool_size=30,
    max_overflow=0,
)


class LogVersion(Extension):
    """Outputs frontend verion"""

    def request_started(self, context):
        headers = dict(context["request"].headers.items())
        logger.info(
            "backend-version | frontend-version -> %s | %s ",
            VERSION,
            headers.get("frontend-version"),
        )


class LoggerExtension(Extension):
    """Outputs some useful log infofrom a GQL api call."""

    def request_started(self, context):
        headers = dict(context["request"].headers.items())
        logger.debug(json.dumps(headers))
        self._st_time = time.timestamp()

    def request_finished(self, context):
        elapsed = time.timestamp() - self._st_time
        query = context.get("gql-query", "unknown")
        logger.info("gql call %s took %.02fs", query, elapsed)


class RequestAuthExtension(Extension):
    """Handles request authentication."""

    def request_started(self, context):
        context["auth0"] = []

        headers = dict(context["request"].headers.items())

        persona_pkh = headers.get("persona-pkh")
        if persona_pkh:
            logger.info("persona pkh %s", persona_pkh)
            context["auth0"] = [persona_pkh]

        use_persona = os.environ.get("USE_PERSONA")
        if not persona_pkh and use_persona:
            # If there's no persona_pkh in the request, we'll use the
            # value in USE_PERSONA. This is for development and should
            # be disabled in production.
            context["auth0"] = [use_persona]

        # It's possible we get here without setting auth0. This would
        # mean that the request has no persona_pkh and was not
        # authenticated at all.

    def request_finished(self, context):
        if "auth0" in context:
            del context["auth0"]


class DbTransactionExtension(Extension):
    """Adds a sqlalchemy connection to the context, db-conn, which begins
    a transaction at the start of a request and commits it at the end.

    """

    def request_started(self, context):
        context["db-conn"] = engine.connect()
        Session = sessionmaker()
        Session.configure(bind=engine)
        context["session"] = Session()

    def request_finished(self, context):
        context["db-conn"].commit()
        context["session"].commit()
        context["db-conn"].close()
        context["session"].close()
        del context["db-conn"]
        del context["session"]


schema = make_executable_schema(type_defs, [query, mutation, upload_scalar])
graphql_app = GraphQL(
    schema,
    http_handler=GraphQLHTTPHandler(
        extensions=[
            LogVersion,
            LoggerExtension,
            RequestAuthExtension,
            DbTransactionExtension,
        ],
        middleware=[
            v1_auth_middleware,
        ],
    ),
    debug=True,
)


async def add_headers(request, call):
    response: Response = await call(request)
    # GraphQLClient can read these headers through calling rawRequest.
    response.headers["backend-version"] = VERSION
    return response


def search_folder(folder, paths):
    """Searches a set of paths for a folder."""

    for path in paths:
        candidate = os.path.join(path, folder)
        if os.path.exists(candidate):
            return os.path.abspath(candidate)

    return None


# Mount Ariadne GraphQL as sub-application for FastAPI
app = FastAPI(root_path="/")
app.middleware("http")(add_headers)
app.mount("/graphql/", graphql_app)
app.include_router(audio_router)
app.include_router(image_router)

static_path = search_folder("static", ["./", "./../"])
app.mount("/static", StaticFiles(directory=static_path), name="static")
