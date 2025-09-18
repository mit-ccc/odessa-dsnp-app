import os
import logging
from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse
from api.assets import S3Bucket
from dotenv import load_dotenv


load_dotenv()

logger = logging.getLogger("api.routers")

bucket = S3Bucket()

audio_router = APIRouter(
    prefix=os.environ["AUDIO_ASSET_PATH"],
)

image_router = APIRouter(
    prefix=os.environ["IMAGE_ASSET_PATH"],
)


@audio_router.get("/{item_id}_{suffix}.{ctype}")
@image_router.get("/{item_id}_{suffix}.{ctype}")
async def get_bucket_url(request: Request, item_id: int, suffix: str, ctype: str):
    """
    Returns S3 url to file. This url contains temporary credentials.
    """

    file_name = request.url.path.lstrip("/")
    temp_access_url = bucket.create_presigned_url(file_name=file_name)
    # logger.info(f"presigned S3 URL for {file_name}: {temp_access_url}")
    return RedirectResponse(url=temp_access_url)
