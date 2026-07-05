import { ssrClient } from "./supabase/ssr";
import { serverClient } from "./supabase/server";

export type Role = "manager" | "sales";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  isManager: boolean;
}

// Returns the logged-in user's profile (role + display name), or null.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await ssrClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Profile row holds the role and the display name. Read with the service
  // client so it works regardless of RLS.
  const db = serverClient();
  let { data } = await db
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  // First login: create a default profile (avoids fragile auth.users triggers).
  if (!data) {
    const inserted = await db
      .from("profiles")
      .insert({
        id: user.id,
        full_name: user.email?.split("@")[0] ?? "",
        role: "sales",
      })
      .select("full_name, role")
      .single();
    data = inserted.data;
  }

  const role: Role = data?.role === "manager" ? "manager" : "sales";
  const name = data?.full_name?.trim() || user.email || "";

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    role,
    isManager: role === "manager",
  };
}
