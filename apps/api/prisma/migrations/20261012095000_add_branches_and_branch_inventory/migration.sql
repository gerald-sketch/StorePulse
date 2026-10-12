CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Branch" ("id", "businessId", "name", "isDefault", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Main Branch', true, CURRENT_TIMESTAMP
FROM "Business";

CREATE TABLE "BranchInventory" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchInventory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "branchId" TEXT;

INSERT INTO "BranchInventory" ("id", "branchId", "productId", "stock", "updatedAt")
SELECT
    gen_random_uuid()::text,
    b."id",
    p."id",
    p."stock",
    CURRENT_TIMESTAMP
FROM "Product" p
JOIN "Branch" b ON b."businessId" = p."businessId" AND b."isDefault";

UPDATE "User" u
SET "branchId" = b."id"
FROM "Branch" b
WHERE b."businessId" = u."businessId" AND b."isDefault";

UPDATE "Sale" s
SET "branchId" = b."id"
FROM "Branch" b
WHERE b."businessId" = s."businessId" AND b."isDefault";

UPDATE "Purchase" p
SET "branchId" = b."id"
FROM "Branch" b
WHERE b."businessId" = p."businessId" AND b."isDefault";

UPDATE "Expense" e
SET "branchId" = b."id"
FROM "Branch" b
WHERE b."businessId" = e."businessId" AND b."isDefault";

ALTER TABLE "User" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "stock";

CREATE UNIQUE INDEX "Branch_businessId_name_key" ON "Branch"("businessId", "name");
CREATE INDEX "Branch_businessId_idx" ON "Branch"("businessId");
CREATE UNIQUE INDEX "BranchInventory_branchId_productId_key" ON "BranchInventory"("branchId", "productId");
CREATE INDEX "BranchInventory_productId_idx" ON "BranchInventory"("productId");
CREATE INDEX "Sale_branchId_paidAt_idx" ON "Sale"("branchId", "paidAt");
CREATE INDEX "Purchase_branchId_status_idx" ON "Purchase"("branchId", "status");
CREATE INDEX "Expense_branchId_spentAt_idx" ON "Expense"("branchId", "spentAt");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
