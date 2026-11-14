# Deploy (VPS)

The `deploy` job in `.github/workflows/ci.yml` runs only when **both** repository
variables are set:

| Variable | Value |
| --- | --- |
| `PUBLISH_IMAGES` | `true` — build and push `ghcr.io/<owner>/<repo>-api` and `-web` |
| `DEPLOY_ENABLED` | `true` — run the SSH release |

Required secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (private key) and
`VPS_KNOWN_HOSTS` (output of `ssh-keyscan <host>`). The `production`
environment should be protected with required reviewers.

## One-time server setup

```bash
sudo mkdir -p /opt/brewlite && sudo chown "$USER" /opt/brewlite
cd /opt/brewlite
cp /path/to/deploy/env.example .env   # then fill in real secrets
chmod 600 .env
```

The stack publishes only on loopback (`API_PORT=3001`, `WEB_PORT=3000`).
Terminate TLS on the host and proxy to those ports, e.g. nginx:

```nginx
# brew.example.com -> web
location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
# api.example.com  -> api
location / { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; }
```

`NEXT_PUBLIC_API_URL` is baked into the web image at build time, so set the
repository variable `NEXT_PUBLIC_API_URL=https://api.example.com` **before** the
first image is published. The API must be reachable on that origin from the
browser, and `FRONTEND_URL` must be the web origin so CORS matches.

## What a release does

1. `images` pushes `:<commit-sha>` and `:main` tags for both components.
2. `deploy` uploads `docker-compose.prod.yml` + `deploy/` to
   `/opt/brewlite/incoming-<sha>.tar.gz`.
3. `bash deploy/release.sh <sha>` pulls the pinned tags, runs
   `docker compose up -d`, and waits for the API and web health checks.
4. The API container applies `prisma migrate deploy` on start.
5. On failure the script redeploys `.last-good-tag` and exits non-zero, so the
   GitHub run is marked failed.
