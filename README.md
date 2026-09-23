# IDX Web

Next.js + Recharts frontend for the IDX Scraper. Presentation-only — all
calculations happen in the FastAPI backend (`idx-scraper/src/idx_scraper/api`).

## Setup

```bash
cd d:/Project/idx-web
npm install
```

Configure the backend URL in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Run

Start the backend first (from `idx-scraper`, with Postgres env loaded):

```bash
cd /d/Project/idx-scraper
set -a && . ./.env && . ./.env.local && set +a
.venv/Scripts/python.exe -m uvicorn idx_scraper.api.app:app --port 8000
```

Then the frontend:

```bash
cd /d/Project/idx-web
npm run dev        # http://localhost:3000
```

If you serve on a different port (e.g. 3100), add it to the backend's
`IDX_API_CORS_ORIGINS` allowlist.

## Structure

- `lib/types.ts` — TypeScript mirrors of the backend Pydantic schemas
- `lib/api.ts` — typed fetch client + SWR fetcher
- `lib/hooks.ts` — SWR hooks (30s auto-refresh)
- `lib/format.ts` — id-ID number / percent / compact-IDR formatting
- `components/` — MarketOverview, WatchlistTable, SignalsPanel, TechnicalChart, SessionMovers
- `app/page.tsx` — dashboard composition
