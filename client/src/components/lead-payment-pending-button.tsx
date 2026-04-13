import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LEADS_QUERY_KEY, updateLeadStatus } from "@/lib/leads-supabase";
import { getLeadStatusId, type Lead } from "@shared/schema";
import { Loader2 } from "lucide-react";

/** True when the payment control row is shown (not Converted/Lost). */
export function leadShowsPaymentPendingSlot(lead: Lead): boolean {
  return lead.status !== "Converted" && lead.status !== "Lost";
}

type LeadPaymentPendingButtonProps = {
  lead: Lead;
  /** When status hides the action: omit row (card) or show em dash (table). */
  whenHidden?: "hidden" | "dash";
  className?: string;
};

export function LeadPaymentPendingButton({
  lead,
  whenHidden = "hidden",
  className,
}: LeadPaymentPendingButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: ({ leadId, statusId }: { leadId: string; statusId: string }) =>
      updateLeadStatus(leadId, statusId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      toast({
        title: "Status updated",
        description: "Lead status has been updated.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update status",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const convertedId = getLeadStatusId("Converted");
  const hidePaymentPendingAction =
    lead.status === "Converted" || lead.status === "Lost";
  const canClickPaymentPending =
    (lead.status === "Qualified" || lead.status === "Payment Pending") &&
    Boolean(convertedId);

  if (hidePaymentPendingAction) {
    if (whenHidden === "dash") {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    return null;
  }

  return (
    <Button
      type="button"
      variant={
        canClickPaymentPending && !updateStatusMutation.isPending
          ? "default"
          : "outline"
      }
      size="sm"
      className={className ?? "text-xs h-8 gap-1"}
      disabled={!canClickPaymentPending || updateStatusMutation.isPending}
      onClick={() => {
        if (!convertedId) return;
        updateStatusMutation.mutate({
          leadId: lead.id,
          statusId: convertedId,
        });
      }}
    >
      {updateStatusMutation.isPending &&
      updateStatusMutation.variables?.statusId === convertedId ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : null}
      Payment pending
    </Button>
  );
}
