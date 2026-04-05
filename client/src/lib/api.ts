import { supabase } from "@/lib/supabase";

export const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  params?: Record<string, string | number>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { method = "GET", body, params } = options;

  const url = new URL(`${FUNCTIONS_BASE_URL}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(url.toString(), {
    method,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    ...(body !== undefined
      ? { body: isFormData ? (body as FormData) : JSON.stringify(body) }
      : {}),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}
