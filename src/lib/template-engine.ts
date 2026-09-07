/**
 * Template & Spintax Engine
 * 
 * Supports:
 * - Tag Spintax: {{RANDOM | Dear | Hello | Hi | Good day}}
 * - Standard Spintax: {Option A | Option B | Option C}
 * - Merge Tags with optional fallbacks: {{firstName | there}}, {{company | your company}}
 */

export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined | null>,
): string {
  if (!template) return "";

  // 1. Resolve Tag Spintax: {{RANDOM | opt1 | opt2 | ...}}
  let output = template.replace(/\{\{RANDOM\s*\|([^}]+)\}\}/gi, (_, choices) => {
    const opts = choices
      .split("|")
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (opts.length === 0) return "";
    return opts[Math.floor(Math.random() * opts.length)] || "";
  });

  // 2. Resolve Merge Tags: {{key}} or {{key | fallback}}
  output = output.replace(/\{\{([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]+))?\}\}/g, (match, key, fallback) => {
    // Avoid re-matching RANDOM if any escaped
    if (key.toUpperCase() === "RANDOM") return match;

    const val = variables[key];
    if (val && typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
    return fallback ? fallback.trim() : "";
  });

  // 3. Resolve Standard Spintax: {opt1 | opt2 | ...}
  // Make sure we only match brackets that contain a pipe delimiter and are not double braces
  output = output.replace(/(?<!\{)\{([^{}\n]+)\}(?!\})/g, (match, content) => {
    if (!content.includes("|")) return match;
    const opts = content
      .split("|")
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (opts.length === 0) return "";
    return opts[Math.floor(Math.random() * opts.length)] || "";
  });

  return output;
}

export function extractTemplateVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{([a-zA-Z0-9_]+)(?:\s*\|\s*[^}]+)?\}\}/g);
  const vars = new Set<string>();
  for (const m of matches) {
    const key = m[1];
    if (key.toUpperCase() !== "RANDOM") {
      vars.add(key);
    }
  }
  return Array.from(vars);
}
