# Phase 1 — Implementation Plan
## Smart Billing & Udhaar Management System

> **Goal:** Launch-ready foundation — Auth, Org, RBAC, Role Master, Shop setup
> **Timeline:** 3–4 weeks
> **Stack:** Node.js + Express + PostgreSQL + Redis + Zod + JWT

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Database Migrations](#2-database-migrations)
3. [Authentication](#3-authentication)
4. [Organization Management](#4-organization-management)
5. [Role Master (RBAC)](#5-role-master-rbac)
6. [RBAC Middleware](#6-rbac-middleware)
7. [Super Admin](#7-super-admin)
8. [Security & Utilities](#8-security--utilities)
9. [Environment Configuration](#9-environment-configuration)
10. [Folder Structure](#10-folder-structure)
11. [API Reference](#11-api-reference)
12. [Definition of Done](#12-definition-of-done)

---

## 1. Project Setup

### Dependencies to install

```bash
npm install express pg bcryptjs jsonwebtoken zod dotenv morgan express-rate-limit crypto
npm install ioredis nodemailer
npm install -D jest supertest nodemon
```

### Tasks

- [ ] Initialize Node.js project with `package.json`
- [ ] Setup Express app in `src/app.js` with middleware chain (morgan, rate limiter, json parser)
- [ ] Setup PostgreSQL pool in `src/config/db.js`
- [ ] Setup Redis client in `src/config/redis.js`
- [ ] Setup environment validation with Zod in `src/config/env.js`
- [ ] Setup global error handler middleware
- [ ] Setup folder structure (see Section 10)
- [ ] Create `.env.example` file
- [ ] Create `README.md` with setup instructions

---

## 2. Database Migrations

Run in order. All use UUID primary keys and `CURRENT_TIMESTAMP` defaults.

### Migration files

| File | Table | Notes |
|---|---|---|
| `001_create_users.sql` | `users` | Base identity table |
| `002_create_organizations.sql` | `organizations` | `owner_id → users` |
| `003_create_org_roles.sql` | `org_roles` | `permissions` as JSONB array |
| `004_create_org_memberships.sql` | `org_memberships` | `user + org + role + shop` unique tuple |
| `005_create_org_invitations.sql` | `org_invitations` | Token-based invite system |
| `006_create_shops.sql` | `shops` | `org_id → organizations` |
| `007_create_customers.sql` | `customers` | Phase 3, but create table now |
| `008_create_products.sql` | `products` | Phase 3, but create table now |
| `009_create_bills.sql` | `bills` | Phase 4, but create table now |
| `010_create_bill_items.sql` | `bill_items` | Phase 4, but create table now |
| `011_create_transactions.sql` | `transactions` | Phase 4, but create table now |

> Create all 11 tables in Phase 1 so foreign key references work correctly from day one.

### Tasks

- [ ] Write and run all 11 migration SQL files
- [ ] Verify indexes are created (`idx_users_email`, `idx_orgs_owner_id`, etc.)
- [ ] Verify `GENERATED ALWAYS AS` columns on `bills.due` and `bill_items.subtotal`
- [ ] Verify `CHECK` constraints on stock, price, paid
- [ ] Create `transaction_type` ENUM (`CREDIT`, `DEBIT`)

---

## 3. Authentication

### APIs

#### `POST /api/auth/register`

**Request:**
```json
{
  "name": "Huzef Merchant",
  "email": "huzef@example.com",
  "password": "SecurePass@123",
  "phone": "9876543210"
}
```

**Logic:**
1. Validate with Zod schema (email format, password min 6 chars, name required)
2. Check email uniqueness → 409 if exists
3. Hash password with bcrypt (saltRounds: 12)
4. Insert into `users`
5. Return JWT

**Response:** `201 Created`
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "uuid", "name": "...", "email": "..." }
}
```

---

#### `POST /api/auth/login`

**Request:**
```json
{ "email": "huzef@example.com", "password": "SecurePass@123" }
```

**Logic:**
1. Find user by email → 401 if not found
2. Compare password with bcrypt → 401 if mismatch
3. Fetch user's org memberships
4. Return JWT + user + organizations array

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "Huzef Merchant",
    "email": "huzef@example.com",
    "organizations": [
      { "id": "uuid", "name": "Huzef Traders", "role": "owner" }
    ]
  }
}
```

---

#### `GET /api/auth/me`

**Auth:** Required (JWT)

Returns current user's profile + all org memberships + assigned shops.

---

#### `POST /api/auth/accept-invite`

**Request:**
```json
{
  "token": "invitation_token_from_email",
  "name": "Ravi Kumar",
  "password": "NewPass@123"
}
```

**Logic:**
1. Find invitation by token → 404 if not found
2. Check `status = pending` AND `expires_at > NOW()` → 400 if expired
3. If user with that email exists → skip user creation, create membership only
4. If new user → create user account first
5. Insert `org_memberships` row
6. Set invitation `status = accepted`
7. Return JWT

> Note: This endpoint is built in Phase 1 but only fully testable after Phase 2 (invitations).

---

### Zod Schemas (src/schemas/auth.schema.js)

```js
// Register
{ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), phone: z.string().optional() }

// Login
{ email: z.string().email(), password: z.string().min(1) }
```

### JWT Payload

```json
{ "userId": "uuid", "email": "user@example.com", "iat": 0, "exp": 0 }
```

### Tasks

- [ ] `auth.schema.js` — Zod schemas for register, login, accept-invite
- [ ] `auth.service.js` — register, login, acceptInvite, getMe logic
- [ ] `auth.controller.js` — HTTP handlers, call service, return JSON
- [ ] `auth.routes.js` — mount routes, attach `validate` middleware
- [ ] Write Jest tests: register success, duplicate email 409, wrong password 401

---

## 4. Organization Management

### APIs

#### `POST /api/organizations` — Create org

**Auth:** Required

**Request:**
```json
{
  "name": "Huzef Traders",
  "slug": "huzef-traders",
  "phone": "9876543210",
  "address": "123 Main Bazaar, Mumbai"
}
```

**Logic:**
1. Validate slug (lowercase, alphanumeric + hyphens, min 3 chars)
2. Check slug uniqueness → 409 if taken
3. Insert into `organizations` with `owner_id = req.user.userId`
4. Auto-create system role `"Owner"` with `permissions: ["*"]` and `is_system: true`
5. Auto-create `org_memberships` row for creator: `role = Owner, shop_id = NULL`

---

#### `GET /api/organizations/:orgId` — Get org details

**Auth:** Required + org member
**Permission:** `org:read`

Returns org info + shop count + member count + role count.

---

#### `PUT /api/organizations/:orgId` — Update org

**Auth:** Required
**Permission:** `org:update`

Updatable: `name`, `phone`, `address`, `logo_url`

---

#### `DELETE /api/organizations/:orgId` — Delete org

**Auth:** Required
**Owner only**

Blocked if any customer has `balance > 0`. Cascades all shops, roles, memberships.

---

#### `GET /api/organizations/:orgId/members` — List members

**Auth:** Required
**Permission:** `user:read`

Returns all users in org with their shop assignments and roles.

---

#### `POST /api/organizations/:orgId/transfer-ownership` — Transfer ownership

**Auth:** Required
**Owner only**

```json
{ "new_owner_id": "uuid" }
```

Updates `organizations.owner_id`. New owner auto-gets Owner role membership.

---

### Tasks

- [ ] `org.schema.js` — Zod schemas for create, update
- [ ] `org.service.js` — createOrg (with auto Owner role + membership), getOrg, updateOrg, deleteOrg, getMembers, transferOwnership
- [ ] `org.controller.js` — HTTP handlers
- [ ] `org.routes.js` — mount with `authenticate`, `resolveOrgScope`, `checkPermission`
- [ ] Write Jest tests: create org, duplicate slug 409, non-owner delete 403

---

## 5. Role Master (RBAC)

> This is the core of Phase 1. Roles define what every non-owner user can and cannot do.

### Master Permissions List (`src/constants/permissions.js`)

```js
export const PERMISSIONS = {
  ORG:         ['org:read', 'org:update'],
  SHOP:        ['shop:create', 'shop:read', 'shop:update', 'shop:delete'],
  USER:        ['user:invite', 'user:read', 'user:update', 'user:remove'],
  ROLE:        ['role:create', 'role:read', 'role:update', 'role:delete'],
  CUSTOMER:    ['customer:create', 'customer:read', 'customer:update', 'customer:delete'],
  PRODUCT:     ['product:create', 'product:read', 'product:update', 'product:delete'],
  BILL:        ['bill:create', 'bill:read', 'bill:delete'],
  TRANSACTION: ['transaction:create', 'transaction:read'],
  REPORT:      ['report:read'],
  STOCK:       ['stock:update'],
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flat();
```

### APIs

#### `GET /api/permissions` — List all available permissions

**Auth:** Required

Returns the full master permissions list grouped by resource. No org scope needed.

**Response:**
```json
{
  "success": true,
  "permissions": {
    "org": ["org:read", "org:update"],
    "shop": ["shop:create", "shop:read", "shop:update", "shop:delete"],
    "bill": ["bill:create", "bill:read", "bill:delete"],
    "..."  : "..."
  }
}
```

---

#### `POST /api/organizations/:orgId/roles` — Create role

**Auth:** Required
**Permission:** `role:create`

**Request:**
```json
{
  "name": "Cashier",
  "description": "Can create bills and view customers",
  "permissions": ["bill:create", "bill:read", "customer:read", "product:read"]
}
```

**Validation rules:**
- Name unique within org
- All permissions must exist in `ALL_PERMISSIONS`
- Cannot create role named `"Owner"` (reserved)

**Response:** `201 Created` with full role object.

---

#### `GET /api/organizations/:orgId/roles` — List all roles

**Auth:** Required
**Permission:** `role:read`

Returns all roles in org including system roles, with `member_count` per role.

**Response:**
```json
{
  "success": true,
  "roles": [
    {
      "id": "uuid",
      "name": "Owner",
      "permissions": ["*"],
      "is_system": true,
      "member_count": 1
    },
    {
      "id": "uuid",
      "name": "Cashier",
      "permissions": ["bill:create", "bill:read", "customer:read"],
      "is_system": false,
      "member_count": 3
    }
  ]
}
```

---

#### `GET /api/organizations/:orgId/roles/:roleId` — Get single role

**Auth:** Required
**Permission:** `role:read`

---

#### `PUT /api/organizations/:orgId/roles/:roleId` — Update role

**Auth:** Required
**Permission:** `role:update`

**Rules:**
- System roles (`is_system = true`) cannot be updated — 403
- Permission changes apply immediately (cache busted on update)

**Request (partial update allowed):**
```json
{
  "name": "Senior Cashier",
  "permissions": ["bill:create", "bill:read", "customer:read", "customer:create", "transaction:create"]
}
```

---

#### `DELETE /api/organizations/:orgId/roles/:roleId` — Delete role

**Auth:** Required
**Permission:** `role:delete`

**Rules:**
- Cannot delete system roles → 403
- Cannot delete if active members assigned → 409 with `affected_members` count

**Error response:**
```json
{
  "success": false,
  "error": {
    "code": "ROLE_IN_USE",
    "message": "Cannot delete role 'Cashier' — 3 members are currently assigned this role.",
    "affected_members": 3
  }
}
```

---

### Tasks

- [ ] `src/constants/permissions.js` — Master permissions enum
- [ ] `role.schema.js` — Zod schemas for create, update
- [ ] `role.service.js` — createRole, listRoles, getRole, updateRole, deleteRole
- [ ] `role.controller.js` — HTTP handlers
- [ ] `role.routes.js` — mount with `authenticate`, `resolveOrgScope`, `checkPermission`
- [ ] Permission cache bust on role update/delete (`bustPermissionCache`)
- [ ] Write Jest tests: create role, duplicate name 409, update system role 403, delete in-use role 409

---

## 6. RBAC Middleware

Three middleware functions that every protected route passes through.

### `authenticate.js` — JWT verification

```js
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

---

### `resolveOrgScope.js` — Attach org context

```js
const resolveOrgScope = async (req, res, next) => {
  const { orgId } = req.params;
  const { userId } = req.user;
  const org = await db.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
  if (!org.rows.length) return res.status(404).json({ error: 'Organization not found' });
  req.org = org.rows[0];
  req.isOrgOwner = org.rows[0].owner_id === userId;
  req.isSuperAdmin = req.user?.is_super_admin || false;
  next();
};
```

---

### `checkPermission.js` — RBAC permission check (with Redis cache)

```js
const checkPermission = (requiredPermission) => async (req, res, next) => {
  // Super admin and org owner bypass all checks
  if (req.isSuperAdmin || req.isOrgOwner) return next();

  const { userId } = req.user;
  const { shopId, orgId } = req.params;

  // Check Redis cache first
  const cacheKey = `perms:${userId}:${shopId || orgId}`;
  let permissions = null;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) permissions = JSON.parse(cached);
  } catch {}

  if (!permissions) {
    const result = await db.query(`
      SELECT r.permissions, m.status
      FROM org_memberships m
      JOIN org_roles r ON r.id = m.role_id
      WHERE m.user_id = $1
        AND m.org_id = $2
        AND (m.shop_id = $3 OR m.shop_id IS NULL)
      ORDER BY m.shop_id NULLS LAST
      LIMIT 1
    `, [userId, orgId, shopId || null]);

    if (!result.rows.length)
      return res.status(403).json({ success: false, error: { code: 'SHOP_ACCESS_DENIED' } });

    if (result.rows[0].status === 'suspended')
      return res.status(403).json({ success: false, error: { code: 'MEMBER_SUSPENDED' } });

    permissions = result.rows[0].permissions;
    await redis.setex(cacheKey, 300, JSON.stringify(permissions));
  }

  const [resource, action] = requiredPermission.split(':');
  const hasPermission =
    permissions.includes('*') ||
    permissions.includes(requiredPermission) ||
    permissions.includes(`${resource}:*`);

  if (!hasPermission)
    return res.status(403).json({
      success: false,
      error: { code: 'PERMISSION_DENIED', required_permission: requiredPermission }
    });

  next();
};
```

---

### `checkOrgOwner.js` — Owner-only guard

```js
const checkOrgOwner = (req, res, next) => {
  if (req.isSuperAdmin || req.isOrgOwner) return next();
  return res.status(403).json({
    success: false,
    error: { code: 'OWNER_ONLY', message: 'Only the org owner can perform this action.' }
  });
};
```

---

### Permission Cache Invalidation

```js
// Call this after any role permission change in role.service.js
const bustPermissionCache = async (orgId) => {
  const keys = await redis.keys(`perms:*:${orgId}`);
  if (keys.length) await redis.del(keys);
};
```

---

### Tasks

- [ ] `authenticate.js`
- [ ] `resolveOrgScope.js`
- [ ] `checkPermission.js` with Redis cache + suspended user check
- [ ] `checkOrgOwner.js`
- [ ] `validate.js` — Zod schema middleware wrapper
- [ ] `errorHandler.js` — Global error handler (catch-all, logs with winston)
- [ ] Write RBAC Jest tests: missing token 401, wrong permission 403, suspended user 403, owner bypass

---

## 7. Super Admin

A global platform-level account that bypasses per-org RBAC. For emergency access and system management.

### Setup

Add `is_super_admin` boolean column to `users` table:

```sql
ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
```

### Seed script (`scripts/create-super-admin.js`)

```js
// Run: node scripts/create-super-admin.js
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_PASSWORD;
const hash = await bcrypt.hash(password, 12);
await db.query(
  'INSERT INTO users (name, email, password, is_super_admin) VALUES ($1, $2, $3, true)',
  ['Super Admin', email, hash]
);
console.log('Super admin created:', email);
```

### Detection in middleware

```js
// In resolveOrgScope.js
req.isSuperAdmin = req.user?.is_super_admin === true;

// In checkPermission.js (first line)
if (req.isSuperAdmin || req.isOrgOwner) return next();
```

### Tasks

- [ ] Add `is_super_admin` column to users migration
- [ ] Add `is_super_admin` to JWT payload on login
- [ ] Create `scripts/create-super-admin.js`
- [ ] Add `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` to `.env.example`
- [ ] Document security note: rotate credentials regularly, audit all super admin actions

---

## 8. Security & Utilities

### Rate Limiting (`src/middleware/rateLimiter.js`)

```js
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per window
  message: { success: false, error: { code: 'RATE_LIMITED' } }
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
```

Apply `authLimiter` on `/api/auth/login` and `/api/auth/register`.
Apply `globalLimiter` on all routes in `app.js`.

---

### Idempotency Middleware (`src/middleware/idempotency.js`)

```js
const idempotencyCheck = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return next();
  const cached = await redis.get(`idem:${key}`);
  if (cached) return res.status(200).json(JSON.parse(cached));
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    await redis.setex(`idem:${key}`, 86400, JSON.stringify(body));
    originalJson(body);
  };
  next();
};
```

> Used in Phase 4 for bill creation. Build it now, wire it in later.

---

### Error Codes Reference

| Code | HTTP | Meaning |
|---|---|---|
| `NOT_ORG_MEMBER` | 403 | User not in this org |
| `SHOP_ACCESS_DENIED` | 403 | No membership for this shop |
| `PERMISSION_DENIED` | 403 | Role lacks required permission |
| `MEMBER_SUSPENDED` | 403 | User is suspended |
| `ROLE_IN_USE` | 409 | Role has active members |
| `INVITATION_EXPIRED` | 400 | Token past `expires_at` |
| `INVITATION_ALREADY_ACCEPTED` | 400 | Token already used |
| `OWNER_CANNOT_BE_REMOVED` | 403 | Cannot remove org owner |
| `OWNER_ONLY` | 403 | Action requires org owner |

---

### Tasks

- [ ] `rateLimiter.js` — auth + global limiters
- [ ] `idempotency.js` — build middleware (wire in Phase 4)
- [ ] `errorHandler.js` — catches unhandled errors, logs with winston, returns standard JSON
- [ ] Setup winston logger (`src/config/logger.js`)
- [ ] Add request logging with morgan

---

## 9. Environment Configuration

### `.env` file

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/billing_db
DB_MAX_CONNECTIONS=20

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

# Redis
REDIS_URL=redis://localhost:6379
PERMISSION_CACHE_TTL=300

# Email (needed for invitations in Phase 2)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=apikey
SMTP_PASS=your_resend_api_key
MAIL_FROM=noreply@yourdomain.com

# App
APP_URL=https://app.yourdomain.com
INVITE_EXPIRES_DAYS=7

# Super Admin
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=change_this_immediately
```

### Zod env validation (`src/config/env.js`)

```js
const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});
export const env = envSchema.parse(process.env);
```

---

## 10. Folder Structure

```
smart-billing-system/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── redis.js
│   │   └── env.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── resolveOrgScope.js
│   │   ├── checkPermission.js
│   │   ├── checkOrgOwner.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── validate.js
│   │   └── idempotency.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── org.routes.js
│   │   └── role.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── org.controller.js
│   │   └── role.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── org.service.js
│   │   ├── role.service.js
│   │   └── permission.service.js
│   ├── schemas/
│   │   ├── auth.schema.js
│   │   ├── org.schema.js
│   │   └── role.schema.js
│   ├── constants/
│   │   └── permissions.js
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_users.sql
│   │   │   ├── 002_create_organizations.sql
│   │   │   ├── 003_create_org_roles.sql
│   │   │   ├── 004_create_org_memberships.sql
│   │   │   ├── 005_create_org_invitations.sql
│   │   │   ├── 006_create_shops.sql
│   │   │   ├── 007_create_customers.sql
│   │   │   ├── 008_create_products.sql
│   │   │   ├── 009_create_bills.sql
│   │   │   ├── 010_create_bill_items.sql
│   │   │   └── 011_create_transactions.sql
│   │   └── seeds/
│   │       └── demo_data.sql
│   └── app.js
├── scripts/
│   └── create-super-admin.js
├── tests/
│   ├── auth.test.js
│   ├── org.test.js
│   └── rbac.test.js
├── .env
├── .env.example
├── package.json
└── README.md
```

---

## 11. API Reference

Quick lookup for all Phase 1 endpoints.

| Method | Endpoint | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | — | Register new user |
| POST | `/api/auth/login` | No | — | Login, get JWT |
| GET | `/api/auth/me` | Yes | — | Get current user |
| POST | `/api/auth/accept-invite` | No | — | Accept invite, create account |
| POST | `/api/organizations` | Yes | — | Create new org |
| GET | `/api/organizations/:orgId` | Yes | `org:read` | Get org details |
| PUT | `/api/organizations/:orgId` | Yes | `org:update` | Update org |
| DELETE | `/api/organizations/:orgId` | Yes | Owner only | Delete org |
| GET | `/api/organizations/:orgId/members` | Yes | `user:read` | List org members |
| POST | `/api/organizations/:orgId/transfer-ownership` | Yes | Owner only | Transfer ownership |
| GET | `/api/permissions` | Yes | — | List all permissions |
| POST | `/api/organizations/:orgId/roles` | Yes | `role:create` | Create role |
| GET | `/api/organizations/:orgId/roles` | Yes | `role:read` | List roles |
| GET | `/api/organizations/:orgId/roles/:roleId` | Yes | `role:read` | Get single role |
| PUT | `/api/organizations/:orgId/roles/:roleId` | Yes | `role:update` | Update role |
| DELETE | `/api/organizations/:orgId/roles/:roleId` | Yes | `role:delete` | Delete role |

---

## 12. Definition of Done

Phase 1 is complete when all of the following pass:

### Functional

- [ ] User can register and login, receives valid JWT
- [ ] User can create an organization; Owner role auto-created
- [ ] Org owner can create custom roles with specific permissions
- [ ] Role permissions validated against master list on create/update
- [ ] System roles (Owner) cannot be updated or deleted
- [ ] In-use roles cannot be deleted (returns member count)
- [ ] `GET /api/permissions` returns full grouped permissions list
- [ ] `checkPermission` middleware correctly allows/blocks per role
- [ ] Org owner bypasses all permission checks
- [ ] Super admin bypasses all permission checks
- [ ] Suspended users receive 403 on all routes
- [ ] Permission cache busted on role update
- [ ] `accept-invite` endpoint works for both new and existing users

### Security

- [ ] Passwords stored as bcrypt hash (rounds: 12)
- [ ] JWT secret min 32 chars, validated at startup
- [ ] Auth routes rate-limited (10 req / 15 min)
- [ ] All routes rate-limited globally (200 req / 15 min)
- [ ] Invalid/expired JWT returns 401

### Code Quality

- [ ] All routes have Zod input validation
- [ ] Global error handler catches unhandled errors
- [ ] No raw SQL strings outside service files
- [ ] Winston logger configured for errors
- [ ] `.env.example` complete and documented

### Tests

- [ ] Register: success, duplicate email, invalid input
- [ ] Login: success, wrong password, user not found
- [ ] Org create: success, duplicate slug
- [ ] RBAC: permission granted, permission denied, owner bypass, suspended user
- [ ] Role: create, update system role 403, delete in-use 409

---

*Phase 1 Document | Smart Billing & Udhaar System | Version 1.0*