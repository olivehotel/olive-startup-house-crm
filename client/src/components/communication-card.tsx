import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Communication } from "@shared/schema";
import { communicationChannels, communicationStatuses } from "@shared/schema";
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Mail,
  FileText,
  Link,
  CheckCircle,
  Sparkles,
  Clock,
  RefreshCw,
} from "lucide-react";

interface CommunicationCardProps {
  communication: Communication;
  onClick?: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  "Text/SMS": <MessageSquare className="h-4 w-4" />,
  "Phone/Call": <Phone className="h-4 w-4" />,
  "Video Tour": <Video className="h-4 w-4" />,
  "In Person": <Users className="h-4 w-4" />,
  Email: <Mail className="h-4 w-4" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> =
  {
    "Docs Requested": {
      icon: <FileText className="h-3 w-3" />,
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    "In Progress": {
      icon: <RefreshCw className="h-3 w-3" />,
      color:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    "Link Sent": {
      icon: <Link className="h-3 w-3" />,
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
    "Form Filled": {
      icon: <CheckCircle className="h-3 w-3" />,
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    Pending: {
      icon: <Clock className="h-3 w-3" />,
      color: "bg-muted text-muted-foreground",
    },
    Completed: {
      icon: <Sparkles className="h-3 w-3" />,
      color: "bg-primary/10 text-primary",
    },
  };

export function CommunicationCard({
  communication,
  onClick,
}: CommunicationCardProps) {
  const initials = communication.contact_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const channelLabel = communicationChannels[communication.channel_id];
  const statusLabel = communicationStatuses[communication.status_id];
  const statusStyle = statusConfig[statusLabel] ?? statusConfig["Pending"];

  return (
    <div
      className="p-4 rounded-md border border-border hover-elevate cursor-pointer transition-colors"
      onClick={onClick}
      data-testid={`communication-card-${communication.id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{communication.contact_name}</h4>
            <Badge variant="secondary" className="text-xs">
              {typeIcons[channelLabel]}
              <span className="ml-1">{channelLabel}</span>
            </Badge>
          </div>

          <Badge
            variant="secondary"
            className={cn("mt-2 text-xs", statusStyle.color)}
          >
            {statusStyle.icon}
            <span className="ml-1">{statusLabel}</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}
