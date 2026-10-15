import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, MapPin, Rocket, Bot, Radar, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SignalCard, type Signal } from "@/components/SignalCard";
import { RegionPicker } from "@/components/RegionPicker";
import { ConnectivityCard } from "@/components/ConnectivityCard";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useRegion } from "@/hooks/useRegion";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MAAROOF PULSE — Trends, events & rising apps near you" },
      { name: "description", content: "See what's on the horizon: rising trends, upcoming events and the fastest-growing apps for your location, refreshed every 12 hours." },
      { property: "og:title", content: "MAAROOF PULSE — Trends, events & rising apps near you" },
      { property: "og:description", content: "Rising trends, upcoming events and fast-growing apps for your location, refreshed every 12 hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { region, setRegion, useGps } = useRegion();

  const teaser = useQuery({
    queryKey: ["teaser", region],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_teaser_signals", region === "global" ? {} : { _region: region });
      if (error) throw error;
      return (data ?? []) as Signal[];
    },
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("app_settings").select("key,value")).data ?? [],
  });
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await supabase.from("plans").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const visible = Number(settings.data?.find((s) => s.key === "teaser_visible_count")?.value ?? 3);
  const items = teaser.data ?? [];
  const ctaTo = user ? "/dashboard" : "/auth";

  const metrics = [
    { k: "m_horizon", v: items.filter((i) => i.momentum === "emerging").length },
    { k: "m_surging", v: items.filter((i) => i.momentum === "surging").length },
    { k: "m_strength", v: items.length ? Math.round(items.reduce((a, b) => a + b.pulse_score, 0) / items.length) : "—" },
    { k: "m_sources", v: new Set(items.map((i) => i.kind)).size ? "8+" : "—" },
  ] as const;

  const features = [
    { i: MapPin, t: "feat1_t", d: "feat1_d" },
    { i: Rocket, t: "feat2_t", d: "feat2_d" },
    { i: Radar, t: "feat3_t", d: "feat3_d" },
    { i: Bot, t: "feat4_t", d: "feat4_d" },
  ] as const;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-border">
        <div className="pulse-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-pulse/40 bg-pulse/10 px-3 py-1 text-xs font-medium text-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse" />{t("hero_kicker")}
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] md:text-6xl">{t("hero_title")}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t("hero_sub")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><Link to={ctaTo}>{t("hero_cta")}<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#pulse">{t("hero_cta2")}</a></Button>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.k} className="bg-card p-5">
                <div className="text-xs text-muted-foreground">{t(m.k)}</div>
                <div className="mt-1 font-display text-3xl font-bold">{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pulse" className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">{t("teaser_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("your_region")}</p>
          </div>
          <RegionPicker region={region} setRegion={setRegion} useGps={useGps} />
        </div>
        <ConnectivityCard region={region} />
        {items.length === 0 && !teaser.isLoading && (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("d_empty")}</p>
        )}
        <div className="relative">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((s, i) => <SignalCard key={s.id} s={s} compact locked={!user && i >= visible} />)}
          </div>
          {!user && items.length > visible && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-2/3 items-end justify-center bg-gradient-to-t from-background via-background/85 to-transparent pb-8">
              <div className="pointer-events-auto max-w-lg rounded-2xl border border-pulse/40 bg-card p-6 text-center shadow-2xl">
                <Lock className="mx-auto h-6 w-6 text-pulse" />
                <h3 className="mt-3 text-xl font-bold">{t("teaser_lock")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("teaser_lock_sub")}</p>
                <Button asChild className="mt-4"><Link to="/auth">{t("hero_cta")}</Link></Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-background p-6">
              <f.i className="h-6 w-6 text-pulse" />
              <h3 className="mt-4 font-semibold">{t(f.t)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(f.d)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-bold">{t("plans_title")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(plans.data ?? []).map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border p-6 ${p.is_featured ? "border-pulse bg-pulse/5" : "border-border bg-card"}`}>
              <h3 className="text-lg font-semibold">{lang === "ar" ? p.name_ar : p.name_en}</h3>
              <div className="mt-3 font-display text-4xl font-bold">{p.price_monthly === 0 ? (lang === "ar" ? "مجاناً" : "Free") : `$${p.price_monthly}`}<span className="text-base font-normal text-muted-foreground">{p.price_monthly ? t("per_month") : ""}</span></div>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {(lang === "ar" ? p.features_ar : p.features_en).map((f: string) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-pulse" />{f}</li>)}
              </ul>
              <Button asChild className="mt-6" variant={p.is_featured ? "default" : "outline"}><Link to={ctaTo}>{t("choose")}</Link></Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        <div className="font-display font-semibold text-foreground">{t("brand")}</div>
        <p className="mt-2">{t("footer")}</p>
      </footer>
    </div>
  );
}
