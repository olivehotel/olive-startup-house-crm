import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, BedDouble, DoorOpen, DollarSign } from "lucide-react";
import type { Property } from "@shared/schema";

export default function PropertiesPage() {
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const totalBeds = properties?.reduce((sum, p) => sum + p.totalBeds, 0) || 0;
  const occupiedBeds = properties?.reduce((sum, p) => sum + p.occupiedBeds, 0) || 0;
  const totalRooms = properties?.reduce((sum, p) => sum + p.totalRooms, 0) || 0;
  const occupiedRooms = properties?.reduce((sum, p) => sum + p.occupiedRooms, 0) || 0;
  const totalRevenue = properties?.reduce((sum, p) => sum + p.monthlyRevenue, 0) || 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage all Olive Startup House properties</p>
        </div>
        <Button data-testid="button-add-property">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
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
    </div>
  );
}
