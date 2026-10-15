import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { runCrawlNow } from "@/lib/pulse.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — MAAROOF PULSE" },
      { name: "description", content: "Manage plans, users, sources and settings." },
      { property: "og:title", content: "Admin — MAAROOF PULSE" },
      { property: "og:description", content: "Platform administration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isStaff, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isStaff) return (<div className="min-h-screen"><SiteHeader /><p className="p-16 text-center text-muted-foreground">Access restricted.</p></div>);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold">Control center</h1>
        <Tabs defaultValue="content">
          <TabsList className="flex-wrap">
            <TabsTrigger value="content">Content & signals</TabsTrigger>
            <TabsTrigger value="sources">Target registry</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
            {isAdmin && <TabsTrigger value="plans">Plans</TabsTrigger>}
            {isAdmin && <TabsTrigger value="countries">Internet users</TabsTrigger>}
            {isAdmin && <TabsTrigger value="settings">Settings & flags</TabsTrigger>}
          </TabsList>
          <TabsContent value="content"><ContentTab /></TabsContent>
          <TabsContent value="sources"><SourcesTab /></TabsContent>
          {isAdmin && <TabsContent value="users"><UsersTab /></TabsContent>}
          {isAdmin && <TabsContent value="plans"><PlansTab /></TabsContent>}
          {isAdmin && <TabsContent value="countries"><CountriesTab /></TabsContent>}
          {isAdmin && <TabsContent value="settings"><SettingsTab /></TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}

function ContentTab() {
  const qc = useQueryClient();
  const crawl = useServerFn(runCrawlNow);
  const [busy, setBusy] = useState(false);
  const { data: signals } = useQuery({ queryKey: ["admin-signals"], queryFn: async () => (await supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: async () => (await supabase.from("crawl_runs").select("*").order("started_at", { ascending: false }).limit(5)).data ?? [] });
  async function run(force: boolean) {
    setBusy(true);
    try {
      const r = await crawl({ data: { force } });
      toast.success(`Crawled ${r.sources} sources · ${r.created} new signals`);
      if (r.errors?.length) toast.error(r.errors.join("\n"));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
    qc.invalidateQueries();
  }
  async function setStatus(id: string, status: string) {
    await supabase.from("signals").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-signals"] });
  }
  async function del(id: string) {
    await supabase.from("signals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-signals"] });
  }
  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(false)} disabled={busy}><Play className="h-4 w-4" />{busy ? "Running…" : "Refresh due sources"}</Button>
        <Button variant="outline" onClick={() => run(true)} disabled={busy}>Force refresh all</Button>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="mb-2 font-semibold">Recent cycles</div>
        {(runs ?? []).map((r) => <div key={r.id} className="flex gap-3 text-muted-foreground"><span>{new Date(r.started_at).toLocaleString()}</span><Badge variant="secondary">{r.status}</Badge><span>{r.signals_created} signals</span></div>)}
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Kind</TableHead><TableHead>Platform</TableHead><TableHead>Region</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {(signals ?? []).map((s) => (
            <TableRow key={s.id}>
              <TableCell className="max-w-md">{s.title}</TableCell>
              <TableCell>{s.kind}</TableCell><TableCell>{s.platform ?? "—"}</TableCell><TableCell>{s.region}</TableCell><TableCell>{s.pulse_score}</TableCell>
              <TableCell>
                <Select value={s.status} onValueChange={(v) => setStatus(s.id, v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{["published", "pending", "rejected"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </TableCell>
              <TableCell><Button variant="ghost" size="icon" onClick={() => del(s.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SourcesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["sources"], queryFn: async () => (await supabase.from("sources").select("*").order("created_at")).data ?? [] });
  const [f, setF] = useState({ name: "", url: "", kind: "trend", region: "global", platform: "web" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sources"] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("sources").insert(f);
    if (error) { toast.error(error.message); return; }
    setF({ name: "", url: "", kind: "trend", region: "global", platform: "web" }); refresh();
  }
  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={add} className="grid gap-2 md:grid-cols-[1fr_2fr_120px_130px_110px_auto]">
        <Input required placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input required type="url" placeholder="https://…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["trend", "event", "app", "news", "social"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
        <Select value={f.platform} onValueChange={(v) => setF({ ...f, platform: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["x", "youtube", "tiktok", "instagram", "facebook", "threads", "telegram", "linkedin", "google", "google_play", "app_store", "news", "web"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Region (SA, global)" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} />
        <Button type="submit"><Plus className="h-4 w-4" />Add</Button>
      </form>
      <Table>
        <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Kind</TableHead><TableHead>Platform</TableHead><TableHead>Region</TableHead><TableHead>Last crawl</TableHead><TableHead>Active</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((s) => (
            <TableRow key={s.id}>
              <TableCell><div className="font-medium">{s.name}</div><div className="max-w-xs truncate text-xs text-muted-foreground">{s.url}</div></TableCell>
              <TableCell>{s.kind}</TableCell><TableCell>{s.platform ?? "—"}</TableCell><TableCell>{s.region}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : "—"}<div>{s.last_status}</div></TableCell>
              <TableCell><Switch checked={s.is_active} onCheckedChange={async (v) => { await supabase.from("sources").update({ is_active: v }).eq("id", s.id); refresh(); }} /></TableCell>
              <TableCell><Button variant="ghost" size="icon" aria-label="Delete" onClick={async () => { await supabase.from("sources").delete().eq("id", s.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const ROLES = ["super_admin", "editor", "subscriber", "guest"] as const;

function UsersTab() {
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: roles } = useQuery({ queryKey: ["admin-roles"], queryFn: async () => (await supabase.from("user_roles").select("user_id,role")).data ?? [] });
  const { data: plans } = useQuery({ queryKey: ["admin-plans"], queryFn: async () => (await supabase.from("plans").select("slug,name_en").order("sort_order")).data ?? [] });
  const { data: activity } = useQuery({ queryKey: ["admin-activity"], queryFn: async () => (await supabase.from("user_activity").select("user_id").limit(1000)).data ?? [] });
  const primaryRole = (id: string) => ROLES.find((r) => roles?.some((x) => x.user_id === id && x.role === r)) ?? "guest";
  async function setRole(id: string, role: (typeof ROLES)[number]) {
    await supabase.from("user_roles").delete().eq("user_id", id);
    const { error } = await supabase.from("user_roles").insert({ user_id: id, role });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  }
  async function update(id: string, patch: { plan_slug?: string; banned?: boolean }) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }
  const [pendingOnly, setPendingOnly] = useState(false);
  async function activate(id: string, on: boolean) {
    await setRole(id, on ? "subscriber" : "guest");
    if (on) {
      const u = users?.find((x) => x.id === id);
      if (u?.plan_slug === "free") await update(id, { plan_slug: plans?.find((p) => p.slug !== "free")?.slug ?? "free" });
    } else await update(id, { plan_slug: "free" });
    toast.success(on ? "Activated" : "Deactivated");
  }
  const shown = (users ?? []).filter((u) => !pendingOnly || primaryRole(u.id) === "guest");
  return (
    <div className="mt-6">
    <label className="flex items-center gap-2 text-sm"><Switch checked={pendingOnly} onCheckedChange={setPendingOnly} />Awaiting activation only ({(users ?? []).filter((u) => primaryRole(u.id) === "guest").length})</label>
    <Table className="mt-4">
      <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Access</TableHead><TableHead>Role</TableHead><TableHead>Plan</TableHead><TableHead>Activity</TableHead><TableHead>Banned</TableHead></TableRow></TableHeader>
      <TableBody>
        {shown.map((u) => (
          <TableRow key={u.id}>
            <TableCell><div className="font-medium">{u.display_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
            <TableCell>{primaryRole(u.id) === "guest"
              ? <Button size="sm" onClick={() => activate(u.id, true)}>Activate subscription</Button>
              : primaryRole(u.id) === "subscriber" ? <Button size="sm" variant="outline" onClick={() => activate(u.id, false)}>Deactivate</Button> : <span className="text-xs text-muted-foreground">Staff</span>}</TableCell>
            <TableCell>
              <Select value={primaryRole(u.id)} onValueChange={(v) => setRole(u.id, v as (typeof ROLES)[number])}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select value={u.plan_slug} onValueChange={(v) => update(u.id, { plan_slug: v })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{(plans ?? []).map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name_en}</SelectItem>)}</SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{activity?.filter((a) => a.user_id === u.id).length ?? 0} actions<div>{u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : "—"}</div></TableCell>
            <TableCell><Switch checked={u.banned} onCheckedChange={(v) => update(u.id, { banned: v })} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-plans-full"], queryFn: async () => (await supabase.from("plans").select("*").order("sort_order")).data ?? [] });
  async function save(id: string, patch: any) {
    const { error } = await supabase.from("plans").update(patch).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Saved");
    qc.invalidateQueries();
  }
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {(data ?? []).map((p) => (
        <div key={p.id} className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between"><span className="font-semibold">{p.slug}</span><Switch checked={p.is_active} onCheckedChange={(v) => save(p.id, { is_active: v })} /></div>
          <Input defaultValue={p.name_en} onBlur={(e) => save(p.id, { name_en: e.target.value })} aria-label="Name EN" />
          <Input defaultValue={p.name_ar} dir="rtl" onBlur={(e) => save(p.id, { name_ar: e.target.value })} aria-label="Name AR" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" defaultValue={p.price_monthly} onBlur={(e) => save(p.id, { price_monthly: Number(e.target.value) })} aria-label="Monthly" />
            <Input type="number" defaultValue={p.price_yearly} onBlur={(e) => save(p.id, { price_yearly: Number(e.target.value) })} aria-label="Yearly" />
          </div>
          <textarea className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm" defaultValue={p.features_en.join("\n")} onBlur={(e) => save(p.id, { features_en: e.target.value.split("\n").filter(Boolean) })} aria-label="Features EN" />
          <textarea dir="rtl" className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm" defaultValue={p.features_ar.join("\n")} onBlur={(e) => save(p.id, { features_ar: e.target.value.split("\n").filter(Boolean) })} aria-label="Features AR" />
          <label className="flex items-center gap-2 text-sm"><Switch checked={p.is_featured} onCheckedChange={(v) => save(p.id, { is_featured: v })} />Featured</label>
        </div>
      ))}
    </div>
  );
}

function CountriesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-country-stats"], queryFn: async () => (await supabase.from("country_stats").select("*").order("code")).data ?? [] });
  const [n, setN] = useState({ code: "", internet_users: "", population: "", source: "", year: String(new Date().getFullYear()) });
  async function save(code: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("country_stats").upsert({ code, ...patch, updated_at: new Date().toISOString() } as never);
    if (error) toast.error(error.message); else toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-country-stats"] });
  }
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[, ]/g, "")));
  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); if (!/^[A-Z]{2}$/.test(n.code)) { toast.error("Code must be 2 letters, e.g. IQ"); return; } save(n.code, { internet_users: num(n.internet_users), population: num(n.population), source: n.source || null, year: num(n.year) }); setN({ ...n, code: "", internet_users: "", population: "" }); }} className="grid gap-2 md:grid-cols-[90px_1fr_1fr_1fr_90px_auto]">
        <Input placeholder="IQ" value={n.code} onChange={(e) => setN({ ...n, code: e.target.value.toUpperCase().slice(0, 2) })} />
        <Input placeholder="Internet users" value={n.internet_users} onChange={(e) => setN({ ...n, internet_users: e.target.value })} />
        <Input placeholder="Population" value={n.population} onChange={(e) => setN({ ...n, population: e.target.value })} />
        <Input placeholder="Source" value={n.source} onChange={(e) => setN({ ...n, source: e.target.value })} />
        <Input placeholder="Year" value={n.year} onChange={(e) => setN({ ...n, year: e.target.value })} />
        <Button type="submit"><Plus className="h-4 w-4" />Add</Button>
      </form>
      <Table>
        <TableHeader><TableRow><TableHead>Country</TableHead><TableHead>Internet users</TableHead><TableHead>Population</TableHead><TableHead>Source</TableHead><TableHead>Year</TableHead></TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((c) => (
            <TableRow key={c.code}>
              <TableCell className="font-medium">{c.code}</TableCell>
              <TableCell><Input className="w-36" defaultValue={c.internet_users ?? ""} onBlur={(e) => save(c.code, { internet_users: num(e.target.value) })} /></TableCell>
              <TableCell><Input className="w-36" defaultValue={c.population ?? ""} onBlur={(e) => save(c.code, { population: num(e.target.value) })} /></TableCell>
              <TableCell><Input defaultValue={c.source ?? ""} onBlur={(e) => save(c.code, { source: e.target.value || null })} /></TableCell>
              <TableCell><Input className="w-20" defaultValue={c.year ?? ""} onBlur={(e) => save(c.code, { year: num(e.target.value) })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("app_settings").select("*").order("key")).data ?? [] });
  async function save(key: string, value: unknown) {
    const { error } = await supabase.from("app_settings").update({ value: value as never, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) toast.error(error.message); else toast.success("Saved");
    qc.invalidateQueries();
  }
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {(data ?? []).map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
          <div><div className="font-medium">{s.key}</div><div className="text-xs text-muted-foreground">{s.description}</div></div>
          {typeof s.value === "boolean" ? (
            <Switch checked={s.value} onCheckedChange={(v) => save(s.key, v)} />
          ) : (
            <Input className="w-28" defaultValue={String(s.value)} onBlur={(e) => save(s.key, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))} />
          )}
        </div>
      ))}
    </div>
  );
}
