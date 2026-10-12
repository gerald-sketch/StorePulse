import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-white p-4">
      <div className="pointer-events-none absolute -top-40 h-96 w-96 rounded-full bg-emerald-100/50 blur-3xl" />
      <Card className="relative w-full max-w-md border-teal-100/80 shadow-[0_24px_80px_-36px_rgba(15,118,110,0.18)]">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center">
              {sent ? (
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
              ) : (
                <Mail className="h-5 w-5 text-teal-700" />
              )}
            </div>
          </div>
          <CardTitle className="text-center text-xl">
            {sent ? "Check your email" : "Forgot password?"}
          </CardTitle>
          <CardDescription className="text-center">
            {sent
              ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
              : "Enter your email and we'll send you a code to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <>
              <div className="rounded-xl border border-teal-200/70 bg-teal-50/70 px-4 py-3 text-xs text-muted-foreground mb-4">
                Didn't get the email? Check your spam folder, or{" "}
                <button
                  type="button"
                  className="text-teal-700 underline hover:text-teal-800"
                  onClick={() => setSent(false)}
                >
                  try again
                </button>
                .
              </div>
              <Button
                className="w-full h-11 rounded-xl bg-teal-700 text-white hover:bg-teal-800"
                onClick={() =>
                  navigate(`/reset-password?email=${encodeURIComponent(email)}`)
                }
              >
                Enter reset code
              </Button>
              <Link
                to="/login"
                className="flex items-center justify-center mt-3 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11 rounded-xl border-slate-200 focus-visible:border-teal-600 focus-visible:ring-teal-600/20"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-teal-700 text-white hover:bg-teal-800"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset code"}
              </Button>
              <Link
                to="/login"
                className="flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
