import { useQuery } from "@tanstack/react-query";
import { Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, regionName, type Key } from "@/lib/i18n";

export function ConnectivityCard({ region }: { region: string }) {
  const { t, lang } = useI18n();
  const stats = useQuery({
    queryKey: ["country-stats", region],
    enabled: region !== "global",
    queryFn: async () => (await supabase.from("country_stats").select("*").eq("code", region).maybeSingle()).data,
  });
  const act = useQuery({
    queryKey: ["cycle-activity", region],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_cycle_activity", region === "global" ? {} : { _region: region });
      return data ?? [];
    },
  });
  const rows = act.data ?? [];
  const cur = rows.reduce((a, r) => a + Number(r.current_count), 0);
  const prev = rows.reduce((a, r) => a + Number(r.previous_count), 0);
  const delta = prev ? Math.round(((cur - prev) / prev) * 100) : null;
  const nf = new Intl.NumberFormat(lang === "ar" ? "ar" : "en", { notation: "compact", maximumFractionDigits: 1 });
  const s = stats.data;

  return (
    <div className="mb-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
      <div className="bg-card p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wifi className="h-3.5 w-3.5 text-pulse" />{t("conn_users")} · {regionName(region, lang)}</div>
        <div className="mt-1 font-display text-2xl font-bold">{s?.internet_users ? nf.format(s.internet_users) : "—"}</div>
        <div className="text-[11px] text-muted-foreground">
          {s?.internet_users && s.population ? `${Math.round((s.internet_users / s.population) * 100)}% · ` : ""}{t("conn_note")}{s?.year ? ` (${s.source} ${s.year})` : ""}
        </div>
      </div>
      <div className="bg-card p-4">
        <div className="text-xs text-muted-foreground">{t("conn_cycle")}</div>
        <div className="mt-1 font-display text-2xl font-bold">{cur}</div>
        {delta !== null && (
          <div className={delta >= 0 ? "text-xs text-pulse" : "text-xs text-surge"} dir="ltr">
            {delta >= 0 ? "+" : ""}{delta}% <span className="text-muted-foreground">{t("conn_vs")}</span>
          </div>
        )}
      </div>
      <div className="bg-card p-4">
        <div className="mb-2 text-xs text-muted-foreground">{t("conn_mix")}</div>
        <div className="space-y-1">
          {rows.filter((r) => Number(r.current_count) > 0).map((r) => {
            const pct = cur ? Math.round((Number(r.current_count) / cur) * 100) : 0;
            return (
              <div key={r.kind} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate">{t(`kind_${r.kind}` as Key)}</span>
                <div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-pulse" style={{ width: `${pct}%` }} /></div>
                <span className="w-8 text-end">{pct}%</span>
              </div>
            );
          })}
          {cur === 0 && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </div>
    </div>
  );
}
