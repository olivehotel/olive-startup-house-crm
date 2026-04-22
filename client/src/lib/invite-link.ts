/**
 * Normalizes link fields from guest-invite / community_add_profile style API responses.
 */
export function extractMagicLinkFromApiResponse(data: Record<string, unknown>): string | undefined {
  const pick = (k: string): string | undefined => {
    const v = data[k];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  return pick("magic_link") ?? pick("link") ?? pick("url") ?? pick("invite_url");
}
