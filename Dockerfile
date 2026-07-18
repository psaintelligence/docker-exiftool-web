
# https://hub.docker.com/r/alpine/git/
FROM docker.io/alpine/git:latest AS clone

# https://github.com/6over3/exiftool/tags
# v1.0.5 = 2025-07-24
# v1.0.6 = 2025-11-15
# v1.0.9 = 2025-12-05
ARG COMMIT_TAG="v1.0.9"
ARG SOURCE_REPO="https://github.com/6over3/exiftool.git"

WORKDIR /clone

RUN set -x && \
    export SOURCE_COMMIT_ID="$(echo ${COMMIT_TAG} | cut -d'+' -f2)" && \
    export SOURCE_TAG_BRANCH="$(echo ${COMMIT_TAG} | cut -d'+' -f1)" && \
    git clone --config advice.detachedHead=false --depth 1 --branch "${SOURCE_TAG_BRANCH}" "${SOURCE_REPO}" "/clone" && \
    git reset --hard "${SOURCE_COMMIT_ID}" && \
    git log

# ===
# https://hub.docker.com/_/node/tags
FROM docker.io/node:24-alpine AS build

WORKDIR /app
RUN npm install -g bun
COPY --from=clone /clone/package*.json ./
RUN npm ci

COPY --from=clone /clone/. ./
RUN npm run build

# https://hub.docker.com/r/nginxinc/nginx-unprivileged
# nginx-unprivileged runs the master process as non-root (uid 101) and listens on 8080.
FROM docker.io/nginxinc/nginx-unprivileged:alpine AS production

# OCI Labels
LABEL org.opencontainers.image.title="Docker Exiftool Web"
LABEL org.opencontainers.image.authors="Nicholas de Jong <ndejong@psaintelligence.ai>"
LABEL org.opencontainers.image.source="https://github.com/psaintelligence/docker-exiftool-web"

# nginx-unprivileged ships its web root owned by root, so filesystem
# mutations (rm, COPY) must happen as root before dropping to uid 101.
USER root

WORKDIR /usr/share/nginx/html
RUN rm -Rf /usr/share/nginx/html/*

COPY --from=build /app/public/* ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER 101
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
