import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Communication } from "@shared/schema";
import {
  getCommunicationChannelLabel,
  getCommunicationStatusLabel,
  getCommunicationStatusStyleKey,
} from "@/lib/communication-labels";
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Mail,
  CheckCircle,
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
    "In Progress": {
      icon: <RefreshCw className="h-3 w-3" />,
      color:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    Processed: {
      icon: <CheckCircle className="h-3 w-3" />,
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
  };

export function CommunicationCard({
  communication,
  onClick,
}: CommunicationCardProps) {
  const initials = (communication.contact_name ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const channelLabel = getCommunicationChannelLabel(communication);
  const statusLabel = getCommunicationStatusLabel(communication);
  const statusStyleKey = getCommunicationStatusStyleKey(communication);
  const statusStyle = statusStyleKey
    ? statusConfig[statusStyleKey]
    : {
        icon: <RefreshCw className="h-3 w-3" />,
        color: "bg-muted text-muted-foreground",
      };


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
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm leading-tight">{communication.contact_name}</h4>
              {statusLabel ? (
                <Badge
                  variant="secondary"
                  className={cn("mt-2 text-xs", statusStyle.color)}
                >
                  {statusStyle.icon}
                  <span className="ml-1">{statusLabel}</span>
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-1 min-w-0 max-w-[45%]">
              {channelLabel ? (
              <Badge
                variant="outline"
                className="text-xs flex items-center gap-1 px-2 py-0.5 border-border bg-muted/40 text-foreground font-normal"
              >
                {typeIcons[channelLabel]}
                {channelLabel}
              </Badge>
              ) : null}
              {communication.main_mail && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 min-w-0 w-full">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{communication.main_mail}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
