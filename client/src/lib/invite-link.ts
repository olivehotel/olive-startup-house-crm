/**
 * Normalizes link fields from guest-invite / community_add_profile style API responses.
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractLinkFromObject(data: Record<string, unknown>): string | undefined {
  const pick = (k: string): string | undefined => {
    const v = data[k];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  return (
    pick("magic_link") ??
    pick("guest_magic_link") ??
    pick("login_link") ??
    pick("link") ??
    pick("url") ??
    pick("invite_url")
  );
}

export function extractMagicLinkFromApiResponse(data: Record<string, unknown>): string | undefined {
  return (
    extractLinkFromObject(data) ??
    (isPlainObject(data.profile) ? extractLinkFromObject(data.profile) : undefined)
  );
}
