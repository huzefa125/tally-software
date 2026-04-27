# Smart Billing & Udhaar Management System
### Complete Technical Specification — MVP (with Org + RBAC)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Organization & RBAC Design](#4-organization--rbac-design)
5. [Database Design](#5-database-design)
6. [Authentication APIs](#6-authentication-apis)
7. [Organization APIs](#7-organization-apis)
8. [RBAC — Roles & Permissions APIs](#8-rbac--roles--permissions-apis)
9. [User Management APIs](#9-user-management-apis)
10. [Shop APIs](#10-shop-apis)
11. [Customer APIs](#11-customer-apis)
12. [Product APIs](#12-product-apis)
13. [Billing APIs](#13-billing-apis)
14. [Udhaar / Transaction APIs](#14-udhaar--transaction-apis)
15. [Dashboard APIs](#15-dashboard-apis)
16. [Error Handling Strategy](#16-error-handling-strategy)
17. [Business Rules & Constraints](#17-business-rules--constraints)
18. [Edge Cases](#18-edge-cases)
19. [Security Implementation](#19-security-implementation)
20. [Middleware & Utilities](#20-middleware--utilities)
21. [Project Folder Structure](#21-project-folder-structure)
22. [Environment Configuration](#22-environment-configuration)
23. [Success Criteria](#23-success-criteria)
24. [Future Enhancements](#24-future-enhancements)

---

## 1. Project Overview

### Objective

A lightweight, fast, and reliable billing + customer credit (Udhaar) tracking system built for small retail businesses. The system supports **multi-shop organizations** with **custom role-based access control (RBAC)** — enabling an org owner to define their own roles, assign permissions granularly, and invite users to manage specific shops.

### Core Features

| Feature | Description |
|---|---|
| Organization Management | One org can have multiple shops under it |
| Custom RBAC | Owner creates roles (e.g. Manager, Cashier) and assigns permissions |
| User Invitations | Invite users to org; assign them a role + shop scope |
| Fast Billing (POS Style) | Create bills quickly with product selection and payment |
| Customer Management | Add, update, delete customers with balance tracking |
| Udhaar System | Track credit/debit transactions per customer |
| Product Management | Maintain product catalog with live stock tracking |
| Dashboard | Sales, dues, and insights — org-wide or per-shop |
| Authentication | Secure JWT-based login/register |

### Access Hierarchy

```
Organization (Org)
    │
    ├── Org Owner  ← Creates org, defines roles, manages all shops
    │
    ├── Roles (custom, defined by Owner)
    │     ├── e.g. "Manager"    → permissions: [bill:create, customer:read, ...]
    │     ├── e.g. "Cashier"    → permissions: [bill:create, product:read]
    │     └── e.g. "Accountant" → permissions: [report:read, transaction:read]
    │
    ├── Shop A  ←─── User 1 (role: Manager)
    ├── Shop B  ←─── User 2 (role: Cashier)
    └── Shop C  ←─── User 1 (role: Manager) + User 3 (role: Cashier)
```

> A single user can be assigned to **multiple shops** with **different roles per shop**.

---

## 2. System Architecture

```
┌─────────────────────────────────────────┐
│              Client Layer               │
│       React Web App / Mobile App        │
└──────────────────┬──────────────────────┘
                   │ HTTP/HTTPS (REST API)
                   ▼
┌─────────────────────────────────────────┐
│              Backend Layer              │
│         Node.js + Express.js            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Middleware Chain         │   │
│  │  Rate Limiter                    │   │
│  │  → JWT Auth (authenticate)       │   │
│  │  → Org Scope Resolver            │   │
│  │  → Permission Check (RBAC)       │   │
│  │  → Input Validation (Zod)        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Routes → Controllers → Services        │
└──────────────────┬──────────────────────┘
                   │ SQL (pg pool)
                   ▼
┌─────────────────────────────────────────┐
│            Database Layer               │
│              PostgreSQL                 │
│  - ACID transactions                    │
│  - UUID primary keys                    │
│  - Row-level shop scoping               │
│  - JSONB for permission arrays          │
└─────────────────────────────────────────┘
```

### Request Lifecycle

```
Client Request
     │
     ▼
Rate Limiter → 429 if exceeded
     │
     ▼
JWT Auth → 401 if missing/invalid
     │
     ▼
Org Scope Resolver
  → Reads org_id from route params
  → Attaches org + isOrgOwner to req
     │
     ▼
RBAC Permission Check
  → Reads user's role for this shop/org
  → Checks permission array: e.g. "bill:create"
  → 403 if not allowed
     │
     ▼
Zod Input Validation → 400 if invalid
     │
     ▼
Controller → Service → DB Transaction
     │
     ▼
JSON Response → Client
```

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js (v18+) | Server runtime |
| Framework | Express.js | HTTP routing & middleware |
| Database | PostgreSQL (v15+) | Primary relational DB |
| Query | pg (node-postgres) | Raw SQL with pooling |
| Auth | JWT (jsonwebtoken) | Stateless auth |
| Password | bcryptjs | Password hashing |
| Validation | Zod | Schema validation |
| Rate Limiting | express-rate-limit | API protection |
| Logging | morgan + winston | Request & error logging |
| Caching | Redis (optional) | Idempotency + permission cache |
| Email | Nodemailer / Resend | Invite emails |
| Env | dotenv | Environment config |
| Testing | Jest + Supertest | Unit & integration tests |

---

## 4. Organization & RBAC Design

### 4.1 Concept Overview

```
┌─────────────────────────────────────────────────────┐
│                   ORGANIZATION                       │
│  id, name, slug, owner_id                           │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐                │
│  │   ROLES     │    │    SHOPS    │                 │
│  │             │    │             │                 │
│  │ "Manager"   │    │  Shop A     │                 │
│  │ permissions │    │  Shop B     │                 │
│  │ [bill:*,    │    │  Shop C     │                 │
│  │  customer:*]│    └─────────────┘                │
│  └─────────────┘            │                       │
│         │                   │                       │
│         ▼                   ▼                       │
│  ┌─────────────────────────────┐                   │
│  │     ORG MEMBERSHIPS         │                   │
│  │  user_id + role_id + shop_id│                   │
│  │  (user assigned role        │                   │
│  │   for a specific shop)      │                   │
│  └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Permission System

All permissions follow the pattern: `resource:action`

**Available Resources & Actions:**

| Resource | Actions | Description |
|---|---|---|
| `org` | `read`, `update` | View/edit org settings |
| `shop` | `create`, `read`, `update`, `delete` | Shop management |
| `user` | `invite`, `read`, `update`, `remove` | User management |
| `role` | `create`, `read`, `update`, `delete` | Role management |
| `customer` | `create`, `read`, `update`, `delete` | Customer management |
| `product` | `create`, `read`, `update`, `delete` | Product management |
| `bill` | `create`, `read`, `delete` | Billing |
| `transaction` | `create`, `read` | Udhaar transactions |
| `report` | `read` | Dashboard & analytics |
| `stock` | `update` | Stock adjustments |

**Wildcard notation:** `bill:*` = all bill actions. `*:read` = read on everything.

### 4.3 Example Role Configurations

```json
// Role: "Manager"
{
  "name": "Manager",
  "permissions": [
    "customer:create", "customer:read", "customer:update",
    "product:create", "product:read", "product:update",
    "bill:create", "bill:read",
    "transaction:create", "transaction:read",
    "stock:update", "report:read"
  ]
}

// Role: "Cashier"
{
  "name": "Cashier",
  "permissions": [
    "customer:read",
    "product:read",
    "bill:create", "bill:read",
    "transaction:create"
  ]
}

// Role: "Accountant"
{
  "name": "Accountant",
  "permissions": [
    "customer:read",
    "bill:read",
    "transaction:read",
    "report:read"
  ]
}

// Role: "Stock Manager"
{
  "name": "Stock Manager",
  "permissions": [
    "product:create", "product:read", "product:update",
    "stock:update"
  ]
}
```

### 4.4 Org Owner vs Role-Based Users

| Capability | Org Owner | Role-Based User |
|---|---|---|
| Create / delete shops | Always | Only if `shop:create` in role |
| Create / edit roles | Always | Only if `role:create` in role |
| Invite users | Always | Only if `user:invite` in role |
| Remove users | Always | Only if `user:remove` in role |
| Access all shops | Always | Only assigned shops |
| Delete org | Always | Never |
| Billing | Always | Only if `bill:create` in role |

### 4.5 Shop Scope Rules

A user's role applies **per-shop**. One user can have different roles in different shops:

```
User: Ravi
  → Shop A: role = "Manager"  (can create bills, manage customers)
  → Shop B: role = "Cashier"  (can only create bills, read customers)
  → Shop C: no access          (cannot see this shop at all)
```

---

## 5. Database Design

### 5.1 Full Entity Relationship Diagram

```
users
  └──< organizations (owner_id → users)
         ├──< org_roles (custom roles per org)
         │      └── permissions: JSONB array
         ├──< org_invitations
         ├──< org_memberships (users ↔ org ↔ role ↔ shop)
         └──< shops
                ├──< customers ──< transactions
                ├──< products
                └──< bills ──< bill_items
```

---

### 5.2 Users Table

```sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  phone        VARCHAR(20)  UNIQUE,
  password     TEXT         NOT NULL,
  is_verified  BOOLEAN      DEFAULT false,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto-generated |
| name | VARCHAR(255) | Full name |
| email | VARCHAR(255) | Unique login identifier |
| phone | VARCHAR(20) | Optional, unique |
| password | TEXT | bcrypt hash |
| is_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Registration time |

---

### 5.3 Organizations Table

```sql
CREATE TABLE organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(100) UNIQUE NOT NULL,
  owner_id     UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  logo_url     TEXT,
  address      TEXT,
  phone        VARCHAR(20),
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orgs_owner_id ON organizations(owner_id);
CREATE UNIQUE INDEX idx_orgs_slug ON organizations(slug);
```

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(255) | Display name e.g. "Huzef Traders" |
| slug | VARCHAR(100) | URL-safe unique identifier e.g. "huzef-traders" |
| owner_id | UUID | FK → users (org creator) |
| logo_url | TEXT | Optional org logo |
| address | TEXT | Business address |
| phone | VARCHAR(20) | Business contact |

---

### 5.4 Org Roles Table (Custom RBAC)

```sql
CREATE TABLE org_roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  permissions  JSONB        NOT NULL DEFAULT '[]',
  is_system    BOOLEAN      DEFAULT false,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, name)
);

CREATE INDEX idx_org_roles_org_id ON org_roles(org_id);
```

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| name | VARCHAR(100) | e.g. "Manager", "Cashier" |
| description | TEXT | Optional role description |
| permissions | JSONB | Array of permission strings |
| is_system | BOOLEAN | System roles cannot be deleted or edited |

**Permissions JSONB Example:**
```json
["bill:create", "bill:read", "customer:create", "customer:read", "product:read", "stock:update"]
```

---

### 5.5 Org Memberships Table

```sql
CREATE TABLE org_memberships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID        NOT NULL REFERENCES org_roles(id) ON DELETE RESTRICT,
  shop_id    UUID        REFERENCES shops(id) ON DELETE CASCADE,
  status     VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  joined_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, user_id, shop_id)
);

CREATE INDEX idx_memberships_org_id  ON org_memberships(org_id);
CREATE INDEX idx_memberships_user_id ON org_memberships(user_id);
CREATE INDEX idx_memberships_shop_id ON org_memberships(shop_id);
```

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| user_id | UUID | FK → users |
| role_id | UUID | FK → org_roles |
| shop_id | UUID | NULL = org-wide access; else scoped to one shop |
| status | VARCHAR | `active` or `suspended` |

> **shop_id = NULL** means the user has that role across **all shops** in the org.

---

### 5.6 Org Invitations Table

```sql
CREATE TABLE org_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by  UUID         NOT NULL REFERENCES users(id),
  email       VARCHAR(255) NOT NULL,
  role_id     UUID         NOT NULL REFERENCES org_roles(id),
  shop_id     UUID         REFERENCES shops(id),
  token       TEXT         UNIQUE NOT NULL,
  status      VARCHAR(20)  DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, email, shop_id)
);

CREATE INDEX idx_invitations_token  ON org_invitations(token);
CREATE INDEX idx_invitations_org_id ON org_invitations(org_id);
```

| Column | Type | Notes |
|---|---|---|
| token | TEXT | Unique secure random token sent via email |
| expires_at | TIMESTAMP | Default: 7 days from creation |
| status | VARCHAR | `pending`, `accepted`, `expired`, `revoked` |

---

### 5.7 Shops Table

```sql
CREATE TABLE shops (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_name  VARCHAR(255) NOT NULL,
  address    TEXT,
  phone      VARCHAR(20),
  is_active  BOOLEAN      DEFAULT true,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shops_org_id ON shops(org_id);
```

> Shops now belong to an **organization** (via `org_id`), not directly to a user.

---

### 5.8 Customers Table

```sql
CREATE TABLE customers (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID           NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       VARCHAR(255)   NOT NULL,
  phone      VARCHAR(20),
  balance    DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_shop_id ON customers(shop_id);
```

---

### 5.9 Products Table

```sql
CREATE TABLE products (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID           NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       VARCHAR(255)   NOT NULL,
  price      DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  stock      INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit       VARCHAR(50)    DEFAULT 'piece',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_shop_id ON products(shop_id);
```

---

### 5.10 Bills Table

```sql
CREATE TABLE bills (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID           NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID           REFERENCES customers(id) ON DELETE SET NULL,
  created_by  UUID           REFERENCES users(id) ON DELETE SET NULL,
  total       DECIMAL(12, 2) NOT NULL CHECK (total >= 0),
  paid        DECIMAL(12, 2) NOT NULL CHECK (paid >= 0),
  due         DECIMAL(12, 2) NOT NULL GENERATED ALWAYS AS (total - paid) STORED,
  note        TEXT,
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_paid_lte_total CHECK (paid <= total)
);

CREATE INDEX idx_bills_shop_id     ON bills(shop_id);
CREATE INDEX idx_bills_customer_id ON bills(customer_id);
CREATE INDEX idx_bills_created_by  ON bills(created_by);
CREATE INDEX idx_bills_created_at  ON bills(created_at DESC);
```

> **Added:** `created_by` — audit trail of which user (cashier/manager) created the bill.

---

### 5.11 Bill Items Table

```sql
CREATE TABLE bill_items (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id      UUID           NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id   UUID           REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255)   NOT NULL,
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  price        DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  subtotal     DECIMAL(12, 2) NOT NULL GENERATED ALWAYS AS (quantity * price) STORED
);

CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
```

> `product_name` is a **snapshot** at billing time. Renaming or deleting a product won't affect historical bills.

---

### 5.12 Transactions (Udhaar) Table

```sql
CREATE TYPE transaction_type AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE transactions (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID             NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shop_id     UUID             NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_by  UUID             REFERENCES users(id) ON DELETE SET NULL,
  type        transaction_type NOT NULL,
  amount      DECIMAL(12, 2)   NOT NULL CHECK (amount > 0),
  note        TEXT,
  bill_id     UUID             REFERENCES bills(id) ON DELETE SET NULL,
  created_at  TIMESTAMP        DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_shop_id     ON transactions(shop_id);
CREATE INDEX idx_transactions_created_at  ON transactions(created_at DESC);
```

> `created_by` tracks which staff member recorded the transaction.

---

### 5.13 Full Schema Summary

| Table | Key Relationships |
|---|---|
| `users` | Base identity table |
| `organizations` | `owner_id → users` |
| `org_roles` | `org_id → organizations`; permissions stored as JSONB |
| `org_memberships` | `user_id + org_id + role_id + shop_id` (unique tuple) |
| `org_invitations` | `org_id, role_id, email, token` |
| `shops` | `org_id → organizations` |
| `customers` | `shop_id → shops` |
| `products` | `shop_id → shops` (soft delete via `deleted_at`) |
| `bills` | `shop_id + customer_id + created_by` |
| `bill_items` | `bill_id + product_id` (name snapshot) |
| `transactions` | `customer_id + shop_id + created_by` |

---

## 6. Authentication APIs

### 6.1 Register

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "Huzef Merchant",
  "email": "huzef@example.com",
  "password": "SecurePass@123",
  "phone": "9876543210"
}
```

**Backend Logic:**
1. Validate with Zod
2. Check email uniqueness → 409 if exists
3. Hash password (bcrypt, saltRounds: 12)
4. Insert into `users`
5. Return JWT (no org yet — user must create or be invited to one)

**Success Response:** `201 Created`
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "Huzef Merchant",
    "email": "huzef@example.com"
  }
}
```

**JWT Payload:**
```json
{
  "userId": "uuid",
  "email": "huzef@example.com",
  "iat": 1234567890,
  "exp": 1235172690
}
```

**Failure Cases:**

| Case | Status |
|---|---|
| Email already exists | 409 Conflict |
| Invalid email format | 400 Bad Request |
| Password shorter than 6 chars | 400 Bad Request |
| Missing required fields | 400 Bad Request |

---

### 6.2 Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "huzef@example.com",
  "password": "SecurePass@123"
}
```

**Success Response:** `200 OK`
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

### 6.3 Accept Invitation (Register via Invite)

**Endpoint:** `POST /api/auth/accept-invite`

**Request Body:**
```json
{
  "token": "invitation_token_from_email",
  "name": "Ravi Kumar",
  "password": "NewPass@123"
}
```

**Backend Logic:**
1. Find invitation by token → 404 if not found
2. Check `status = pending` and `expires_at > NOW()` → 400 if expired
3. Check if user with that email already exists
   - If yes: create membership only, skip user creation
   - If no: create user account first
4. Create `org_memberships` record (org_id, user_id, role_id, shop_id)
5. Set invitation `status = accepted`
6. Return JWT

---

### 6.4 Get Current User

**Endpoint:** `GET /api/auth/me`
**Auth:** Required

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Ravi Kumar",
    "email": "ravi@example.com",
    "organizations": [
      {
        "id": "uuid",
        "name": "Huzef Traders",
        "role": "owner",
        "shops": [
          { "id": "uuid", "name": "Shop A" },
          { "id": "uuid", "name": "Shop B" }
        ]
      }
    ]
  }
}
```

---

## 7. Organization APIs

> All org endpoints require JWT. Only the org owner can perform destructive actions.

### 7.1 Create Organization

**Endpoint:** `POST /api/organizations`
**Auth:** Required

**Request Body:**
```json
{
  "name": "Huzef Traders",
  "slug": "huzef-traders",
  "phone": "9876543210",
  "address": "123 Main Bazaar, Mumbai"
}
```

**Backend Logic:**
1. Validate slug (lowercase, alphanumeric + hyphens only, min 3 chars)
2. Check slug uniqueness → 409 if taken
3. Create organization with `owner_id = req.user.userId`
4. Auto-create a system role `"Owner"` with all permissions (`["*"]`)
5. Auto-create `org_memberships` row for creator with Owner role and `shop_id = NULL`

**Success Response:** `201 Created`
```json
{
  "success": true,
  "organization": {
    "id": "uuid",
    "name": "Huzef Traders",
    "slug": "huzef-traders",
    "owner_id": "uuid",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 7.2 Get Organization

**Endpoint:** `GET /api/organizations/:orgId`
**Auth:** Required + org member
**Permission:** `org:read`

Returns org details + shop list + member count + role count.

---

### 7.3 Update Organization

**Endpoint:** `PUT /api/organizations/:orgId`
**Auth:** Required
**Permission:** `org:update`

Updatable fields: `name`, `phone`, `address`, `logo_url`

---

### 7.4 Delete Organization

**Endpoint:** `DELETE /api/organizations/:orgId`
**Auth:** Required
**Owner Only**

Rules:
- Only the `owner_id` user can call this
- Blocked if any customer has `balance > 0` across any shop
- Cascades: all shops, roles, memberships, invitations deleted

---

### 7.5 Get Org Members

**Endpoint:** `GET /api/organizations/:orgId/members`
**Auth:** Required
**Permission:** `user:read`

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "user_id": "uuid",
      "name": "Ravi Kumar",
      "email": "ravi@example.com",
      "memberships": [
        {
          "shop_id": "uuid",
          "shop_name": "Shop A",
          "role_id": "uuid",
          "role_name": "Manager",
          "status": "active"
        },
        {
          "shop_id": "uuid",
          "shop_name": "Shop B",
          "role_id": "uuid",
          "role_name": "Cashier",
          "status": "active"
        }
      ]
    }
  ]
}
```

---

### 7.6 Transfer Ownership

**Endpoint:** `POST /api/organizations/:orgId/transfer-ownership`
**Owner Only**

```json
{ "new_owner_id": "uuid" }
```

Updates `organizations.owner_id`. Old owner retains membership but loses owner-only privileges.

---

## 8. RBAC — Roles & Permissions APIs

### 8.1 Create Role

**Endpoint:** `POST /api/organizations/:orgId/roles`
**Auth:** Required
**Permission:** `role:create`

**Request Body:**
```json
{
  "name": "Senior Cashier",
  "description": "Can bill and manage customers but not products",
  "permissions": [
    "customer:create", "customer:read", "customer:update",
    "bill:create", "bill:read",
    "transaction:create", "transaction:read"
  ]
}
```

**Validation Rules:**
- Name must be unique within the org
- All permissions must be from the master permissions list
- Cannot create a role named `"Owner"` (system reserved)

**Success Response:** `201 Created`
```json
{
  "success": true,
  "role": {
    "id": "uuid",
    "name": "Senior Cashier",
    "description": "Can bill and manage customers but not products",
    "permissions": [
      "customer:create", "customer:read", "customer:update",
      "bill:create", "bill:read",
      "transaction:create", "transaction:read"
    ],
    "is_system": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 8.2 Get All Roles

**Endpoint:** `GET /api/organizations/:orgId/roles`
**Auth:** Required
**Permission:** `role:read`

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
      "name": "Manager",
      "permissions": ["bill:create", "bill:read", "customer:*", "product:*", "stock:update", "report:read"],
      "is_system": false,
      "member_count": 3
    },
    {
      "id": "uuid",
      "name": "Cashier",
      "permissions": ["bill:create", "bill:read", "customer:read", "product:read"],
      "is_system": false,
      "member_count": 5
    }
  ]
}
```

---

### 8.3 Update Role

**Endpoint:** `PUT /api/organizations/:orgId/roles/:roleId`
**Auth:** Required
**Permission:** `role:update`

**Rules:**
- System roles (`is_system = true`) cannot be updated
- Permission changes apply immediately to all members with this role

**Request Body:** (partial update allowed)
```json
{
  "name": "Store Manager",
  "permissions": [
    "customer:create", "customer:read", "customer:update", "customer:delete",
    "product:create", "product:read", "product:update",
    "bill:create", "bill:read",
    "transaction:create", "transaction:read",
    "stock:update", "report:read"
  ]
}
```

---

### 8.4 Delete Role

**Endpoint:** `DELETE /api/organizations/:orgId/roles/:roleId`
**Auth:** Required
**Permission:** `role:delete`

**Rules:**
- Cannot delete a role with active members assigned to it
- Cannot delete system roles (`is_system = true`)

**Failure Response:**
```json
{
  "success": false,
  "error": {
    "code": "ROLE_IN_USE",
    "message": "Cannot delete role 'Manager' — 3 members are currently assigned this role.",
    "affected_members": 3
  }
}
```

---

### 8.5 Get All Available Permissions

**Endpoint:** `GET /api/permissions`
**Auth:** Required

Returns the master list of all valid permissions assignable to roles.

**Response:**
```json
{
  "success": true,
  "permissions": {
    "org":         ["org:read", "org:update"],
    "shop":        ["shop:create", "shop:read", "shop:update", "shop:delete"],
    "user":        ["user:invite", "user:read", "user:update", "user:remove"],
    "role":        ["role:create", "role:read", "role:update", "role:delete"],
    "customer":    ["customer:create", "customer:read", "customer:update", "customer:delete"],
    "product":     ["product:create", "product:read", "product:update", "product:delete"],
    "bill":        ["bill:create", "bill:read", "bill:delete"],
    "transaction": ["transaction:create", "transaction:read"],
    "report":      ["report:read"],
    "stock":       ["stock:update"]
  }
}
```

---

## 9. User Management APIs

### 9.1 Invite User

**Endpoint:** `POST /api/organizations/:orgId/invite`
**Auth:** Required
**Permission:** `user:invite`

**Request Body:**
```json
{
  "email": "ravi@example.com",
  "role_id": "uuid",
  "shop_id": "uuid"
}
```

**Backend Logic:**
1. Validate `role_id` belongs to this org
2. Validate `shop_id` belongs to this org (if provided)
3. Check if user is already a member of this shop → 409 if yes
4. Check for existing pending invitation → 409 if yes
5. Generate secure token via `crypto.randomBytes(32).toString('hex')`
6. Set `expires_at = NOW() + 7 days`
7. Insert into `org_invitations`
8. Send email: `https://app.example.com/accept-invite?token=TOKEN`

**Success Response:** `201 Created`
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "ravi@example.com",
    "role_name": "Manager",
    "shop_name": "Shop A",
    "expires_at": "2024-01-22T10:30:00Z",
    "status": "pending"
  }
}
```

---

### 9.2 Get Pending Invitations

**Endpoint:** `GET /api/organizations/:orgId/invitations`
**Auth:** Required
**Permission:** `user:read`

**Query Params:** `status` (pending / accepted / expired / revoked)

---

### 9.3 Revoke Invitation

**Endpoint:** `DELETE /api/organizations/:orgId/invitations/:invitationId`
**Auth:** Required
**Permission:** `user:invite`

Sets `status = revoked`. Token becomes invalid immediately.

---

### 9.4 Resend Invitation

**Endpoint:** `POST /api/organizations/:orgId/invitations/:invitationId/resend`
**Auth:** Required
**Permission:** `user:invite`

Regenerates token, resets `expires_at` to 7 days from now, re-sends email.

---

### 9.5 Update Member Role / Shop Assignment

**Endpoint:** `PUT /api/organizations/:orgId/members/:userId`
**Auth:** Required
**Permission:** `user:update`

**Request Body:**
```json
{
  "memberships": [
    { "shop_id": "uuid-shop-a", "role_id": "uuid-manager-role" },
    { "shop_id": "uuid-shop-b", "role_id": "uuid-cashier-role" }
  ]
}
```

Replaces all existing memberships for this user in this org. Each `(user_id, org_id, shop_id)` must be unique.

---

### 9.6 Suspend / Reactivate Member

**Endpoint:** `PATCH /api/organizations/:orgId/members/:userId/status`
**Auth:** Required
**Permission:** `user:update`

```json
{ "status": "suspended" }
```

Suspended users get 403 on all requests even with a valid JWT.

---

### 9.7 Remove Member from Org

**Endpoint:** `DELETE /api/organizations/:orgId/members/:userId`
**Auth:** Required
**Permission:** `user:remove`

**Rules:**
- Cannot remove the org owner
- Deletes all `org_memberships` rows for this user in this org
- Historical bills and transactions retain `created_by` reference

---

## 10. Shop APIs

> Shops are created under an org. All shop endpoints require org membership.

### 10.1 Create Shop

**Endpoint:** `POST /api/organizations/:orgId/shops`
**Auth:** Required
**Permission:** `shop:create`

```json
{
  "shop_name": "Huzef Main Store",
  "address": "123 Main Bazaar, Mumbai",
  "phone": "9876543210"
}
```

---

### 10.2 Get All Shops

**Endpoint:** `GET /api/organizations/:orgId/shops`
**Auth:** Required
**Permission:** `shop:read`

Non-owner users only see shops they are assigned to via `org_memberships`. Owner sees all.

---

### 10.3 Get Single Shop

**Endpoint:** `GET /api/organizations/:orgId/shops/:shopId`
**Auth:** Required
**Permission:** `shop:read`

---

### 10.4 Update Shop

**Endpoint:** `PUT /api/organizations/:orgId/shops/:shopId`
**Auth:** Required
**Permission:** `shop:update`

---

### 10.5 Delete / Close Shop

**Endpoint:** `DELETE /api/organizations/:orgId/shops/:shopId`
**Auth:** Required
**Permission:** `shop:delete`

Rules:
- Cannot delete if customers have `balance > 0`
- Soft-close option: set `is_active = false` to preserve data

---

## 11. Customer APIs

> All endpoints are scoped to `shop_id`. User must have access to that shop.

### 11.1 Add Customer

**Endpoint:** `POST /api/shops/:shopId/customers`
**Auth:** Required
**Permission:** `customer:create`

```json
{ "name": "Rahul Sharma", "phone": "9876543210" }
```

---

### 11.2 Get All Customers

**Endpoint:** `GET /api/shops/:shopId/customers`
**Auth:** Required
**Permission:** `customer:read`

**Query Params:** `search`, `sort`, `order`, `page`, `limit`, `has_balance`

---

### 11.3 Get Single Customer

**Endpoint:** `GET /api/shops/:shopId/customers/:customerId`
**Auth:** Required
**Permission:** `customer:read`

---

### 11.4 Update Customer

**Endpoint:** `PUT /api/shops/:shopId/customers/:customerId`
**Auth:** Required
**Permission:** `customer:update`

---

### 11.5 Delete Customer

**Endpoint:** `DELETE /api/shops/:shopId/customers/:customerId`
**Auth:** Required
**Permission:** `customer:delete`

Rule: Cannot delete if `balance > 0`.

---

## 12. Product APIs

### 12.1 Add Product

**Endpoint:** `POST /api/shops/:shopId/products`
**Auth:** Required
**Permission:** `product:create`

```json
{ "name": "Basmati Rice 5kg", "price": 450.00, "stock": 100, "unit": "bag" }
```

---

### 12.2 Get All Products

**Endpoint:** `GET /api/shops/:shopId/products`
**Auth:** Required
**Permission:** `product:read`

**Query Params:** `search`, `low_stock` (boolean), `page`, `limit`

---

### 12.3 Update Product

**Endpoint:** `PUT /api/shops/:shopId/products/:productId`
**Auth:** Required
**Permission:** `product:update`

---

### 12.4 Delete Product (Soft)

**Endpoint:** `DELETE /api/shops/:shopId/products/:productId`
**Auth:** Required
**Permission:** `product:delete`

Sets `deleted_at = NOW()`. Hidden from new bills, preserved in historical data.

---

### 12.5 Update Stock

**Endpoint:** `PATCH /api/shops/:shopId/products/:productId/stock`
**Auth:** Required
**Permission:** `stock:update`

```json
{ "adjustment": 50, "type": "ADD" }
```

`type` can be `ADD` or `SET`. Stock can never go below 0.

---

## 13. Billing APIs

### 13.1 Create Bill

**Endpoint:** `POST /api/shops/:shopId/bills`
**Auth:** Required
**Permission:** `bill:create`

**Request Body:**
```json
{
  "customer_id": "uuid-or-null",
  "items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid", "quantity": 1 }
  ],
  "paid": 200.00,
  "note": "Partial payment, rest udhaar"
}
```

**Backend Logic (Atomic DB Transaction):**
```
BEGIN TRANSACTION;

1. Verify user has bill:create permission for this shop
2. Validate all product_ids belong to this shop and are not soft-deleted
3. FOR EACH item:
   a. SELECT price, stock FROM products WHERE id = $id FOR UPDATE (row lock)
   b. Check stock >= quantity → else ROLLBACK with "Out of stock"
   c. subtotal = price × quantity
4. total = SUM(all subtotals)
5. Validate paid <= total → else ROLLBACK
6. due = total - paid
7. INSERT INTO bills (shop_id, customer_id, created_by, total, paid)
8. INSERT INTO bill_items (bill_id, product_id, product_name snapshot, qty, price)
9. FOR EACH item: UPDATE products SET stock = stock - quantity
10. IF customer_id IS NOT NULL AND due > 0:
    INSERT INTO transactions (type=DEBIT, amount=due, bill_id, created_by)
    UPDATE customers SET balance = balance + due

COMMIT;
```

**Success Response:** `201 Created`
```json
{
  "success": true,
  "bill": {
    "id": "uuid",
    "total": 900.00,
    "paid": 200.00,
    "due": 700.00,
    "created_by": { "id": "uuid", "name": "Ravi Kumar" },
    "customer": { "id": "uuid", "name": "Rahul Sharma", "balance": 700.00 },
    "items": [
      { "product_name": "Basmati Rice 5kg", "quantity": 2, "price": 450.00, "subtotal": 900.00 }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Failure Cases:**

| Case | Status |
|---|---|
| Product not found / wrong shop | 404 Not Found |
| Insufficient stock | 400 Bad Request |
| `paid > total` | 400 Bad Request |
| Items array empty | 400 Bad Request |
| Invalid quantity (≤ 0) | 400 Bad Request |

---

### 13.2 Get Bills

**Endpoint:** `GET /api/shops/:shopId/bills`
**Auth:** Required
**Permission:** `bill:read`

**Query Params:** `customer_id`, `from`, `to`, `has_due`, `created_by`, `page`, `limit`

---

### 13.3 Get Single Bill

**Endpoint:** `GET /api/shops/:shopId/bills/:billId`
**Auth:** Required
**Permission:** `bill:read`

---

### 13.4 Delete Bill

**Endpoint:** `DELETE /api/shops/:shopId/bills/:billId`
**Auth:** Required
**Permission:** `bill:delete`

Reverses stock deductions, removes linked transactions, recalculates customer balance — all in one atomic DB transaction.

---

## 14. Udhaar / Transaction APIs

### 14.1 Add Manual Transaction

**Endpoint:** `POST /api/shops/:shopId/transactions`
**Auth:** Required
**Permission:** `transaction:create`

```json
{
  "customer_id": "uuid",
  "type": "CREDIT",
  "amount": 500.00,
  "note": "Cash payment received"
}
```

**Logic:**
- `CREDIT` → customer paid → `balance = balance - amount`
- `DEBIT` → shop gave goods on credit → `balance = balance + amount`
- Records `created_by = req.user.userId`

**Success Response:** `201 Created`
```json
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "type": "CREDIT",
    "amount": 500.00,
    "note": "Cash payment received",
    "created_by": { "id": "uuid", "name": "Ravi Kumar" },
    "created_at": "2024-01-15T10:30:00Z"
  },
  "customer": {
    "id": "uuid",
    "name": "Rahul Sharma",
    "balance": 200.00
  }
}
```

---

### 14.2 Get Transactions by Customer

**Endpoint:** `GET /api/shops/:shopId/customers/:customerId/transactions`
**Auth:** Required
**Permission:** `transaction:read`

**Query Params:** `type` (CREDIT/DEBIT), `from`, `to`, `page`, `limit`

---

### 14.3 Get All Transactions (Shop Level)

**Endpoint:** `GET /api/shops/:shopId/transactions`
**Auth:** Required
**Permission:** `transaction:read`

**Query Params:** `type`, `from`, `to`, `created_by`, `page`, `limit`

---

## 15. Dashboard APIs

### 15.1 Shop Dashboard

**Endpoint:** `GET /api/shops/:shopId/dashboard`
**Auth:** Required
**Permission:** `report:read`

**Query Params:** `from`, `to` (date range; default: current month)

```json
{
  "success": true,
  "summary": {
    "total_sales": 85000.00,
    "total_collected": 72000.00,
    "total_due": 13000.00,
    "total_customers": 45,
    "today_sales": 3500.00,
    "bills_count": 128
  },
  "top_debtors": [
    { "id": "uuid", "name": "Rahul Sharma", "balance": 2500.00 }
  ],
  "recent_bills": [...]
}
```

---

### 15.2 Org-Wide Dashboard

**Endpoint:** `GET /api/organizations/:orgId/dashboard`
**Auth:** Required
**Permission:** `report:read` (org-wide membership or owner)

Aggregates data across **all shops** in the org.

```json
{
  "success": true,
  "org_summary": {
    "total_shops": 3,
    "total_sales": 250000.00,
    "total_due": 35000.00,
    "total_customers": 180
  },
  "shops_breakdown": [
    { "shop_id": "uuid", "shop_name": "Shop A", "sales": 120000.00, "due": 15000.00 },
    { "shop_id": "uuid", "shop_name": "Shop B", "sales": 80000.00, "due": 12000.00 },
    { "shop_id": "uuid", "shop_name": "Shop C", "sales": 50000.00, "due": 8000.00 }
  ],
  "top_debtors_org_wide": [...]
}
```

---

### 15.3 User Activity Report

**Endpoint:** `GET /api/organizations/:orgId/reports/activity`
**Auth:** Required
**Permission:** `report:read`

Tracks bills and transactions created by each staff member — useful for cashier performance.

```json
{
  "success": true,
  "activity": [
    {
      "user_id": "uuid",
      "name": "Ravi Kumar",
      "role": "Cashier",
      "shop": "Shop A",
      "bills_created": 45,
      "total_billed": 32000.00,
      "transactions_created": 12
    }
  ]
}
```

---

## 16. Error Handling Strategy

### HTTP Status Codes

| Error Type | Code | Description |
|---|---|---|
| Validation Error | 400 | Invalid input data |
| Unauthorized | 401 | Missing or invalid JWT |
| Forbidden | 403 | Valid token, insufficient permissions |
| Not Found | 404 | Resource does not exist |
| Conflict | 409 | Duplicate data |
| Too Many Requests | 429 | Rate limit exceeded |
| Server Error | 500 | Unexpected internal error |

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action.",
    "required_permission": "bill:create",
    "your_role": "Accountant"
  }
}
```

### RBAC-Specific Error Codes

| Code | Meaning |
|---|---|
| `NOT_ORG_MEMBER` | User is not a member of this org |
| `SHOP_ACCESS_DENIED` | User has no membership for this shop |
| `PERMISSION_DENIED` | User's role lacks required permission |
| `MEMBER_SUSPENDED` | User is suspended from this org |
| `ROLE_IN_USE` | Cannot delete role with active members |
| `INVITATION_EXPIRED` | Invite token is expired |
| `INVITATION_ALREADY_ACCEPTED` | Token already used |
| `OWNER_CANNOT_BE_REMOVED` | Cannot remove org owner from membership |

---

## 17. Business Rules & Constraints

### Organization Rules

```
✅ One user can own multiple organizations
✅ One user can be a member of multiple organizations
✅ A user can have different roles in different shops within same org
✅ Org owner always has full access regardless of their role record
❌ Cannot delete org with active customer dues
❌ Cannot remove or suspend the org owner
```

### Role Rules

```
✅ Roles are scoped per organization (not global)
✅ Owner can create unlimited custom roles
✅ Updating a role's permissions applies immediately to all members
❌ System roles (Owner) cannot be modified or deleted
❌ Cannot delete a role assigned to active members
❌ Role name must be unique within org
❌ Cannot create a role named "Owner"
```

### Membership Rules

```
✅ One (user, org, shop) tuple = one membership row (unique constraint)
✅ User can be assigned to multiple shops with different roles
✅ shop_id = NULL means org-wide access to all shops
✅ Suspended users cannot perform any actions (403 on all routes)
❌ Cannot have two roles for the same (user + shop)
❌ Cannot remove org owner from org
```

### Billing / Balance Rules

```
✅ Bill tracks created_by for full audit trail
✅ Walk-in bills allowed (customer_id = NULL)
✅ Partial payment creates DEBIT transaction for due amount
❌ paid > total is rejected
❌ Stock cannot go negative
❌ Cannot bill out-of-stock products
```

---

## 18. Edge Cases

### RBAC Edge Cases

| Scenario | Handling |
|---|---|
| User invited to shop, shop later deleted | `org_memberships` row cascade deleted |
| Role permissions updated mid-session | Changes apply on next request (cache TTL: 5 min) |
| User has org-wide membership (shop_id = NULL) | Can access all shops; used for senior staff |
| Org owner tries to remove themselves | Rejected with `OWNER_CANNOT_BE_REMOVED` |
| Invitation token reused after accepted | Second use returns 400 with `INVITATION_ALREADY_ACCEPTED` |
| Expired invitation token accepted | `expires_at < NOW()` check returns 400 |
| Two simultaneous role deletions | Unique constraint prevents double deletion |

### Billing Edge Cases

| Scenario | Handling |
|---|---|
| Two cashiers bill same product simultaneously | `SELECT ... FOR UPDATE` row lock prevents race condition |
| Product deleted after bill creation | `product_id = NULL` in bill_items; `product_name` snapshot retained |
| Network failure mid-billing | DB transaction rolls back entirely; client retries safely |
| Duplicate API call | `X-Idempotency-Key` header prevents double billing |

### Org Edge Cases

| Scenario | Handling |
|---|---|
| Slug collision on org creation | 409 with suggestion for alternative slug |
| User already exists when accepting invite | Membership created; no duplicate user row |
| Transfer ownership to non-member | New owner auto-added with Owner role membership |

---

## 19. Security Implementation

### JWT Authentication

```javascript
// JWT contains only userId — org/shop context resolved fresh from DB each request
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

### RBAC Permission Check Middleware

```javascript
// middleware/checkPermission.js
const checkPermission = (requiredPermission) => async (req, res, next) => {
  const { userId } = req.user;
  const { shopId, orgId } = req.params;

  // Org owner bypasses all permission checks
  if (req.isOrgOwner) return next();

  // Check cache first
  const cacheKey = `perms:${userId}:${shopId || orgId}`;
  const cached = await redis.get(cacheKey);
  let permissions = cached ? JSON.parse(cached) : null;

  if (!permissions) {
    const result = await db.query(`
      SELECT r.permissions
      FROM org_memberships m
      JOIN org_roles r ON r.id = m.role_id
      WHERE m.user_id = $1
        AND m.org_id = $2
        AND (m.shop_id = $3 OR m.shop_id IS NULL)
        AND m.status = 'active'
      ORDER BY m.shop_id NULLS LAST
      LIMIT 1
    `, [userId, orgId, shopId]);

    if (!result.rows.length) {
      return res.status(403).json({
        success: false,
        error: { code: 'SHOP_ACCESS_DENIED', message: 'No access to this shop' }
      });
    }

    permissions = result.rows[0].permissions;
    await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // cache 5 min
  }

  const [resource, action] = requiredPermission.split(':');
  const hasPermission =
    permissions.includes('*') ||
    permissions.includes(requiredPermission) ||
    permissions.includes(`${resource}:*`);

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: `Missing required permission: ${requiredPermission}`
      }
    });
  }

  next();
};

// Usage in routes:
router.post('/bills', authenticate, resolveOrgScope, checkPermission('bill:create'), createBill);
```

### Route-Permission Mapping

| Route | Method | Permission |
|---|---|---|
| `/organizations/:id/roles` | POST | `role:create` |
| `/organizations/:id/roles/:id` | PUT | `role:update` |
| `/organizations/:id/roles/:id` | DELETE | `role:delete` |
| `/organizations/:id/invite` | POST | `user:invite` |
| `/organizations/:id/members/:id` | PUT | `user:update` |
| `/organizations/:id/members/:id` | DELETE | `user:remove` |
| `/organizations/:id/shops` | POST | `shop:create` |
| `/shops/:id/customers` | POST | `customer:create` |
| `/shops/:id/customers/:id` | DELETE | `customer:delete` |
| `/shops/:id/products` | POST | `product:create` |
| `/shops/:id/products/:id/stock` | PATCH | `stock:update` |
| `/shops/:id/bills` | POST | `bill:create` |
| `/shops/:id/bills/:id` | DELETE | `bill:delete` |
| `/shops/:id/transactions` | POST | `transaction:create` |
| `/shops/:id/dashboard` | GET | `report:read` |
| `/organizations/:id/dashboard` | GET | `report:read` |

### Password & Token Security

```javascript
// Password hashing
const hash = await bcrypt.hash(password, 12);
const isMatch = await bcrypt.compare(input, hash);

// Invitation token
const token = crypto.randomBytes(32).toString('hex');

// Rate limiting
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
```

---

### 19.4 Super Admin (Global)

Purpose: A single global "Super Admin" account that bypasses per-org RBAC and has full access to all organizations and shops. This is intended for emergency access, platform administrators, or automated system accounts that must manage data across org boundaries.

- Detection:
  - Recommended: set `SUPER_ADMIN_EMAIL` in environment, or use a user-level boolean column `is_super_admin` (preferred for auditability).
  - Example: a user is considered super admin when `user.is_super_admin === true` OR `user.email === process.env.SUPER_ADMIN_EMAIL`.

- Middleware behavior:
  - `authenticate` / `resolveOrgScope` should set `req.isSuperAdmin = true` when the condition above matches.
  - `checkPermission` should short-circuit and call `next()` when `req.isSuperAdmin` is true.

Example (conceptual):
```
// resolveOrgScope.js (after fetching req.user and org)
req.isSuperAdmin = req.user?.is_super_admin || (process.env.SUPER_ADMIN_EMAIL && req.user?.email === process.env.SUPER_ADMIN_EMAIL);

// checkPermission.js (start of middleware)
if (req.isSuperAdmin) return next();
```

- Seeder / Initial setup:
  - Add a seed or migration to create a Super Admin user with a strong password and `is_super_admin = true`.
  - Alternatively, provide a small script `scripts/create-super-admin.js` which creates the user from `SUPER_ADMIN_EMAIL` and a secure environment-only password.

- Security notes:
  - Limit access to the `SUPER_ADMIN_EMAIL` value and any scripts that create the account.
  - Enforce strong password, rotate credentials regularly, and consider enabling MFA for the Super Admin account.
  - Treat Super Admin actions as high-risk; log and audit all Super Admin activity.

---

## 20. Middleware & Utilities

### Org Scope Resolver

```javascript
const resolveOrgScope = async (req, res, next) => {
  const { orgId } = req.params;
  const { userId } = req.user;

  const org = await db.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
  if (!org.rows.length) return res.status(404).json({ error: 'Organization not found' });

  req.org = org.rows[0];
  req.isOrgOwner = org.rows[0].owner_id === userId;
  next();
};
```

### Permission Cache Invalidation

```javascript
// Bust cache for all users in this shop when a role is updated
const bustPermissionCache = async (orgId, shopId) => {
  const keys = await redis.keys(`perms:*:${shopId || orgId}`);
  if (keys.length) await redis.del(keys);
};

// Call this in role.service.js after any role permission change
await bustPermissionCache(orgId, null); // org-wide
```

### Idempotency Middleware

```javascript
const idempotencyCheck = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key) return next();
  const cached = await redis.get(`idem:${key}`);
  if (cached) return res.status(200).json(JSON.parse(cached));
  res.sendResponse = res.json.bind(res);
  res.json = async (body) => {
    await redis.setex(`idem:${key}`, 86400, JSON.stringify(body));
    res.sendResponse(body);
  };
  next();
};
```

### Permissions Constants File

```javascript
// src/constants/permissions.js
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

---

## 21. Project Folder Structure

```
smart-billing-system/
├── src/
│   ├── config/
│   │   ├── db.js                      # PostgreSQL pool
│   │   ├── redis.js                   # Redis client
│   │   └── env.js                     # Env validation (Zod)
│   │
│   ├── middleware/
│   │   ├── authenticate.js            # JWT verify
│   │   ├── resolveOrgScope.js         # Attach org + isOrgOwner to req
│   │   ├── checkPermission.js         # RBAC permission check (with cache)
│   │   ├── checkOrgOwner.js           # Owner-only guard
│   │   ├── errorHandler.js            # Global error handler
│   │   ├── rateLimiter.js             # Rate limiting configs
│   │   ├── validate.js                # Zod schema middleware
│   │   └── idempotency.js             # Idempotency key handler
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── org.routes.js              # Org CRUD + member mgmt + dashboard
│   │   ├── role.routes.js             # RBAC role CRUD
│   │   ├── invitation.routes.js       # Invite / accept / revoke / resend
│   │   ├── shop.routes.js             # Shop CRUD under org
│   │   ├── customer.routes.js         # Customer CRUD under shop
│   │   ├── product.routes.js          # Product CRUD + stock update
│   │   ├── bill.routes.js             # Billing
│   │   ├── transaction.routes.js      # Udhaar transactions
│   │   └── dashboard.routes.js        # Shop + org dashboards
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── org.controller.js
│   │   ├── role.controller.js
│   │   ├── invitation.controller.js
│   │   ├── shop.controller.js
│   │   ├── customer.controller.js
│   │   ├── product.controller.js
│   │   ├── bill.controller.js
│   │   ├── transaction.controller.js
│   │   └── dashboard.controller.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── org.service.js
│   │   ├── role.service.js            # Role CRUD + cache bust
│   │   ├── invitation.service.js      # Token gen + email sending
│   │   ├── permission.service.js      # Permission resolution + cache
│   │   ├── shop.service.js
│   │   ├── customer.service.js
│   │   ├── product.service.js
│   │   ├── bill.service.js            # Core atomic billing logic
│   │   ├── transaction.service.js
│   │   └── dashboard.service.js
│   │
│   ├── schemas/
│   │   ├── auth.schema.js
│   │   ├── org.schema.js
│   │   ├── role.schema.js
│   │   ├── invitation.schema.js
│   │   ├── customer.schema.js
│   │   ├── product.schema.js
│   │   ├── bill.schema.js
│   │   └── transaction.schema.js
│   │
│   ├── constants/
│   │   └── permissions.js             # Master PERMISSIONS enum
│   │
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
│   │
│   └── app.js
│
├── tests/
│   ├── auth.test.js
│   ├── org.test.js
│   ├── rbac.test.js                   # Permission check edge cases
│   ├── billing.test.js
│   ├── invitation.test.js
│   └── transaction.test.js
│
├── .env.example
├── package.json
└── README.md
```

---

## 22. Environment Configuration

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

# Redis (permission cache + idempotency)
REDIS_URL=redis://localhost:6379
PERMISSION_CACHE_TTL=300

# Email (invitations)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=apikey
SMTP_PASS=your_resend_api_key
MAIL_FROM=noreply@yourdomain.com

# App
APP_URL=https://app.yourdomain.com
INVITE_EXPIRES_DAYS=7

# Business Config
ALLOW_OVERPAYMENT=true
ALLOW_DUPLICATE_PHONE=true
STRICT_STOCK_CHECK=true
```

---

## 23. Success Criteria

| Metric | Target | Verification |
|---|---|---|
| Bill creation time | < 3 seconds | Load test with k6 |
| RBAC permission check | < 50ms (cached hit) | Redis hit rate monitoring |
| API response time (p95) | < 500ms | PM2 / APM |
| Concurrent users | 1000+ | Stress test |
| Data consistency (balance) | Zero mismatch | Reconciliation query |
| Stock integrity | Never negative | DB CHECK constraint |
| Invitation email delivery | < 30 seconds | Mail delivery logs |
| Permission change propagation | Immediate (cache busted on update) | Integration test |

### Balance Reconciliation Query

```sql
-- Should always return 0 rows if balance is consistent
SELECT c.id, c.name, c.balance,
  COALESCE(SUM(CASE WHEN t.type = 'DEBIT'  THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0) AS calculated_balance
FROM customers c
LEFT JOIN transactions t ON t.customer_id = c.id
GROUP BY c.id, c.name, c.balance
HAVING c.balance != (
  COALESCE(SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END), 0)
);
```

---

## 24. Future Enhancements

| Enhancement | Description | Priority |
|---|---|---|
| GST Support | Tax percentage per product; GST breakup in bills | High |
| Invoice PDF | Auto-generate downloadable PDF per bill | High |
| Audit Logs | Full log of every create/update/delete (who, what, when) | High |
| Permission Templates | Pre-built role templates (Manager, Cashier) for quick setup | Medium |
| Multi-currency | Per-org currency config | Medium |
| Offline Sync | PWA + IndexedDB queue for poor connectivity | Medium |
| WhatsApp Alerts | Auto-send due reminders to customers | Medium |
| Mobile App | React Native for Android/iOS | Medium |
| Barcode Scanning | Scan product barcode to add to bill instantly | Low |
| Expense Tracking | Log shop expenses to calculate profit/loss | Low |
| Analytics Reports | Weekly/monthly PDF report for org owner | Low |
| Data Export | Export all data to CSV/Excel | Low |

---

*Document Version: 2.0 | System: Smart Billing & Udhaar MVP — Organization + Custom RBAC*