import { apiFetch } from "@/lib/api";
import { parseISO, isValid } from "date-fns";

export type CheckerboardLocation = "mp" | "pa";

export const CHECKERBOARD_QUERY_KEY = "checkerboard" as const;

/** Normalized booking segment for one bed row */
export type CheckerboardBooking = {
  id: string;
  guestName: string;
  start: Date;
  end: Date;
  /** Display: confirmed = green bar, pending = amber */
  variant: "confirmed" | "pending";
  /** e.g. "$910 USD" from Air `computedSumToPay` */
  tariffSummary?: string;
};

export type CheckerboardBed = {
  id: string;
  name: string;
  /** If API omits status, UI can still show a neutral dot */
  occupied?: boolean;
  bookings: CheckerboardBooking[];
};

export type CheckerboardRoomGroup = {
  id: string;
  title: string;
  beds: CheckerboardBed[];
};

export type CheckerboardModel = {
  rooms: CheckerboardRoomGroup[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const x = obj[k];
    if (typeof x === "string" && x.trim()) return x.trim();
  }
  return undefined;
}

function parseDateValue(v: unknown): Date | null {
  if (v instanceof Date && isValid(v)) return v;
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return isValid(d) ? d : null;
  }
  if (typeof v === "string" && v.trim()) {
    const d = parseISO(v);
    return isValid(d) ? d : null;
  }
  return null;
}

function bookingVariantFromStatus(raw: unknown): "confirmed" | "pending" {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  if (
    s.includes("pending") ||
    s.includes("hold") ||
    s.includes("request") ||
    s.includes("tentative")
  ) {
    return "pending";
  }
  return "confirmed";
}

function slugIdPart(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "g";
}

function getFirstCategoryTitle(room: Record<string, unknown> | null): string | undefined {
  if (!room) return undefined;
  const cats = room.categories;
  if (!Array.isArray(cats) || cats.length === 0) return undefined;
  const c0 = asRecord(cats[0]);
  return pickString(c0 ?? {}, ["title", "name", "label"]);
}

function extractTariffSummary(o: Record<string, unknown>): string | undefined {
  const arr = o.computedSumToPay;
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const first = asRecord(arr[0]);
  if (!first) return undefined;
  const value = first.value;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const cur = asRecord(first.currency);
  const sym = typeof cur?.symbol === "string" ? cur.symbol : undefined;
  if (sym) return `${sym}${value}`;
  const code = pickString(first, ["currencyTitle"]) ?? pickString(cur ?? {}, ["title"]);
  return code ? `${value} ${code}` : String(value);
}

/**
 * Air / get-checkerboard shape: root `{ bookings: [ { room, representative, fromDate, toDate, computedStatus, ... } ] }`.
 * Groups by `room.categories[0].title`, then by bed (`room.id` / `room.number`).
 */
function normalizeFromRootBookings(bookings: unknown[]): CheckerboardModel {
  type BedAcc = { bedId: string; bedName: string; segments: CheckerboardBooking[] };
  const byCategory = new Map<string, Map<string, BedAcc>>();

  bookings.forEach((raw, index) => {
    const o = asRecord(raw);
    if (!o) return;

    const room = asRecord(o.room);
    const categoryTitle = getFirstCategoryTitle(room) ?? "Other";

    const bedKey =
      (room && (typeof room.id === "number" || typeof room.id === "string")
        ? String(room.id)
        : undefined) ??
      pickString(room ?? {}, ["number"]) ??
      `bed-${index}`;

    const bedName =
      pickString(room ?? {}, ["number", "title"])?.trim() || `Bed ${index + 1}`;

    const segment = normalizeAirBookingSegment(o, index);
    if (!segment) return;

    if (!byCategory.has(categoryTitle)) {
      byCategory.set(categoryTitle, new Map());
    }
    const bedsMap = byCategory.get(categoryTitle)!;

    if (!bedsMap.has(bedKey)) {
      bedsMap.set(bedKey, {
        bedId: `${slugIdPart(categoryTitle)}-${slugIdPart(bedKey)}`,
        bedName,
        segments: [],
      });
    }
    const acc = bedsMap.get(bedKey)!;
    acc.segments.push(segment);
  });

  const categoryTitles = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b));

  const rooms: CheckerboardRoomGroup[] = categoryTitles.map((title, gi) => {
    const bedsMap = byCategory.get(title)!;
    const bedKeys = Array.from(bedsMap.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );

    const beds: CheckerboardBed[] = bedKeys.map((bk) => {
      const { bedId, bedName, segments } = bedsMap.get(bk)!;
      return {
        id: bedId,
        name: bedName,
        occupied: segments.length > 0,
        bookings: segments,
      };
    });

    return {
      id: `cat-${gi}-${slugIdPart(title)}`,
      title,
      beds,
    };
  });

  return { rooms };
}

