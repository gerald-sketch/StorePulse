import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-store";
import { useBranchStore } from "@/lib/branch-store";
import { useBranches } from "@/features/branches/use-branches";

export function BranchSwitcher() {
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
      <p className="text-xs text-muted-foreground">
        Branch: <span className="font-medium text-foreground">{activeBranch.name}</span>
      </p>
    );
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Branch</span>
      <select
        aria-label="Active branch"
        value={activeBranch.id}
        onChange={(event) => {
          setSelectedBranchId(event.target.value);
          void queryClient.invalidateQueries();
        }}
        className="h-9 max-w-[min(60vw,18rem)] rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground"
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
