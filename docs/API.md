# API reference

Base URL: `http://localhost:3001/api`. Send JSON bodies with `Content-Type: application/json`. Protected requests require `Authorization: Bearer <token>`. All prices are INR rupees, with at most two decimal places. IDs are UUIDs.

## Authentication

`POST /auth/register` → `201`

```json
{ "name": "Asha Rao", "email": "asha@example.com", "password": "StrongPass123!" }
```

`POST /auth/login` → `200`

```json
{ "email": "asha@example.com", "password": "StrongPass123!" }
```

Both return `{ "user": { "id": "...", "name": "...", "email": "...", "role": "customer" }, "token": "..." }`. Registration rejects a supplied role or other unknown fields. Names are 1–80 characters; emails are normalized to lower case. Registration passwords require 8–72 characters and at most 72 UTF-8 bytes. Login accepts 1–72 characters and enforces the same byte limit to prevent bcrypt truncation.

`GET /auth/me` → `{ "user": { ... } }`. Authentication required.

## Vehicles

`GET /vehicles` and `GET /vehicles/search` accept the same query parameters. Authentication required.

| Parameter              | Meaning                                               |
| ---------------------- | ----------------------------------------------------- |
| `q`                    | Substring search across make/model/category           |
| `make`, `model`        | Case-insensitive substring match                      |
| `category`             | Case-insensitive exact match                          |
| `minPrice`, `maxPrice` | Inclusive price bounds, 0–100,000,000                 |
| `inStock`              | `true` for positive stock; `false` for zero stock     |
| `sort`                 | `name` (default), `price_asc`, `price_desc`, `newest` |
| `page`                 | Positive integer; default 1                           |
| `pageSize`             | 1–100; default 9                                      |

Unknown query parameters are rejected. SQL wildcard characters in search text are treated literally. An empty result has `totalPages: 0`.

```json
{
  "vehicles": [
    {
      "id": "a UUID",
      "make": "Tata",
      "model": "Nexon",
      "category": "SUV",
      "price": 850000,
      "quantity": 8,
      "createdAt": "2026-10-25T00:00:00.000Z",
      "updatedAt": "2026-10-25T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 9, "total": 1, "totalPages": 1 },
  "summary": { "models": 1, "totalUnits": 8, "inventoryValue": 6800000, "lowStock": 0 }
}
```

Summary values describe the entire catalogue, independently of filters. `lowStock` counts models with two or fewer units, including sold-out models.

`POST /vehicles` → `201`, administrator required.

```json
{ "make": "Tata", "model": "Nexon", "category": "SUV", "price": 850000, "quantity": 8 }
```

`PUT /vehicles/:id` → `200`, administrator required. Send a complete set of descriptive fields: `make`, `model`, `category`, `price`. Quantity is not accepted here. Both create and update return the vehicle object.

Make, model and category have maximum lengths 60, 80 and 40 respectively and cannot be blank. Price must be greater than zero and no more than 100,000,000. Initial quantity must be an integer from 0 to 1,000,000. Unknown body fields are rejected.

`DELETE /vehicles/:id` → `204`, administrator required. Past stock activity is retained with the vehicle-name snapshot.

## Inventory

`POST /vehicles/:id/purchase` → `200`, authentication required.

`POST /vehicles/:id/restock` → `200`, administrator required.

```json
{ "quantity": 2 }
```

Quantity is an integer from 1 to 1,000,000, defaulting to 1 when omitted. The response is the updated vehicle. Insufficient stock or exceeding maximum stock returns `409`; there is no partial fulfilment. Stock and movement history are transactional.

`GET /inventory/movements` → `{ "movements": [...] }`, administrator required. Returns at most 50 entries, newest first. Entries include `id`, `vehicleId` (null after deletion), `vehicleName`, `actorName`, `kind` (`initial`, `purchase`, `restock`), `delta`, `quantityAfter`, and `createdAt`.

## Errors and health

Errors have the shape `{ "error": { "code": "...", "message": "..." } }`. Validation errors also include `details: [{ "field": "price", "message": "..." }]`.

| Status | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 400    | Invalid input, malformed JSON, unknown fields or invalid ID |
| 401    | Missing/invalid/expired session or incorrect login          |
| 403    | Administrator permission required                           |
| 404    | Vehicle or API route not found                              |
| 409    | Duplicate email or stock conflict                           |
| 413    | Request body exceeds 16 KB                                  |
| 429    | Authentication rate limit reached                           |
| 500    | Unexpected failure; details stay in server logs             |

Every response includes `X-Request-Id`. `GET /health` is public and returns `{ "status": "ok" }` after checking database connectivity.
