import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MAAROOF PULSE" },
      { name: "description", content: "Sign in or create a free MAAROOF PULSE account to unlock the full pulse." },
      { property: "og:title", content: "Sign in — MAAROOF PULSE" },
      { property: "og:description", content: "Unlock trends, events and rising apps for your location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function social(p: "google" | "apple" | "microsoft") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? String(r.error));
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }
  async function signUp(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } } });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success(t("check_email"));
  }
  async function forgot() {
    if (!email) return toast.error(t("email"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    if (error) toast.error(error.message); else toast.success(t("reset_sent"));
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-bold">{t("auth_title")}</h1>
        <div className="mt-8 space-y-2">
          <Button variant="outline" className="w-full" onClick={() => social("google")}>{t("g")}</Button>
          <Button variant="outline" className="w-full" onClick={() => social("apple")}>{t("a")}</Button>
          <Button variant="outline" className="w-full" onClick={() => social("microsoft")}>{t("ms")}</Button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />{t("or")}<div className="h-px flex-1 bg-border" /></div>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t("auth_signin")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth_signup")}</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="mt-4 space-y-4">
              <div><Label htmlFor="e1">{t("email")}</Label><Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label htmlFor="p1">{t("password")}</Label><Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{t("auth_signin")}</Button>
              <button type="button" onClick={forgot} className="text-sm text-muted-foreground hover:text-foreground">{t("forgot")}</button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="mt-4 space-y-4">
              <div><Label htmlFor="n2">{t("name")}</Label><Input id="n2" required value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label htmlFor="e2">{t("email")}</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label htmlFor="p2">{t("password")}</Label><Input id="p2" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{t("auth_signup")}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
