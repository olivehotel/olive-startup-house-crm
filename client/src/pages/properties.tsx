import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropertyCard } from "@/components/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import {
  COMMUNICATION_TOTALS_QUERY_KEY,
  deleteAllCommunicationsByEmail,
} from "@/actions/communications";
import { Plus, Building2, BedDouble, DoorOpen, DollarSign, Loader2, Trash2 } from "lucide-react";
import type { Property } from "@shared/schema";

export default function PropertiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canViewCommunityAdminProfiles } = useUserRole();
  const [deleteCommsOpen, setDeleteCommsOpen] = useState(false);
  const [deleteCommsEmail, setDeleteCommsEmail] = useState("");
  const [deletingComms, setDeletingComms] = useState(false);

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const totalBeds = properties?.reduce((sum, p) => sum + p.totalBeds, 0) || 0;
  const occupiedBeds = properties?.reduce((sum, p) => sum + p.occupiedBeds, 0) || 0;
  const totalRooms = properties?.reduce((sum, p) => sum + p.totalRooms, 0) || 0;
  const occupiedRooms = properties?.reduce((sum, p) => sum + p.occupiedRooms, 0) || 0;
  const totalRevenue = properties?.reduce((sum, p) => sum + p.monthlyRevenue, 0) || 0;

  const closeDeleteCommsDialog = () => {
    if (deletingComms) return;
    setDeleteCommsEmail("");
    setDeleteCommsOpen(false);
  };

  const submitDeleteComms = async () => {
    const parsed = z.string().email("Enter a valid email address").safeParse(deleteCommsEmail.trim());
    if (!parsed.success) {
      toast({
        title: "Invalid email",
        description: parsed.error.issues[0]?.message ?? "Invalid email",
        variant: "destructive",
      });
      return;
    }
    setDeletingComms(true);
    try {
      await deleteAllCommunicationsByEmail(parsed.data);
      toast({
        title: "Communications removed",
        description: `Removed Communication Center data for ${parsed.data}.`,
      });
      setDeleteCommsEmail("");
      setDeleteCommsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["communications"] });
      await queryClient.invalidateQueries({ queryKey: COMMUNICATION_TOTALS_QUERY_KEY });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeletingComms(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage all Olive Startup House properties</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button data-testid="button-add-property">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
          {canViewCommunityAdminProfiles && (
            <Button
              type="button"
              data-testid="button-delete-communications"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteCommsOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete communications
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{properties?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BedDouble className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{occupiedBeds}/{totalBeds}</p>
            <p className="text-sm text-muted-foreground">Beds Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DoorOpen className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{occupiedRooms}/{totalRooms}</p>
            <p className="text-sm text-muted-foreground">Rooms Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">{totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%</p>
            <p className="text-sm text-muted-foreground">Occupancy Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-2">${(totalRevenue / 1000).toFixed(1)}k</p>
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-md" />
          ))
        ) : properties?.length === 0 ? (
          <div className="col-span-4 text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mt-4">No properties found</p>
            <Button className="mt-4">Add Your First Property</Button>
          </div>
        ) : (
          properties?.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))
        )}
      </div>

      <Dialog
        open={deleteCommsOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteCommsDialog();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (deletingComms) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (deletingComms) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete communications by email</DialogTitle>
            <DialogDescription>
              This removes Communication Center data for the address you enter. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-comms-email">Email</Label>
            <Input
              id="delete-comms-email"
              type="email"
              autoComplete="email"
              placeholder="name@gmail.com"
              value={deleteCommsEmail}
              onChange={(e) => setDeleteCommsEmail(e.target.value)}
              disabled={deletingComms}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteCommsDialog} disabled={deletingComms}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void submitDeleteComms()}
              disabled={deletingComms}
            >
              {deletingComms ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
