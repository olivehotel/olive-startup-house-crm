import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const COMM_TABLE = Deno.env.get("COMMUNICATIONS_TABLE") ?? "communications";
const MESSAGES_TABLE =
  Deno.env.get("COMMUNICATION_MESSAGES_TABLE") ?? "communication_messages";

type UnknownRecord = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseBody(raw: string): UnknownRecord {
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? (v as UnknownRecord)
      : {};
  } catch {
    return {};
  }
}

function toInt(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function mapMessage(row: UnknownRecord): UnknownRecord {
  const fromVal = row.from ?? row.from_address ?? row.sender ?? "";
  const toVal = row.to ?? row.to_address ?? row.recipient ?? "";
  const dir = row.direction === "outgoing" ? "outgoing" : "incoming";
  let attachments = row.attachments;
  if (typeof attachments === "string") {
    try {
      attachments = JSON.parse(attachments) as unknown;
    } catch {
      attachments = [];
    }
  }
  if (!Array.isArray(attachments)) attachments = [];

  return {
    id: String(row.id ?? ""),
    gmail_thread_id: String(row.gmail_thread_id ?? row.thread_id ?? ""),
    subject: String(row.subject ?? ""),
    from: String(fromVal),
    to: String(toVal),
    direction: dir,
    body_text: String(row.body_text ?? ""),
    body_html: row.body_html != null ? String(row.body_html) : undefined,
    date: String(row.date ?? row.received_at ?? ""),
    received_at: String(row.received_at ?? ""),
    attachments,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const body = parseBody(await req.text());
  const communicationId = body.communication_id;
  if (
    typeof communicationId !== "string" ||
    communicationId.trim() === ""
  ) {
    return jsonResponse({ error: "communication_id is required" }, 400);
  }

  let page = toInt(body.page, 1);
  let limit = toInt(body.limit, DEFAULT_LIMIT);
  if (page < 1) page = 1;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const { data: communication, error: commErr } = await admin
    .from(COMM_TABLE)
    .select(
      "id, contact_name, contact_email, last_message_at, status_id, channel_id, main_mail, lead_id",
    )
    .eq("id", communicationId)
    .maybeSingle();

  if (commErr) {
    console.error("communication fetch", commErr);
    return jsonResponse({ error: commErr.message }, 500);
  }
  if (!communication) {
    return jsonResponse({ error: "Communication not found" }, 404);
  }

  const { count: totalRaw, error: countErr } = await admin
    .from(MESSAGES_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("communication_id", communicationId);

  if (countErr) {
    console.error("messages count", countErr);
    return jsonResponse({ error: countErr.message }, 500);
  }

  const total = totalRaw ?? 0;
  const total_pages = total === 0 ? 1 : Math.ceil(total / limit);
  const has_next_page = page < total_pages;
  const offset = (page - 1) * limit;

  const { data: rows, error: msgErr } = await admin
    .from(MESSAGES_TABLE)
    .select("*")
    .eq("communication_id", communicationId)
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (msgErr) {
    console.error("messages fetch", msgErr);
    return jsonResponse({ error: msgErr.message }, 500);
  }

  const rawList = (rows ?? []) as UnknownRecord[];
  rawList.sort((a, b) => {
    const ta = new Date(String(a.received_at ?? 0)).getTime();
    const tb = new Date(String(b.received_at ?? 0)).getTime();
    return ta - tb;
  });

  const messages = rawList.map((r) => mapMessage(r));

  const pagination = {
    page,
    page_size: limit,
    total,
    total_pages,
    has_next_page,
  };

  return jsonResponse({
    communication,
    messages,
    count: total,
    pagination,
  });
});
