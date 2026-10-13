import type { ReactNode } from "react";
import { BranchSwitcher } from "./BranchSwitcher";
import { PwaStatus } from "@/components/pwa/PwaStatus";

interface PageHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
  pendingSync?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  pendingSync,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={`flex min-w-0 flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-center lg:justify-between ${className ?? ""}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
        <PwaStatus showQueueStatus={!pendingSync} />
        {pendingSync}
        <BranchSwitcher />
        {children}
      </div>
    </header>
  );
}
