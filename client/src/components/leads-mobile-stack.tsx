import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedCell } from "@/components/truncated-cell";
import { LeadPaymentPendingButton } from "@/components/lead-payment-pending-button";
import { LeadCommunicationLink } from "@/components/lead-communication-link";
import { LeadsTable, formatLeadCreatedRelative } from "@/components/leads-table";
import { getLeadStatusBadgeClass } from "@/lib/lead-status-badge-classes";
import { cn } from "@/lib/utils";
import type { Lead } from "@shared/schema";

function LabeledRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5 flex flex-col items-center text-center w-full min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm min-w-0 w-full max-w-full flex justify-center overflow-hidden">
        {children}
      </div>
    </div>
  );
}

type LeadsMobileStackProps = {
  leads: Lead[];
};

export function LeadsMobileStack({ leads }: LeadsMobileStackProps) {
  return (
    <div className="space-y-3 min-w-0 max-w-full">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="rounded-lg border bg-muted/50 dark:bg-muted/35 p-3 space-y-2.5 text-center min-w-0 max-w-full overflow-x-hidden"
          data-testid={`lead-mobile-card-${lead.id}`}
        >
          <div className="min-w-0 w-full flex justify-center">
            <TruncatedCell
              className="font-medium"
              compact
              alwaysTooltip
              align="center"
              value={lead.name}
              maxLength={40}
            />
          </div>

          <div className="space-y-2 pt-0.5">
            <LabeledRow label="Email">
              <TruncatedCell
                compact
                alwaysTooltip
                align="center"
                breakTokens
                value={lead.email || undefined}
                maxLength={36}
              />
            </LabeledRow>
            <LabeledRow label="Phone">
              <TruncatedCell
                compact
                alwaysTooltip
                align="center"
                value={lead.phone}
                maxLength={24}
              />
            </LabeledRow>
            <LabeledRow label="Location">
              <TruncatedCell
                compact
                value={lead.location}
                alwaysTooltip
                align="center"
                breakTokens
              />
            </LabeledRow>
            <LabeledRow label="Message">
              <TruncatedCell
                compact
                align="center"
                alignContent="start"
                alwaysTooltip
                lineClamp={4}
                maxLength={120}
                value={lead.message_text}
              />
            </LabeledRow>
          </div>

          <div className="flex flex-col items-center gap-2 pt-1 border-t border-border/60">
            <span className="text-xs text-muted-foreground">
              {formatLeadCreatedRelative(lead.createdAt)}
            </span>
            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
              <LeadPaymentPendingButton
                lead={lead}
                whenHidden="dash"
                className="text-xs h-9 gap-1 whitespace-nowrap shrink-0 w-full"
              />
              <LeadCommunicationLink
                lead={lead}
                className="text-xs h-9 w-full justify-center"
              />
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-normal leading-tight",
                getLeadStatusBadgeClass(lead.status),
              )}
            >
              {lead.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

type LeadsPipelineResponsiveProps = {
  leads: Lead[];
  variant?: "page" | "embedded";
};

export function LeadsPipelineResponsive({
  leads,
  variant = "page",
}: LeadsPipelineResponsiveProps) {
  return (
    <>
      <div className="hidden md:block">
        <LeadsTable leads={leads} variant={variant} />
      </div>
      <div className="md:hidden">
        <LeadsMobileStack leads={leads} />
      </div>
    </>
  );
}

type LeadsPipelineSkeletonsProps = {
  tableRows?: number;
  mobileRows?: number;
};

export function LeadsPipelineSkeletons({
  tableRows = 8,
  mobileRows = 6,
}: LeadsPipelineSkeletonsProps) {
  return (
    <>
      <div className="hidden md:block space-y-2">
        {Array.from({ length: tableRows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: mobileRows }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
