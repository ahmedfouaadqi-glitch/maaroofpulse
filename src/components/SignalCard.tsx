import { MapPin, ExternalLink, Ticket, Clock, Flame, TrendingUp, Sparkles, Info, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n, regionName, type Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Signal = {
  id: string; kind: string; title: string; summary?: string | null; why_rising?: string | null;
  title_ar?: string | null; summary_ar?: string | null; why_rising_ar?: string | null;
  region: string; category?: string | null; pulse_score: number; lead_time_hours?: number | null; momentum: string;
  source_name?: string | null; source_url?: string | null; map_url?: string | null; register_url?: string | null;
  event_date?: string | null; created_at: string;
  platform?: string | null; cta_ar?: string | null; cta_en?: string | null;
  models_view?: unknown;
};

export const PLATFORM_KEYS = ["x", "youtube", "tiktok", "instagram", "facebook", "threads", "telegram", "linkedin", "snapchat", "google", "google_play", "app_store", "news", "web"];

const momentumIcon = { emerging: Sparkles, rising: TrendingUp, surging: Flame } as Record<string, typeof Flame>;

export function SignalCard({ s, locked, compact }: { s: Signal; locked?: boolean; compact?: boolean }) {
  const { t, lang } = useI18n();
  const Icon = momentumIcon[s.momentum] ?? TrendingUp;
  const ar = lang === "ar";
  const title = (ar && s.title_ar) || s.title;
  const summary = (ar && s.summary_ar) || s.summary;
  const why = (ar && s.why_rising_ar) || s.why_rising;
  return (
    <article className={cn("group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-pulse/50", locked && "select-none")}>
      <div className={cn(locked && "blur-[6px]")}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{t(`kind_${s.kind}` as Key) ?? s.kind}</Badge>
          {s.platform && PLATFORM_KEYS.includes(s.platform) && s.platform !== s.kind && <Badge variant="outline">{t(`pf_${s.platform}` as Key)}</Badge>}
          <span className={cn("inline-flex items-center gap-1 font-medium", s.momentum === "surging" ? "text-surge" : "text-pulse")}>
            <Icon className="h-3.5 w-3.5" />{t(s.momentum as Key)}<Tip text={t("tip_momentum")} />
          </span>
          {s.category && <span className="text-muted-foreground">· {s.category}</span>}
          <span className="ms-auto text-muted-foreground">{regionName(s.region, lang)}</span>
        </div>
        {title ? <h3 className="text-base font-semibold leading-snug">{title}</h3> : (
          <div aria-hidden className="space-y-2 py-1"><div className="h-3.5 w-11/12 animate-pulse rounded-full bg-muted" /><div className="h-3.5 w-2/3 animate-pulse rounded-full bg-muted" /></div>
        )}
        {!compact && summary && <p className="mt-2 text-sm text-muted-foreground">{summary}</p>}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">{t("m_strength")}<Tip text={t("tip_strength")} /></span><span className="font-semibold text-foreground">{s.pulse_score}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-pulse to-accent" style={{ width: `${s.pulse_score}%` }} />
          </div>
        </div>
        {!compact && (
          <>
            {why && (
              <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
                <div className="mb-1 text-xs font-semibold text-pulse">{t("d_why")}</div>
                {why}
              </div>
            )}
            <ModelReadings v={s.models_view} />
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              {!!s.lead_time_hours && (
                <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{t("m_lead")}: {s.lead_time_hours}{t("hrs")}<Tip text={t("tip_lead")} /></span>
              )}
              {s.event_date && <span className="text-muted-foreground">{new Date(s.event_date).toLocaleDateString(lang === "ar" ? "ar" : "en", { dateStyle: "medium" })}</span>}
              {s.map_url && <a href={s.map_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pulse hover:underline"><MapPin className="h-3.5 w-3.5" />{t("d_map")}</a>}
              {s.register_url && <a href={s.register_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><Ticket className="h-3.5 w-3.5" />{t("d_register")}</a>}
              {s.source_url && <a href={s.source_url} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" />{s.source_name ?? t("d_source")}</a>}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function Tip({ text }: { text: string }) {
  return <span title={text} aria-label={text} className="inline-flex cursor-help text-muted-foreground"><Info className="h-3 w-3" /></span>;
}

type Reading = { name: string; available?: boolean; stance: string; note_en: string; note_ar: string };
function ModelReadings({ v }: { v: unknown }) {
  const { t, lang } = useI18n();
  if (!Array.isArray(v) || !v.length) return null;
  const list = v as Reading[];
  return (
    <details className="group/m mt-4 rounded-xl border border-border p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground">
        {t("models_title")}<ChevronDown className="h-3.5 w-3.5 transition-transform group-open/m:rotate-180" />
      </summary>
      <ul className="mt-3 space-y-2">
        {list.map((m) => (
          <li key={m.name}>
            <div className="flex items-center gap-2 text-xs"><span className="font-semibold">{m.name}</span>
              {m.available === false ? <span className="text-muted-foreground">{t("models_unavailable")}</span> : <span className={m.stance === "caution" ? "text-surge" : "text-pulse"}>{t(`st_${m.stance}` as Key)}</span>}
            </div>
            {m.available !== false && <p className="mt-0.5 text-muted-foreground">{lang === "ar" ? m.note_ar || m.note_en : m.note_en}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Keep one card per headline; prefer the user's own country over global. */
export function dedupeSignals<T extends { title: string; title_ar?: string | null; region: string }>(list: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of list) {
    const k = (x.title || x.title_ar || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    if (!k) { m.set(Math.random().toString(), x); continue; }
    const prev = m.get(k);
    if (!prev || (prev.region === "global" && x.region !== "global")) m.set(k, x);
  }
  return [...m.values()];
}