function normalizeAirBookingSegment(o: Record<string, unknown>, index: number): CheckerboardBooking | null {
  const rep = asRecord(o.representative);
  const guestName =
    pickString(rep ?? {}, ["fullName", "name"]) ??
    pickString(o, ["guestName", "guest_name", "fullName"]) ??
    "Guest";

  const start =
    parseDateValue(o.fromDate ?? o.checkIn ?? o.startDate ?? o.from) ?? null;
  const end =
    parseDateValue(o.toDate ?? o.checkOut ?? o.endDate ?? o.to) ?? null;

  if (!start || !end) return null;

  const computed = asRecord(o.computedStatus);
  const statusStr =
    (typeof computed?.status === "string" ? computed.status : undefined) ??
    pickString(o, ["status", "state"]);
  const variant = bookingVariantFromStatus(statusStr);

  const id = o.id != null ? String(o.id) : `b-${index}-${guestName.slice(0, 8)}`;

  const tariffSummary = extractTariffSummary(o);

  const lo = start <= end ? start : end;
  const hi = start <= end ? end : start;

  return {
    id,
    guestName,
    start: lo,
    end: hi,
    variant,
    ...(tariffSummary ? { tariffSummary } : {}),
  };
}

function firstArray(
  obj: Record<string, unknown> | null,
  keys: string[],
): unknown[] | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v;
  }
  return null;
}

function extractRoomsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];

  const fromRoot = firstArray(root, [
    "rooms",
    "roomGroups",
    "groups",
    "items",
    "result",
    "payload",
    "checkerboard",
    "data",
  ]);
  if (fromRoot) return fromRoot;

  const data = asRecord(root.data);
  const fromData = firstArray(data, [
    "rooms",
    "rows",
    "items",
    "result",
    "payload",
    "roomGroups",
    "groups",
  ]);
  if (fromData) return fromData;

  return [];
}

function extractBeds(room: Record<string, unknown>): unknown[] {
  const fromKeys = firstArray(room, [
    "beds",
    "Beds",
    "bedList",
    "bedSlots",
    "slots",
    "items",
  ]);
  return fromKeys ?? [];
}

function extractBookings(bed: Record<string, unknown>): unknown[] {
  if (Array.isArray(bed.bookings)) return bed.bookings;
  if (Array.isArray(bed.reservations)) return bed.reservations;
  if (Array.isArray(bed.stays)) return bed.stays;
  if (Array.isArray(bed.segments)) return bed.segments;
  return [];
}

