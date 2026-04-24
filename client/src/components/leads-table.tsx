import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TruncatedCell } from "@/components/truncated-cell";
import { LeadPaymentPendingButton } from "@/components/lead-payment-pending-button";
import { LeadCommunicationLink } from "@/components/lead-communication-link";
import { cn } from "@/lib/utils";
import type { Lead } from "@shared/schema";
import { LEAD_STATUS_BADGE_CLASSES } from "@/lib/lead-status-badge-classes";
import { MessageSquare } from "lucide-react";

export function formatLeadCreatedRelative(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return "Just now";
}

type LeadsTableProps = {
  leads: Lead[];
  /** `page`: full-bleed horizontal scroll on small screens (leads page). `embedded`: inside cards (dashboard). */
  variant?: "page" | "embedded";
};

const tableDense =
  "table-fixed w-full [&_th]:h-9 [&_th]:px-2 [&_th]:py-2 [&_th]:text-xs [&_td]:p-2 [&_td]:text-sm [&_td]:align-middle";

export function LeadsTable({ leads, variant = "page" }: LeadsTableProps) {
  const wrapperClass =
    variant === "embedded"
      ? "overflow-x-auto"
      : "overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0";

  return (
    <div className={wrapperClass}>
      <Table className={tableDense}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[11%] min-w-0">Name</TableHead>
            <TableHead className="w-[14%] min-w-0">Email</TableHead>
            <TableHead className="w-[9%] min-w-0">Phone</TableHead>
            <TableHead className="w-[12%] min-w-0">Location</TableHead>
            <TableHead className="w-[19%] min-w-0">Message</TableHead>
            <TableHead className="w-[10%] min-w-0">Status</TableHead>
            <TableHead className="w-[9%] min-w-0">Created</TableHead>
            <TableHead className="w-[11%] min-w-0 text-right whitespace-nowrap">
              Actions
            </TableHead>
            <TableHead className="w-[5%] min-w-0 p-2 text-right whitespace-nowrap">
              <span className="inline-flex items-center justify-end w-full text-primary">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Open communication</span>
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
              <TableCell className="font-medium max-w-0">
                <TruncatedCell
                  compact
                  alwaysTooltip
                  value={lead.name}
                  maxLength={40}
                />
              </TableCell>
              <TableCell className="max-w-0">
                <TruncatedCell
                  compact
                  alwaysTooltip
                  breakTokens
                  value={lead.email || undefined}
                  maxLength={36}
                />
              </TableCell>
              <TableCell className="max-w-0">
                <TruncatedCell
                  compact
                  alwaysTooltip
                  value={lead.phone}
                  maxLength={24}
                />
              </TableCell>
              <TableCell className="max-w-0">
                <TruncatedCell compact value={lead.location} alwaysTooltip />
              </TableCell>
              <TableCell className="max-w-0">
                <TruncatedCell compact value={lead.message_text} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-normal leading-tight",
                    LEAD_STATUS_BADGE_CLASSES[lead.status],
                  )}
                >
                  {lead.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {formatLeadCreatedRelative(lead.createdAt)}
              </TableCell>
              <TableCell className="text-right w-px whitespace-nowrap">
                <LeadPaymentPendingButton
                  lead={lead}
                  whenHidden="dash"
                  className="text-xs h-8 gap-1 whitespace-nowrap shrink-0"
                />
              </TableCell>
              <TableCell className="text-right w-px whitespace-nowrap">
                <LeadCommunicationLink lead={lead} compact />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
