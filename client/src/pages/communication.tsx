import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Plus,
  Search,
  Filter,
  MessageSquare,
  Phone,
  Video,
  Users,
  Mail,
  FileText,
  Link,
  CheckCircle,
  Calendar,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { communicationChannels, communicationStatuses } from "@shared/schema";
import type { Communication, CommunicationStats } from "@shared/schema";
import { getCommunications } from "@/actions/communications";

export default function CommunicationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, navigate] = useLocation();

  const { data: communications, isLoading } = useQuery<Communication[]>({
    queryKey: ["communications"],
    queryFn: getCommunications,
  });

  console.log(communications,'communications');
  const { data: stats } = useQuery<CommunicationStats>({
    queryKey: ["/api/communications/stats"],
  });

  const filteredComms = communications?.filter((comm) => {
    const matchesSearch = (comm.contact_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || comm.channel_id === typeFilter;
    const matchesStatus = statusFilter === "all" || comm.status_id === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Communication Center</h1>
          <p className="text-muted-foreground">Manage all prospect communications across multiple channels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Automation
          </Button>
          <Button data-testid="button-new-communication">
            <Plus className="h-4 w-4 mr-2" />
            New Communication
          </Button>
        </div>
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto text-blue-600 dark:text-blue-400" />
            <p className="text-2xl font-bold mt-2">{stats?.textMessages || 0}</p>
            <p className="text-sm text-muted-foreground">Text Messages</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <Phone className="h-6 w-6 mx-auto text-emerald-600 dark:text-emerald-400" />
            <p className="text-2xl font-bold mt-2">{stats?.phoneCalls || 0}</p>
            <p className="text-sm text-muted-foreground">Phone Calls</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <Video className="h-6 w-6 mx-auto text-purple-600 dark:text-purple-400" />
            <p className="text-2xl font-bold mt-2">{stats?.videoTours || 0}</p>
            <p className="text-sm text-muted-foreground">Video Tours</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-amber-600 dark:text-amber-400" />
            <p className="text-2xl font-bold mt-2">{stats?.inPersonTours || 0}</p>
            <p className="text-sm text-muted-foreground">In-Person Tours</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer">
          <CardContent className="p-4 text-center">
            <Mail className="h-6 w-6 mx-auto text-red-600 dark:text-red-400" />
            <p className="text-2xl font-bold mt-2">{stats?.emails || 0}</p>
            <p className="text-sm text-muted-foreground">Emails</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="py-1.5 px-3">
              All Activity <span className="ml-1 font-bold">{stats?.totalActivity || 0}</span>
            </Badge>
            <Badge variant="secondary" className="py-1.5 px-3 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Docs Pending <span className="ml-1 font-bold">{stats?.docsPending || 0}</span>
            </Badge>
            <Badge variant="secondary" className="py-1.5 px-3 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Link className="h-3.5 w-3.5 mr-1.5" />
              Links Sent <span className="ml-1 font-bold">{stats?.linksSent || 0}</span>
            </Badge>
            <Badge variant="secondary" className="py-1.5 px-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Forms Filled <span className="ml-1 font-bold">{stats?.formsFilled || 0}</span>
            </Badge>
            <Badge variant="secondary" className="py-1.5 px-3 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Tours Scheduled <span className="ml-1 font-bold">{stats?.toursScheduled || 0}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

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
