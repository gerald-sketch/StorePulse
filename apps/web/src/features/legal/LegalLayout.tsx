import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/storepulse-mark.svg"
              alt=""
              className="h-8 w-8 shrink-0 rounded-lg"
            />
            <span className="font-semibold text-[15px] tracking-tight">
              StorePulse
            </span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </div>
      </header>

      {/* Document */}
      <main className="max-w-3xl mx-auto px-4 lg:px-8 py-10 lg:py-16">
        <div className="mb-10">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>

        <article
          className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
          prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-muted-foreground
          prose-li:text-[15px] prose-li:text-muted-foreground
          prose-strong:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
        >
          {children}
        </article>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            This document is provided as a template for the SmallBiz platform. A
            production deployment would engage legal counsel to review and
            customize these terms for the specific jurisdiction and business
            entity.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <Link
              to="/terms"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <span className="h-3 w-px bg-border" />
            <Link
              to="/privacy"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="h-3 w-px bg-border" />
            <Link
              to="/register"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
