import { useEffect, useState } from "react";
import { detectRegion } from "@/lib/pulse.functions";
import { REGIONS } from "@/lib/i18n";

const known = new Set(REGIONS.map((r) => r.code));

export function useRegion() {
  const [region, setRegionState] = useState<string>("global");
  useEffect(() => {
    const saved = localStorage.getItem("pulse_region");
    if (saved) { setRegionState(saved); return; }
    detectRegion().then((r) => { if (r.country && known.has(r.country)) setRegionState(r.country); }).catch(() => {});
  }, []);
  const setRegion = (r: string) => { setRegionState(r); localStorage.setItem("pulse_region", r); };
  const useGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
        const j = await res.json();
        const c = String(j.countryCode ?? "").toUpperCase();
        setRegion(known.has(c) ? c : "global");
      } catch {}
    });
  };
  return { region, setRegion, useGps };
}
