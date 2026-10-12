import { useState } from "react";
import { CalendarDays, Clock, Package, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesHistory } from "./use-sales-history";

const BUSINESS_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function businessToday() {
  return new Date(Date.now() + BUSINESS_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

function peso(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SalesHistoryPage() {
  const [date, setDate] = useState(businessToday);
  const { data, isLoading, isError, refetch } = useSalesHistory(date);
  const total = data?.sales.reduce((sum, sale) => sum + sale.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Sales History</h2>
        <p className="text-sm text-muted-foreground">
          Review your sales and the products in each transaction.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full space-y-2 sm:max-w-xs">
            <Label htmlFor="sales-history-date">Select date</Label>
            <Input
              id="sales-history-date"
              type="date"
              max={businessToday()}
              value={date}
              onChange={(event) => {
                if (event.target.value) setDate(event.target.value);
              }}
            />
          </div>
          {data && (
            <div className="flex items-center justify-between gap-4 text-sm sm:justify-end">
              <span className="text-muted-foreground">
                {data.sales.length}{" "}
                {data.sales.length === 1 ? "transaction" : "transactions"}
              </span>
              <span className="font-semibold tabular-nums">
                {peso(total)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-destructive">
              Could not load your sales history.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !data?.sales.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No sales on this date</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(date)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {formatDate(date)}
          </div>

          {data.sales.map((sale) => (
            <Card key={sale.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {sale.customerName}
                  </CardTitle>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(sale.paidAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">
                    {peso(sale.total)}
                  </p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {sale.paymentMethod.replaceAll("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2 border-t pt-3">
                  {sale.items.map((item, index) => (
                    <div
                      key={`${item.productId}-${index}`}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.sku} · {item.quantity} × {peso(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {peso(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
