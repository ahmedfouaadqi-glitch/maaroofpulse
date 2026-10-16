import { describe, it, expect, afterEach, vi } from "vitest";
import { isHorizon, classifyCost, withinCap, redact, classifyVerification } from "@/lib/phase1";
import { apiDirectStatus, apiDirectFetch } from "@/lib/apidirect.server";

const now = Date.parse("2026-10-16T12:00:00Z");
const recent = "2026-10-16T06:00:00Z";

describe("horizon definition", () => {
  it("counts only non-surging 12–72h lead, recent, published", () => {
    expect(isHorizon({ momentum: "rising", lead_time_hours: 24, created_at: recent, status: "published" }, now)).toBe(true);
    expect(isHorizon({ momentum: "surging", lead_time_hours: 24, created_at: recent }, now)).toBe(false);
    expect(isHorizon({ momentum: "emerging", lead_time_hours: 6, created_at: recent }, now)).toBe(false);
    expect(isHorizon({ momentum: "emerging", lead_time_hours: 90, created_at: recent }, now)).toBe(false);
    expect(isHorizon({ momentum: "rising", lead_time_hours: 24, created_at: "2026-10-10T00:00:00Z" }, now)).toBe(false);
    expect(isHorizon({ momentum: "rising", lead_time_hours: 24, created_at: recent, status: "draft" }, now)).toBe(false);
  });
});

describe("cost classification", () => {
  it("actual only when provider reports it", () => {
    expect(classifyCost({ reported: 5, estimate: 1 }).type).toBe("actual");
    expect(classifyCost({ reported: undefined, estimate: 1 })).toMatchObject({ type: "estimated", amount: 1 });
    expect(classifyCost({ reported: "abc", estimate: 2 }).type).toBe("estimated");
    expect(classifyCost({ free: true }).type).toBe("free");
  });
  it("enforces the spend cap; no cap blocks paid calls", () => {
    expect(withinCap(90, 5, 100)).toBe(true);
    expect(withinCap(98, 5, 100)).toBe(false);
    expect(withinCap(0, 1, 0)).toBe(false);
  });
  it("redacts secrets from errors", () => {
    const r = redact("401 Bearer fc-abcdef123456789 api_key=supersecretvalue");
    expect(r).not.toContain("abcdef123456789");
    expect(r).not.toContain("supersecretvalue");
  });
});

describe("verification", () => {
  it("syndicated reposts count once", () => {
    const v = classifyVerification([
      { url: "https://a.com/x", publisher: "a.com", title: "Iraq launches new digital payments platform" },
      { url: "https://b.com/y", publisher: "b.com", title: "Iraq launches new digital payments platform" },
    ]);
    expect(v.status).toBe("raw");
  });
  it("same publisher on different URLs is not independent", () => {
    expect(classifyVerification([{ url: "https://a.com/1", publisher: "A", title: "x one" }, { url: "https://a.com/2", publisher: "a", title: "other topic entirely" }]).status).toBe("raw");
  });
  it("two independent publishers corroborate; primary makes verified", () => {
    const evs = [
      { url: "https://a.com/x", publisher: "a.com", title: "Central bank raises rates" },
      { url: "https://b.com/y", publisher: "b.com", title: "Interest decision surprises markets in Amman" },
    ];
    expect(classifyVerification(evs).status).toBe("corroborated");
    expect(classifyVerification([...evs.slice(0, 1), { ...evs[1]!, evidence_type: "primary" as const }]).status).toBe("verified");
  });
});

describe("API Direct", () => {
  afterEach(() => { delete process.env["APIDIRECT_API_KEY"]; vi.restoreAllMocks(); });
  it("disabled without key and makes no network call", async () => {
    delete process.env["APIDIRECT_API_KEY"];
    const f = vi.spyOn(globalThis, "fetch");
    expect(apiDirectStatus().state).toBe("disabled");
    expect(await apiDirectFetch("anything")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("enabled with a key; generic fetch still returns no mock data", async () => {
    process.env["APIDIRECT_API_KEY"] = "x";
    expect(apiDirectStatus().state).toBe("enabled");
    expect(await apiDirectFetch("anything")).toBeNull();
  });
});
