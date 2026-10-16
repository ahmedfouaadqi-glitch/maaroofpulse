import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type React from "react";

export type Lang = "en" | "ar";
type Theme = "dark" | "light";

const dict = {
  en: {
    brand: "MAAROOF PULSE",
    nav_pulse: "Live pulse", nav_dashboard: "Dashboard", nav_admin: "Admin", nav_signin: "Sign in", nav_signout: "Sign out", nav_pricing: "Plans",
    hero_kicker: "Updated every 12 hours for your location",
    hero_title: "See what's on the horizon — before everyone else.",
    hero_sub: "Trends rising fast, upcoming events, the apps everyone is downloading, and why — tuned to where you are.",
    hero_cta: "Join free and see the pulse",
    hero_cta2: "See today's pulse",
    your_region: "Your region",
    use_gps: "Use precise location",
    global: "Global",
    m_horizon: "On the horizon", m_surging: "Rising strongly", m_strength: "Pulse strength", m_sources: "Trusted sources", m_lead: "Lead time", m_accuracy: "Accuracy & transparency log",
    emerging: "On the horizon", rising: "Rising", surging: "Rising strongly",
    kind_trend: "Trend", kind_event: "Event", kind_app: "App", kind_news: "News", kind_social: "Social",
    kind_economy: "Economy & investment", tab_horizon: "On the horizon", ag_all: "All apps", ag_most_used: "Most used", ag_most_traded: "Most traded", ag_spreading: "Fastest spreading", pf_snapchat: "Snapchat",
    tip_strength: "Pulse strength (0–100): how strong the signal is across trusted sources right now. Above 70 means wide, fast spread.",
    tip_lead: "Lead time: estimated hours before this reaches mainstream coverage.",
    tip_momentum: "Momentum: emerging = early signs, rising = steady growth, surging = rising strongly.",
    models_unavailable: "Currently unavailable",
    horizon_empty: "No early signals in the 12–72 hour window yet.",
    vs_raw: "Single source", vs_corroborated: "Corroborated", vs_verified: "Verified",
    models_title: "Model readings", geo_unavailable: "Unavailable this cycle", geo_mentioned: "Mentions you", geo_absent: "Not mentioned", geo_full10: "Check your presence across all 10 AI models and build a reach plan at maaroofai.com →", st_agree: "Confirms", st_caution: "Cautious", st_neutral: "Neutral",
    go_maaroof: "Continue at maaroofai.com", persona: "I am a", p_merchant: "Merchant", p_creator: "Content creator", p_investor: "Investor", p_developer: "Developer", p_citizen: "Citizen",
    all_platforms: "All platforms", pf_x: "X", pf_youtube: "YouTube", pf_tiktok: "TikTok", pf_instagram: "Instagram", pf_facebook: "Facebook", pf_threads: "Threads", pf_telegram: "Telegram", pf_linkedin: "LinkedIn", pf_google: "Google Trends", pf_google_play: "Google Play", pf_app_store: "App Store", pf_news: "News", pf_web: "Web",
    conn_title: "Connectivity pulse", conn_users: "Internet users", conn_note: "Estimate", conn_cycle: "Signals this cycle", conn_vs: "vs previous cycle", conn_mix: "Activity mix",
    teaser_title: "Today's pulse",
    teaser_lock: "The rest of today's pulse is waiting for you",
    teaser_lock_sub: "Create a free account to see every signal, event maps, registration links, why it's rising and lead time.",
    feat1_t: "Events near you", feat1_d: "Upcoming events with direct Google Maps and registration links.",
    feat2_t: "Fastest-growing apps", feat2_d: "The apps gaining ground in your region, and the reasons behind the climb.",
    feat3_t: "AI visibility index", feat3_d: "How present your brand is across 10 AI assistants — DeepSeek, ChatGPT, Gemini, Claude, Perplexity, Copilot, Grok, Mistral, Kimi, Qwen.",
    feat4_t: "Your smart assistant", feat4_d: "Ask anything about the current pulse and get grounded, practical answers.",
    plans_title: "Simple plans", per_month: "/mo", choose: "Get started",
    footer: "Built for founders, marketers and teams who move first.",
    hrs: "h", pts: "pts",
    auth_title: "Welcome to the pulse", auth_signin: "Sign in", auth_signup: "Create account", email: "Email", password: "Password", name: "Full name",
    forgot: "Forgot password?", or: "or", g: "Continue with Google", a: "Continue with Apple", ms: "Continue with Microsoft",
    check_email: "Check your inbox to confirm your account.", reset_sent: "Password reset link sent.", new_password: "New password", save: "Save",
    d_title: "Your pulse", d_all: "All", d_why: "Why it's rising", d_map: "Open map", d_register: "Register", d_source: "Source",
    d_empty: "No signals yet for this region. The next refresh cycle will fill this in.",
    d_assistant: "Smart assistant", d_ask: "Ask about trends, events or apps…", d_send: "Send",
    d_geo: "AI visibility index", d_brand: "Your brand or product", d_market: "Market (e.g. Saudi Arabia)", d_check: "Check visibility", d_overall: "Overall presence",
    banned: "Your account is suspended. Contact support.",
    pending_title: "Your account is awaiting activation",
    pending_sub: "You're seeing a preview: headlines and pulse strength only. Our team activates full access — details, why it's rising, maps, registration links and the assistant.",
    loc_detected: "We detected your location:", loc_precise: "Use precise location", loc_change: "Change manually", loc_denied: "Location access was declined — pick your country from the list.",
    loc_ask: "Want more accurate results?", search_country: "Search countries…", no_country: "No country found",
    last_update: "Last refresh", next_update: "Next refresh",
    g_global: "Global", g_gulf: "Gulf", g_levant: "Levant & Iraq", g_africa: "Egypt & North Africa", g_europe: "Europe", g_americas: "Americas", g_asia: "Asia & Oceania",
  },
  ar: {
    brand: "MAAROOF PULSE",
    nav_pulse: "النبض اللحظي", nav_dashboard: "لوحتي", nav_admin: "الإدارة", nav_signin: "تسجيل الدخول", nav_signout: "خروج", nav_pricing: "الباقات",
    hero_kicker: "يتجدد كل 12 ساعة حسب موقعك",
    hero_title: "اعرف ما يلوح في الأفق — قبل الجميع.",
    hero_sub: "ترندات تصعد بقوة، وفعاليات على الأبواب، وتطبيقات تتصدّر التحميل، مع قراءة واضحة لأسباب صعودها — كل ذلك مفصّل على مقاس منطقتك.",
    hero_cta: "انضم مجاناً واطّلع على النبض",
    hero_cta2: "استعرض نبض اليوم",
    your_region: "منطقتك",
    use_gps: "استخدم موقعي الدقيق",
    global: "عالمي",
    m_horizon: "يلوح في الأفق", m_surging: "ترند صاعد بقوة", m_strength: "مؤشر قوة النبض", m_sources: "المصادر الموثوقة", m_lead: "وقت السبق", m_accuracy: "سجل الدقة والشفافية",
    emerging: "يلوح في الأفق", rising: "صاعد", surging: "صاعد بقوة",
    kind_trend: "ترند", kind_event: "فعالية", kind_app: "تطبيق", kind_news: "خبر", kind_social: "تواصل اجتماعي",
    kind_economy: "اقتصاد واستثمار", tab_horizon: "يلوح في الأفق", ag_all: "كل التطبيقات", ag_most_used: "الأكثر استخداماً", ag_most_traded: "الأكثر تداولاً", ag_spreading: "الأسرع انتشاراً", pf_snapchat: "سناب شات",
    tip_strength: "مؤشر قوة النبض (0–100): يقيس حضور الإشارة في المصادر الموثوقة الآن؛ ما فوق 70 يعني انتشاراً واسعاً وسريعاً.",
    tip_lead: "وقت السبق: عدد الساعات التقديري قبل أن يتصدّر الموضوع التغطية العامة.",
    tip_momentum: "الزخم: «بوادر» تعني إشارات أولى، و«صاعد» نمو ثابت، و«صاعد بقوة» اندفاع لافت.",
    models_unavailable: "غير متاح حالياً",
    horizon_empty: "لا إشارات مبكرة ضمن نافذة 12–72 ساعة حتى الآن.",
    vs_raw: "مصدر واحد", vs_corroborated: "تؤيده مصادر مستقلة", vs_verified: "موثَّق",
    models_title: "قراءات النماذج", geo_unavailable: "غير متاح في هذه الدورة", geo_mentioned: "يذكر علامتك", geo_absent: "لا يذكرها", geo_full10: "اكشف حضورك في النماذج العشرة كاملة وابنِ خطة انتشارك عبر maaroofai.com ←", st_agree: "يؤكّد", st_caution: "يتحفّظ", st_neutral: "محايد",
    go_maaroof: "تابع عبر maaroofai.com", persona: "صفتي", p_merchant: "تاجر", p_creator: "صانع محتوى", p_investor: "مستثمر", p_developer: "مطوّر", p_citizen: "مواطن",
    all_platforms: "كل المنصات", pf_x: "إكس", pf_youtube: "يوتيوب", pf_tiktok: "تيك توك", pf_instagram: "إنستغرام", pf_facebook: "فيسبوك", pf_threads: "ثريدز", pf_telegram: "تيليغرام", pf_linkedin: "لينكدإن", pf_google: "مؤشرات Google", pf_google_play: "Google Play", pf_app_store: "App Store", pf_news: "أخبار", pf_web: "الويب",
    conn_title: "نبض الاتصال", conn_users: "مستخدمو الإنترنت", conn_note: "تقديري", conn_cycle: "إشارات هذه الدورة", conn_vs: "مقارنةً بالدورة السابقة", conn_mix: "توزيع النشاط",
    teaser_title: "نبض اليوم",
    teaser_lock: "بقية نبض اليوم بانتظارك",
    teaser_lock_sub: "أنشئ حسابك مجاناً، وبعد تفعيله تنكشف لك الإشارات كاملة بخرائط الفعاليات وروابط التسجيل وأسباب الصعود ووقت السبق.",
    feat1_t: "فعاليات قريبة منك", feat1_d: "الفعاليات القادمة مع روابط خرائط Google وروابط التسجيل المباشرة.",
    feat2_t: "التطبيقات الأكثر نمواً", feat2_d: "التطبيقات التي تتسع رقعتها في منطقتك، وما الذي يدفعها إلى الواجهة.",
    feat3_t: "مؤشر الحضور في الذكاء الاصطناعي", feat3_d: "مدى حضور علامتك في 3 مساعدات ذكية —  وChatGPT وGemini وClaude . يمكنك الانتقال الى : maaroofai.com لتصل الى 10 نماذج ذكية .",
    feat4_t: "مساعدك الذكي", feat4_d: "اسأل عن النبض الحالي واحصل على إجابات عملية مبنية على البيانات.",
    plans_title: "باقات بسيطة", per_month: "/شهرياً", choose: "ابدأ الآن",
    footer: "صُمّم لروّاد الأعمال والمسوّقين والفرق التي تسبق غيرها بخطوة.",
    hrs: "س", pts: "نقطة",
    auth_title: "أهلاً بك في النبض", auth_signin: "تسجيل الدخول", auth_signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور", name: "الاسم الكامل",
    forgot: "نسيت كلمة المرور؟", or: "أو", g: "المتابعة عبر Google", a: "المتابعة عبر Apple", ms: "المتابعة عبر Microsoft",
    check_email: "تحقق من بريدك لتأكيد الحساب.", reset_sent: "تم إرسال رابط إعادة التعيين.", new_password: "كلمة مرور جديدة", save: "حفظ",
    d_title: "نبضك", d_all: "الكل", d_why: "سرّ الصعود", d_map: "افتح الخريطة", d_register: "سجّل الآن", d_source: "المصدر",
    d_empty: "لم تُرصد إشارات لهذه المنطقة بعد، وستحمل دورة التحديث القادمة جديدها.",
    d_assistant: "المساعد الذكي", d_ask: "اسأل عن الترندات أو الفعاليات أو التطبيقات…", d_send: "إرسال",
    d_geo: "مؤشر الحضور في الذكاء الاصطناعي", d_brand: "علامتك أو منتجك", d_market: "السوق (مثل السعودية)", d_check: "افحص الحضور", d_overall: "الحضور العام",
    banned: "حسابك موقوف حالياً، يُرجى التواصل مع فريق الدعم.",
    pending_title: "حسابك قيد التفعيل",
    pending_sub: "تتصفّح الآن نسخة مختصرة: العناوين ومؤشر قوة النبض فحسب. يتولى فريقنا تفعيل وصولك الكامل لتطّلع على التفاصيل وأسباب الصعود والخرائط وروابط التسجيل والمساعد الذكي.",
    loc_detected: "رصدنا موقعك في:", loc_precise: "حدّد موقعي بدقة", loc_change: "اختر يدوياً", loc_denied: "لم تُمنح صلاحية الوصول إلى الموقع، اختر دولتك من القائمة.",
    loc_ask: "هل تودّ نتائج أدق؟", search_country: "ابحث عن دولة…", no_country: "لا توجد دولة بهذا الاسم",
    last_update: "آخر تحديث", next_update: "التحديث القادم",
    g_global: "عالمي", g_gulf: "الخليج العربي", g_levant: "بلاد الشام والعراق", g_africa: "مصر والمغرب العربي", g_europe: "أوروبا", g_americas: "الأمريكتان", g_asia: "آسيا وأوقيانوسيا",
  },
} as const;

