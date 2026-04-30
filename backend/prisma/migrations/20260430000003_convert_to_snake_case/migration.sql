-- Rename Organization columns to snake_case
ALTER TABLE "Organization" RENAME COLUMN "contactName" TO "contact_name";
ALTER TABLE "Organization" RENAME COLUMN "contactNo" TO "contact_no";
ALTER TABLE "Organization" RENAME COLUMN "countryCode" TO "country_code";
ALTER TABLE "Organization" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Organization" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename User columns to snake_case
ALTER TABLE "User" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "User" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "User" RENAME COLUMN "orgId" TO "org_id";
ALTER TABLE "User" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "User" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename Customer columns to snake_case
ALTER TABLE "Customer" RENAME COLUMN "orgId" TO "org_id";
ALTER TABLE "Customer" RENAME COLUMN "createdAt" TO "created_at";

-- Rename Product columns to snake_case
ALTER TABLE "Product" RENAME COLUMN "costPrice" TO "cost_price";
ALTER TABLE "Product" RENAME COLUMN "orgId" TO "org_id";
ALTER TABLE "Product" RENAME COLUMN "createdAt" TO "created_at";

-- Rename Invoice columns to snake_case
ALTER TABLE "Invoice" RENAME COLUMN "customerId" TO "customer_id";
ALTER TABLE "Invoice" RENAME COLUMN "orgId" TO "org_id";
ALTER TABLE "Invoice" RENAME COLUMN "createdAt" TO "created_at";

-- Rename InvoiceItem columns to snake_case
ALTER TABLE "InvoiceItem" RENAME COLUMN "invoiceId" TO "invoice_id";
ALTER TABLE "InvoiceItem" RENAME COLUMN "productId" TO "product_id";

-- Rename Role columns to snake_case
ALTER TABLE "Role" RENAME COLUMN "orgId" TO "org_id";
ALTER TABLE "Role" RENAME COLUMN "isDefault" TO "is_default";
ALTER TABLE "Role" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Role" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Role" RENAME COLUMN "createdBy" TO "created_by";
ALTER TABLE "Role" RENAME COLUMN "updatedBy" TO "updated_by";

-- Rename Permission columns to snake_case
ALTER TABLE "Permission" RENAME COLUMN "displayName" TO "display_name";
ALTER TABLE "Permission" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Permission" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename RolePermission columns to snake_case
ALTER TABLE "RolePermission" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "RolePermission" RENAME COLUMN "permissionId" TO "permission_id";
