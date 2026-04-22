import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppUserRole } from "@shared/schema";

export const USER_ROLE_QUERY_KEY = ["user_role"] as const;

export function useUserRole() {
  const query = useQuery({
    queryKey: USER_ROLE_QUERY_KEY,
    queryFn: async (): Promise<{ role: AppUserRole | null; userId: string | null }> => {
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data.user;
      if (userError || !user) {
        return { role: null, userId: null };
      }
      const { data: row, error: rowError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (rowError || !row || typeof row !== "object" || !("role" in row)) {
        return { role: null, userId: user.id };
      }
      const r = (row as { role: string }).role;
      if (r === "admin" || r === "manager" || r === "client") {
        return { role: r, userId: user.id };
      }
      return { role: null, userId: user.id };
    },
    staleTime: 60_000,
  });

  const role = query.data?.role ?? null;
  const canViewCommunityAdminProfiles = role === "admin" || role === "manager";

  return { ...query, role, canViewCommunityAdminProfiles };
}
