import { useState } from "react";
import { LocateFixed, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { REGIONS, REGION_GROUPS, regionName, useI18n, type Key } from "@/lib/i18n";

export function RegionPicker({ region, setRegion, useGps }: { region: string; setRegion: (r: string) => void; useGps: () => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-52 justify-between" aria-label={t("your_region")}>
            {regionName(region, lang)}<ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <Command filter={(v, s) => (v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder={t("search_country")} />
            <CommandList>
              <CommandEmpty>{t("no_country")}</CommandEmpty>
              {REGION_GROUPS.map((g) => (
                <CommandGroup key={g} heading={t(`g_${g}` as Key)}>
                  {REGIONS.filter((r) => r.g === g).map((r) => (
                    <CommandItem key={r.code} value={`${r.en} ${r.ar} ${r.code}`} onSelect={() => { setRegion(r.code); setOpen(false); }}>
                      <Check className={`h-4 w-4 ${region === r.code ? "opacity-100" : "opacity-0"}`} />{r[lang]}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="icon" onClick={useGps} title={t("use_gps")} aria-label={t("use_gps")}>
        <LocateFixed className="h-4 w-4" />
      </Button>
    </div>
  );
}
