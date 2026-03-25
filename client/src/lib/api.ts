import { supabase } from "@/lib/supabase";

export const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { method = "GET", body } = options;

  const res = await fetch(`${FUNCTIONS_BASE_URL}/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}