function normalizeBooking(raw: unknown, index: number): CheckerboardBooking | null {
  const o = asRecord(raw);
  if (!o) return null;

  const rep = asRecord(o.representative);
  const guestName =
    pickString(rep ?? {}, ["fullName", "name"]) ??
    pickString(o, ["guestName", "guest_name", "guest", "name", "label", "title", "fullName"]) ??
    "Guest";

  const start =
    parseDateValue(
      o.fromDate ??
        o.startDate ??
        o.start ??
        o.from ??
        o.checkIn ??
        o.check_in ??
        o.checkin ??
        o.arrival,
    ) ?? null;
  const end =
    parseDateValue(
      o.toDate ??
        o.endDate ??
        o.end ??
        o.to ??
        o.checkOut ??
        o.check_out ??
        o.checkout ??
        o.departure,
    ) ?? null;

  if (!start || !end) return null;

  const computed = asRecord(o.computedStatus);
  const statusRaw =
    (typeof computed?.status === "string" ? computed.status : undefined) ??
    pickString(o, ["status", "state", "bookingStatus", "type"]);
  const variant = bookingVariantFromStatus(statusRaw);

  const id =
    pickString(o, ["id", "bookingId", "reservationId"]) ?? `b-${index}-${guestName.slice(0, 8)}`;

  const tariffSummary = extractTariffSummary(o);

  const lo = start <= end ? start : end;
  const hi = start <= end ? end : start;

  return {
    id,
    guestName,
    start: lo,
    end: hi,
    variant,
    ...(tariffSummary ? { tariffSummary } : {}),
  };
}

function normalizeBed(raw: unknown, bedIndex: number, roomPrefix: string): CheckerboardBed {
  const o = asRecord(raw) ?? {};
  const id =
    pickString(o, ["id", "bedId", "key"]) ?? `${roomPrefix}-bed-${bedIndex}`;
  const name =
    pickString(o, ["name", "label", "title", "bedName", "bed"]) ?? `Bed ${bedIndex + 1}`;

  const bookingsRaw = extractBookings(o);
  const bookings: CheckerboardBooking[] = [];
  bookingsRaw.forEach((br, i) => {
    const b = normalizeBooking(br, i);
    if (b) bookings.push(b);
  });

  let occupied: boolean | undefined;
  if (typeof o.isOccupied === "boolean") occupied = o.isOccupied;
  else if (typeof o.occupied === "boolean") occupied = o.occupied;
  else if (typeof o.active === "boolean") occupied = o.active;

  return { id, name, occupied, bookings };
}

function normalizeRoom(raw: unknown, index: number): CheckerboardRoomGroup {
  const o = asRecord(raw) ?? {};
  const title =
    pickString(o, [
      "title",
      "name",
      "roomName",
      "room_name",
      "label",
      "displayName",
      "room",
    ]) ?? `Room ${index + 1}`;

  const id =
    pickString(o, ["id", "roomId", "key"]) ?? `room-${index}`;

  const bedsRaw = extractBeds(o);
  const beds = bedsRaw.map((b, i) => normalizeBed(b, i, id));

  return { id, title, beds };
}

/**
 * Maps arbitrary Edge Function JSON into a stable UI model.
 * Supports Air shape `{ bookings: [...] }` (grouped by room category and bed),
 * plus legacy `{ rooms: [...] }`, `{ data: { rooms } }`, top-level arrays, etc.
 */
export function normalizeCheckerboardResponse(raw: unknown): CheckerboardModel {
  const root = asRecord(raw);
  if (root && Array.isArray(root.bookings)) {
    if (root.bookings.length === 0) {
      return { rooms: [] };
    }
    return normalizeFromRootBookings(root.bookings);
  }

  const roomsRaw = extractRoomsArray(raw);
  const rooms = roomsRaw.map((r, i) => normalizeRoom(r, i));
  return { rooms };
}

export type FetchCheckerboardParams = {
  location: CheckerboardLocation;
  fromDate: Date;
  toDate: Date;
};

export async function fetchCheckerboard(params: FetchCheckerboardParams): Promise<CheckerboardModel> {
  const raw = await apiFetch<unknown>("get-checkerboard", {
    params: {
      location: params.location,
      fromDate: params.fromDate.toISOString(),
      toDate: params.toDate.toISOString(),
    },
  });
  const model = normalizeCheckerboardResponse(raw);
  if (import.meta.env.DEV && model.rooms.length === 0 && raw !== null && typeof raw === "object") {
    const keys = Array.isArray(raw) ? ["<root is array>"] : Object.keys(raw);
    console.warn("[get-checkerboard] Empty rooms after normalize. Top-level keys:", keys);
  }
  return model;
}
