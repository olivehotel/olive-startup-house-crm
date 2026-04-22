import { z } from "zod";
import { apiFetch } from "@/lib/api";

function trimEmpty(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  const t = s.trim();
  return t === "" ? undefined : t;
}

export const createLeadBodySchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    message_text: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const email = trimEmpty(data.email);
    const phone = trimEmpty(data.phone);
    if (!email && !phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide email or phone",
        path: ["email"],
      });
    }
    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Valid email is required",
        path: ["email"],
      });
    }
  })
  .transform((data) => ({
    name: trimEmpty(data.name),
    email: trimEmpty(data.email),
    phone: trimEmpty(data.phone),
    location: trimEmpty(data.location),
    message_text: trimEmpty(data.message_text),
  }));

export type CreateLeadBody = z.infer<typeof createLeadBodySchema>;

export function createLead(body: CreateLeadBody) {
  return apiFetch<Record<string, unknown>>("create-lead", {
    method: "POST",
    body,
  });
}

export function qualifyLead(leadId: string) {
  return apiFetch<Record<string, unknown>>("qualify-lead", {
    method: "POST",
    body: { lead_id: leadId },
  });
}

const QUALIFY_409_HIGHER_STATUS =
  "This lead is already at a higher status than this step, so payment confirmation is not needed.";

function isHigherStatusConflictMessage(apiError: string): boolean {
  const t = apiError.toLowerCase();
  return (
    t.includes("higher status") ||
    t.includes("cannot set to qualified") ||
    t.includes("already at a")
  );
}

/** Maps apiFetch `Error` messages (e.g. `409: {"error":"…"}`) to user-facing copy. */
export function getQualifyLeadErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    if (typeof error === "string" && error) return error;
    return "Something went wrong. Please try again.";
  }

  const m = error.message;
  const match = /^(\d{3}):\s*([\s\S]+)$/.exec(m);
  if (!match) return m;

  const status = match[1];
  const rest = match[2].trim();

  if (status === "409") {
    try {
      const parsed = JSON.parse(rest) as { error?: string };
      const errText = typeof parsed.error === "string" ? parsed.error : "";
      if (isHigherStatusConflictMessage(errText)) {
        return QUALIFY_409_HIGHER_STATUS;
      }
      if (errText) {
        return errText;
      }
    } catch {
      // not JSON
    }
    return "This change is not allowed for the lead in its current state.";
  }

  return m;
}
