import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { StatCard } from "@/components/stat-card";
import {
  LeadsPipelineResponsive,
  LeadsPipelineSkeletons,
} from "@/components/leads-mobile-stack";
import { CommunicationCard } from "@/components/communication-card";
import { ScreeningCard } from "@/components/screening-card";
import { OnboardingCard } from "@/components/onboarding-card";
import { PropertyCard } from "@/components/property-card";
import { EventCard } from "@/components/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Users,
  Search,
  ClipboardCheck,
  Building2,
  PartyPopper,
  Zap,
  ExternalLink,
  Plus,
  MessageSquare,
  Calendar,
  Receipt,
  RefreshCw,
  CheckCheck,
  TrendingUp,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { fetchLeadsFromSupabase, LEADS_QUERY_KEY } from "@/lib/leads-supabase";
import {
  COMMUNICATION_TOTALS_QUERY_KEY,
  fetchCommunicationTotals,
} from "@/actions/communications";
import type { 
  Lead, 
  Communication, 
  Screening, 
  Onboarding, 
  Property, 
  CommunityEvent,
  DashboardStats,
  CommunicationStats,
  CommunityStats,
  FinancialData,
  RevenueByProperty,
} from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: LEADS_QUERY_KEY,
    queryFn: fetchLeadsFromSupabase,
    staleTime: 60_000,
  });

  const { data: communications, isLoading: commsLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
  });

  const { data: commStats } = useQuery<CommunicationStats>({
    queryKey: COMMUNICATION_TOTALS_QUERY_KEY,
    queryFn: fetchCommunicationTotals,
  });

  const { data: screenings, isLoading: screeningsLoading } = useQuery<Screening[]>({
    queryKey: ["/api/screenings"],
  });

  const { data: onboardings, isLoading: onboardingsLoading } = useQuery<Onboarding[]>({
    queryKey: ["/api/onboardings"],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<CommunityEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: communityStats } = useQuery<CommunityStats>({
    queryKey: ["/api/community/stats"],
  });

  const { data: financials } = useQuery<FinancialData>({
    queryKey: ["/api/financials"],
  });

  const { data: revenueByProperty } = useQuery<RevenueByProperty[]>({
    queryKey: ["/api/financials/by-property"],
  });

  const totalBeds = properties?.reduce((sum, p) => sum + p.totalBeds, 0) || 0;
  const occupiedBeds = properties?.reduce((sum, p) => sum + p.occupiedBeds, 0) || 0;
  const totalRooms = properties?.reduce((sum, p) => sum + p.totalRooms, 0) || 0;
  const occupiedRooms = properties?.reduce((sum, p) => sum + p.occupiedRooms, 0) || 0;
  const communicationTours =
    commStats?.calendarEventsCreated ??
    (commStats?.videoTours || 0) + (commStats?.inPersonTours || 0);
  const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const roomOccupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-10 w-10 rounded-md mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Total Leads"
              value={stats?.totalLeads || 0}
              change={stats?.leadsChange || 0}
            />
            <StatCard
              icon={<Search className="h-5 w-5" />}
              title="Active Screenings"
              value={stats?.activeScreenings || 0}
              change={stats?.screeningsChange || 0}
            />
            <StatCard
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="Pending Onboarding"
              value={stats?.pendingOnboarding || 0}
              change={stats?.onboardingChange || 0}
            />
            <StatCard
              icon={<Building2 className="h-5 w-5" />}
              title="Current Occupancy"
              value={stats?.currentOccupancy || 0}
              suffix="%"
              change={stats?.occupancyChange || 0}
            />
            <StatCard
              icon={<PartyPopper className="h-5 w-5" />}
              title="Community Events"
              value={stats?.communityEvents || 0}
              change={stats?.eventsChange || 0}
            />
            <StatCard
              icon={<Zap className="h-5 w-5" />}
              title="Tool Usage (Today)"
              value={stats?.toolUsageToday || 0}
              change={stats?.toolUsageChange || 0}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Center */}
        <Card className="overflow-visible">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg">Communication Center</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all prospect communications across multiple channels
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link href="/communication" data-testid="link-communication-open">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Platform
                </Link>
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Communication Stats */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              <div className="text-center p-1 sm:p-2 rounded-md bg-muted/50">
                <RefreshCw className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-bold mt-1">{commStats?.inProgress || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center p-1 sm:p-2 rounded-md bg-muted/50">
                <CheckCheck className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-bold mt-1">{commStats?.processed || 0}</p>
                <p className="text-xs text-muted-foreground">Processed</p>
              </div>
              <div className="text-center p-1 sm:p-2 rounded-md bg-muted/50">
                <Calendar className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-bold mt-1">{communicationTours}</p>
                <p className="text-xs text-muted-foreground">Tours</p>
              </div>
              <div className="text-center p-1 sm:p-2 rounded-md bg-muted/50">
                <Receipt className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-lg font-bold mt-1">{commStats?.invoicesSend || 0}</p>
                <p className="text-xs text-muted-foreground">Invoices send</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">All Activity {commStats?.totalActivity || 0}</Badge>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <RefreshCw className="h-3 w-3 mr-1" />
                In Progress {commStats?.inProgress || 0}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCheck className="h-3 w-3 mr-1" />
                Processed {commStats?.processed || 0}
              </Badge>
            </div>

            {/* Recent Communications */}
            <div className="space-y-3">
              {commsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))
              ) : (
                communications?.slice(0, 4).map((comm) => (
                  <CommunicationCard key={comm.id} communication={comm} />
                ))
              )}
            </div>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/communication" data-testid="link-communication-all">
                View all {commStats?.totalActivity || 0} communications
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Lead Pipeline */}
        <Card className="overflow-visible">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-lg">Lead Pipeline</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all incoming leads
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link href="/leads" data-testid="link-leads-open">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Platform
                </Link>
              </Button>
              <AddLeadDialog>
                <Button size="sm" type="button" data-testid="button-dashboard-add-lead">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Lead
                </Button>
              </AddLeadDialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lead Tabs */}
            <Tabs defaultValue="all">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">All Leads {leads?.length || 0}</TabsTrigger>
                <TabsTrigger value="new">New {leads?.filter(l => l.status === "New").length || 0}</TabsTrigger>
                <TabsTrigger value="contacted">Contacted {leads?.filter(l => l.status === "Contacted").length || 0}</TabsTrigger>
                <TabsTrigger value="qualified">Qualified {leads?.filter(l => l.status === "Qualified").length || 0}</TabsTrigger>
                <TabsTrigger value="converted">Converted {leads?.filter(l => l.status === "Converted").length || 0}</TabsTrigger>
                <TabsTrigger value="registered">Registered {leads?.filter(l => l.status === "Registered").length || 0}</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                {leadsLoading ? (
                  <LeadsPipelineSkeletons tableRows={4} mobileRows={4} />
                ) : (leads?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No leads yet.</p>
                ) : (
                  <LeadsPipelineResponsive
                    leads={(leads ?? []).slice(0, 5)}
                    variant="embedded"
                  />
                )}
              </TabsContent>
              <TabsContent value="new" className="mt-4">
                {leadsLoading ? (
                  <LeadsPipelineSkeletons tableRows={4} mobileRows={4} />
                ) : (() => {
                    const rows = (leads ?? [])
                      .filter((l) => l.status === "New")
                      .slice(0, 5);
                    return rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No leads in this stage.
                      </p>
                    ) : (
                      <LeadsPipelineResponsive leads={rows} variant="embedded" />
                    );
                  })()}
              </TabsContent>
              <TabsContent value="contacted" className="mt-4">
                {leadsLoading ? (
                  <LeadsPipelineSkeletons tableRows={4} mobileRows={4} />
                ) : (() => {
                    const rows = (leads ?? [])
                      .filter((l) => l.status === "Contacted")
                      .slice(0, 5);
                    return rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No leads in this stage.
                      </p>
                    ) : (
                      <LeadsPipelineResponsive leads={rows} variant="embedded" />
                    );
                  })()}
              </TabsContent>
              <TabsContent value="qualified" className="mt-4">
                {leadsLoading ? (
                  <LeadsPipelineSkeletons tableRows={4} mobileRows={4} />
                ) : (() => {
                    const rows = (leads ?? [])
                      .filter((l) => l.status === "Qualified")
                      .slice(0, 5);
                    return rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No leads in this stage.
                      </p>
                    ) : (
                      <LeadsPipelineResponsive leads={rows} variant="embedded" />
                    );
                  })()}
              </TabsContent>
              <TabsContent value="converted" className="mt-4">
                {leadsLoading ? (
                  <LeadsPipelineSkeletons tableRows={4} mobileRows={4} />
                ) : (() => {
                    const rows = (leads ?? [])
                      .filter((l) => l.status === "Converted")
                      .slice(0, 5);
                    return rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No leads in this stage.
                      </p>
                    ) : (
                      <LeadsPipelineResponsive leads={rows} variant="embedded" />
                    );
                  })()}
              </TabsContent>
              <TabsContent value="registered" className="mt-4">
                {leadsLoading ? (
                  <LeadsPipelineSkeletons tableRows={4} mobileRows={4} />
                ) : (() => {
                    const rows = (leads ?? [])
                      .filter((l) => l.status === "Registered")
                      .slice(0, 5);
                    return rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No leads in this stage.
                      </p>
                    ) : (
                      <LeadsPipelineResponsive leads={rows} variant="embedded" />
                    );
                  })()}
              </TabsContent>
            </Tabs>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/leads" data-testid="link-leads-all">
                View all {leads?.length || 0} leads
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Background Checks */}
        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-lg">Background Checks</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Pipeline Summary</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/screening" data-testid="link-screening-open">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Platform
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <div className="text-center p-2 sm:p-3 rounded-md bg-blue-50 dark:bg-blue-900/20">
                <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">
                  {screenings?.filter(s => s.status === "In Progress").length || 0}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">In Progress</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-md bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {screenings?.filter(s => s.status === "Approved").length || 0}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Approved</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-md bg-amber-50 dark:bg-amber-900/20">
                <p className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-400">
                  {screenings?.filter(s => s.status === "Flagged").length || 0}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Flagged</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-md bg-red-50 dark:bg-red-900/20">
                <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400">
                  {screenings?.filter(s => s.status === "Rejected").length || 0}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Rejected</p>
              </div>
            </div>

            {/* Recent Checks */}
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Checks</h4>
              <div className="space-y-2">
                {screeningsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))
                ) : (
                  screenings?.slice(0, 4).map((screening) => (
                    <ScreeningCard key={screening.id} screening={screening} />
                  ))
                )}
              </div>
            </div>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/screening" data-testid="link-screening-all">
                View All Background Checks
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding & Billing */}
        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-lg">Onboarding & Billing</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Member orientation and invoices</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/onboarding" data-testid="link-onboarding-open">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Platform
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">Active Onboarding</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">
                  {onboardings?.filter(o => o.status !== "Complete").length || 0}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">Invoices Pending</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 text-primary">
                  ${onboardings?.filter(o => !o.invoicePaid).reduce((sum, o) => sum + o.monthlyRent, 0).toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
              <div className="space-y-2">
                {onboardingsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))
                ) : (
                  onboardings?.slice(0, 4).map((onboarding) => (
                    <OnboardingCard key={onboarding.id} onboarding={onboarding} />
                  ))
                )}
              </div>
            </div>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/onboarding" data-testid="link-onboarding-all">
                View All Onboarding
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Financial Reporting */}
      <Card className="overflow-visible">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-lg">Financial Reporting</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue analytics, P&L statements, and financial performance
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href="/financials" data-testid="link-financials-open">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Platform
              </Link>
            </Button>
            <Button size="sm">
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="p-3 sm:p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">${((financials?.totalRevenue || 0) / 1000).toFixed(1)}k</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {financials?.revenueChange || 0}% vs last month
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">${((financials?.netProfit || 0) / 1000).toFixed(1)}k</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {financials?.profitChange || 0}% vs last month
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">Profit Margin</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{financials?.profitMargin || 0}%</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                +{financials?.marginChange || 0}% vs last month
              </p>
            </div>
            <div className="p-3 sm:p-4 rounded-md bg-muted/50">
              <p className="text-sm text-muted-foreground">Avg Occupancy</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{financials?.avgOccupancy || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Across all properties</p>
            </div>
          </div>

          {/* Revenue by Property */}
          <div>
            <h4 className="text-sm font-medium mb-4">Revenue by Property</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {revenueByProperty?.map((prop) => (
                <div key={prop.propertyId} className="p-4 rounded-md border border-border">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">{prop.propertyName}</h5>
                    <Badge 
                      variant="secondary" 
                      className={prop.change >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {prop.change}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{prop.location}</p>
                  <p className="text-xl font-bold mt-2 text-primary">${(prop.revenue / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  <p className="text-xs mt-2">
                    Occupancy {prop.occupiedRooms}/{prop.totalRooms} rooms ({Math.round((prop.occupiedRooms / prop.totalRooms) * 100)}%)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Overview */}
        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-lg">Occupancy Overview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Current occupancy by house</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ecosmart" data-testid="link-ecosmart-open">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open EcoSmart
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
                <p className="text-xl sm:text-2xl font-bold">{properties?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Properties</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
                <p className="text-xl sm:text-2xl font-bold">{bedOccupancy}%</p>
                <p className="text-xs text-muted-foreground">Bed Occupancy ({occupiedBeds}/{totalBeds})</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-md bg-muted/50">
                <p className="text-xl sm:text-2xl font-bold">{roomOccupancy}%</p>
                <p className="text-xs text-muted-foreground">Room Occupancy ({occupiedRooms}/{totalRooms})</p>
              </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {propertiesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-md" />
                ))
              ) : (
                properties?.slice(0, 4).map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Community Hub */}
        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-lg">Community Hub</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Co-living & co-working engagement</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/community" data-testid="link-community-open">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Platform
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Community Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Active Members</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xl font-bold">{communityStats?.activeMembers || 0}</p>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {communityStats?.membersChange || 0}%
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xl font-bold">{communityStats?.whatsappEngagement || 0}%</p>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {communityStats?.engagementChange || 0}%
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Telegram Groups</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xl font-bold">{communityStats?.telegramGroups || 0}</p>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {communityStats?.groupsChange || 0}%
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Monthly Events</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xl font-bold">{communityStats?.monthlyEvents || 0}</p>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {communityStats?.eventsChange || 0}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Upcoming Events</h4>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Event
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eventsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-md" />
                  ))
                ) : (
                  events?.slice(0, 4).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>

            {/* Messaging Platforms */}
            <div className="p-4 rounded-md border border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Messaging Platforms</h4>
                  <p className="text-xs text-muted-foreground mt-1">WhatsApp & Telegram integrated</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                  Active
                </Badge>
              </div>
              <Button variant="outline" size="sm" className="mt-3">
                Manage Channels
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
