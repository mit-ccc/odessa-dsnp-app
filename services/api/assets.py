import base64
import io
import json
import logging
import os
import subprocess
import tempfile
import uuid

import assemblyai as aai
import boto3
import six
from botocore.exceptions import ClientError, WaiterError
from dotenv import load_dotenv
from mutagen.mp3 import MP3
from PIL import Image

load_dotenv()

logger = logging.getLogger("api.assets")

# boto3 loads credentials from the AWS_ACCESS_KEY_ID and
# AWS_SECRET_ACCESS_KEY environment variables, or from AWS_PROFILE, or
# from the assumed lambda execution role.
s3_client = boto3.client("s3")


class S3Bucket(object):
    def __init__(
        self,
        name: str = "ccc-odessa",
        audio_path: str = "assets/dev/audio",
        image_path: str = "assets/dev/image",
    ):
        self._name = name
        self._s3_client = s3_client

        audio_path = os.environ.get("AUDIO_ASSET_PATH", audio_path).lstrip("/")
        image_path = os.environ.get("IMAGE_ASSET_PATH", image_path).lstrip("/")

        self._audio_path = audio_path
        self._image_path = image_path

    @property
    def audio_path(self):
        return f"/{self._audio_path}"

    @property
    def image_path(self):
        return f"/{self._image_path}"

    def create_presigned_url(self, file_name, expiration=600):
        """
        expiration:= defaults to 600 seconds.
        """
        response = self._s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._name, "Key": file_name},
            ExpiresIn=expiration,
        )
        return response

    def _get_file_name(self, file_id=None, suffix=None, ctype=None, folder=""):
        if file_id is None:
            file_id = str(uuid.uuid4())[:20]
        else:
            file_id = str(file_id)

        file_name = f"{folder}/{file_id}"

        if suffix:
            file_name = f"{file_name}{suffix}"

        if ctype is not None:
            file_name = f"{file_name}.{ctype}"

        return file_name

    def _decode_base64_file(self, data, header=None):
        """
        Converts base64 to readable IO bytes
        :param data: base64 file input
        :return: (file object, data length)
        """

        if header and isinstance(data, six.string_types):
            if data.startswith(header):
                _, data = data.split(";base64,")

        if type(data) is str:
            # base64 encoded data length must be a multiple of 4, so
            # pad missing chars with =
            data = data + "=" * (-len(data) % 4)
        decoded_file = base64.b64decode(data)

        fout = tempfile.TemporaryFile()
        fout.write(decoded_file)
        fout.flush()
        fout.seek(0)

        del decoded_file  # proactively delete since this could take up a lot of memory

        return fout

    def _upload_raw_file(self, base64_data, file_name):
        fileobj = io.BytesIO(base64_data.encode("ascii"))
        return self._upload_fileobj(fileobj, file_name)

    def _upload_file(self, file, file_name):
        return self._upload_fileobj(file, file_name)

    def _upload_fileobj(self, file, file_name):
        try:
            self._s3_client.upload_fileobj(file, self._name, file_name)
            return self.object_exist(file_name, delay=0.25, max_attempts=5)
        except ClientError as e:
            raise Exception(e.__str__())

    def object_exist(self, file_name, delay=0.05, max_attempts=1):
        try:
            self._s3_client.get_waiter("object_exists").wait(
                Bucket=self._name,
                Key=file_name,
                WaiterConfig={"Delay": delay, "MaxAttempts": max_attempts},
            )
            return True
        except WaiterError as e:
            response = e.last_response["Error"]
            logger.info(f"Waiter ObjectExists failed: {response} {file_name}")
            # {'Code': '403', 'Message': 'Forbidden'}
            # {'Code': '404', 'Message': 'Not Found'}
            return False

    def read_base64_file(self, file_name):
        audio = self._s3_client.get_object(Bucket=self._name, Key=file_name)
        return audio["Body"].read().decode()

    def get_file_url(self, file_id=None, suffix=None, ctype=None):
        file_name = self._get_file_name(file_id, suffix, ctype)
        file_url = f"https://{self._name}.s3.amazonaws.com/{file_name}"
        return file_url


