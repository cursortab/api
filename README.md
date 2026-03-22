# cursortab-api

Community data collection API for training an improved completion gating model.
Built with [Hono](https://hono.dev) on Cloudflare Workers with
[Turso](https://turso.tech) (LibSQL) for storage.

## Local Development

```bash
bun install
cp .dev.vars.example .dev.vars  # add your Turso credentials
turso dev --port 8080            # local LibSQL server
bun run dev                      # http://localhost:8787
```

## Deploy

Deploys automatically on push to `main` via GitHub Actions.

### First-time setup

1. Set Cloudflare API token in GitHub repo secrets as `CLOUDFLARE_API_TOKEN`
2. Set Turso secrets on Cloudflare:
   ```bash
   wrangler secret put TURSO_URL
   wrangler secret put TURSO_AUTH_TOKEN
   ```

Database migrations run automatically on first request.

## Endpoints

| Method | Path      | Rate limited | Description                                            |
| ------ | --------- | ------------ | ------------------------------------------------------ |
| `POST` | `/events` | No           | Ingest a completion event                              |
| `GET`  | `/events` | 60/min/IP    | Paginated read (`?limit=&offset=&device_id=&outcome=`) |
| `GET`  | `/stats`  | 60/min/IP    | Aggregate statistics                                   |

See [docs/community-data-schema.md](docs/community-data-schema.md) for the full
schema.
