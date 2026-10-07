IMAGE ?= registry.cn-shanghai.aliyuncs.com/wukongim/tangsengdaodaoweb
TAG ?= latest
LOCAL_IMAGE ?= tangsengdaodaoweb
PLATFORM ?= linux/amd64
PLATFORMS ?= linux/amd64,linux/arm64
YARN_REGISTRY ?= https://registry.npmmirror.com

build:
	docker buildx build --platform $(PLATFORM) --build-arg YARN_REGISTRY=$(YARN_REGISTRY) -t $(LOCAL_IMAGE):$(TAG) --load .

build-amd64:
	$(MAKE) build PLATFORM=linux/amd64

build-arm64:
	$(MAKE) build PLATFORM=linux/arm64

deploy:
	yarn build
	docker buildx build --platform $(PLATFORMS) -f Dockerfile.ghcr -t $(IMAGE):$(TAG) --push .

deploy-dockerbuild:
	docker buildx build --platform $(PLATFORMS) --build-arg YARN_REGISTRY=$(YARN_REGISTRY) -t $(IMAGE):$(TAG) --push .
