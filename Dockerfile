# Book Club with its progress server. One container, no database.
#   docker run -d -p 8080:8080 -v bookclub_data:/data ghcr.io/doodelidodo/bookclub:latest
FROM node:22-alpine

WORKDIR /app
COPY index.html manifest.webmanifest sw.js ./
COPY css ./css
COPY js ./js
COPY vendor ./vendor
COPY assets ./assets
COPY packs ./packs
COPY fonts ./fonts
COPY server ./server
COPY repertoire ./repertoire
COPY tools/selftest.js tools/build-pack.js ./tools/

ENV PORT=8080 \
    BASE_PATH=/ \
    DATA_DIR=/data \
    BACKUP_DAYS=60

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1:${PORT}${BASE_PATH}api/health" >/dev/null || exit 1

CMD ["node", "server/server.js"]
