import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LeadsPipelineResponsive,
  LeadsPipelineSkeletons,
} from "@/components/leads-mobile-stack";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { fetchLeadsFromSupabase, LEADS_QUERY_KEY } from "@/lib/leads-supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, TrendingUp, Users, Target, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Lead } from "@shared/schema";

const MOBILE_PAGE_SIZE = 6;

/** Qualified (payment button enabled) + legacy DB Payment Pending rows. */
function matchesPaymentPendingTab(lead: Lead): boolean {
  return lead.status === "Qualified" || lead.status === "Payment Pending";
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusTab, setStatusTab] = useState("all");
  const [mobilePage, setMobilePage] = useState(1);

  const { data: leads, isLoading, isError, error } = useQuery<Lead[]>({
    queryKey: LEADS_QUERY_KEY,
    queryFn: fetchLeadsFromSupabase,
    staleTime: 60_000,
  });

  const filteredLeads = useMemo(() => {
    return (
      leads?.filter((lead) => {
        const q = searchQuery.toLowerCase();
        const hay = [
          lead.name,
          lead.email,
          lead.phone,
          lead.location,
          lead.message_text,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = hay.includes(q);
        const matchesSource =
          sourceFilter === "all" || lead.source === sourceFilter;
        const matchesStatus =
          statusTab === "all" ||
          (statusTab === "Payment Pending"
            ? matchesPaymentPendingTab(lead)
            : lead.status === statusTab);
        return matchesSearch && matchesSource && matchesStatus;
      }) ?? []
    );
  }, [leads, searchQuery, sourceFilter, statusTab]);

  const mobileTotalPages = Math.max(
    1,
    Math.ceil(filteredLeads.length / MOBILE_PAGE_SIZE),
  );

  useEffect(() => {
    setMobilePage(1);
  }, [statusTab, searchQuery, sourceFilter]);

  useEffect(() => {
    setMobilePage((p) => Math.min(Math.max(1, p), mobileTotalPages));
  }, [mobileTotalPages]);

  const safeMobilePage = Math.min(Math.max(1, mobilePage), mobileTotalPages);

  const mobileLeads = useMemo(() => {
    const start = (safeMobilePage - 1) * MOBILE_PAGE_SIZE;
    return filteredLeads.slice(start, start + MOBILE_PAGE_SIZE);
  }, [filteredLeads, safeMobilePage]);

  const leadsByStatus = {
    all: leads?.length || 0,
    New: leads?.filter(l => l.status === "New").length || 0,
    Contacted: leads?.filter(l => l.status === "Contacted").length || 0,
    Qualified: leads?.filter(l => l.status === "Qualified").length || 0,
    "Payment Pending": leads?.filter(matchesPaymentPendingTab).length || 0,
    Converted: leads?.filter(l => l.status === "Converted").length || 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground">Manage and track all incoming leads from various sources</p>
        </div>
        <AddLeadDialog>
          <Button type="button" data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add New Lead
          </Button>
        </AddLeadDialog>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load leads</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Something went wrong"}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leads?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadsByStatus.New}</p>
                <p className="text-sm text-muted-foreground">New This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadsByStatus.Qualified}</p>
                <p className="text-sm text-muted-foreground">Qualified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadsByStatus.Converted}</p>
                <p className="text-sm text-muted-foreground">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, location, message…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-leads"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-source-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Booking.com">Booking.com</SelectItem>
                <SelectItem value="Airbnb">Airbnb</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="WOM">Word of Mouth</SelectItem>
                <SelectItem value="OTA">OTA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
        <div className="rounded-lg border bg-card">
          <div className="p-6 pb-3">
            <Tabs value={statusTab} onValueChange={setStatusTab}>
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:inline-flex md:w-auto md:flex-wrap md:justify-start">
                <TabsTrigger
                  value="all"
                  className="w-full min-h-[2.75rem] justify-center px-2 py-2 text-center whitespace-normal md:min-h-0 md:h-10 md:w-auto md:px-3 md:py-1.5 md:whitespace-nowrap"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight md:inline-flex md:flex-row md:items-center md:gap-0 md:leading-normal">
                    <span>All Leads</span>
                    <Badge variant="secondary" className="ml-0 md:ml-2 shrink-0">
                      {leadsByStatus.all}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="New"
                  className="w-full min-h-[2.75rem] justify-center px-2 py-2 text-center whitespace-normal md:min-h-0 md:h-10 md:w-auto md:px-3 md:py-1.5 md:whitespace-nowrap"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight md:inline-flex md:flex-row md:items-center md:gap-0 md:leading-normal">
                    <span>New</span>
                    <Badge variant="secondary" className="ml-0 md:ml-2 shrink-0">
                      {leadsByStatus.New}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="Contacted"
                  className="w-full min-h-[2.75rem] justify-center px-2 py-2 text-center whitespace-normal md:min-h-0 md:h-10 md:w-auto md:px-3 md:py-1.5 md:whitespace-nowrap"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight md:inline-flex md:flex-row md:items-center md:gap-0 md:leading-normal">
                    <span>Contacted</span>
                    <Badge variant="secondary" className="ml-0 md:ml-2 shrink-0">
                      {leadsByStatus.Contacted}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="Qualified"
                  className="w-full min-h-[2.75rem] justify-center px-2 py-2 text-center whitespace-normal md:min-h-0 md:h-10 md:w-auto md:px-3 md:py-1.5 md:whitespace-nowrap"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight md:inline-flex md:flex-row md:items-center md:gap-0 md:leading-normal">
                    <span>Qualified</span>
                    <Badge variant="secondary" className="ml-0 md:ml-2 shrink-0">
                      {leadsByStatus.Qualified}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="Payment Pending"
                  className="w-full min-h-[2.75rem] justify-center px-2 py-2 text-center whitespace-normal md:min-h-0 md:h-10 md:w-auto md:px-3 md:py-1.5 md:whitespace-nowrap"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight md:inline-flex md:flex-row md:items-center md:gap-0 md:leading-normal">
                    <span className="px-0.5">Payment Pending</span>
                    <Badge variant="secondary" className="ml-0 md:ml-2 shrink-0">
                      {leadsByStatus["Payment Pending"]}
                    </Badge>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="Converted"
                  className="w-full min-h-[2.75rem] justify-center px-2 py-2 text-center whitespace-normal md:min-h-0 md:h-10 md:w-auto md:px-3 md:py-1.5 md:whitespace-nowrap"
                >
                  <span className="flex flex-col items-center gap-0.5 leading-tight md:inline-flex md:flex-row md:items-center md:gap-0 md:leading-normal">
                    <span>Converted</span>
                    <Badge variant="secondary" className="ml-0 md:ml-2 shrink-0">
                      {leadsByStatus.Converted}
                    </Badge>
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="px-4 py-4 pt-0 sm:px-6">
            {isLoading ? (
              <LeadsPipelineSkeletons tableRows={8} mobileRows={6} />
            ) : isError ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Fix the error above to see your pipeline.
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mt-4">No leads found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <LeadsPipelineResponsive
                  leads={filteredLeads}
                  mobileLeads={mobileLeads}
                  variant="page"
                />
                {filteredLeads.length > MOBILE_PAGE_SIZE && (
                  <div className="md:hidden flex flex-col items-center gap-3 pt-4 mt-4 border-t border-border/60">
                    <p className="text-xs text-muted-foreground">
                      Showing{" "}
                      {(safeMobilePage - 1) * MOBILE_PAGE_SIZE + 1}–
                      {Math.min(
                        safeMobilePage * MOBILE_PAGE_SIZE,
                        filteredLeads.length,
                      )}{" "}
                      of {filteredLeads.length}
                    </p>
                    <div className="flex items-center justify-center gap-2 w-full max-w-sm">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={safeMobilePage <= 1}
                        onClick={() =>
                          setMobilePage((p) => Math.max(1, p - 1))
                        }
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground tabular-nums shrink-0 px-1">
                        Page {safeMobilePage} of {mobileTotalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={safeMobilePage >= mobileTotalPages}
                        onClick={() =>
                          setMobilePage((p) =>
                            Math.min(mobileTotalPages, p + 1),
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
    </div>
  );
}