import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { SignalCard, PLATFORM_KEYS, type Signal } from "@/components/SignalCard";
import { RegionPicker } from "@/components/RegionPicker";
import { ConnectivityCard } from "@/components/ConnectivityCard";
import { useI18n, type Key } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useRegion } from "@/hooks/useRegion";
import { supabase } from "@/integrations/supabase/client";
import { askAssistant, runGeoCheck } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your pulse — MAAROOF PULSE" },
      { name: "description", content: "Your live pulse: trends, events, rising apps, AI visibility and assistant." },
      { property: "og:title", content: "Your pulse — MAAROOF PULSE" },
      { property: "og:description", content: "Your live pulse dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { canViewFull, profile, loading } = useAuth();
  const { lang } = useI18n();
  const { region, setRegion, useGps } = useRegion();
  const [kind, setKind] = useState("all");
  const [platform, setPlatform] = useState("all");

  const limited = useQuery({
    queryKey: ["limited-signals", region, kind],
    enabled: !canViewFull && !loading,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_limited_signals", { ...(region !== "global" ? { _region: region } : {}), ...(kind !== "all" ? { _kind: kind } : {}) });
      if (error) throw error;
      return (data ?? []) as Signal[];
    },
  });
  const lastRun = useQuery({
    queryKey: ["last-refresh"],
    queryFn: async () => (await supabase.from("signals").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle()).data?.created_at ?? null,
  });
  const signals = useQuery({
    queryKey: ["signals", region, kind],
    enabled: canViewFull,
    queryFn: async () => {
      let q = supabase.from("signals").select("*").eq("status", "published").order("created_at", { ascending: false }).limit(60);
      if (region !== "global") q = q.in("region", [region, "global"]);
      if (kind !== "all") q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Signal[];
    },
  });

  if (profile?.banned) return (<div className="min-h-screen"><SiteHeader /><p className="p-16 text-center">{t("banned")}</p></div>);

  const list = ((canViewFull ? signals.data : limited.data) ?? []).filter((x) => platform === "all" || x.platform === platform).slice().sort((a, b) => b.pulse_score - a.pulse_score);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{t("d_title")}</h1>
            <RegionPicker region={region} setRegion={setRegion} useGps={useGps} />
          </div>
          {!canViewFull && !loading && (
            <div className="mb-6 rounded-2xl border border-pulse/40 bg-pulse/10 p-5">
              <h2 className="font-semibold text-pulse">{t("pending_title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("pending_sub")}</p>
            </div>
          )}
          <ConnectivityCard region={region} />
          <RefreshInfo last={lastRun.data ?? null} lang={lang} />
          <Tabs value={kind} onValueChange={setKind} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">{t("d_all")}</TabsTrigger>
              {["trend", "event", "app", "news", "social"].map((k) => <TabsTrigger key={k} value={k}>{t(`kind_${k}` as Key)}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          {canViewFull && (kind === "social" || kind === "all") && (
            <div className="-mt-3 mb-6 flex flex-wrap gap-2">
              {["all", ...PLATFORM_KEYS.filter((p) => (signals.data ?? []).some((x) => x.platform === p))].map((p) => (
                <Button key={p} size="sm" variant={platform === p ? "default" : "outline"} onClick={() => setPlatform(p)}>{p === "all" ? t("all_platforms") : t(`pf_${p}` as Key)}</Button>
              ))}
            </div>
          )}
          {list.length === 0 && !signals.isLoading && <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("d_empty")}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((s) => <SignalCard key={s.id} s={s} compact={!canViewFull} />)}
          </div>
        </section>
        <aside className="space-y-6">
          {canViewFull && <Assistant region={region} />}
          {canViewFull && <GeoIndex />}
        </aside>
      </main>
    </div>
  );
}

function nextCycle() {
  const d = new Date(); const n = new Date(d);
  n.setUTCMinutes(0, 0, 0);
  n.setUTCHours(d.getUTCHours() < 12 ? 12 : 24);
  return n;
}

function RefreshInfo({ last, lang }: { last: string | null; lang: string }) {
  const { t } = useI18n();
  const fmt = (x: Date) => x.toLocaleString(lang === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" });
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      {last && <>{t("last_update")}: {fmt(new Date(last))} · </>}{t("next_update")}: {fmt(nextCycle())}
    </p>
  );
}

function Assistant({ region }: { region: string }) {
  const { t, lang } = useI18n();
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { profile } = useAuth();
  const [persona, setPersonaState] = useState<string>((profile as { persona?: string } | null)?.persona ?? "citizen");
  async function setPersona(p: string) {
    setPersonaState(p);
    if (profile?.id) await supabase.from("profiles").update({ persona: p }).eq("id", profile.id);
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: input.trim() }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await ask({ data: { messages: next, region, lang, persona } });
      if ("error" in r && r.error) toast.error(r.error);
      else if ("reply" in r) setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    setBusy(false);
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{t("d_assistant")}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{t("persona")}:</span>
        {["merchant", "creator", "investor", "developer", "citizen"].map((p) => (
          <button key={p} type="button" onClick={() => setPersona(p)} className={`rounded-full border px-2.5 py-1 ${persona === p ? "border-pulse bg-pulse/15 text-pulse" : "border-border text-muted-foreground"}`}>{t(`p_${p}` as Key)}</button>
        ))}
      </div>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto text-sm">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ms-8 rounded-xl bg-primary/15 p-3" : "me-8 whitespace-pre-wrap rounded-xl bg-muted p-3"}>{m.content}</div>
        ))}
        {busy && <div className="me-8 animate-pulse rounded-xl bg-muted p-3">…</div>}
      </div>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("d_ask")} />
        <Button type="submit" size="icon" disabled={busy} aria-label={t("d_send")}><Send className="h-4 w-4 rtl:rotate-180" /></Button>
      </form>
    </div>
  );
}

function GeoIndex() {
  const { t, lang } = useI18n();
  const check = useServerFn(runGeoCheck);
  const [brand, setBrand] = useState("");
  const [market, setMarket] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ overall: number; summary: string; cta?: string; models: { name: string; score: number; note: string }[] } | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const r = await check({ data: { brand, market, lang } });
      if ("error" in r && r.error) toast.error(r.error); else if ("result" in r && r.result) setRes(r.result);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Error"); }
    setBusy(false);
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Radar className="h-4 w-4 text-pulse" />{t("d_geo")}</h2>
      <form onSubmit={go} className="mt-4 space-y-2">
        <Input required value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t("d_brand")} />
        <Input value={market} onChange={(e) => setMarket(e.target.value)} placeholder={t("d_market")} />
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : t("d_check")}</Button>
      </form>
      {res && (
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-baseline justify-between"><span className="text-muted-foreground">{t("d_overall")}</span><span className="font-display text-3xl font-bold text-pulse">{res.overall}</span></div>
          <p className="text-muted-foreground">{res.summary}</p>
          {res.models?.map((m) => (
            <div key={m.name} title={m.note}>
              <div className="flex justify-between text-xs"><span>{m.name}</span><span>{m.score}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-pulse" style={{ width: `${m.score}%` }} /></div>
            </div>
          ))}
          {res.cta && <a href="https://maaroofai.com" target="_blank" rel="noreferrer" className="block rounded-xl border border-pulse/40 bg-pulse/10 p-3 hover:bg-pulse/20">{res.cta}</a>}
        </div>
      )}
    </div>
  );
}
