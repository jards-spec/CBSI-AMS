# Access Policy (JWT + Role Authorization)

## Authentication Model

- Identity is accepted only from `Authorization: Bearer <token>`.
- Backend resolves the authenticated actor into `req.user`.
- The API does not trust:
  - `x-user-id`
  - `x-user-role`
  - `actorId`
  - `actorRole`
- If token is missing/invalid/expired, protected endpoints return `401`.

## Public Routes

These routes are intentionally public:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/health/db` (optional public)

Everything else under `/api/*` is protected by `requireAuth`.

## Role Model

Privileged roles are treated as admin-capable:

- `admin`
- `superuser`
- `super admin`
- `it admin`
- `manager`

Routes using `requireAdmin` return `403` to non-privileged users.

## Route Access Matrix

### Authenticated (any valid user)

- Read inventory data:
  - `GET /api/assets`
  - `GET /api/assets/:id/attachments`
  - `GET /api/consumables`
  - `GET /api/accessories`
  - `GET /api/accessories/:id/assignments`
  - `GET /api/licenses`
  - `GET /api/components`
  - `GET /api/components/:id/assignments`
- Read request/maintenance:
  - `GET /api/requests`
  - `GET /api/maintenance`
- Personal profile:
  - `GET /api/profile/me`
  - `GET /api/profile/me/requests`
  - `GET /api/profile/me/maintenance`
  - `PUT /api/profile/me`
- User-initiated submission:
  - `POST /api/requests`
  - `POST /api/maintenance`

### Admin / Privileged Only (`requireAdmin`)

- Employee management:
  - `GET /api/employees`
  - `POST /api/employees`
  - `PUT /api/employees/:id`
  - `PATCH /api/employees/:id/archive`
  - `PATCH /api/employees/:id/restore`
  - `DELETE /api/employees/:id`
- Asset write/destructive:
  - `POST /api/assets`
  - `PUT /api/assets/:id`
  - `PATCH /api/assets/:id/archive`
  - `PATCH /api/assets/:id/restore`
  - `DELETE /api/assets/:id`
- Consumable write/destructive:
  - `POST /api/consumables`
  - `PUT /api/consumables/:id`
  - `PATCH /api/consumables/:id/checkout`
  - `PATCH /api/consumables/:id/archive`
  - `PATCH /api/consumables/:id/restore`
  - `DELETE /api/consumables/:id`
- Accessory write/destructive:
  - `POST /api/accessories`
  - `PUT /api/accessories/:id`
  - `PATCH /api/accessories/:id/checkout`
  - `PATCH /api/accessories/:id/archive`
  - `PATCH /api/accessories/:id/restore`
  - `DELETE /api/accessories/:id`
- License write/destructive:
  - `POST /api/licenses`
  - `PUT /api/licenses/:id`
  - `PATCH /api/licenses/:id/archive`
  - `PATCH /api/licenses/:id/restore`
  - `DELETE /api/licenses/:id`
- Component write/destructive:
  - `POST /api/components`
  - `PUT /api/components/:id`
  - `PATCH /api/components/:id/archive`
  - `PATCH /api/components/:id/restore`
  - `DELETE /api/components/:id`
  - `PATCH /api/components/:id/checkin`
  - `PATCH /api/components/:id/checkout`
- Request/maintenance admin actions:
  - `PATCH /api/requests/:id/status`
  - `PATCH /api/requests/:id/archive`
  - `PATCH /api/requests/:id/restore`
  - `DELETE /api/requests/:id`
  - `PUT /api/maintenance/:id`
  - `PATCH /api/maintenance/:id/archive`
  - `PATCH /api/maintenance/:id/restore`
  - `DELETE /api/maintenance/:id`
- Transaction endpoints:
  - `POST /api/transactions/checkout`
  - `POST /api/transactions/checkin`
- Audit:
  - `GET /api/audit`
  - `POST /api/audit`
  - `DELETE /api/audit`

## Audit Attribution Rules

- Audit actor is always derived from `req.user`.
- Never trust request body for actor identity fields.
- Archive metadata (`archivedById`, `archivedByName`) must be server-authored from token context.

## Regression Checklist (must pass before release)

- Protected route without token => `401`
- Protected route with invalid token => `401`
- Non-admin on admin route => `403`
- Admin on admin route => success
- Spoof headers without token => `401`
- Spoof headers with token do not alter actor identity