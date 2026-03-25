import { apiFetch } from "@/lib/api";
import type { Communication, CommunicationMessagesResponse } from "@shared/schema";

export const getCommunications = () =>
  apiFetch<{ communications: Communication[] }>("get-communications").then(
    (res) => res.communications,
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
