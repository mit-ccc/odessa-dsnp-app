FROM public.ecr.aws/lambda/python:3.11

COPY cache /usr/local/bin
RUN chmod a+x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install --no-cache-dir -r requirements.txt

COPY . ${LAMBDA_TASK_ROOT}
RUN python -m compileall ${LAMBDA_TASK_ROOT}
RUN mv .env.production .env \
    && rm -Rf ${LAMBDA_TASK_ROOT}/cache
