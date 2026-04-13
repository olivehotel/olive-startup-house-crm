import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Lead } from "@shared/schema";
import { LEAD_STATUS_BADGE_CLASSES } from "@/lib/lead-status-badge-classes";
import {
  LeadPaymentPendingButton,
  leadShowsPaymentPendingSlot,
} from "@/components/lead-payment-pending-button";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
}

const sourceIcons: Record<string, string> = {
  Instagram: "📍",
  Website: "📍",
  "Booking.com": "📍",
  Airbnb: "📍",
  Referral: "📍",
  WOM: "📍",
  OTA: "📍",
};

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const displayName = lead.name.trim();
  const initials =
    displayName && displayName !== "Unknown"
      ? displayName
          .split(/\s+/)
          .filter(Boolean)
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "?"
      : "?";

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 p-3 rounded-md hover-elevate cursor-pointer border border-transparent hover:border-border transition-colors"
      onClick={onClick}
      data-testid={`lead-card-${lead.id}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={lead.avatar} alt={lead.name} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{lead.name}</h4>
            <Badge
              variant="secondary"
              className={cn("text-xs shrink-0", LEAD_STATUS_BADGE_CLASSES[lead.status])}
            >
              {lead.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>
              {sourceIcons[lead.source]} {lead.source}
            </span>
            <span className="text-primary font-medium">{formatBudget(lead.budget)}</span>
            <span className="hidden sm:inline">{formatTimeAgo(lead.createdAt)}</span>
          </div>
        </div>
      </div>

      {leadShowsPaymentPendingSlot(lead) ? (
        <div
          className="flex shrink-0 gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <LeadPaymentPendingButton lead={lead} whenHidden="hidden" />
        </div>
      ) : null}
    </div>
  );
}