class AudioBucket(S3Bucket):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @property
    def path(self):
        return self._audio_path

    def _get_file_name(self, *args, **kwargs):
        return super()._get_file_name(*args, **kwargs, folder=self.path)

    def upload_file(self, data, file_id, header="data:audio/", context=None):
        # Uploads audio data with audio.id file_id to S3

        # upload data as raw file
        logger.info("uploading raw")
        s3_url_raw = self._get_file_name(file_id, suffix="_raw")
        created_raw = self._upload_raw_file(data, s3_url_raw)
        logger.info("raw s3 path: %s", s3_url_raw)
        return {"created_raw": created_raw}

    def _ffmpeg_convert(self, finp, ctype, verbose=True):
        """Converts the input file to the target type using ffmpeg.

        Returns (file object)

        """

        fout = tempfile.NamedTemporaryFile(prefix="odessa-audio-", suffix=f".{ctype}")
        # takes input via stdin, converts audio to 22khz mono, and
        # outputs a ctype file via stdout
        cmd = f"ffmpeg -i - -ar 22050 -ac 1 -filter_complex compand=attacks=0:points=-80/-900|-45/-15|-27/-9|0/-7|20/-7:gain=5 -f {ctype} -"

        if not verbose:
            cmd = f"{cmd[:-1]} -loglevel error -hide_banner -nostats -"
        logger.info(f"{cmd} > {fout.name}")
        subprocess.run(cmd.split(), stdin=finp, stdout=fout)

        # figure out the output file's size
        fout.flush()
        # os.fsync(fout.file)
        fout.seek(0)  # rewind to start of file

        return fout

    def _ffmpeg_generate_wave(self, fpath, verbose=True):
        with tempfile.NamedTemporaryFile(
            prefix="odessa-audiowave-", suffix=".log", mode="r"
        ) as fout:
            cmd = (
                f"ffprobe -v error -f lavfi -i amovie={fpath},astats=metadata=1:reset=1"
            )
            cmd = cmd + " -show_entries frame_tags=lavfi.astats.1.DC_offset -of csv=p=0"
            print(cmd)
            subprocess.run(cmd.split(), stdout=fout)
            fout.seek(0)
            values = [float(_) for _ in fout.read().split("\n") if len(_) > 0]
        return values

    def _export_transcripts_vtt(self, fpath):
        def __get_formatted_subtitles(transcript, chars_per_caption=24):
            # FIXME(bcsaldias): chars_per_caption should be determined in frontend.
            st, et, text = None, None, ""
            lines = []
            words = transcript.words

            if len(words) == 0:
                return [{"start": 0, "end": -1, "text": ""}]

            sentenses_st = [s.start for s in transcript.get_sentences()]
            for i, word in enumerate(words):
                if st is None:
                    st = word.start

                tmp_text = f"{text} {word.text}".strip()

                is_too_long = len(tmp_text) > chars_per_caption
                is_new_sentence = word.start in sentenses_st
                if text and (is_too_long or is_new_sentence):
                    lines.append({"start": st / 1000, "end": et / 1000, "text": text})
                    st = word.start
                    et = word.end
                    text = word.text
                else:
                    et = word.end
                    text = tmp_text

                if i == len(words) - 1:
                    lines.append(
                        {"start": st / 1000, "end": word.end / 1000, "text": text}
                    )

            return lines

        aai.settings.api_key = os.environ["ASSEMBLY_AI_API_KEY"]
        config = aai.TranscriptionConfig(
            language_code="en_us",
            punctuate=True,
            format_text=True,
            disfluencies=True,
            filter_profanity=False,
        )
        transcriber = aai.Transcriber(config=config)
        transcript = transcriber.transcribe(fpath)
        transcripts = __get_formatted_subtitles(transcript)
        return transcripts

    def process_audio_from_aws(
        self,
        audio_id,
        mp3=True,
        waveform=True,
        transcipt=True,
        ai_moderate=True,
        context=None,
        request_mod_reviews=False,
        request_author_reviews=False,
        verbose=False,
    ):
        """
        This function is core to new posts being processed.
        It takes audio files from AWS to transcribe and analyze it.

        It is currently being called at:
        - Processed in parallel, deployment env
            tasks > tasks_mod > process_pending_post > handle_process_post
        - Processed in series, development env
            api > resolvers > posts > create_post
        - Processed on demand > invoke task from terminal
            jobs > lambda_entrypoint_new_post > process_audio
        """
        # TODO(bcsaldias):
        # request_author_reviews can be set at the community level as a FLAG!

        assert mp3, "mp3 must always be True"
        logger.info(">>> FLAG mp3 = True")

        from api.resolvers import Audios

        audio = Audios.get(context, audio_id)
        audio_info = audio.info_dict
        post = audio.post
        processing_status_dict = post.processing_status_dict if post else {}

        s3_url_raw = self._get_file_name(audio_id, suffix="_raw")
        data = self.read_base64_file(s3_url_raw)

        logger.info("converting to mp3")
        s3_url_audio = self._get_file_name(audio_id, suffix="_full", ctype="mp3")
        fobj = self._decode_base64_file(data, "data:audio/")
        fobj = self._ffmpeg_convert(fobj, "mp3", verbose=verbose)

        logger.info("calculating duration")
        logger.info(fobj.name)
        with open(fobj.name, "rb") as ftemp:
            tmp_info = MP3(ftemp).info.__dict__
            audio_info.update(tmp_info)
            logger.info("audio_info")
            logger.info(audio_info)

        allow_waveform = False
        if allow_waveform and waveform and not processing_status_dict.get("waveform"):
            logger.info(">>> FLAG waveform = True")
            wave_values = self._ffmpeg_generate_wave(fobj.name, verbose=verbose)
            audio_info["wave_values"] = wave_values

        if transcipt and not processing_status_dict.get("transcript"):
            logger.info(">>> FLAG transcipt = True")
            transcripts_vtt = self._export_transcripts_vtt(fobj.name)
            audio_info["transcripts_vtt"] = transcripts_vtt
            logger.info("set transcripts_vtt")

        values = {
            "info": json.dumps(audio_info),
            "duration": float(audio_info["length"]),
        }
        audio = Audios.update(context, audio_id, values)

        if ai_moderate and not processing_status_dict.get("ai_moderated"):
            logger.info(">>> FLAG ai_moderate = True")
            post = audio.post
            if post is None:
                logger.info("Error: Can't moderate because audio.post is None.")
            elif not post.community._FLAG_enabled_mod_actions:
                logger.info(
                    "Error: Can't moderate because FLAG_enabled_mod_actions = False."
                )
            else:
                mode_mod = "audio.plain_transcript"
                mod_params = (mode_mod, request_mod_reviews, request_author_reviews)
                post.run_ai_mod(*mod_params)

        if mp3 and not processing_status_dict.get("mp3"):
            logger.info("uploading mp3")
            self._upload_fileobj(fobj, s3_url_audio)
            logger.info("uploaded mp3 to s3 path: %s", s3_url_audio)

        context["db-conn"].commit()
        logger.info("finished audio processing and uploads")
        return audio


