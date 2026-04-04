# Station Transfer Events

NestJS service for ingesting station transfer events with idempotent, concurrency-safe batch processing and reconciliation summaries.

## Quick Start

| Action | Local | Docker |
|--------|-------|--------|
| Run the app | `make run` | `docker compose up --build` |
| Run unit tests | `make test` | `docker compose run --rm test` |
| Run e2e tests | `make test-e2e` | `docker compose run --rm test npm run test:e2e` |
| Lint | `make lint` | — |

## Tech Stack

- **Framework:** NestJS 10 (TypeScript, Express)
- **Database:** PostgreSQL 16 with TypeORM
- **Validation:** class-validator, class-transformer
- **API Docs:** Swagger / OpenAPI via @nestjs/swagger
- **Testing:** Jest, Supertest

## Running Locally

**Prerequisites:** Node.js 20+, PostgreSQL running locally

```bash
npm install
```

Create a `.env` file in `src/`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=petro_app
SERVER_PORT=3000
```

```bash
npm run start:dev
```

The app will start on `http://localhost:3000`. Swagger docs at `http://localhost:3000/docs`.

## Running with Docker

```bash
docker compose up --build
```

This starts both PostgreSQL and the app. API available at `http://localhost:3000`, Swagger at `http://localhost:3000/docs`.

## Running Tests

```bash
# Unit tests
npm test

# E2E tests (requires running PostgreSQL)
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Examples

### Ingest Transfer Events

```bash
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "event_id": "evt-001",
        "station_id": "station-A",
        "amount": 150.75,
        "status": "approved",
        "created_at": "2024-01-15T10:30:00Z"
      },
      {
        "event_id": "evt-002",
        "station_id": "station-A",
        "amount": 200.00,
        "status": "pending",
        "created_at": "2024-01-15T11:00:00Z"
      }
    ]
  }'
```

Response (201):
```json
{ "inserted": 2, "duplicates": 0 }
```

### Get Station Summary

```bash
curl http://localhost:3000/stations/station-A/summary
```

Response (200):
```json
{
  "station_id": "station-A",
  "total_approved_amount": 150.75,
  "events_count": 1
}
```

Only events with `"approved"` status are counted and summed.

## Design Notes

### Idempotency

Events use `event_id` as the primary key. Inserts use `INSERT ... ON CONFLICT (event_id) DO NOTHING`, so resubmitting the same batch is safe -- duplicates are counted but not re-inserted.

### Concurrency

PostgreSQL's unique constraint on `event_id` prevents double-inserts at the database level. Two concurrent requests with the same `event_id` are resolved by the DB -- one inserts, the other gets a no-op conflict. All batch inserts run within explicit transactions.

### Batch Strategy

- **Validation:** Fail-fast -- the entire request is rejected if any event fails validation (400)
- **Duplicates:** Partial-accept -- valid events are inserted, duplicates are skipped and counted in the response
- **Limit:** Maximum 500 events per batch

### Storage Architecture

The storage layer uses an interface/port pattern. `IEventStore` defines the contract, `PostgresEventStore` implements it. The binding is done via a NestJS DI token (`EVENT_STORE` Symbol). To swap implementations, change `useClass` in `StorageModule` -- nothing else needs to change.

### Tradeoffs

- **`synchronize: true`:** TypeORM auto-creates tables from entities. Acceptable for a take-home; production would use migrations.
- **Decimal amounts:** Stored as `decimal(20,2)` in PostgreSQL for precision. JavaScript `parseFloat` is used on read, which is sufficient for this use case but production financial systems would use integer cents or a decimal library.
- **Transactions:** Using transactions would cause higher latency for make sure everything is inserted into DB correctly.
- **Fail entire request:** 

## Assumptions and Open Questions

1. **Why does an event have a status of "approved" and not an attribute type?** The spec uses `status` as a free-form string. In a real system, this would likely be an enum or tied to a workflow state machine.
2. **If it is approved, approved by whom?** The spec doesn't define an approval workflow. We treat `status` as a pre-existing label on the incoming event, not something this service controls.
3. **Assumed this is a public API.** The `status` field accepts any string value rather than enforcing a fixed set of allowed values. If this were an internal API, we would restrict `status` to a known enum (e.g., `approved`, `pending`, `rejected`).
4. **POST /transfers has a limit on the events array size.** Capped at 1000 events per batch to prevent abuse and keep request sizes manageable.
5. **All event statuses are accepted on ingest, but the summary endpoint only counts and sums events with `"approved"` status.** This means non-approved events are stored but excluded from reconciliation totals.
6. **No authentication layer is implemented.** In production, this API should be protected with an authentication mechanism such as API key validation (e.g., via a NestJS Guard that checks an `x-api-key` header) to prevent unauthorized access to the ingest and summary endpoints.
