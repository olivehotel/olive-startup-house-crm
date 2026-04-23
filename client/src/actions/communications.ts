import { apiFetch } from "@/lib/api";
import type { Communication, CommunicationMessagesResponse, Pagination } from "@shared/schema";

export const COMMUNICATION_MESSAGES_PAGE_SIZE = 20;

export const getCommunications = (page = 1) =>
  apiFetch<{ communications: Communication[]; pagination: Pagination }>(
    "get-communications",
    { params: { page } },
  );

/** Resolves a communication list row by `main_mail` (paginates until match or end). */
export async function findCommunicationIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const match = (comms: Communication[]) =>
    comms.find((c) => (c.main_mail ?? "").trim().toLowerCase() === normalized)?.id ?? null;

  const first = await getCommunications(1);
  const hitFirst = match(first.communications ?? []);
  if (hitFirst) return hitFirst;

  const totalPages = Math.max(1, first.pagination?.total_pages ?? 1);
  for (let p = 2; p <= totalPages; p++) {
    const { communications } = await getCommunications(p);
    const id = match(communications ?? []);
    if (id) return id;
  }
  return null;
}

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
