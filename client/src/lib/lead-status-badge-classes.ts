import type { LeadStatus } from "@shared/schema";

export const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Registered:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Contacted:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Qualified:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Payment Pending":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Converted: "bg-primary/10 text-primary",
  Lost: "bg-muted text-muted-foreground",
};

const FALLBACK_BADGE_CLASS = "bg-muted text-muted-foreground";

export function getLeadStatusBadgeClass(status: string): string {
  return LEAD_STATUS_BADGE_CLASSES[status as LeadStatus] ?? FALLBACK_BADGE_CLASS;
}
