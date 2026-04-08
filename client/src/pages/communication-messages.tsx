import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  createCalendarEvent,
  getCommunicationMessages,
  sendEmailMessage,
} from "@/actions/communications";
import { getCommunityDocuments, getClientDocuments } from "@/actions/community";
import { communicationChannels, communicationStatuses } from "@shared/schema";
import type {
  CommunicationMessage,
  CommunicationMessageAttachment,
  CommunicationMessagesResponse,
  CommunityDocument,
  CommunityDocumentsPagination,
} from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { downloadCommunityDocumentFromStorage } from "@/lib/community-document-storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  Paperclip,
  Phone,
  Send,
  Loader2,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import DOMPurify from "dompurify";

const statusColors: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Docs Requested": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Link Sent": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Form Filled": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Completed": "bg-primary/10 text-primary",
};

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
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
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

function scopeSelectors(selectors: string, prefix: string): string {
  return selectors
    .split(",")
    .map((s) => {
      s = s.trim();
      if (!s) return "";
      const replaced = s.replace(/^(html|body|:root)(\b|$)/, prefix);
      return replaced !== s ? replaced : `${prefix} ${s}`;
    })
    .filter(Boolean)
    .join(", ");
}

function scopeCss(css: string, prefix: string): string {
  const scoped = css.replace(
    /(@(?:media|supports)[^{]+\{)([\s\S]*?)(\}[ \t]*\})/g,
    (_m, atRule, inner, closing) => {
      const scopedInner = inner.replace(/([^{};]+)\{/g, (_mi: string, sel: string) =>
        sel.trim().startsWith("@") ? _mi : `${scopeSelectors(sel.trim(), prefix)} {`
      );
      return atRule + scopedInner + closing;
    }
  );
  return scoped.replace(
    /([^{@\n][^{]*)\{/g,
    (_m, sel) => `${scopeSelectors(sel.trim(), prefix)} {`
  );
}

function HtmlEmailBody({ html, scopeId }: { html: string; scopeId: string }) {
  const scope = `em-${scopeId.replace(/[^a-z0-9]/gi, "")}`;

  const { bodyHtml, scopedCss } = useMemo(() => {
    const clean = DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      FORBID_TAGS: ["script", "noscript", "form", "object", "embed", "iframe"],
    });

    const doc = new DOMParser().parseFromString(clean, "text/html");

    let rawCss = "";
    doc.querySelectorAll("style").forEach((el) => {
      rawCss += el.textContent ?? "";
      el.remove();
    });

    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });

    doc.querySelectorAll("img, table, td, th, div").forEach((el) => {
      el.removeAttribute("width");
      el.removeAttribute("height");
      const style = el.getAttribute("style");
      if (style) {
        el.setAttribute(
          "style",
          style
            .replace(/\bwidth\s*:\s*[^;]+;?/gi, "")
            .replace(/\bmax-width\s*:\s*[^;]+;?/gi, "")
            .replace(/\bmin-width\s*:\s*[^;]+;?/gi, ""),
        );
      }
    });

    const responsiveOverrides = `
      .${scope} { width: 100%; }
      .${scope} * { box-sizing: border-box !important; max-width: 100% !important; }
      .${scope} img { height: auto !important; display: block; }
      .${scope} table { width: 100% !important; table-layout: fixed !important; }
      .${scope} td, .${scope} th { word-break: break-word !important; }
      .${scope} blockquote { border-left: none !important; padding-left: 0 !important; margin-left: 0 !important; }
      @media (max-width: 640px) {
        .${scope} img { max-width: 60% !important; }
      }
    `;

    return {
      bodyHtml: doc.body.innerHTML,
      scopedCss: (rawCss ? scopeCss(rawCss, `.${scope}`) : "") + responsiveOverrides,
    };
  }, [html, scope]);

  return (
    <div className={`${scope} text-sm leading-relaxed w-full overflow-hidden`}>
      {scopedCss && <style>{scopedCss}</style>}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  );
}

