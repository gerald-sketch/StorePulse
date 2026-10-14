import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import { useBranches } from "@/features/branches/use-branches";

export function BranchSwitcher({ compact = false }: { compact?: boolean }) {
  const role = useAuth((state) => state.user?.role);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const setSelectedBranchId = useBranchStore(
    (state) => state.setSelectedBranchId,
  );
  const queryClient = useQueryClient();
  const { data: branches, isError } = useBranches();
  const selectedBranch = branches?.find(
    (branch) => branch.id === selectedBranchId,
  );
  const activeBranch =
    selectedBranch ??
    branches?.find((branch) => branch.isDefault) ??
    branches?.[0];

  useEffect(() => {
    if (branches?.length && !selectedBranch) {
      setSelectedBranchId(activeBranch?.id ?? null);
      void queryClient.invalidateQueries();
    }
  }, [
    activeBranch?.id,
    branches?.length,
    queryClient,
    selectedBranch,
    setSelectedBranchId,
  ]);

  if (isError) {
    return (
      <p role="alert" className="text-xs text-destructive">
        Could not load branches.
      </p>
    );
  }
  if (!branches?.length || !activeBranch) return null;

  if (role !== "OWNER" || branches.length < 2) {
    return (
      <p
        className={`min-w-0 truncate text-xs text-muted-foreground ${
          compact ? "max-w-[min(30vw,9rem)] shrink" : ""
        }`}
      >
        Branch: <span className="font-medium text-foreground">{activeBranch.name}</span>
      </p>
    );
  }

  return (
    <label className="flex min-w-0 shrink-0 items-center gap-1 text-xs text-muted-foreground">
      <span>{compact ? "Branch:" : "Branch"}</span>
      <select
        aria-label="Active branch"
        value={activeBranch.id}
        onChange={(event) => {
          setSelectedBranchId(event.target.value);
          void queryClient.invalidateQueries();
        }}
        className={`h-9 max-w-[min(60vw,18rem)] rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground ${
          compact ? "h-7 max-w-[min(28vw,9rem)] px-1.5 text-xs" : ""
        }`}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
