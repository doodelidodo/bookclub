# Book Club in my-platform (tando)

Same pattern as `/pause`: the app lives under its own path, Traefik routes it
**without stripprefix** (the container itself serves under `/bookclub/`), and
the image comes from GitHub like Knightmare, so there is one source.

## 1. docker-compose.yml

```yaml
  bookclub:
    image: ghcr.io/doodelidodo/bookclub:latest
    restart: unless-stopped
    environment:
      BASE_PATH: /bookclub/
      BACKUP_DAYS: "60"
    volumes:
      - bookclub_data:/data
    labels:
      - traefik.enable=true
      - traefik.http.routers.bookclub.rule=PathPrefix(`/bookclub`)
      - traefik.http.routers.bookclub.priority=150
      - traefik.http.services.bookclub.loadbalancer.server.port=8080
```

and under the top-level `volumes:`

```yaml
  bookclub_data:
```

Copy the router labels from the `pause-page` service if it uses an entrypoint or
TLS label; the lines above are the ones Book Club needs on top. The redirect
`/bookclub` → `/bookclub/` is done by the container itself. No `.env` entry, no
port to the outside.

## 2. Deploy

```bash
docker compose pull bookclub && docker compose up -d bookclub
docker compose logs --tail 5 bookclub      # "Book Club on http://localhost:8080/bookclub/ · progress in /data/progress.json"
```

Then open `/bookclub/` on the phone and the laptop. The small dot top right shows
the state: green = saved on the server, blue = saving, red = offline (answers are
kept in the browser and sent as soon as the connection is back).

## 3. Backup

The progress is one small JSON file in the volume, written atomically (temp file,
then rename), so a plain file copy is consistent. The container also keeps a copy
per day in `/data/backups/` (60 days).

For restic, add the volume to `ops/backup.sh`, like the SFTP volume:

```bash
docker volume inspect my-platform_bookclub_data --format '{{ .Mountpoint }}'
```

## 4. If something goes wrong

- Restore a day: `docker compose cp bookclub:/data/backups/progress-2026-10-04.json ./restore.json`,
  then in the app *Settings → Restore (file)*. Restoring merges, it never deletes newer answers.
- Logs: `docker compose logs bookclub`. A broken `progress.json` is reported there and the
  server starts empty; the daily copies stay untouched.
