# KWHU Supabase Runtime

This folder contains the minimum self-hosted Supabase runtime files needed for the KWHU project.

The KWHU app remains `wallet-first`. This stack exists only for `off-chain data and storage` compatibility and later expansion.

## Included

- `docker-compose.yml`
- `.env.example`
- only the mounted `volumes/` files required by the active compose stack

## KWHU Defaults

- Compose project name: `kwhu-supabase`
- API gateway: `http://localhost:8050`
- HTTPS gateway: `https://localhost:8445`
- Postgres port: `54322`
- Transaction pooler port: `65432`

## Quick Start

1. Copy `.env.example` to `.env`.
2. Replace all placeholder secrets before first startup.
3. On Docker Desktop for macOS, update `DOCKER_SOCKET_LOCATION` in `.env` if needed.
4. Run `docker compose up -d` from this directory.
5. Use the resulting Supabase URL and keys in the repo root `.env`.

## Notes

- This folder is intentionally trimmed down from the upstream Supabase Docker bundle.
- If we later need alternate storage backends, dev overlays, or helper scripts, we can add only the pieces we actually use.
- Official reference: [Supabase self-hosting docs](https://supabase.com/docs/guides/self-hosting/docker)
