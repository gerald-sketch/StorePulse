import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { useBranchStore } from "@/lib/branch-store";
import { Branch, useBranches } from "@/features/branches/use-branches";
import {
  Employee,
  CreateEmployeeInput,
  Role,
  useCreateEmployee,
  useUpdateEmployee,
} from "./use-employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee?: Employee | null;
}

const EMPTY_BRANCHES: Branch[] = [];

export function EmployeeDialog({ open, onOpenChange, employee }: Props) {
  const isEdit = !!employee;
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(employee?.role ?? "STAFF");
  const [branchId, setBranchId] = useState(
    employee?.branch.id ?? selectedBranchId ?? "",
  );
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const { data: loadedBranches, isLoading: branchesLoading } = useBranches();
  const branches = loadedBranches ?? EMPTY_BRANCHES;
  const effectiveBranchId = branchId || branches[0]?.id || "";

  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit && employee) {
        await update.mutateAsync({ id: employee.id, name, role, branchId });
        toast.success("Employee updated");
      } else {
        const input: CreateEmployeeInput = {
          name,
          email,
          password,
          role,
          branchId: effectiveBranchId,
        };
        await create.mutateAsync(input);
        toast.success("Employee added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "New employee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update employee details."
              : "Add a staff account to your business."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ename">Name</Label>
            <Input
              id="ename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eemail">Email</Label>
            <Input
              id="eemail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEdit}
            />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="epassword">Password</Label>
              <PasswordInput
                id="epassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Min 8 chars, one uppercase, one lowercase, one digit
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={effectiveBranchId}
              onValueChange={setBranchId}
              disabled={branchesLoading || branches.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    branchesLoading ? "Loading branches..." : "Select branch"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!branchesLoading && branches.length === 0 && (
              <p className="text-xs text-destructive">
                Create a branch before adding employees.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !branchId}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
