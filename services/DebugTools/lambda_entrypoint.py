import logging
import os
import sys

import sqlalchemy

# Add the parent directory to sys.path to import the api module
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
import api.resolvers as resolvers

# You can put initialization code here. See
# https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html

config_path = "/var/task/log-production.ini"
if os.path.exists("/var/task/log-production.ini"):
    logging.config.fileConfig(config_path, disable_existing_loggers=True)

logger = logging.getLogger("worker")
logger.addHandler(logging.StreamHandler(sys.stdout))
logger.setLevel(logging.INFO)

logger.info("initializing upgraded_rounds lambda function")

CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")
engine = sqlalchemy.create_engine(f"postgresql+psycopg2://{CONNECTION_STRING}")
logger.info("Connecting to sqlalchemy engine")


def handler(event, context):
    # This is executed once a minute.
    with engine.connect() as conn:
        context = {"db-conn": conn}
        logger.info(f"worker event: {event}")

        communities = resolvers.Communities(context).all()
        for community in communities:
            # If force=False, and round isn't completed it won't be archived.
            # If force=True, will forcefully archive current round.
            community.move_to_next_round(force=True, printfn=logger.info)


if __name__ == "__main__":
    print("__main__")
    handler(None, None)
    # ping()
