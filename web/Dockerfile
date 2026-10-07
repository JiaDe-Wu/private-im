FROM node:20.9.0 AS builder
WORKDIR /app

ARG YARN_REGISTRY=https://registry.npmmirror.com
RUN yarn config set registry ${YARN_REGISTRY} \
  && yarn config set network-timeout 600000

COPY . .
RUN yarn install --frozen-lockfile --network-timeout 600000 && yarn build

FROM nginx:latest
COPY --from=builder /app/docker-entrypoint.sh /docker-entrypoint2.sh
RUN sed -i 's/\r$//' /docker-entrypoint2.sh
COPY --from=builder /app/nginx.conf.template /
COPY --from=builder /app/apps/web/build /usr/share/nginx/html
ENTRYPOINT ["sh", "/docker-entrypoint2.sh"]
CMD ["nginx","-g","daemon off;"]
