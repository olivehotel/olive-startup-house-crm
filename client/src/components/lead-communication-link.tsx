import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import type { Lead } from "@shared/schema";
import { cn } from "@/lib/utils";

/** High-visibility control for Communication (matches lead pipeline + mobile cards) */
const communicationAccentClass =
  "border-primary/40 bg-primary/10 text-primary shadow-sm hover:bg-primary/15 hover:text-primary focus-visible:ring-primary/30";

type LeadCommunicationLinkProps = {
  lead: Lead;
  className?: string;
  /** Use short icon-only control (e.g. table actions column) */
  compact?: boolean;
};

export function LeadCommunicationLink({
  lead,
  className,
  compact,
}: LeadCommunicationLinkProps) {
  const id = lead.communicationId;
  if (!id) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "gap-1.5",
        communicationAccentClass,
        compact && "h-8 w-8 p-0",
        className,
      )}
      asChild
    >
      <Link
        href={`/communication/${id}`}
        title="Open communication"
        aria-label="Open communication"
        data-testid={`lead-communication-link-${lead.id}`}
        className={cn("inline-flex items-center justify-center", !compact && "gap-1.5")}
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        {!compact && <span className="font-medium">Open communication</span>}
      </Link>
    </Button>
  );
}
