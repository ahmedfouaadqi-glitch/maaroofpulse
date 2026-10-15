import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONS, useI18n } from "@/lib/i18n";

export function RegionPicker({ region, setRegion, useGps }: { region: string; setRegion: (r: string) => void; useGps: () => void }) {
  const { t, lang } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <Select value={region} onValueChange={setRegion}>
        <SelectTrigger className="w-48" aria-label={t("your_region")}><SelectValue /></SelectTrigger>
        <SelectContent>
          {REGIONS.map((r) => <SelectItem key={r.code} value={r.code}>{lang === "ar" ? r.ar : r.en}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={useGps} title={t("use_gps")} aria-label={t("use_gps")}>
        <LocateFixed className="h-4 w-4" />
      </Button>
    </div>
  );
}
