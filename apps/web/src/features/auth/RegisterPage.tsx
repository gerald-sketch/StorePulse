import { useState } from "react";
import { Link } from "react-router-dom";
import { useRegister } from "./use-auth";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Store,
} from "lucide-react";

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

const BENEFITS = [
  {
    icon: Zap,
    title: "Set up in minutes",
    description: "No installation, no training. Start ringing sales today.",
  },
  {
    icon: TrendingUp,
    title: "Know your numbers",
    description: "Real-time profit, top products, and cash flow at a glance.",
  },
  {
    icon: Shield,
    title: "Built to be reliable",
    description: "Every transaction is protected against double-charges.",
  },
];

export function RegisterPage() {
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
  const passwordValid = Object.values(rules).every(Boolean);

  return (
    <div className="font-inter min-h-dvh bg-white lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      {/* ─── Left Panel: Brand & Benefits ─── */}
    <div className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-8 text-slate-800 lg:flex xl:px-12 xl:py-10">
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-teal-200/35 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl" />
        <div
        className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
            "linear-gradient(#0f766e 1px, transparent 1px), linear-gradient(90deg, #0f766e 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        {/* Brand */}
        <Link to="/" className="relative flex w-fit items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/15">
            <Store className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-semibold leading-tight tracking-tight">
            Store<span className="text-teal-700">Pulse</span>
            </p>
          <p className="text-xs leading-tight text-slate-500">
              Business management, in sync
            </p>
          </div>
        </Link>

        {/* Hero copy */}
        <div className="relative max-w-lg space-y-6 py-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-teal-800 shadow-sm shadow-teal-900/5">
              <Sparkles className="h-3.5 w-3.5 text-teal-700" />
              <span>Free to get started</span>
            </div>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-[-0.04em] text-slate-950 xl:text-5xl">
              Everything your business needs, in one place.
            </h1>
            <p className="text-base leading-7 text-slate-600">
              Stop juggling spreadsheets. Start with a system that grows with
              you — from your first sale to your hundredth employee.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid gap-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex gap-3 rounded-2xl border border-teal-100/80 bg-white/75 p-3 shadow-sm shadow-teal-900/[0.03] transition-colors duration-200 hover:border-teal-200 hover:bg-white"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <b.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight tracking-tight text-slate-900">
                    {b.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {b.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-teal-700" />
          <span>No credit card required · Free plan available forever</span>
        </div>
      </div>

      {/* ─── Right Panel: Register Form ─── */}
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-teal-50/70 via-white to-white px-4 py-4 sm:px-8 sm:py-8 lg:h-dvh lg:min-h-0 lg:overflow-y-auto lg:bg-white lg:px-6 lg:py-3 xl:px-10">
        <Link
          to="/"
          aria-label="StorePulse home"
          className="mb-2 inline-flex items-center gap-2.5 sm:mb-8 lg:hidden"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 shadow-sm shadow-teal-900/15">
            <Store className="h-4 w-4 text-white" strokeWidth={2.2} />
          </div>
          <span className="font-semibold tracking-tight text-slate-900">
            Store<span className="text-teal-700">Pulse</span>
          </span>
        </Link>

        <main className="flex flex-1 items-center justify-center py-0 sm:py-4 lg:flex-none lg:py-0">
          <div className="h-fit w-full max-w-md rounded-3xl border border-teal-100/80 bg-white p-3 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.18)] sm:p-7 lg:mx-auto lg:p-6">
            <div className="mb-4 space-y-1.5 sm:mb-8 sm:space-y-2 lg:mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                Start for free
              </p>
              <h1 className="text-2xl font-bold tracking-[-0.035em] text-slate-950 sm:text-3xl">
                Create your account
              </h1>
              <p className="text-sm leading-6 text-slate-500">
                Start managing your business in under a minute
              </p>
            </div>

            <form
              className="space-y-2.5 sm:space-y-5 lg:space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                register.mutate({ businessName, name, email, password });
              }}
            >
            <div className="space-y-1.5 sm:space-y-2 lg:space-y-1">
              <Label htmlFor="businessName" className="text-[13px] font-medium text-slate-700">
                Business name
              </Label>
              <Input
                id="businessName"
                placeholder="Acme Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:border-teal-600 focus-visible:ring-teal-600/20 sm:h-12 lg:h-10"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2 lg:space-y-1">
              <Label htmlFor="name" className="text-[13px] font-medium text-slate-700">
                Your name
              </Label>
              <Input
                id="name"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:border-teal-600 focus-visible:ring-teal-600/20 sm:h-12 lg:h-10"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2 lg:space-y-1">
              <Label htmlFor="email" className="text-[13px] font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:border-teal-600 focus-visible:ring-teal-600/20 sm:h-12 lg:h-10"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2 lg:space-y-1">
              <Label htmlFor="password" className="text-[13px] font-medium text-slate-700">
                Password
              </Label>
              <PasswordInput
                id="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11 rounded-xl border-slate-200 px-3.5 focus-visible:border-teal-600 focus-visible:ring-teal-600/20 sm:h-12 lg:h-10"
              />
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5 text-[11px] sm:gap-x-3 sm:gap-y-2 lg:gap-y-0.5">
                <Rule ok={rules.length}>8+ characters</Rule>
                <Rule ok={rules.upper}>Uppercase letter</Rule>
                <Rule ok={rules.lower}>Lowercase letter</Rule>
                <Rule ok={rules.digit}>One number</Rule>
              </div>
            </div>

            {register.isError && (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm leading-5 text-destructive">
                {apiErrorMessage(register.error)}
              </div>
            )}

            <Button
              type="submit"
              className="group h-11 w-full rounded-xl bg-teal-700 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-teal-800 sm:h-12 lg:h-11"
              disabled={register.isPending || !passwordValid}
            >
              {register.isPending ? (
                "Creating account..."
              ) : (
                <>
                  Create account <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>

            <p className="px-1 text-center text-xs leading-5 text-slate-500">
              By creating an account you agree to our{" "}
              <Link
                to="/terms"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
            </form>

          <div className="relative my-3 sm:my-6 lg:my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">
                Already registered?
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50/60 hover:text-teal-800 sm:h-12 lg:h-11"
          >
            Sign in to your account
          </Link>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] text-slate-500 sm:mt-6 lg:mt-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
              <span>No credit card</span>
            </div>
            <span className="hidden h-3 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
              <span>Free forever</span>
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
