import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "super_admin" | "editor" | "subscriber" | "guest";
type Profile = { id: string; email: string | null; display_name: string | null; plan_slug: string; banned: boolean };
type Ctx = { user: User | null; roles: Role[]; profile: Profile | null; loading: boolean; isAdmin: boolean; isStaff: boolean; canViewFull: boolean };

const AuthCtx = createContext<Ctx>({ user: null, roles: [], profile: null, loading: true, isAdmin: false, isStaff: false, canViewFull: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (!u) { setRoles([]); setProfile(null); setLoading(false); return; }
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.id),
        supabase.from("profiles").select("id,email,display_name,plan_slug,banned").eq("id", u.id).maybeSingle(),
      ]);
      setRoles((r ?? []).map((x) => x.role as Role));
      setProfile(p as Profile | null);
      setLoading(false);
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", u.id).then(() => {});
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      setTimeout(() => load(session?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("super_admin");
  const isStaff = isAdmin || roles.includes("editor");
  const canViewFull = !profile?.banned && (isStaff || roles.includes("subscriber"));
  return <AuthCtx.Provider value={{ user, roles, profile, loading, isAdmin, isStaff, canViewFull }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
