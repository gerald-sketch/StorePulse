import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { Employee, useResetPassword } from "./use-employees";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: Employee | null;
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        ok ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ok ? "bg-primary" : "bg-muted-foreground/30",
        )}
      />
      {children}
    </div>
  );
}

export function ResetPasswordDialog({ open, onOpenChange, employee }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = useResetPassword();

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
    }
  }, [open]);

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
  const valid = Object.values(rules).every(Boolean);
  const matches = password === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    if (!valid) {
      toast.error("Password does not meet requirements");
      return;
    }
    if (!matches) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await reset.mutateAsync({ id: employee.id, password });
      toast.success(`Password reset for ${employee.name}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{employee.name}</strong>. They will
            use this to sign in next time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
              <Rule ok={rules.length}>8+ characters</Rule>
              <Rule ok={rules.upper}>Uppercase letter</Rule>
              <Rule ok={rules.lower}>Lowercase letter</Rule>
              <Rule ok={rules.digit}>One number</Rule>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reset.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={reset.isPending || !valid || !matches}
            >
              {reset.isPending ? "Resetting..." : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
