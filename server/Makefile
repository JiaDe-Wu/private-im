IMAGE ?= registry.cn-shanghai.aliyuncs.com/wukongim/tangsengdaodaoserver
PLATFORMS ?= linux/amd64,linux/arm64

build:
	docker build -t tangsengdaodaoserver .
push:
	docker tag tangsengdaodaoserver registry.cn-shanghai.aliyuncs.com/wukongim/tangsengdaodaoserver:latest
	docker push registry.cn-shanghai.aliyuncs.com/wukongim/wukongchatserver:latest
deploy:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE):latest --push --provenance=false .
deploy-v2:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE):v2 --push --provenance=false .

run-dev:
	docker-compose build;docker-compose up -d
stop-dev:
	docker-compose stop
env-test:
	docker-compose -f ./testenv/docker-compose.yaml up -d 
