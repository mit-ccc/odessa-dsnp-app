import os
import logging
import logging.config

import boto3
from dotenv import load_dotenv
from mangum import Mangum

import api


# You can put initialization code here. See
# https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html

config_path = "/var/task/log-production.ini"
if os.path.exists("/var/task/log-production.ini"):
    logging.config.fileConfig(config_path, disable_existing_loggers=True)

logger = logging.getLogger("api.lambda")
# logger.addHandler(logging.StreamHandler(sys.stdout)) # FIXME: this line caused to log twice.
logger.setLevel(logging.INFO)

logger.info("initializing lambda function, version %s", api.version.VERSION)

load_dotenv()

# output our arn
sts_client = boto3.client("sts")
logger.info("AWS ARN = %s", sts_client.get_caller_identity()["Arn"])

# ffmpeg is installed into /usr/local/bin in lambda, so add this to
# the search path.
os.environ["PATH"] = f"{os.environ['PATH']}:/usr/local/bin"


handler = Mangum(
    api.app,
    lifespan="auto",
    api_gateway_base_path="/deploy",
)
