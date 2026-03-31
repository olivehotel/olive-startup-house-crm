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
}) =>
  apiFetch<{ success: boolean }>("send-email-message", {
    method: "POST",
    body: payload,
  });
