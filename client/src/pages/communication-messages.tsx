import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { getCommunicationMessages, sendEmailMessage } from "@/actions/communications";
import { communicationChannels, communicationStatuses } from "@shared/schema";
import type { CommunicationMessage } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanMessageText(raw: string): string {
  let text = raw
    // Strip <style> blocks and all HTML tags
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    // Decode HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Fix common mojibake (UTF-8 read as Latin-1)
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, "\u201C")
    .replace(/â€/g, "\u201D")
    .replace(/â€"/g, "\u2014")
    .replace(/â€¢/g, "•")
    .replace(/Â©/g, "©")
    .replace(/Â®/g, "®")
    .replace(/Â°/g, "°")
    .replace(/ï»¿/g, "")
    // Strip leaked CSS rule blocks (.class-name { ... })
    .replace(/\.[a-z][\w-]*\s*\{[^}]*\}/gi, "")
    // Remove Meetup-style labeled tracking links: ( http://... )
    .replace(/\(\s*https?:\/\/\S+\s*\)/g, "");

  const lines = text.split(/\r?\n/);

  const cleaned = lines.filter((line) => {
    const t = line.trim();
    // Drop bare long tracking/obfuscated URLs
    if (/^https?:\/\/\S{50,}$/.test(t)) return false;
    // Drop email footer boilerplate lines
    if (
      /unsubscribe|privacy policy|you received this (message|email)|manage your settings|report this message|block message sender|copyright.*\d{4}|all rights reserved|please don.t reply|do not reply|visit your account/i.test(
        t,
      )
    )
      return false;
    return true;
  });

  // Trim quoted reply sections (everything from "On ... wrote:" onwards)
  // Also catches non-English (e.g. Russian) attribution lines via year+HH:MM+trailing colon
  const quoteStart = cleaned.findIndex((line) => {
    const t = line.trim();
    return (
      /^(On .+wrote:|>|\s*_{3,}|\s*-{3,})/.test(t) ||
      /\d{4}.{0,80}\d{1,2}:\d{2}.{0,80}:$/.test(t)
    );
  });
  const trimmedLines = quoteStart > 0 ? cleaned.slice(0, quoteStart) : cleaned;

  return trimmedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getInitials(name: string) {
  return name
    .split(/[\s<>@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function MessageBubble({ message }: { message: CommunicationMessage }) {
  const isOutgoing = message.direction === "outgoing";

  const senderDisplay = isOutgoing
    ? message.from
    : message.from.replace(/<.*>/, "").trim() || message.from;

  return (
    <div
      className={cn(
        "flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[80%]",
        isOutgoing ? "ml-auto flex-row-reverse" : "mr-auto flex-row",
      )}
    >
      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 mt-1">
        <AvatarFallback
          className={cn(
            "text-xs",
            isOutgoing
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {getInitials(message.from)}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex flex-col gap-1",
          isOutgoing ? "items-end" : "items-start",
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{senderDisplay}</span>
          {message.subject && (
            <span className="text-xs font-medium text-foreground">
              {message.subject}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(message.received_at)}
          </span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isOutgoing
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm",
          )}
        >
          {message.body_text
            ? cleanMessageText(message.body_text) || "(no content)"
            : "(no content)"}
        </div>
      </div>
    </div>
  );
}

export default function CommunicationMessagesPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const communicationId = params.id;

  const bottomRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["communication-messages", communicationId],
    queryFn: () => getCommunicationMessages(communicationId),
    enabled: Boolean(communicationId),
  });

  const comm = data?.communication;
  const messages = data?.messages ?? [];

  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
  );

  // Pre-fill subject from the last message in the thread
  useEffect(() => {
    if (sortedMessages.length > 0 && !subject) {
      const lastSubject = sortedMessages[sortedMessages.length - 1].subject;
      if (lastSubject) {
        setSubject(
          lastSubject.startsWith("Re:") ? lastSubject : `Re: ${lastSubject}`,
        );
      }
    }
  // Only run when messages first load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length]);

  const channelLabel = comm
    ? communicationChannels[comm.channel_id]
    : undefined;
  const statusLabel = comm
    ? communicationStatuses[comm.status_id]
    : undefined;

  const mutation = useMutation({
    mutationFn: sendEmailMessage,
    onSuccess: () => {
      setBody("");
      setSendError(null);
      queryClient.invalidateQueries({
        queryKey: ["communication-messages", communicationId],
      });
    },
    onError: (err: Error) => {
      setSendError(err.message ?? "Failed to send message.");
    },
  });

  function handleSend() {
    const trimmedBody = body.trim();
    const trimmedSubject = subject.trim();
    if (!trimmedBody || !trimmedSubject || !communicationId) return;
    setSendError(null);
    mutation.mutate({
      communication_id: communicationId,
      body: trimmedBody,
      subject: trimmedSubject,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  console.log(comm,'comm in messages page')

  return (
    <div className="flex flex-col h-[calc(100dvh-53px)] w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 sm:px-6 sm:py-4 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/communication")}
          aria-label="Back to communications"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {isLoading ? (
          <div className="flex flex-col gap-1 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        ) : comm ? (
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold truncate">
                {comm.contact_name}
              </h1>
              {channelLabel && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Mail className="h-3 w-3 mr-1" />
                  {channelLabel}
                </Badge>
              )}
              {statusLabel && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {statusLabel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{comm.contact_email}</p>
          </div>
        ) : null}

        {data && (
          <span className="text-xs text-muted-foreground shrink-0">
            {data.count} message{data.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 flex flex-col gap-4">
        {isLoading ? (
          <>
            <div className="flex gap-3 max-w-[70%] mr-auto">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            </div>
            <div className="flex gap-3 max-w-[70%] ml-auto flex-row-reverse">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-1 flex-1 items-end">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            </div>
            <div className="flex gap-3 max-w-[70%] mr-auto">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            </div>
          </>
        ) : isError ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Failed to load messages.</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto opacity-40 mb-3" />
            <p>No messages yet</p>
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose bar */}
      <div className="border-t bg-background px-3 py-3 sm:px-6 sm:py-4 shrink-0 flex flex-col gap-2">
        <Input
          placeholder="Subject"
          value={`From: ${comm?.main_mail || ''}`}
          onChange={(e) => null}
          className="text-sm"
        />
        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={mutation.isPending}
          className="text-sm"
        />
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Write a message… (Ctrl+Enter to send)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={mutation.isPending}
            rows={3}
            className="resize-none text-sm flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={
              mutation.isPending || !body.trim() || !subject.trim()
            }
            size="icon"
            className="shrink-0 h-10 w-10"
            aria-label="Send message"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {sendError && (
          <p className="text-xs text-destructive">{sendError}</p>
        )}
      </div>
    </div>
  );
}
