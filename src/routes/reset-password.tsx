import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — MAAROOF PULSE" },
      { name: "description", content: "Choose a new password for your MAAROOF PULSE account." },
      { property: "og:title", content: "Reset password — MAAROOF PULSE" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <form onSubmit={save} className="mx-auto max-w-md space-y-4 px-4 py-16">
        <h1 className="text-2xl font-bold">{t("new_password")}</h1>
        <Input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit" className="w-full">{t("save")}</Button>
      </form>
    </div>
  );
}
