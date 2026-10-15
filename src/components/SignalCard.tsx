import { MapPin, ExternalLink, Ticket, Clock, Flame, TrendingUp, Sparkles, ArrowUpRight, ChevronDown } from "lucide-react";
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
  models_view?: { name: string; stance: string; note_en: string; note_ar: string }[] | null | unknown;
};

export const PLATFORM_KEYS = ["x", "youtube", "tiktok", "instagram", "facebook", "threads", "telegram", "linkedin", "google", "google_play", "app_store", "news", "web"];

const momentumIcon = { emerging: Sparkles, rising: TrendingUp, surging: Flame } as Record<string, typeof Flame>;

export function SignalCard({ s, locked, compact }: { s: Signal; locked?: boolean; compact?: boolean }) {
  const { t, lang } = useI18n();
  const Icon = momentumIcon[s.momentum] ?? TrendingUp;
  const ar = lang === "ar";
  const title = (ar && s.title_ar) || s.title || "████████ ██████ ████";
  const summary = (ar && s.summary_ar) || s.summary;
  const why = (ar && s.why_rising_ar) || s.why_rising;
  return (
    <article className={cn("group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-pulse/50", locked && "select-none")}>
      <div className={cn(locked && "blur-[6px]")}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{t(`kind_${s.kind}` as Key) ?? s.kind}</Badge>
          {s.platform && PLATFORM_KEYS.includes(s.platform) && s.platform !== s.kind && <Badge variant="outline">{t(`pf_${s.platform}` as Key)}</Badge>}
          <span className={cn("inline-flex items-center gap-1 font-medium", s.momentum === "surging" ? "text-surge" : "text-pulse")}>
            <Icon className="h-3.5 w-3.5" />{t(s.momentum as Key)}
          </span>
          {s.category && <span className="text-muted-foreground">· {s.category}</span>}
          <span className="ms-auto text-muted-foreground">{regionName(s.region, lang)}</span>
        </div>
        <h3 className="text-base font-semibold leading-snug">{title}</h3>
        {!compact && summary && <p className="mt-2 text-sm text-muted-foreground">{summary}</p>}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{t("m_strength")}</span><span className="font-semibold text-foreground">{s.pulse_score}</span>
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
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              {!!s.lead_time_hours && (
                <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{t("m_lead")}: {s.lead_time_hours}{t("hrs")}</span>
              )}
              {s.event_date && <span className="text-muted-foreground">{new Date(s.event_date).toLocaleDateString(lang === "ar" ? "ar" : "en", { dateStyle: "medium" })}</span>}
              {s.map_url && <a href={s.map_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-pulse hover:underline"><MapPin className="h-3.5 w-3.5" />{t("d_map")}</a>}
              {s.register_url && <a href={s.register_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><Ticket className="h-3.5 w-3.5" />{t("d_register")}</a>}
              {s.source_url && <a href={s.source_url} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" />{s.source_name ?? t("d_source")}</a>}
            </div>
            <ModelsView s={s} />
            <CtaLine s={s} />
          </>
        )}
      </div>
    </article>
  );
}

function ModelsView({ s }: { s: Signal }) {
  const { t, lang } = useI18n();
  const mv = Array.isArray(s.models_view) ? (s.models_view as { name: string; stance: string; note_en: string; note_ar: string }[]) : [];
  if (!mv.length) return null;
  const tone = (x: string) => (x === "agree" ? "text-pulse" : x === "caution" ? "text-surge" : "text-muted-foreground");
  return (
    <details className="group/m mt-4 rounded-xl border border-border p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold">
        {t("models_title")}<ChevronDown className="h-4 w-4 transition-transform group-open/m:rotate-180" />
      </summary>
      <ul className="mt-3 space-y-2">
        {mv.map((m) => (
          <li key={m.name} className="text-xs">
            <span className="font-semibold">{m.name}</span> · <span className={tone(m.stance)}>{t(`st_${m.stance}` as Key)}</span>
            <p className="text-muted-foreground">{lang === "ar" ? m.note_ar || m.note_en : m.note_en}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">{t("models_note")}</p>
    </details>
  );
}

function CtaLine({ s }: { s: Signal }) {
  const { t, lang } = useI18n();
  const line = (lang === "ar" ? s.cta_ar : s.cta_en) || s.cta_en || s.cta_ar;
  return (
    <a href="https://maaroofai.com" target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-pulse/40 bg-pulse/10 p-3 text-sm transition-colors hover:bg-pulse/20">
      <span>{line || t("go_maaroof")}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-pulse rtl:-scale-x-100" />
    </a>
  );
}
