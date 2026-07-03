# Backend — Data Processor & Analytics microservices

Two NestJS microservices in a single monorepo, wired together over Redis and
backed by MongoDB, PostgreSQL and RedisTimeSeries. Shared infrastructure
(Mongo connection, Redis client, schemas) lives in `libs/shared`.

```
                 ┌────────────────────┐        Redis Pub/Sub        ┌────────────────────┐
   Public API ─► │  Service A          │  ── "api-events" channel ──►│  Service B          │
   (DummyJSON)   │  data-processor     │                             │  analytics-service  │
                 │  (port 3000)        │                             │  (port 3001)        │
                 └─────────┬───────────┘                             └─────────┬──────────┘
                           │ products                                          │ logs
                           ▼                                                   ▼
                       MongoDB  ◄── RedisTimeSeries (TS.ADD)              PostgreSQL
                                                                              │ gRPC
                                                                              ▼
                                                                     report-service (Go)
```

## Services

### Service A — `data-processor` (port 3000)

- `GET /data/fetch` — **in-code ingestion pipeline**: fetches products from the
  public API, saves the raw payload to a JSON file, then parses that file and
  inserts each product as its own document into MongoDB (idempotent bulk-upsert
  by source `id`).
- `GET /data/search?query=&limit=&skip=` — case-insensitive substring search
  over the indexed `title`/`description` fields with collection-level
  `skip`/`limit` pagination and an accurate `total` count.
- Every action (`fetch` / `search`) is written to **RedisTimeSeries** (`TS.ADD`)
  and published on the `api-events` channel.

> MongoDB is populated exclusively by the fetch pipeline. On first boot, if the
> collection is empty the service runs it automatically, so the app has data on
> page load. Re-run it anytime via `GET /data/fetch` (Swagger or
> `curl http://localhost:3000/data/fetch`) to refresh the catalog.

### Service B — `analytics-service` (port 3001)

- Subscribes to the `api-events` Redis channel and persists each event as a log
  row in PostgreSQL (TypeORM).
- `GET /analytics/logs?action=&startDate=&endDate=` — query stored logs by type
  and date range.
- `GET /analytics/report` — returns a **PDF report with a bar chart** built from
  the RedisTimeSeries metrics. The PDF is rendered by the Go `report-service`
  over **gRPC**.

## Data model (MongoDB)

| Collection    | Purpose                                                              |
| ------------- | ------------------------------------------------------------------- |
| `products`    | One document per product. Text index on `title` + `description`.    |
| `parseddatas` | Ingestion log — one record per fetch run (`recordCount`).           |

Storing products individually (instead of one document holding the whole array)
is what makes the search index-friendly and pagination/counting efficient.

## Running with Docker Compose (from the repo root)

```bash
docker compose up --build
```

Starts MongoDB, PostgreSQL, `redis/redis-stack` (which provides the
RedisTimeSeries module), both NestJS services and the Go report-service. Service
hosts are resolved via environment variables (`MONGO_HOST`, `REDIS_HOST`,
`POSTGRES_HOST`, `REPORT_GRPC_URL`, ...), so the same code runs locally
(defaulting to `localhost`) and inside the Docker network.

- Service A Swagger: http://localhost:3000/api
- Service B Swagger: http://localhost:3001/api
- RedisInsight (inspect time-series keys): http://localhost:8001

## Running locally (without Docker)

Start MongoDB, PostgreSQL and Redis Stack yourself, then:

```bash
npm install
npm run start:dev                     # data-processor (default app)
npm run start:dev analytics-service
```

## Tests

```bash
npm run test        # unit tests
npm run test:e2e    # e2e tests
```
