import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound, MapPin } from "lucide-react";
import { useEmployees, useDeleteEmployee, Employee } from "./use-employees";
import { EmployeeDialog } from "./EmployeeDialog";
import { BranchManagementDialog } from "./BranchManagementDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth-store";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export function EmployeesPage() {
  const currentUser = useAuth((s) => s.user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [resetting, setResetting] = useState<Employee | null>(null);
  const [branchesOpen, setBranchesOpen] = useState(false);

  const { data, isLoading } = useEmployees();
  const del = useDeleteEmployee();
  const canManage = currentUser?.role === "OWNER";

  function handleCreateClick() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success("Employee removed");
      setDeleting(null);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Staff accounts and permissions">
        {canManage && (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="outline"
              onClick={() => setBranchesOpen(true)}
              className="rounded-xl"
            >
              <MapPin className="mr-2 h-4 w-4" /> Branches
            </Button>
            <Button onClick={handleCreateClick} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> New employee
            </Button>
          </div>
        )}
      </PageHeader>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No employees yet.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.name}
                    {e.id === currentUser?.id && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={e.role === "OWNER" ? "default" : "secondary"}
                    >
                      {ROLE_LABEL[e.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.branch.name}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {e.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => setResetting(e)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(e);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {e.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogOpen && (
        <EmployeeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employee={editing}
        />
      )}

      {canManage && (
        <BranchManagementDialog
          open={branchesOpen}
          onOpenChange={setBranchesOpen}
        />
      )}

      <ResetPasswordDialog
        open={!!resetting}
        onOpenChange={(v) => !v && setResetting(null)}
        employee={resetting}
      />

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove employee?</DialogTitle>
            <DialogDescription>
              "{deleting?.name}" will lose access to this business.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={del.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={del.isPending}
            >
              {del.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
