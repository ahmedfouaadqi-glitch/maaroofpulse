import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";
type Theme = "dark" | "light";

const dict = {
  en: {
    brand: "MAAROOF PULSE",
    nav_pulse: "Live pulse", nav_dashboard: "Dashboard", nav_admin: "Admin", nav_signin: "Sign in", nav_signout: "Sign out", nav_pricing: "Plans",
    hero_kicker: "Updated every 12 hours for your location",
    hero_title: "See what's on the horizon — before everyone else.",
    hero_sub: "Trends rising fast, upcoming events, the apps everyone is downloading, and why — tuned to where you are.",
    hero_cta: "Unlock the full pulse — free",
    hero_cta2: "See today's pulse",
    your_region: "Your region",
    use_gps: "Use precise location",
    global: "Global",
    m_horizon: "On the horizon", m_surging: "Rising strongly", m_strength: "Pulse strength", m_sources: "Trusted sources", m_lead: "Lead time", m_accuracy: "Accuracy & transparency log",
    emerging: "On the horizon", rising: "Rising", surging: "Rising strongly",
    kind_trend: "Trend", kind_event: "Event", kind_app: "App", kind_news: "News",
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
  },
  ar: {
    brand: "معروف بلس",
    nav_pulse: "النبض اللحظي", nav_dashboard: "لوحتي", nav_admin: "الإدارة", nav_signin: "تسجيل الدخول", nav_signout: "خروج", nav_pricing: "الباقات",
    hero_kicker: "يتجدد كل 12 ساعة حسب موقعك",
    hero_title: "اعرف ما يلوح في الأفق — قبل الجميع.",
    hero_sub: "ترندات صاعدة بقوة، فعاليات قادمة، التطبيقات الأكثر انتشاراً، وأسباب صعودها — مخصصة لمكانك.",
    hero_cta: "افتح النبض كاملاً — مجاناً",
    hero_cta2: "شاهد نبض اليوم",
    your_region: "منطقتك",
    use_gps: "استخدم موقعي الدقيق",
    global: "عالمي",
    m_horizon: "يلوح في الأفق", m_surging: "ترند صاعد بقوة", m_strength: "مؤشر قوة النبض", m_sources: "المصادر الموثوقة", m_lead: "وقت السبق", m_accuracy: "سجل الدقة والشفافية",
    emerging: "يلوح في الأفق", rising: "صاعد", surging: "صاعد بقوة",
    kind_trend: "ترند", kind_event: "فعالية", kind_app: "تطبيق", kind_news: "خبر",
    teaser_title: "نبض اليوم",
    teaser_lock: "بقية نبض اليوم بانتظارك",
    teaser_lock_sub: "أنشئ حساباً مجانياً لترى كل الإشارات وخرائط الفعاليات وروابط التسجيل وأسباب الصعود ووقت السبق.",
    feat1_t: "فعاليات قريبة منك", feat1_d: "الفعاليات القادمة مع روابط خرائط Google وروابط التسجيل المباشرة.",
    feat2_t: "التطبيقات الأكثر نمواً", feat2_d: "التطبيقات التي تكسب أرضاً في منطقتك وأسباب صعودها.",
    feat3_t: "مؤشر الحضور في الذكاء الاصطناعي", feat3_d: "مدى حضور علامتك في 10 مساعدات ذكية — DeepSeek وChatGPT وGemini وClaude وPerplexity وCopilot وGrok وMistral وKimi وQwen.",
    feat4_t: "مساعدك الذكي", feat4_d: "اسأل عن النبض الحالي واحصل على إجابات عملية مبنية على البيانات.",
    plans_title: "باقات بسيطة", per_month: "/شهرياً", choose: "ابدأ الآن",
    footer: "صُمم لرواد الأعمال والمسوقين والفرق التي تتحرك أولاً.",
    hrs: "س", pts: "نقطة",
    auth_title: "أهلاً بك في النبض", auth_signin: "تسجيل الدخول", auth_signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور", name: "الاسم الكامل",
    forgot: "نسيت كلمة المرور؟", or: "أو", g: "المتابعة عبر Google", a: "المتابعة عبر Apple", ms: "المتابعة عبر Microsoft",
    check_email: "تحقق من بريدك لتأكيد الحساب.", reset_sent: "تم إرسال رابط إعادة التعيين.", new_password: "كلمة مرور جديدة", save: "حفظ",
    d_title: "نبضك", d_all: "الكل", d_why: "لماذا يصعد", d_map: "افتح الخريطة", d_register: "سجّل الآن", d_source: "المصدر",
    d_empty: "لا توجد إشارات لهذه المنطقة بعد. ستملؤها دورة التحديث القادمة.",
    d_assistant: "المساعد الذكي", d_ask: "اسأل عن الترندات أو الفعاليات أو التطبيقات…", d_send: "إرسال",
    d_geo: "مؤشر الحضور في الذكاء الاصطناعي", d_brand: "علامتك أو منتجك", d_market: "السوق (مثل السعودية)", d_check: "افحص الحضور", d_overall: "الحضور العام",
    banned: "حسابك موقوف. تواصل مع الدعم.",
  },
} as const;

export type Key = keyof typeof dict.en;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string; theme: Theme; toggleTheme: () => void };
const I18nCtx = createContext<Ctx | null>(null);

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

export const REGIONS = [
  { code: "global", en: "Global", ar: "عالمي" },
  { code: "SA", en: "Saudi Arabia", ar: "السعودية" },
  { code: "AE", en: "UAE", ar: "الإمارات" },
  { code: "EG", en: "Egypt", ar: "مصر" },
  { code: "KW", en: "Kuwait", ar: "الكويت" },
  { code: "QA", en: "Qatar", ar: "قطر" },
  { code: "US", en: "United States", ar: "الولايات المتحدة" },
  { code: "GB", en: "United Kingdom", ar: "المملكة المتحدة" },
];
