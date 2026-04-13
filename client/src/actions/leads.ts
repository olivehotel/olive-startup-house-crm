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
