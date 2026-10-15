import { useEffect, useState } from "react";
import { toast } from "sonner";
import { detectRegion } from "@/lib/pulse.functions";
import { REGIONS, regionName, useI18n } from "@/lib/i18n";

const known = new Set(REGIONS.map((r) => r.code));

export function useRegion() {
  const { t, lang } = useI18n();
  const [region, setRegionState] = useState<string>("global");
  const setRegion = (r: string) => { setRegionState(r); localStorage.setItem("pulse_region", r); };

  const useGps = () => {
    if (!navigator.geolocation) { toast.error(t("loc_denied")); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
          const j = await res.json();
          const c = String(j.countryCode ?? "").toUpperCase();
          const code = known.has(c) ? c : "global";
          setRegion(code);
          toast.success(`${t("loc_detected")} ${regionName(code, lang)}`);
        } catch { toast.error(t("loc_denied")); }
      },
      () => toast.error(t("loc_denied")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  useEffect(() => {
    const saved = localStorage.getItem("pulse_region");
    if (saved && known.has(saved)) { setRegionState(saved); return; }
    detectRegion().then((r) => {
      const code = r.country && known.has(r.country) ? r.country : "global";
      setRegion(code);
      toast(`${t("loc_detected")} ${regionName(code, lang)}`, {
        description: t("loc_ask"),
        duration: 12000,
        action: { label: t("loc_precise"), onClick: useGps },
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { region, setRegion, useGps };
}
