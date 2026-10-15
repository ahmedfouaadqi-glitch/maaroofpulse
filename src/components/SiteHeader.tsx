import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Languages, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function Logo() {
  const { t } = useI18n();
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full rounded-full bg-pulse animate-beat" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-pulse" />
      </span>
      {t("brand")}
    </Link>
  );
}

export function SiteHeader() {
  const { t, lang, setLang, theme, toggleTheme } = useI18n();
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-1">
          {user && (
            <Button asChild variant="ghost" size="sm"><Link to="/dashboard">{t("nav_dashboard")}</Link></Button>
          )}
          {isStaff && (
            <Button asChild variant="ghost" size="sm"><Link to="/admin">{t("nav_admin")}</Link></Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Language" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
            <Languages className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Theme" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" />{t("nav_signout")}</Button>
          ) : (
            <Button asChild size="sm"><Link to="/auth">{t("nav_signin")}</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
