import { useState } from "react";
import { toast } from "sonner";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import {
  usePurchases,
  useReceivePurchase,
  useCancelPurchase,
  PurchaseStatus,
} from "./use-purchases";
import { PurchaseDialog } from "./PurchaseDialog";
import { PageHeader } from "@/components/layout/PageHeader";
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

function peso(n: number | string) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  PENDING: "Pending",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export function PurchasesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiving, setReceiving] = useState<string | null>(null);

  const { data, isLoading } = usePurchases(page, statusFilter || undefined);
  const receive = useReceivePurchase();
  const cancel = useCancelPurchase();

  async function confirmReceive() {
    if (!receiving) return;
    try {
      const updated = await receive.mutateAsync(receiving);
      toast.success(
        `Received PO · stock +${updated.items.reduce((s, i) => s + i.quantity, 0)}`,
      );
      setReceiving(null);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancel.mutateAsync(id);
      toast.success("PO cancelled");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="Purchase orders and stock-in"
      >
        <Button
          onClick={() => setDialogOpen(true)}
          className="w-full rounded-xl sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> New PO
        </Button>
      </PageHeader>

      <div className="flex gap-2">
        {(["", "PENDING", "RECEIVED", "CANCELLED"] as const).map((s) => (
          <Button
            key={s || "all"}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {s === "" ? "All" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No purchase orders yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {p.reference ?? p.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{p.supplier.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "RECEIVED"
                            ? "default"
                            : p.status === "CANCELLED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {STATUS_LABEL[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.items.length}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {peso(p.total)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.orderedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "PENDING" && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setReceiving(p.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Receive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(p.id)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {p.status === "RECEIVED" && (
                        <span className="text-xs text-muted-foreground">
                          {p.receivedAt
                            ? new Date(p.receivedAt).toLocaleDateString()
                            : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data && data.pages > 1 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Page {data.page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <PurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <Dialog open={!!receiving} onOpenChange={(v) => !v && setReceiving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive purchase order?</DialogTitle>
            <DialogDescription>
              Product stock will increase by the ordered quantities. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReceiving(null)}
              disabled={receive.isPending}
            >
              Cancel
            </Button>
            <Button onClick={confirmReceive} disabled={receive.isPending}>
              {receive.isPending ? "Receiving..." : "Receive stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
