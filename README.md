# Product Search & Annotation — Full-Stack Test Assignment

A full-stack application featuring a typeahead product search with a virtual-scrolled,
paginated result grid, a canvas-based polygon annotation tool, and a polyglot
microservice backend (NestJS + Go) with MongoDB, PostgreSQL, Redis/RedisTimeSeries,
gRPC, and Swagger docs.

---

## Demo

https://github.com/user-attachments/assets/c8e70491-eb2d-4e82-bccd-389eff2c3750

---

## Architecture

```
                    ┌──────────────────────────┐
   Browser ◄──HTTP──┤  Angular frontend (4200) │
                    └────────────┬─────────────┘
                                 │ REST
                    ┌────────────▼─────────────┐        Redis Pub/Sub        ┌─────────────────────────┐
   DummyJSON ─────► │  data-processor (3000)   │ ─ "api-events" channel ───► │  analytics-service (3001)│
   public API       │  NestJS — Service A      │                            │  NestJS — Service B      │
                    └───┬───────────────┬──────┘                            └───────┬──────────┬────────┘
                        │ products       │ TS.ADD                                   │ logs      │ gRPC
                        ▼                ▼                                          ▼           ▼
                    MongoDB        RedisTimeSeries                            PostgreSQL   report-service (50051)
                                                                                          Go + gRPC → PDF
```

- **Frontend (Angular 21, NgRx):** typeahead search (debounce + `switchMap` + result caching),
  CDK virtual scroll with batch pagination, search-history suggestions, and a Canvas polygon
  editor (draw / drag / rotate, aspect-ratio preserving, persisted in the store + localStorage).
- **Service A — `data-processor` (NestJS):** in-code pipeline that fetches data from a public API
  to a JSON file, then parses that file into MongoDB (one document per product), exposes an
  indexed search API, and publishes every action to RedisTimeSeries.
- **Service B — `analytics-service` (NestJS):** subscribes to Service A's events, stores logs in
  PostgreSQL, exposes a filtered logs API, and serves a PDF report.
- **`report-service` (Go, gRPC):** renders the analytics PDF (bar chart from RedisTimeSeries),
  called by Service B over gRPC.

---

## Tech stack

| Layer         | Technology                                                                           |
| ------------- | ------------------------------------------------------------------------------------ |
| Frontend      | Angular 21, Angular Material, Angular CDK, NgRx (store/effects/entity), RxJS, Canvas |
| Backend       | NestJS 11 (monorepo: 2 apps + shared lib), TypeScript                                |
| Report svc    | Go 1.25, gRPC, go-pdf/fpdf                                                           |
| Databases     | MongoDB (Mongoose), PostgreSQL (TypeORM)                                             |
| Cache/metrics | Redis Stack (Pub/Sub + RedisTimeSeries)                                              |
| Messaging     | Redis Pub/Sub (A → B), gRPC (B → report-service)                                     |
| API docs      | Swagger (OpenAPI)                                                                    |
| Infra         | Docker + Docker Compose                                                              |

---

## Prerequisites

- **Docker** and **Docker Compose** (v2) — required to run the backend stack.
- **Node.js 20+** (22 recommended) and **npm** — to run the Angular frontend (it is not containerised).
- _(Optional)_ **Go 1.25** — only if you want to run the report-service outside Docker.

---

## Quick start (recommended)

### 1. Start the backend stack with Docker Compose

From the repository root:

```bash
docker compose up --build
```

This builds and starts everything except the frontend:

| Container             | Port(s)        | Purpose                                    |
| --------------------- | -------------- | ------------------------------------------ |
| `data-processor`      | `3000`         | Service A (fetch pipeline / search)        |
| `analytics-service`   | `3001`         | Service B (logs / PDF report)              |
| `report-service`      | `50051`        | Go gRPC PDF renderer                       |
| `mongodb`             | `27017`        | Product storage                            |
| `postgres`            | `5432`         | Analytics logs (`analytics_db`)            |
| `redis` (Redis Stack) | `6379`, `8001` | Pub/Sub + RedisTimeSeries (+ RedisInsight) |

On first boot, Service A auto-loads the catalog by running its ingestion pipeline (fetch from
the public API → save JSON file → parse it → MongoDB), so search works immediately. Refresh the
data anytime via **`GET /data/fetch`** (Swagger at http://localhost:3000/api or
`curl http://localhost:3000/data/fetch`). To reset: `docker compose down -v`.

### 2. Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm start          # ng serve
```

Open **http://localhost:4200/**. The frontend talks to Service A at `http://localhost:3000`.

---

## Useful URLs

- **App:** http://localhost:4200
- **Service A Swagger:** http://localhost:3000/api
- **Service B Swagger:** http://localhost:3001/api
- **RedisInsight** (inspect time-series keys): http://localhost:8001

---

## API endpoints

### Service A — `data-processor`

| Method | Path                               | Description                                                 |
| ------ | ---------------------------------- | ----------------------------------------------------------- |
| GET    | `/data/fetch`                      | Fetch from public API → save JSON file → parse it → MongoDB  |
| POST   | `/data/upload`                     | Upload a JSON file → parse it → insert products into MongoDB |
| GET    | `/data/search?query=&limit=&skip=` | Search products with pagination                             |

### Service B — `analytics-service`

| Method | Path                                          | Description                                   |
| ------ | --------------------------------------------- | --------------------------------------------- |
| GET    | `/analytics/logs?action=&startDate=&endDate=` | Query stored event logs by type/date range    |
| GET    | `/analytics/report`                           | PDF report (rendered by the Go service, gRPC) |

---

## Local development (without Docker)

If you prefer to run the Node services directly, start only the infrastructure with Docker:

```bash
docker compose up -d mongodb postgres redis
```

Then run the backend apps (they default to `localhost` connections):

```bash
cd backend
npm install
npm run start:dev                    # data-processor (Service A, :3000)
npm run start:dev analytics-service  # Service B (:3001) — in a second terminal
```

> Optional: copy `backend/.env.example` to `backend/.env` to override backend config
> (e.g. `PUBLIC_API_URL`). Without a `.env`, the apps fall back to sensible `localhost`
> defaults, so this step is not required for a standard local run.

> Note: `/analytics/report` requires the Go `report-service` on `:50051`. Run it via
> `docker compose up report-service`, or locally with Go installed (`cd report-service`).

Frontend: `cd frontend && npm install && npm start`.

---

## Project structure

```
.
├── docker-compose.yml          # Backend stack orchestration
├── frontend/                   # Angular 21 app (NgRx, Material, Canvas)
├── backend/                    # NestJS monorepo
│   ├── apps/
│   │   ├── data-processor/     # Service A
│   │   └── analytics-service/  # Service B (gRPC client)
│   └── libs/shared/            # Shared Mongo & Redis connection modules + schemas
└── report-service/             # Go gRPC service (PDF report generation)
    ├── proto/report.proto      # gRPC contract
    ├── main.go
    └── Dockerfile
```

---

## Tests

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test
```

---

## Notes

- Connection hosts are configured via environment variables (`MONGO_HOST`, `REDIS_HOST`,
  `POSTGRES_HOST`, `REPORT_GRPC_URL`, ...), defaulting to `localhost` so the same code runs both
  locally and inside the Docker network.
- The shared library exposes independent `MongoModule` and `RedisModule` so each service imports
  only the connections it actually uses.
