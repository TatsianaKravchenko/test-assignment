# Backend — Data Processor & Analytics microservices

Two NestJS microservices in a single monorepo, wired together over Redis and
backed by MongoDB, PostgreSQL and RedisTimeSeries. Shared infrastructure
(Mongo connection, Redis client, schemas) lives in `libs/shared`.

```
                 ┌────────────────────┐        Redis Pub/Sub        ┌────────────────────┐
   DummyJSON ──► │  Service A          │  ── "api-events" channel ──►│  Service B          │
   public API    │  data-processor     │                             │  analytics-service  │
                 │  (port 3000)        │                             │  (port 3001)        │
                 └─────────┬───────────┘                             └─────────┬──────────┘
                           │ products (1 doc each)                             │ logs
                           ▼                                                   ▼
                       MongoDB  ◄── RedisTimeSeries (TS.ADD)              PostgreSQL
```

## Services

### Service A — `data-processor` (port 3000)

- `GET  /data/fetch` — fetches products from the DummyJSON public API entirely
  in code, saves the raw payload to a JSON file, and inserts each product as its
  own document in Mongo (idempotent bulk-upsert by source `id`).
- `POST /data/upload` — uploads and parses a `JSON`/`CSV` file in code and
  inserts the parsed records the same way.
- `GET  /data/search?query=&limit=&skip=` — case-insensitive substring search
  over the indexed `title`/`description` fields with collection-level
  `skip`/`limit` pagination and an accurate `total` count.
- Every action (`fetch` / `upload` / `search`) is written to **RedisTimeSeries**
  (`TS.ADD`) and published on the `api-events` channel.

On first boot, if the `products` collection is empty the service auto-seeds it
from DummyJSON (`onApplicationBootstrap`).

### Service B — `analytics-service` (port 3001)

- Subscribes to the `api-events` Redis channel and persists each event as a log
  row in PostgreSQL (TypeORM).
- `GET /analytics/logs?action=&startDate=&endDate=` — query stored logs by type
  and date range.
- `GET /analytics/report` — generates a **PDF report with a bar chart** built
  from the RedisTimeSeries metrics (last 24h), with labels and layout.

## Data model (MongoDB)

| Collection    | Purpose                                                              |
| ------------- | ------------------------------------------------------------------- |
| `products`    | One document per product. Text index on `title` + `description`.    |
| `parseddatas` | Ingestion log — one record per fetched/uploaded file (`recordCount`).|

Storing products individually (instead of one document holding the whole array)
is what makes the search index-friendly and pagination/counting efficient.

## Running with Docker Compose (from the repo root)

```bash
docker compose up --build
```

This starts MongoDB, PostgreSQL, `redis/redis-stack` (which provides the
RedisTimeSeries module), and both microservices. Service hosts are resolved via
environment variables (`MONGO_HOST`, `REDIS_HOST`, `POSTGRES_HOST`, ...), so the
same code runs locally (defaults to `localhost`) and inside the Docker network.

- Service A Swagger: http://localhost:3000/api
- Service B Swagger: http://localhost:3001/api
- RedisInsight (inspect time-series keys): http://localhost:8001

## Running locally (without Docker)

Start MongoDB, PostgreSQL and Redis Stack yourself, then:

```bash
npm install
npm run start:dev            # data-processor (default app)
npm run start:dev analytics-service
```

## Tests

```bash
npm run test        # unit tests
npm run test:e2e    # e2e tests
```