class ImageBucket(S3Bucket):
    def __init__(self, *args, **kwargs):
        sizes = kwargs.pop("sizes", None)
        super().__init__(*args, **kwargs)

        if sizes is None:
            self._available_sizes = (0, 50, 150, 300)  # , 300, 600)
        else:
            self._available_sizes = sizes

    @property
    def path(self):
        return self._image_path

    def _get_file_name(self, *args, **kwargs):
        return super()._get_file_name(*args, **kwargs, folder=self.path)

    def upload_file(self, raw_data, file_id, header="data:image/"):
        # Uploads image data with image.id file_id to S3

        s3_url_raw = self._get_file_name(file_id, suffix="_raw")
        created_raw = self._upload_raw_file(raw_data, s3_url_raw)

        created_image = {}
        for size in self._available_sizes:
            image_data, fmat = self._get_resized_image(raw_data, size)
            s3_url = self._get_file_name(
                file_id, suffix=f"_{size}" if size else None, ctype=fmat
            )
            created = self._upload_file(image_data, s3_url)
            created_image[size] = created

        return {"created_raw": created_raw, "created_image": created_image}

    def _get_resized_image(self, img_data, size, header="data:image/", format="png"):
        fobj = self._decode_base64_file(img_data, header=header)
        img = Image.open(fobj)

        if size > 0:
            h, w = size, size
            if img.width > w or img.height > h:
                img.thumbnail((w, h))

        buf = io.BytesIO()
        img.save(buf, format)
        buf.seek(0)
        return buf, format
