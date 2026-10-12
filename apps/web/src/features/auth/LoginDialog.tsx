import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLogin } from "./use-auth";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [email, setEmail] = useState("gerald@acme.test");
  const [password, setPassword] = useState("Password123");
  const login = useLogin();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/15 sm:max-w-md sm:p-8">
        <DialogHeader className="mb-5 space-y-4 pr-7 text-left">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/storepulse-mark.svg"
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl"
            />
            <span className="min-w-0 text-lg font-bold tracking-[-0.04em] text-slate-900">
              Store<span className="text-teal-700">Pulse</span>
            </span>
          </div>
          <div className="min-w-0 space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-slate-950">
              Welcome back
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-slate-500">
              Sign in to continue to your StorePulse dashboard.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            login.mutate({ email, password });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-[13px] font-medium text-slate-700">
              Email
            </Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="h-12 rounded-xl border-slate-200 px-3.5 focus-visible:border-teal-600 focus-visible:ring-teal-600/20"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="login-password" className="text-[13px] font-medium text-slate-700">
                Password
              </Label>
              <button
                type="button"
                className="text-xs font-medium text-slate-500 transition-colors hover:text-teal-700"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="h-12 rounded-xl border-slate-200 px-3.5 focus-visible:border-teal-600 focus-visible:ring-teal-600/20"
            />
          </div>

          {login.isError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm leading-5 text-destructive"
            >
              {apiErrorMessage(login.error)}
            </div>
          )}

          <Button
            type="submit"
            className="group h-12 w-full rounded-xl bg-teal-700 font-semibold text-white shadow-sm shadow-teal-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-800 hover:shadow-md focus-visible:ring-teal-700"
            disabled={login.isPending}
          >
            {login.isPending ? (
              "Signing in..."
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        <div className="relative my-1 flex items-center justify-center">
          <span className="absolute inset-x-0 border-t border-slate-200" />
          <span className="relative bg-white px-3 text-xs text-slate-400">
            New to StorePulse?
          </span>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 font-semibold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50/60 hover:text-teal-800"
        >
          <Link to="/register" onClick={() => onOpenChange(false)}>
            Create a new account
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