function DocumentPickerPagination({
  pagination,
  onPageChange,
}: {
  pagination: CommunityDocumentsPagination;
  onPageChange: (page: number) => void;
}) {
  if (pagination.total_pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-2 border-t border-border shrink-0">
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
        disabled={!pagination.has_prev}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.total_pages}
      </span>
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={!pagination.has_next}
      >
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function MessageAttachmentChip({ att }: { att: CommunicationMessageAttachment }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const label = att.filename ?? att.title ?? "Attachment";
  const canDownload = Boolean(att.bucket && att.file_path);

  async function handleDownload() {
    if (!canDownload || loading || !att.bucket || !att.file_path) return;
    setLoading(true);
    try {
      const result = await downloadCommunityDocumentFromStorage(
        supabase,
        att.bucket,
        att.file_path,
        label,
      );
      if (!result.ok) {
        toast({
          title: "Download failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-2 py-0.5 text-xs text-muted-foreground max-w-full">
      <FileText className="h-3 w-3 shrink-0" />
      {att.url ? (
        <a
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate max-w-[14rem] text-primary hover:underline"
        >
          {label}
        </a>
      ) : canDownload ? (
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={loading}
          className="truncate max-w-[14rem] text-left text-primary hover:underline disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              <span className="truncate">{label}</span>
            </span>
          ) : (
            label
          )}
        </button>
      ) : (
        <span className="truncate max-w-[14rem]">{label}</span>
      )}
    </span>
  );
}

function OutgoingAttachmentNames({
  attachments,
}: {
  attachments: CommunicationMessageAttachment[];
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground max-w-full">
      {attachments.map((att) => (
        <span key={att.id} className="truncate max-w-[18rem] text-right">
          {att.filename ?? att.title ?? "Attachment"}
        </span>
      ))}
    </div>
  );
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

        {message.attachments && message.attachments.length > 0 && (
          <>
            {isOutgoing ? (
              <OutgoingAttachmentNames attachments={message.attachments} />
            ) : (
              <div
                className={cn(
                  "flex flex-wrap gap-1.5 max-w-full",
                  "justify-start",
                )}
              >
                {message.attachments.map((att) => (
                  <MessageAttachmentChip key={att.id} att={att} />
                ))}
              </div>
            )}
          </>
        )}

        {message.body_html ? (
          <div
            className={cn(
              "rounded-2xl overflow-hidden w-full max-w-full",
              isOutgoing ? "rounded-tr-sm" : "rounded-tl-sm",
            )}
          >
            <HtmlEmailBody html={message.body_html} scopeId={message.id} />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export default function CommunicationMessagesPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const communicationId = params.id;

  const bottomRef = useRef<HTMLDivElement>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const [inPersonTourOpen, setInPersonTourOpen] = useState(false);
  const [tourTitle, setTourTitle] = useState("");
  const [tourDescription, setTourDescription] = useState("");
  const [tourLocation, setTourLocation] = useState("");
  const [tourStart, setTourStart] = useState("");
  const [tourEnd, setTourEnd] = useState("");
  const [tourFormError, setTourFormError] = useState<string | null>(null);

  const [phoneCallSetupOpen, setPhoneCallSetupOpen] = useState(false);
  const [callTitle, setCallTitle] = useState("");
  const [callDescription, setCallDescription] = useState("");
  const [callLocation, setCallLocation] = useState("");
  const [callStart, setCallStart] = useState("");
  const [callEnd, setCallEnd] = useState("");
  const [callFormError, setCallFormError] = useState<string | null>(null);
  const scheduleKindRef = useRef<"tour" | "phone">("tour");

  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentPickerTab, setDocumentPickerTab] = useState("common");
  const [pageCommon, setPageCommon] = useState(1);
  const [pageClient, setPageClient] = useState(1);
  const [documentsCommon, setDocumentsCommon] = useState<CommunityDocument[]>([]);
  const [documentsClient, setDocumentsClient] = useState<CommunityDocument[]>([]);
  const [paginationCommon, setPaginationCommon] =
    useState<CommunityDocumentsPagination | null>(null);
  const [paginationClient, setPaginationClient] =
    useState<CommunityDocumentsPagination | null>(null);
  const [loadingCommon, setLoadingCommon] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [documentTitlesById, setDocumentTitlesById] = useState<Record<string, string>>(
    {},
  );

  const documentSelectionRef = useRef<{
    ids: string[];
    titles: Record<string, string>;
  }>({ ids: [], titles: {} });
  useEffect(() => {
    documentSelectionRef.current = {
      ids: selectedDocumentIds,
      titles: documentTitlesById,
    };
  }, [selectedDocumentIds, documentTitlesById]);

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

  const loadCommonPage = useCallback(
    async (p: number) => {
      setLoadingCommon(true);
      try {
        const { documents: docs, pagination: pag } = await getCommunityDocuments(p);
        const filtered = (docs ?? []).filter((d) => d.doc_type !== "client");
        setDocumentsCommon(filtered);
        setPaginationCommon(pag);
      } catch (err) {
        setPaginationCommon(null);
        toast({
          title: "Could not load common documents",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingCommon(false);
      }
    },
    [toast],
  );

  const loadClientPage = useCallback(
    async (p: number) => {
      setLoadingClient(true);
      try {
        const { documents: docs, pagination: pag } = await getClientDocuments(p);
        setDocumentsClient(docs ?? []);
        setPaginationClient(pag);
      } catch (err) {
        setPaginationClient(null);
        toast({
          title: "Could not load client documents",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingClient(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!documentsOpen || documentPickerTab !== "common") return;
    void loadCommonPage(pageCommon);
  }, [documentsOpen, documentPickerTab, pageCommon, loadCommonPage]);

  useEffect(() => {
    if (!documentsOpen || documentPickerTab !== "client") return;
    void loadClientPage(pageClient);
  }, [documentsOpen, documentPickerTab, pageClient, loadClientPage]);

  function openDocumentsPicker() {
    setDocumentPickerTab("common");
    setPageCommon(1);
    setPageClient(1);
    setDocumentsOpen(true);
  }

  function toggleDocumentSelection(id: string, title: string, checked: boolean) {
    setSelectedDocumentIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id),
    );
    setDocumentTitlesById((prev) => {
      if (checked) return { ...prev, [id]: title };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function removeDocumentChip(id: string) {
    toggleDocumentSelection(id, documentTitlesById[id] ?? "", false);
  }

  type SendEmailMutationContext = {
    sentBody: string;
    sentSubject: string;
    attachmentSnapshot: CommunicationMessageAttachment[];
  };

  const mutation = useMutation({
    mutationFn: sendEmailMessage,
    onMutate: (variables): SendEmailMutationContext => {
      const { ids, titles } = documentSelectionRef.current;
      const attachmentSnapshot: CommunicationMessageAttachment[] = ids.map((id) => ({
        id,
        filename: titles[id] ?? "Document",
      }));
      return {
        sentBody: variables.body,
        sentSubject: variables.subject,
        attachmentSnapshot,
      };
    },
    onSuccess: async (_data, _variables, context) => {
      if (!communicationId) return;
      await queryClient.refetchQueries({
        queryKey: ["communication-messages", communicationId],
      });
      if (context?.attachmentSnapshot?.length) {
        queryClient.setQueryData<CommunicationMessagesResponse | undefined>(
          ["communication-messages", communicationId],
          (old) => {
            if (!old) return old;
            const messages = [...old.messages];
            for (let i = messages.length - 1; i >= 0; i--) {
              const m = messages[i];
              if (
                m.direction === "outgoing" &&
                m.body_text?.trim() === context.sentBody.trim() &&
                m.subject === context.sentSubject
              ) {
                if (!m.attachments?.length) {
                  messages[i] = { ...m, attachments: context.attachmentSnapshot };
                }
                break;
              }
            }
            return { ...old, messages };
          },
        );
      }
      setBody("");
      setSendError(null);
      setSelectedDocumentIds([]);
      setDocumentTitlesById({});
    },
    onError: (err: Error) => {
      setSendError(err.message ?? "Failed to send message.");
    },
  });

  const createCalendarMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      const kind = scheduleKindRef.current;
      setTourFormError(null);
      setInPersonTourOpen(false);
      setTourTitle("");
      setTourDescription("");
      setTourLocation("");
      setTourStart("");
      setTourEnd("");
      setCallFormError(null);
      setPhoneCallSetupOpen(false);
      setCallTitle("");
      setCallDescription("");
      setCallLocation("");
      setCallStart("");
      setCallEnd("");
      toast({
        title: "Meeting scheduled",
        description:
          kind === "phone"
            ? "Your phone call is on the thread."
            : "Your in-person tour is on the thread.",
      });
      queryClient.invalidateQueries({
        queryKey: ["communication-messages", communicationId],
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not create meeting",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function handleSubmitInPersonTour(e: React.FormEvent) {
    e.preventDefault();
    if (!communicationId) return;
    const title = tourTitle.trim();
    if (!title) {
      setTourFormError("Title is required.");
      return;
    }
    if (!tourStart || !tourEnd) {
      setTourFormError("Start and end are required.");
      return;
    }
    const start = new Date(tourStart);
    const end = new Date(tourEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setTourFormError("Invalid date or time.");
      return;
    }
    if (end <= start) {
      setTourFormError("End must be after start.");
      return;
    }
    setTourFormError(null);
    scheduleKindRef.current = "tour";
    createCalendarMutation.mutate({
      communication_id: communicationId,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      description: tourDescription.trim(),
      location: tourLocation.trim(),
    });
  }

  function handleSubmitPhoneCallSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!communicationId) return;
    const title = callTitle.trim();
    if (!title) {
      setCallFormError("Title is required.");
      return;
    }
    if (!callStart || !callEnd) {
      setCallFormError("Start and end are required.");
      return;
    }
    const start = new Date(callStart);
    const end = new Date(callEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setCallFormError("Invalid date or time.");
      return;
    }
    if (end <= start) {
      setCallFormError("End must be after start.");
      return;
    }
    setCallFormError(null);
    scheduleKindRef.current = "phone";
    createCalendarMutation.mutate({
      communication_id: communicationId,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      description: callDescription.trim(),
      location: callLocation.trim(),
    });
  }

  function handleSend() {
    const trimmedBody = body.trim();
    const trimmedSubject = subject.trim();
    if (!trimmedBody || !trimmedSubject || !communicationId) return;
    setSendError(null);
    const payload: {
      communication_id: string;
      body: string;
      subject: string;
      document_ids?: string[];
    } = {
      communication_id: communicationId,
      body: trimmedBody,
      subject: trimmedSubject,
    };
    if (selectedDocumentIds.length > 0) {
      payload.document_ids = selectedDocumentIds;
    }
    mutation.mutate(payload);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

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
                <Badge
                  variant="secondary"
                  className={cn("text-xs shrink-0", statusColors[statusLabel])}
                >
                  {statusLabel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{comm.contact_email}</p>
          </div>
        ) : null}

        {comm && (
          <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 px-2"
                  aria-label="Quick actions"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuItem
                  className="h-auto cursor-pointer flex-col items-stretch gap-0 py-2"
                  onSelect={() => {
                    toast({
                      title: "Video tour",
                      description: "Send video link from your workflow when available.",
                    });
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Video className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex min-w-0 flex-col items-start gap-0">
                      <span>Video tour</span>
                      <span className="text-xs text-muted-foreground">
                        Send a video tour
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-auto cursor-pointer flex-col items-stretch gap-0 py-2"
                  onSelect={() => setInPersonTourOpen(true)}
                >
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex min-w-0 flex-col items-start gap-0">
                      <span>In-person tour</span>
                      <span className="text-xs text-muted-foreground">
                        Schedule a tour
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-auto cursor-pointer flex-col items-stretch gap-0 py-2"
                  onSelect={() => openDocumentsPicker()}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex min-w-0 flex-col items-start gap-0">
                      <span>Documents</span>
                      <span className="text-xs text-muted-foreground">
                        Attach to email
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-auto cursor-pointer flex-col items-stretch gap-0 py-2"
                  onSelect={() => setPhoneCallSetupOpen(true)}
                >
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex min-w-0 flex-col items-start gap-0">
                      <span>Phone call setup</span>
                      <span className="text-xs text-muted-foreground">
                        Schedule a call
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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
        {selectedDocumentIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDocumentIds.map((id) => (
              <Badge
                key={id}
                variant="secondary"
                className="gap-0.5 pr-1 font-normal max-w-full"
              >
                <span className="truncate max-w-[12rem]">
                  {documentTitlesById[id] ?? id}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 rounded-sm"
                  onClick={() => removeDocumentChip(id)}
                  aria-label={`Remove ${documentTitlesById[id] ?? "document"}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 h-10 w-10"
            onClick={openDocumentsPicker}
            disabled={mutation.isPending}
            aria-label="Attach documents"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
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

      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach documents</DialogTitle>
            <DialogDescription>
              Select community or client documents to send with your message.
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={documentPickerTab}
            onValueChange={setDocumentPickerTab}
            className="flex flex-col flex-1 min-h-0 gap-3"
          >
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="common">Common</TabsTrigger>
              <TabsTrigger value="client">Client</TabsTrigger>
            </TabsList>
            <TabsContent
              value="common"
              className="mt-0 flex flex-col gap-2 flex-1 min-h-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-[min(240px,40vh)] rounded-md border">
                <div className="p-2">
                  {loadingCommon ? (
                    <div className="space-y-2 py-1">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : documentsCommon.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 px-2">
                      No common documents
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {documentsCommon.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/60"
                        >
                          <Checkbox
                            id={`pick-common-${doc.id}`}
                            checked={selectedDocumentIds.includes(doc.id)}
                            onCheckedChange={(c) =>
                              toggleDocumentSelection(doc.id, doc.title, c === true)
                            }
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`pick-common-${doc.id}`}
                            className="text-sm leading-snug cursor-pointer flex-1"
                          >
                            {doc.title}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ScrollArea>
              {paginationCommon ? (
                <DocumentPickerPagination
                  pagination={paginationCommon}
                  onPageChange={setPageCommon}
                />
              ) : null}
            </TabsContent>
            <TabsContent
              value="client"
              className="mt-0 flex flex-col gap-2 flex-1 min-h-0 data-[state=inactive]:hidden"
            >
              <ScrollArea className="h-[min(240px,40vh)] rounded-md border">
                <div className="p-2">
                  {loadingClient ? (
                    <div className="space-y-2 py-1">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : documentsClient.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 px-2">
                      No client documents
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {documentsClient.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-start gap-2 rounded-md p-2 hover:bg-muted/60"
                        >
                          <Checkbox
                            id={`pick-client-${doc.id}`}
                            checked={selectedDocumentIds.includes(doc.id)}
                            onCheckedChange={(c) =>
                              toggleDocumentSelection(doc.id, doc.title, c === true)
                            }
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`pick-client-${doc.id}`}
                            className="text-sm leading-snug cursor-pointer flex-1"
                          >
                            {doc.title}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ScrollArea>
              {paginationClient ? (
                <DocumentPickerPagination
                  pagination={paginationClient}
                  onPageChange={setPageClient}
                />
              ) : null}
            </TabsContent>
          </Tabs>
          <DialogFooter className="shrink-0 sm:justify-end">
            <Button type="button" onClick={() => setDocumentsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inPersonTourOpen} onOpenChange={setInPersonTourOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitInPersonTour}>
            <DialogHeader>
              <DialogTitle>In-person tour</DialogTitle>
              <DialogDescription>
                Create a meeting for this thread. It will appear in the chat
                after the event is created.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tour-title">Title</Label>
                <Input
                  id="tour-title"
                  value={tourTitle}
                  onChange={(e) => setTourTitle(e.target.value)}
                  placeholder="Tour or meeting title"
                  disabled={createCalendarMutation.isPending}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tour-start">Start</Label>
                  <Input
                    id="tour-start"
                    type="datetime-local"
                    value={tourStart}
                    onChange={(e) => setTourStart(e.target.value)}
                    disabled={createCalendarMutation.isPending}
                    className="datetime-local-input block h-auto min-h-10 py-2"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tour-end">End</Label>
                  <Input
                    id="tour-end"
                    type="datetime-local"
                    value={tourEnd}
                    onChange={(e) => setTourEnd(e.target.value)}
                    disabled={createCalendarMutation.isPending}
                    className="datetime-local-input block h-auto min-h-10 py-2"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tour-location">Location</Label>
                <Input
                  id="tour-location"
                  value={tourLocation}
                  onChange={(e) => setTourLocation(e.target.value)}
                  placeholder="Address or place"
                  disabled={createCalendarMutation.isPending}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tour-description">Description</Label>
                <Textarea
                  id="tour-description"
                  value={tourDescription}
                  onChange={(e) => setTourDescription(e.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  disabled={createCalendarMutation.isPending}
                  className="resize-none"
                />
              </div>
              {tourFormError && (
                <p className="text-sm text-destructive">{tourFormError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInPersonTourOpen(false)}
                disabled={createCalendarMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCalendarMutation.isPending}>
                {createCalendarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling…
                  </>
                ) : (
                  "Create meeting"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={phoneCallSetupOpen} onOpenChange={setPhoneCallSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitPhoneCallSetup}>
            <DialogHeader>
              <DialogTitle>Phone call setup</DialogTitle>
              <DialogDescription>
                Schedule when you will call. It will appear in the chat after
                the event is created.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="call-title">Title</Label>
                <Input
                  id="call-title"
                  value={callTitle}
                  onChange={(e) => setCallTitle(e.target.value)}
                  placeholder="Phone call"
                  disabled={createCalendarMutation.isPending}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="call-start">Start</Label>
                  <Input
                    id="call-start"
                    type="datetime-local"
                    value={callStart}
                    onChange={(e) => setCallStart(e.target.value)}
                    disabled={createCalendarMutation.isPending}
                    className="datetime-local-input block h-auto min-h-10 py-2"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="call-end">End</Label>
                  <Input
                    id="call-end"
                    type="datetime-local"
                    value={callEnd}
                    onChange={(e) => setCallEnd(e.target.value)}
                    disabled={createCalendarMutation.isPending}
                    className="datetime-local-input block h-auto min-h-10 py-2"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="call-location">Phone number or dial-in</Label>
                <Input
                  id="call-location"
                  value={callLocation}
                  onChange={(e) => setCallLocation(e.target.value)}
                  placeholder="Optional"
                  disabled={createCalendarMutation.isPending}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="call-description">Description</Label>
                <Textarea
                  id="call-description"
                  value={callDescription}
                  onChange={(e) => setCallDescription(e.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  disabled={createCalendarMutation.isPending}
                  className="resize-none"
                />
              </div>
              {callFormError && (
                <p className="text-sm text-destructive">{callFormError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhoneCallSetupOpen(false)}
                disabled={createCalendarMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCalendarMutation.isPending}>
                {createCalendarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling…
                  </>
                ) : (
                  "Create meeting"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
