import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        ok ? "text-teal-700" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ok ? "bg-teal-700" : "bg-muted-foreground/30",
        )}
      />
      {children}
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
  const valid = Object.values(rules).every(Boolean);
  const matches = password === confirm && confirm.length > 0;
  const codeValid = /^\d{6}$/.test(code);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/login"), 2500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !matches || !codeValid) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { email, code, password });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Success ───
  if (done) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white p-4">
        <Card className="relative w-full max-w-md border-teal-100/80 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.18)]">
          <CardHeader>
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
              </div>
            </div>
            <CardTitle className="text-center text-xl">
              Password reset
            </CardTitle>
            <CardDescription className="text-center">
              Your password has been updated. Redirecting to sign in...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/login"
              className="flex items-center justify-center w-full h-11 rounded-xl bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 transition-colors"
            >
              Sign in now
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Missing email ───
  if (!email) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white p-4">
        <Card className="relative w-full max-w-md border-teal-100/80 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.18)]">
          <CardHeader>
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center text-xl">Missing email</CardTitle>
            <CardDescription className="text-center">
              Start the password reset from the sign-in page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/forgot-password"
              className="flex items-center justify-center w-full h-11 rounded-xl bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 transition-colors"
            >
              Start reset
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Reset form ───
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white p-4">
      <div className="pointer-events-none absolute -top-40 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />
      <Card className="relative w-full max-w-md border-teal-100/80 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.18)]">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-teal-700" />
            </div>
          </div>
          <CardTitle className="text-center text-xl">
            Enter reset code
          </CardTitle>
          <CardDescription className="text-center">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below
            along with your new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-display">Email</Label>
              <Input
                id="email-display"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-lg font-bold tracking-[0.5em] text-center rounded-xl tabular-nums"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 rounded-xl"
              />
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                <Rule ok={rules.length}>8+ characters</Rule>
                <Rule ok={rules.upper}>Uppercase letter</Rule>
                <Rule ok={rules.lower}>Lowercase letter</Rule>
                <Rule ok={rules.digit}>One number</Rule>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <PasswordInput
                id="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className="h-11 rounded-xl"
              />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl"
              disabled={loading || !valid || !matches || !codeValid}
            >
              {loading ? "Resetting..." : "Reset password"}
            </Button>

            <Link
              to="/forgot-password"
              className="flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Didn't get a code? Try again
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
