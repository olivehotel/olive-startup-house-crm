import {
  communicationChannels,
  communicationStatuses,
} from "@shared/schema";
import type { CommunicationStatusValue } from "@shared/schema";

function asRecord(comm: unknown): Record<string, unknown> | null {
  if (comm && typeof comm === "object" && !Array.isArray(comm)) {
    return comm as Record<string, unknown>;
  }
  return null;
}

function nestedId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return undefined;
  const id = (obj as { id?: unknown }).id;
  return typeof id === "string" && id.trim() !== "" ? id : undefined;
}

function nestedValue(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return undefined;
  const v = (obj as { value?: unknown }).value;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/** UUID for filters (flat `status_id` or nested `status.id`). */
export function getCommunicationStatusId(comm: unknown): string | undefined {
  const r = asRecord(comm);
  if (!r) return undefined;
  if (typeof r.status_id === "string" && r.status_id.trim() !== "") {
    return r.status_id;
  }
  return nestedId(r.status);
}

/** UUID for filters (flat `channel_id` or nested `channel.id`). */
export function getCommunicationChannelId(comm: unknown): string | undefined {
  const r = asRecord(comm);
  if (!r) return undefined;
  if (typeof r.channel_id === "string" && r.channel_id.trim() !== "") {
    return r.channel_id;
  }
  return nestedId(r.channel);
}

function normalizeStatusValue(raw: string): CommunicationStatusValue | null {
  const t = raw.trim();
  for (const k of ["In Progress", "Processed"] as const) {
    if (k.toLowerCase() === t.toLowerCase()) return k;
  }
  return null;
}

/**
 * Resolves pipeline status for UI. API shape `status: { id, value }` — **value first**,
 * then `status_label`, then UUID map, then `status` as a string. No default guess.
 */
export function getCommunicationStatusLabel(comm: unknown): string {
  const r = asRecord(comm);
  if (!r) return "";

  const st = r.status;
  if (st && typeof st === "object" && !Array.isArray(st)) {
    const v = nestedValue(st);
    if (v) {
      const n = normalizeStatusValue(v);
      if (n) return n;
      return v;
    }
  }

  if (typeof r.status_label === "string" && r.status_label.trim() !== "") {
    const t = r.status_label.trim();
    const n = normalizeStatusValue(t);
    if (n) return n;
    return t;
  }

  const byId = getCommunicationStatusId(comm);
  if (byId) {
    const m =
      communicationStatuses[byId as keyof typeof communicationStatuses];
    if (m) return m;
  }

  if (typeof st === "string" && st.trim() !== "") {
    const t = st.trim();
    const n = normalizeStatusValue(t);
    if (n) return n;
    return t;
  }

  return "";
}

/**
 * "In Progress" / "Processed" for known styling, or null for custom/empty.
 */
export function getCommunicationStatusStyleKey(
  comm: unknown,
): CommunicationStatusValue | null {
  const label = getCommunicationStatusLabel(comm);
  if (!label) return null;
  return label === "In Progress" || label === "Processed" ? label : null;
}

/**
 * Channel label for UI. API shape `channel: { id, value }` — **value first**,
 * then `channel_label`, then UUID map, then `channel` as a string.
 */
export function getCommunicationChannelLabel(comm: unknown): string | undefined {
  const r = asRecord(comm);
  if (!r) return undefined;

  const ch = r.channel;
  if (ch && typeof ch === "object" && !Array.isArray(ch)) {
    const v = nestedValue(ch);
    if (v) return v;
  }

  if (typeof r.channel_label === "string" && r.channel_label.trim() !== "") {
    return r.channel_label.trim();
  }

  const byId = getCommunicationChannelId(comm);
  if (byId) {
    const m = communicationChannels[byId as keyof typeof communicationChannels];
    if (m) return m;
  }

  if (typeof ch === "string" && ch.trim() !== "") return ch.trim();

  return undefined;
}
