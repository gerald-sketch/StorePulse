import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/query-client";
import { AuthBootstrap } from "@/routes/AuthBootstrap";
import { RequireAuth } from "@/routes/RequireAuth";
import { RequireRole } from "@/routes/RequireRole";
import { AppShell } from "@/components/layout/AppShell";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { TermsOfServicePage } from "@/features/legal/TermsOfServicePage";
import { PrivacyPolicyPage } from "@/features/legal/PrivacyPolicyPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PosPage } from "@/features/pos/PosPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { SuppliersPage } from "@/features/suppliers/SuppliersPage";
import { PurchasesPage } from "@/features/purchases/PurchasesPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { EmployeesPage } from "@/features/employees/EmployeesPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { ForecastingPage } from "@/features/forecasting/ForecastingPage";
import { StaffPerformancePage } from "@/features/dashboard/StaffPerformancePage";
import { SalesHistoryPage } from "@/features/sales-history/SalesHistoryPage";
import { PublicHomeRoute } from "@/features/landing/StorePulseLandingPage";
import { PwaRuntime } from "@/components/pwa/PwaRuntime";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <PwaRuntime />
          <Routes>
            {/* ─── Public routes ─── */}
            <Route path="/" element={<PublicHomeRoute />} />
            <Route
              path="/login"
              element={<PublicHomeRoute initialLoginOpen />}
            />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />

            {/* ─── Authenticated routes ─── */}
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route element={<RequireRole roles={["OWNER", "MANAGER"]} />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                </Route>
                <Route element={<RequireRole roles={["STAFF"]} />}>
                  <Route path="/sales-history" element={<SalesHistoryPage />} />
                </Route>
                <Route path="/pos" element={<PosPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/purchases" element={<PurchasesPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                <Route element={<RequireRole roles={["OWNER", "MANAGER"]} />}>
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/forecasting" element={<ForecastingPage />} />
                  <Route path="/team" element={<StaffPerformancePage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthBootstrap>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
