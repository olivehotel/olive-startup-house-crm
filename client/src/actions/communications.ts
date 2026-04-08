import { apiFetch } from "@/lib/api";
import type { Communication, CommunicationMessagesResponse, Pagination } from "@shared/schema";

export const getCommunications = (page = 1) =>
  apiFetch<{ communications: Communication[]; pagination: Pagination }>(
    "get-communications",
    { params: { page } },
  );

export const getCommunicationMessages = (communicationId: string) =>
  apiFetch<CommunicationMessagesResponse>("get-communication-messages", {
    method: "POST",
    body: { communication_id: communicationId },
  });

export const sendEmailMessage = (payload: {
  communication_id: string;
  body: string;
  subject: string;
  document_ids?: string[];
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
