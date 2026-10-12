import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useSuppliers } from "./use-suppliers";
import { SupplierDialog } from "./SupplierDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useSuppliers(search);

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Your supplier directory">
        <Button
          onClick={() => setDialogOpen(true)}
          className="w-full rounded-xl sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> New supplier
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No suppliers yet.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.contact ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-xs">
                    {s.address ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
