// Server-only helper: streams a Lovable AI Gateway chat completion and returns the final text.
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function aiComplete(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { model?: string; json?: boolean } = {},
): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError(401, "AI is not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      stream: true,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    let msg = body;
    try {
      msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? body;
    } catch {}
    if (res.status === 402) msg = "AI credits are exhausted. Add credits in Settings → Plans & credits.";
    if (res.status === 429) msg = "Too many requests right now — please try again shortly.";
    throw new AiError(res.status, msg || `AI request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        out += j.choices?.[0]?.delta?.content ?? "";
      } catch {}
    }
  }
  return out;
}

export function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}
