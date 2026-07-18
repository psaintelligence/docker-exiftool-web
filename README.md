# docker-exiftool-web

A Docker container that serves a web-based **File Metadata Extractor** powered by
[`6over3/exiftool`](https://github.com/6over3/exiftool/) — a WebAssembly port of
ExifTool that runs entirely in the browser, with no server-side file processing.

Customized and maintained by **PSA Intelligence**.

## Features

- **Fully client-side** — files never leave the browser; metadata extraction runs
  locally via WebAssembly.
- **Static hosting** — served as a single nginx container, trivially deployable
  behind any reverse proxy or load balancer.
- **Pinned upstream releases** — each image tag is built from a specific
  `6over3/exiftool` release for reproducibility.
- **Lightweight** — `nginx:alpine` base, ~10 MB image layer on top of nginx.

## Quick start

Images are published to both Docker Hub and the GitHub Container Registry (GHCR).
Pick whichever registry you prefer — the image content is identical.

```bash
# Docker Hub
docker pull psaintelligence/exiftool-web:latest

# GHCR
docker pull ghcr.io/psaintelligence/exiftool-web:latest

# Run on http://localhost:8080
docker run -d \
  --name exiftool-web \
  -p 8080:8080 \
  --restart unless-stopped \
  psaintelligence/exiftool-web:latest
```

Open <http://localhost:8080> in your browser.

### Docker Compose

```yaml
services:
  exiftool-web:
    image: ghcr.io/psaintelligence/exiftool-web:latest  # or psaintelligence/exiftool-web:latest
    ports:
      - "8080:8080"
    restart: unless-stopped
```

```bash
docker compose up -d
```

## Tags

| Tag            | Description                                                  |
|----------------|--------------------------------------------------------------|
| `latest`       | Most recent tagged release.                                  |
| `v1.0.9`       | Pinned to upstream `6over3/exiftool` release `v1.0.9`.       |
| `dev-<sha>`    | Per-commit builds from the `dev` branch.                    |

Tag listings:
- Docker Hub — <https://hub.docker.com/r/psaintelligence/exiftool-web/tags>
- GHCR — <https://github.com/psaintelligence/docker-exiftool-web/pkgs/container/exiftool-web>

## Configuration

The container exposes **TCP port 8080**. Override the host port in the normal
Docker way (`-p <host-port>:8080`).

nginx is configured for SPA-style routing — unknown paths fall back to
`index.html`, so the app can be hosted at any sub-path behind a reverse proxy.
See [`nginx.conf`](./nginx.conf) for the full server block.

## Building from source

This repository builds the image directly from the upstream `6over3/exiftool`
source at a pinned tag, then ships the compiled static output with nginx.

```bash
git clone https://github.com/psaintelligence/docker-exiftool-web.git
cd docker-exiftool-web

# Build with the default upstream tag (v1.0.9)
docker build -t exiftool-web:local .

# Build against a different upstream tag
docker build -t exiftool-web:v1.0.6 \
  --build-arg COMMIT_TAG=v1.0.6 .

docker run --rm -p 8080:8080 exiftool-web:local
```

See the [`Dockerfile`](./Dockerfile) for the full multi-stage build definition.

## How it works

1. **`clone` stage** — fetches `6over3/exiftool` at the pinned `COMMIT_TAG`.
2. **`build` stage** — `node:24-alpine` installs deps and runs `npm run build`
   to produce the static SPA in `/app/public`.
3. **`production` stage** — `nginx:alpine` serves the static output on port 8080.

All metadata extraction happens **in the browser** using a WebAssembly build of
ExifTool — there is no Perl runtime, no file upload endpoint, and no persistence
layer in this container.

## Credits

- **Upstream project** — [`6over3/exiftool`](https://github.com/6over3/exiftool/).
- **Andrew Sampson** ([`@andrewmd5`](https://github.com/andrewmd5)) — this would
  not exist without his work on
  [ZeroPerl: Sandboxed Perl with WebAssembly](https://andrews.substack.com/p/zeroperl-sandboxed-perl-with-webassembly).
- **Phil Harvey** — the original
  [ExifTool](https://exiftool.org/).

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
