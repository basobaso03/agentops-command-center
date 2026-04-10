# Deployment Checklist

## Secrets and Keys
- Rotate any previously exposed API keys immediately.
- Set `GEMINI_API_KEY` as a deployment secret (never commit real values).
- Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as deployment secrets.
- Keep `server/.env` local-only; use `server/.env.example` as the template.

## Backend Configuration
- Set `NODE_ENV=production`.
- Set `CORS_ORIGIN` to your frontend domain(s), comma-separated.
- Tune `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` for expected load.
- Deploy server behind HTTPS.

## Frontend Configuration
- Set `VITE_API_BASE_URL` to your deployed backend API URL.
- Run `npm run build` in `client` and verify the bundle output.

## Data and Access
- Verify Supabase tables exist and migrations are applied.
- Confirm Row Level Security and policies are correct for production use.
- Audit who can read/write `chat_messages`, `agent_logs`, and knowledge base tables.

## Validation Before Go-Live
- Health check: `GET /api/health` returns status ok.
- Route check: `POST /api/chat/route` returns a valid department and agent.
- Chat check: `POST /api/chat` succeeds or returns controlled fallback responses.
- Logs check: application does not leak internal stack traces in API responses.

## Monitoring
- Enable platform logs and alerts for backend restarts and 5xx spikes.
- Monitor Gemini quota/availability and fallback frequency.
- Track API 429 rates to tune rate-limiting thresholds.
