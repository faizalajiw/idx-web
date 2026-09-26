# Market Labs — IDX Web

Next.js + Recharts frontend for the IDX market-data platform. Presentation-only —
all calculations happen in the FastAPI backend
(`market-labs/idx-scraper/src/idx_scraper/api`). Data source auto-switches between
the official IDX feed and Yahoo Finance fallback.

## Features

### Market Overview & Narasi
- **Market Overview** — IHSG close/change, total volume, top gainers/losers
- **Narasi Pasar** — auto-generated market summary (IHSG + breadth: up/down/flat)
- **Market Regime** — IHSG regime detection (ADX + realized volatility)
- **Session Movers** — biggest movers of the current session

### Watchlist & Signals (`/pantau`)
- **Watchlist CRUD** — add/remove/replace tickers (persisted to `.env`)
- **Technical signals** — BUY/SELL/HOLD per emiten
- **Hold-Check** — combined technical + valuation "still worth holding?" verdict

### Per-Stock Analysis (`/stock/[code]`)
- **Price history** & **technical chart** (OHLCV + indicators)
- **Broker summary** per emiten
- **Dividend detail** per emiten (cash history + splits)

### Advanced Analytics
- **Foreign Flow** — foreign fund flow (`/foreign`)
- **Sector Analysis** + **RRG** (Relative Rotation Graph, `/sectors`)
- **Valuation** — PER/PBV and peers (`/valuation`)
- **Screener** — multi-criteria filter: signal, RSI, momentum, value, foreign-in,
  volume ratio (`/screener`)

### Dividends & Corporate Actions (`/dividen`)
- **Dividend overview** — totals, yearly history, top trailing yields
- **Corporate actions ledger** — splits, reverse splits, bonus, rights, dividends

### Data Quality (`/quality`)
- **Quality overview** — coverage, freshness, counts for the `research.*` layer
- **Quarantine viewer** — rows rejected by the quality gate + reason
- **Coverage gaps** & **thin days** — detect missing/partial scrape days
- **Duplicate detection** — bars with more than one knowledge_date

### Alerts (Telegram)
- **Alert rules CRUD** — create watch conditions
- **Test message** — verify Telegram wiring

### Backtest (`/backtest`)
- **Backtest engine** — point-in-time simulation, equity curve + metrics, with a
  cost model (commission, tax, slippage) and configurable rebalance frequency

### Learn (`/learn`)
- Education / glossary page for market terms

## Setup

```bash
cd d:/Project/market-labs/idx-web
npm install
```

Configure the backend URL in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Run

Start the backend first (from `idx-scraper`, with Postgres env loaded):

```bash
cd /d/Project/market-labs/idx-scraper
set -a && . ./.env && set +a
.venv/Scripts/python.exe -m uvicorn idx_scraper.api.app:app --port 8000
```

Then the frontend:

```bash
cd /d/Project/market-labs/idx-web
npm run dev        # http://localhost:3000
```

If you serve on a different port (e.g. 3100), add it to the backend's
`IDX_API_CORS_ORIGINS` allowlist.

## Structure

- `lib/types.ts` — TypeScript mirrors of the backend Pydantic schemas
- `lib/api.ts` — typed fetch client + SWR fetcher
- `lib/hooks.ts` — SWR hooks (30s auto-refresh)
- `lib/format.ts` — id-ID number / percent / compact-IDR formatting
- `components/` — MarketOverview, MarketNarration, RegimeBanner, MarketBadge, WatchlistTable, SignalsPanel, HoldCheckPanel, TechnicalChart, HistoryTable, SessionMovers, SectorRRGChart, BrokerSummary, EquityCurveChart, RebalanceLedger, AlertRules, TelegramStatus, DividendYearChart, DividendDetailPanel, Sidebar, Card, States
- `app/page.tsx` — dashboard composition
- `app/pantau/page.tsx` — watchlist + signals + alert rules + Telegram wiring
- `app/stock/[code]/page.tsx` — per-stock technical, history, brokers, dividends
- `app/screener/page.tsx` — multi-criteria stock screener
- `app/sectors/page.tsx` — sector analysis + RRG rotation graph
- `app/foreign/page.tsx` — foreign fund flow
- `app/valuation/page.tsx` — PER/PBV valuation view
- `app/hold-check/page.tsx` — combined hold verdict
- `app/dividen/page.tsx` — dividend overview, trailing yields, corp-action ledger
- `app/quality/page.tsx` — data-quality dashboard (coverage, quarantine, gaps)
- `app/backtest/page.tsx` — strategy simulator (equity curve, rebalance cadence, cost model, gross/net metrics vs buy & hold)
- `app/learn/page.tsx` — education / glossary page

Full change history for both repos: see `../idx-scraper/AUDIT.md`.
