import { apiFetch } from "@/lib/api";
import type {
  Communication,
  CommunicationMessagesResponse,
  CommunicationStats,
  CommunicationTotalsResponse,
  Pagination,
} from "@shared/schema";

export const COMMUNICATION_TOTALS_QUERY_KEY = ["communication-totals"] as const;

export async function fetchCommunicationTotals(): Promise<CommunicationStats> {
  const raw = await apiFetch<CommunicationTotalsResponse>("communication-totals");
  const inProgress = raw.in_progress;
  const processed = raw.processed;
  const calendarEventsCreated = raw.calendar_events_created;
  const invoicesSend = raw.invoices_sent;
  const totalActivity =
    inProgress + processed + calendarEventsCreated + invoicesSend;
  return {
    textMessages: 0,
    videoTours: 0,
    inPersonTours: 0,
    emails: 0,
    totalActivity,
    inProgress,
    processed,
    invoicesSend,
    calendarEventsCreated,
  };
}

export const COMMUNICATION_MESSAGES_PAGE_SIZE = 20;

export const getCommunications = (page = 1) =>
  apiFetch<{ communications: Communication[]; pagination: Pagination }>(
    "get-communications",
    { params: { page } },
  );

export const getCommunicationMessages = (
  communicationId: string,
  params?: { page?: number; limit?: number },
) =>
  apiFetch<CommunicationMessagesResponse>("get-communication-messages", {
    method: "POST",
    body: {
      communication_id: communicationId,
      page: params?.page ?? 1,
      limit: params?.limit ?? COMMUNICATION_MESSAGES_PAGE_SIZE,
    },
  });

export const sendEmailMessage = (payload: {
  communication_id: string;
  body: string;
  subject: string;
  document_ids?: string[];
  is_invoice?: boolean;
}) =>
  apiFetch<{ success: boolean }>("send-email-message", {
    method: "POST",
    body: payload,
  });

export type CreateCalendarEventPayload = {
  communication_id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  location: string;
};

export const createCalendarEvent = (payload: CreateCalendarEventPayload) =>
  apiFetch<{ success?: boolean }>("create-calendar-event", {
    method: "POST",
    body: payload,
  });

export const createLeadFromCommunication = (communicationId: string) =>
  apiFetch<{ lead_id?: string }>("create-lead-from-communication", {
    method: "POST",
    body: { communication_id: communicationId },
  });

export type CreateGuestInvitePayload = {
  email: string;
  name: string;
  phone: string;
};

export const createGuestInvite = (payload: CreateGuestInvitePayload) =>
  apiFetch<Record<string, unknown>>("create-guest-invite", {
    method: "POST",
    body: payload,
  });
