import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { useBranches, useCreateBranch } from "@/features/branches/use-branches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchManagementDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const { data: branches, isLoading } = useBranches();
  const create = useCreateBranch();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const branch = await create.mutateAsync({
        name,
        ...(address.trim() ? { address } : {}),
      });
      toast.success(`${branch.name} created`);
      setName("");
      setAddress("");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage branches</DialogTitle>
          <DialogDescription>
            Add business locations and assign employees to a branch.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {branches?.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{branch.name}</p>
                  {branch.address && (
                    <p className="truncate text-xs text-muted-foreground">
                      {branch.address}
                    </p>
                  )}
                </div>
                {branch.isDefault && (
                  <Badge variant="secondary" className="shrink-0">
                    Default
                  </Badge>
                )}
              </div>
            ))}
            {branches?.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No branches yet.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch name</Label>
            <Input
              id="branch-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Downtown"
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-address">Address (optional)</Label>
            <Input
              id="branch-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={255}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Close
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending ? "Adding..." : "Add branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
