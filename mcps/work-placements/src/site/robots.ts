// robots.txt as RFC 9309 reads it: the group for our product token, else "*"; the longest matching rule
// wins, Allow on a tie; "*" and "$" in paths. A missing file (4xx) allows everything; a server error
// or no answer disallows everything, until it answers.

export interface Rule {
  allow: boolean;
  path: string;
}

/** The rules for this agent: its own group if the file has one, else the "*" group. */
export function rulesFor(text: string, token: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | undefined;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, field = "", value = ""] = match;
    const key = field.toLowerCase();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key === "allow" || key === "disallow") {
      lastWasAgent = false;
      if (current && value) current.rules.push({ allow: key === "allow", path: value });
    } else lastWasAgent = false;
  }
  const own = groups.filter((g) => g.agents.some((a) => a !== "*" && token.toLowerCase().startsWith(a)));
  const chosen = own.length ? own : groups.filter((g) => g.agents.includes("*"));
  return chosen.flatMap((g) => g.rules);
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

/** Whether a path (with its query) may be fetched under these rules. */
export function allowed(rules: Rule[], path: string): boolean {
  let best: Rule | undefined;
  for (const rule of rules) {
    if (!matches(rule.path, path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  }
  return best ? best.allow : true;
}
