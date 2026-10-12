CREATE INDEX IF NOT EXISTS "Purchase_branchId_status_idx"
ON "Purchase"("branchId", "status");

CREATE INDEX IF NOT EXISTS "Expense_branchId_spentAt_idx"
ON "Expense"("branchId", "spentAt");
