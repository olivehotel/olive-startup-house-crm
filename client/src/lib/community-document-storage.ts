import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMUNITY_DOCUMENTS_BUCKET = "community-documents";

/**
 * Reduces API values to the object key inside the bucket (no domain, no /storage/v1/ prefix).
 */
export function normalizeCommunityDocumentStoragePath(raw: string, bucket: string): string {
  let s = raw.trim();
  if (!s) return "";

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      s = u.pathname.replace(/^\/+/, "");
    } catch {
      return "";
    }
  } else {
    s = s.replace(/^\/+/, "");
  }

  const storagePrefixes = [
    `storage/v1/object/public/${bucket}/`,
    `storage/v1/object/sign/${bucket}/`,
    `storage/v1/object/authenticated/${bucket}/`,
    `storage/v1/object/${bucket}/`,
  ];
  for (const prefix of storagePrefixes) {
    if (s.startsWith(prefix)) {
      s = s.slice(prefix.length);
      break;
    }
  }

  while (s.startsWith(`${bucket}/`)) {
    s = s.slice(bucket.length + 1);
  }

  return s.replace(/^\/+/, "");
}

export function suggestedDownloadFileName(filePath: string, title: string): string {
  const segments = filePath.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  if (last.includes(".")) return last;
  const extMatch = filePath.match(/(\.[a-zA-Z0-9]{1,12})$/);
  const base = title.replace(/[/\\?%*:|"<>]/g, "-").trim() || "download";
  return extMatch ? `${base}${extMatch[1]}` : base;
}

/** Keys to try when the stored path may be URI-encoded or use encoded slashes. */
function storageKeyVariants(primary: string): string[] {
  const out: string[] = [];
  const add = (k: string) => {
    const t = k.trim().replace(/^\/+/, "").replace(/\/+$/g, "");
    if (t && !out.includes(t)) out.push(t);
  };

  add(primary);

  const segmentDecoded = primary
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    })
    .join("/");
  add(segmentDecoded);

  if (/%[0-9A-Fa-f]{2}/.test(primary)) {
    try {
      const full = decodeURIComponent(primary.replace(/\+/g, " "));
      add(full);
    } catch {
      /* ignore */
    }
  }

  return out;
}

/**
 * Prefer signed URLs (object key from DB after normalization; avoids some authenticated GET issues).
 */
async function tryDownloadViaSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
  fileName: string,
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(key, 60, { download: fileName });

  if (error || !data?.signedUrl) {
    return false;
  }

  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  link.click();
  return true;
}

async function fetchBlobForKey(
  supabase: SupabaseClient,
  bucket: string,
  key: string,
): Promise<{ blob: Blob } | { error: string }> {
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (!error && data) {
    return { blob: data };
  }

  const authMessage = error?.message ?? "Download failed";

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(key);

  try {
    const res = await fetch(publicUrl, { method: "GET", credentials: "omit", mode: "cors" });
    if (res.ok) {
      return { blob: await res.blob() };
    }
  } catch {
    /* ignore — e.g. CORS or network */
  }

  return { error: authMessage };
}

export async function downloadCommunityDocumentFromStorage(
  supabase: SupabaseClient,
  bucket: string,
  rawPath: string,
  title: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const baseKey = normalizeCommunityDocumentStoragePath(rawPath, bucket);
  if (!baseKey) {
    return { ok: false, message: "Invalid file path" };
  }

  const keys = storageKeyVariants(baseKey);
  const fileName = suggestedDownloadFileName(keys[0], title);

  let lastMessage = "Object not found";

  for (const key of keys) {
    const signedOk = await tryDownloadViaSignedUrl(supabase, bucket, key, fileName);
    if (signedOk) {
      return { ok: true };
    }

    const result = await fetchBlobForKey(supabase, bucket, key);
    if ("blob" in result) {
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    }
    lastMessage = result.error;
  }

  return { ok: false, message: lastMessage };
}
