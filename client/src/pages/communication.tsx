import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommunicationCard } from "@/components/communication-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MessageSquare,
  Calendar,
  Receipt,
  RefreshCw,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { communicationChannels, communicationStatuses } from "@shared/schema";
import type { Communication, CommunicationStats } from "@shared/schema";
import {
  COMMUNICATION_TOTALS_QUERY_KEY,
  fetchCommunicationTotals,
  getCommunications,
} from "@/actions/communications";
import {
  getCommunicationChannelId,
  getCommunicationStatusId,
} from "@/lib/communication-labels";

export default function CommunicationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [, navigate] = useLocation();

  const { data: communicationsData, isLoading } = useQuery({
    queryKey: ["communications", page],
    queryFn: () => getCommunications(page),
  });

  const communications = communicationsData?.communications;
  const pagination = communicationsData?.pagination;

  const { data: stats } = useQuery<CommunicationStats>({
    queryKey: COMMUNICATION_TOTALS_QUERY_KEY,
    queryFn: fetchCommunicationTotals,
  });

  const filteredComms = communications?.filter((comm) => {
    const matchesSearch = (comm.contact_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const chId = getCommunicationChannelId(comm);
    const stId = getCommunicationStatusId(comm);
    const matchesType = typeFilter === "all" || chId === typeFilter;
    const matchesStatus = statusFilter === "all" || stId === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });
  const toursCount =
    stats?.calendarEventsCreated ??
    (stats?.videoTours || 0) + (stats?.inPersonTours || 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Communication Center</h1>
          <p className="text-muted-foreground">Manage all prospect communications across multiple channels</p>
        </div>
      </div>

      {/* Communication Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <RefreshCw className="h-6 w-6 mx-auto text-blue-600 dark:text-blue-400" />
            <p className="text-2xl font-bold mt-2">{stats?.inProgress || 0}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <CheckCheck className="h-6 w-6 mx-auto text-emerald-600 dark:text-emerald-400" />
            <p className="text-2xl font-bold mt-2">{stats?.processed || 0}</p>
            <p className="text-sm text-muted-foreground">Processed</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-amber-600 dark:text-amber-400" />
            <p className="text-2xl font-bold mt-2">{toursCount}</p>
            <p className="text-sm text-muted-foreground">Tours/Phone call</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <Receipt className="h-6 w-6 mx-auto text-red-600 dark:text-red-400" />
            <p className="text-2xl font-bold mt-2">{stats?.invoicesSend || 0}</p>
            <p className="text-sm text-muted-foreground">Invoices send</p>
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
                placeholder="Search by name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-communications"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-type-filter">
                <SelectValue placeholder="Channel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {(Object.entries(communicationChannels) as [string, string][]).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.entries(communicationStatuses) as [string, string][]).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Communications List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Communications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-md" />
              ))
            ) : filteredComms?.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mt-4">No communications found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              filteredComms?.map((comm) => (
                <CommunicationCard
                  key={comm.id}
                  communication={comm}
                  onClick={() => navigate(`/communication/${comm.id}`)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.has_next_page}
          >
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Live Updates Banner */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Live updates enabled
      </div>
    </div>
  );
}
