import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createLead, createLeadBodySchema } from "@/actions/leads";
import { LEADS_QUERY_KEY } from "@/lib/leads-supabase";
import { Loader2 } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";

const emptyLeadForm = { name: "", email: "", phone: "", location: "" };

type AddLeadDialogProps = {
  children: ReactNode;
};

export function AddLeadDialog({ children }: AddLeadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const emailId = `${baseId}-email`;
  const phoneId = `${baseId}-phone`;
  const locationId = `${baseId}-location`;

  const [open, setOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(emptyLeadForm);

  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      setLeadForm(emptyLeadForm);
      setOpen(false);
      toast({
        title: "Lead created",
        description: "The new lead has been added to your pipeline.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not create lead",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setLeadForm(emptyLeadForm);
  }

  function handleSubmitLead(e: FormEvent) {
    e.preventDefault();
    const body = {
      name: leadForm.name.trim(),
      email: leadForm.email.trim(),
      phone: leadForm.phone.trim(),
      location: leadForm.location.trim(),
    };
    const parsed = createLeadBodySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Check the form fields.";
      toast({ title: "Invalid input", description: first, variant: "destructive" });
      return;
    }
    createLeadMutation.mutate(parsed.data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmitLead} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              value={leadForm.name}
              onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
              disabled={createLeadMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              value={leadForm.email}
              onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              disabled={createLeadMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={phoneId}>Phone</Label>
            <Input
              id={phoneId}
              type="tel"
              value={leadForm.phone}
              onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
              autoComplete="tel"
              disabled={createLeadMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={locationId}>Location</Label>
            <Input
              id={locationId}
              value={leadForm.location}
              onChange={(e) => setLeadForm((f) => ({ ...f, location: e.target.value }))}
              autoComplete="address-level2"
              disabled={createLeadMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createLeadMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLeadMutation.isPending}>
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create lead"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
