DEPLOY_ECR=411833189048.dkr.ecr.us-east-1.amazonaws.com
DEPLOY_API_ARN=arn:aws:lambda:us-east-1:411833189048:function:odessa-api
DEPLOY_WORKER_ARN=arn:aws:lambda:us-east-1:411833189048:function:odessa-worker
DEPLOY_NEW_POST_WORKER_ARN=arn:aws:lambda:us-east-1:411833189048:function:odessa-new-post-worker
DEPLOY_API_LOGS=/aws/lambda/odessa-api
DEPLOY_WORKER_LOGS=/aws/lambda/odessa-worker
DEPLOY_NEW_POST_WORKER_LOGS=/aws/lambda/odessa-new-post-worker


all:
	@echo "usage:"
	@echo "  make build"
	@echo "  make push"
	@echo "  make update"
	@echo "  make clean"
	@echo "  make api-logs"
	@echo "  make worker-logs"

build: cache/ffmpeg cache/ffprobe
	docker build --platform linux/amd64 -t odessa .

examine:
	docker run --rm -it --entrypoint sh odessa:latest

push:
	aws ecr get-login-password | docker login --username AWS --password-stdin $(DEPLOY_ECR)
	docker tag odessa:latest $(DEPLOY_ECR)/odessa
	docker push $(DEPLOY_ECR)/odessa

update:
	aws lambda update-function-code --function-name $(DEPLOY_API_ARN) \
		--image-uri $(DEPLOY_ECR)/odessa:latest
	aws lambda update-function-code --function-name $(DEPLOY_WORKER_ARN) \
		--image-uri $(DEPLOY_ECR)/odessa:latest
	aws lambda update-function-code --function-name $(DEPLOY_NEW_POST_WORKER_ARN) \
		--image-uri $(DEPLOY_ECR)/odessa:latest

api-logs:
	aws logs tail $(DEPLOY_API_LOGS) --follow

worker-logs:
	aws logs tail $(DEPLOY_WORKER_LOGS) --follow

new-post-worker-logs:
	aws logs tail $(DEPLOY_NEW_POST_WORKER_LOGS) --follow

clean:
	rm -Rf build cache
	docker image rm odessa:latest

cache/ffmpeg:
	aws s3 cp s3://ccc-odessa/deployment/ffmpeg cache/ffmpeg

cache/ffprobe:
	aws s3 cp s3://ccc-odessa/deployment/ffprobe cache/ffprobe
