import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { productsRouter } from "./modules/products/products.routes";
import { inventoryRouter } from "./modules/inventory/inventory.routes";
import { customersRouter } from "./modules/customers/customers.routes";
import { posRouter } from "./modules/pos/pos.routes";
import { suppliersRouter } from "./modules/suppliers/suppliers.routes";
import { purchasesRouter } from "./modules/purchases/purchases.routes";
import { employeesRouter } from "./modules/employees/employees.routes";
import { expensesRouter } from "./modules/expenses/expenses.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { settingsRouter } from "./modules/settings/settings.routes";
import { forecastingRouter } from "./modules/forecasting/forecasting.routes";
import { branchesRouter } from "./modules/branches/branches.routes";

export const routes = Router();

routes.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

routes.use("/auth", authRouter);
routes.use("/branches", branchesRouter);
routes.use("/categories", categoriesRouter);
routes.use("/products", productsRouter);
routes.use("/inventory", inventoryRouter);
routes.use("/customers", customersRouter);
routes.use("/pos", posRouter);
routes.use("/suppliers", suppliersRouter);
routes.use("/purchases", purchasesRouter);
routes.use("/employees", employeesRouter);
routes.use("/expenses", expensesRouter);
routes.use("/reports", reportsRouter);
routes.use("/dashboard", dashboardRouter);
routes.use("/settings", settingsRouter);
routes.use("/forecasting", forecastingRouter);
