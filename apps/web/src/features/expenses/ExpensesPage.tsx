import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  useExpenses,
  useExpenseSummary,
  useDeleteExpense,
} from "./use-expenses";
import { ExpenseDialog } from "./ExpenseDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function peso(n: number | string) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useExpenses(page);
  const { data: summary } = useExpenseSummary();
  const del = useDeleteExpense();

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success("Expense deleted");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track operating costs">
        <Button
          onClick={() => setDialogOpen(true)}
          className="w-full rounded-xl sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> New expense
        </Button>
      </PageHeader>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{peso(summary.total)}</div>
              <p className="text-xs text-muted-foreground">
                {new Date(summary.year, summary.month - 1).toLocaleString(
                  "en-PH",
                  { month: "long", year: "numeric" },
                )}
              </p>
            </CardContent>
          </Card>
          {summary.byCategory.slice(0, 2).map((c) => (
            <Card key={c.category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {c.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{peso(c.total)}</div>
                <p className="text-xs text-muted-foreground">
                  {c.count} entries
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No expenses recorded.
                    </TableCell>
                  </TableRow>
                )}
                {data?.items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      {new Date(e.spentAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.category}</Badge>
                    </TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {peso(e.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(e.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
