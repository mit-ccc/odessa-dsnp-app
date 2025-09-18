import logging
import logging.config
import os

import api
import api.resolvers as resolvers
import boto3
import sqlalchemy

# You can put initialization code here. See
# https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html

config_path = "/var/task/log-production.ini"
if os.path.exists("/var/task/log-production.ini"):
    logging.config.fileConfig(config_path, disable_existing_loggers=True)

logger = logging.getLogger("worker")
# logger.addHandler(logging.StreamHandler(sys.stdout)) # FIXME: this line caused to log twice.
logger.setLevel(logging.INFO)

logger.info(
    "initializing upgraded_rounds lambda function, version %s", api.version.VERSION
)

# output our arn
sts_client = boto3.client("sts")
logger.info("AWS ARN = %s", sts_client.get_caller_identity()["Arn"])

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
            # following line triggers a notification the first time it's true
            if not community.is_active or community.active_round.completed:
                # If force=False, and round isn't completed it won't be archived.
                # If force=True, will forcefully archive current round.
                community.move_to_next_round(force=False, printfn=logger.info)
            else:
                logger.info(f"Community.id {community.id} is_active.")

        context["db-conn"].commit()
        context["db-conn"].close()