export type Key = keyof typeof dict.en;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string; theme: Theme; toggleTheme: () => void };
const g = globalThis as unknown as { __pulseI18nCtx?: React.Context<Ctx | null> };
const I18nCtx = (g.__pulseI18nCtx ??= createContext<Ctx | null>(null));

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const l = localStorage.getItem("pulse_lang") as Lang | null;
    const th = localStorage.getItem("pulse_theme") as Theme | null;
    if (l) setLangState(l);
    if (th) setTheme(th);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("pulse_lang", l); };
  const toggleTheme = () => setTheme((p) => { const n = p === "dark" ? "light" : "dark"; localStorage.setItem("pulse_theme", n); return n; });
  return <I18nCtx.Provider value={{ lang, setLang, t: (k) => dict[lang][k], theme, toggleTheme }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

type R = { code: string; en: string; ar: string; g: "global" | "gulf" | "levant" | "africa" | "europe" | "americas" | "asia" };
const r = (g: R["g"], list: [string, string, string][]): R[] => list.map(([code, en, ar]) => ({ code, en, ar, g }));
export const REGION_GROUPS = ["global", "gulf", "levant", "africa", "europe", "americas", "asia"] as const;
export const REGIONS: R[] = [
  { code: "global", en: "Global", ar: "عالمي", g: "global" },
  ...r("gulf", [["SA","Saudi Arabia","السعودية"],["AE","UAE","الإمارات"],["KW","Kuwait","الكويت"],["QA","Qatar","قطر"],["BH","Bahrain","البحرين"],["OM","Oman","عُمان"],["YE","Yemen","اليمن"]]),
  ...r("levant", [["IQ","Iraq","العراق"],["LB","Lebanon","لبنان"],["JO","Jordan","الأردن"],["SY","Syria","سوريا"],["PS","Palestine","فلسطين"]]),
  ...r("africa", [["EG","Egypt","مصر"],["MA","Morocco","المغرب"],["DZ","Algeria","الجزائر"],["TN","Tunisia","تونس"],["LY","Libya","ليبيا"],["SD","Sudan","السودان"],["MR","Mauritania","موريتانيا"],["NG","Nigeria","نيجيريا"],["ZA","South Africa","جنوب أفريقيا"],["KE","Kenya","كينيا"]]),
  ...r("europe", [["GB","United Kingdom","المملكة المتحدة"],["NL","Netherlands","هولندا"],["DE","Germany","ألمانيا"],["FR","France","فرنسا"],["ES","Spain","إسبانيا"],["IT","Italy","إيطاليا"],["BE","Belgium","بلجيكا"],["SE","Sweden","السويد"],["NO","Norway","النرويج"],["DK","Denmark","الدنمارك"],["CH","Switzerland","سويسرا"],["AT","Austria","النمسا"],["IE","Ireland","أيرلندا"],["PT","Portugal","البرتغال"],["PL","Poland","بولندا"],["GR","Greece","اليونان"],["TR","Türkiye","تركيا"],["UA","Ukraine","أوكرانيا"]]),
  ...r("americas", [["US","United States","الولايات المتحدة"],["CA","Canada","كندا"],["MX","Mexico","المكسيك"],["BR","Brazil","البرازيل"],["AR","Argentina","الأرجنتين"],["CL","Chile","تشيلي"],["CO","Colombia","كولومبيا"]]),
  ...r("asia", [["AU","Australia","أستراليا"],["NZ","New Zealand","نيوزيلندا"],["IN","India","الهند"],["PK","Pakistan","باكستان"],["ID","Indonesia","إندونيسيا"],["MY","Malaysia","ماليزيا"],["SG","Singapore","سنغافورة"],["JP","Japan","اليابان"],["KR","South Korea","كوريا الجنوبية"],["CN","China","الصين"],["PH","Philippines","الفلبين"],["TH","Thailand","تايلاند"],["IR","Iran","إيران"]]),
];
export const regionName = (code: string, lang: Lang) => { const x = REGIONS.find((r) => r.code === code); return x ? x[lang] : code; };
