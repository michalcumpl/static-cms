// Which paths a site's robots.txt lets every crawler fetch (site-import spec, "Safe fetching";
// design decision 5): the group for `*`, the longest matching rule winning, and `Allow` winning
// over `Disallow` at equal length. `*` and a trailing `$` in a rule work as Google reads them.

interface Rule {
  allow: boolean;
  length: number;
  pattern: RegExp;
}

/** Whether robots.txt allows fetching a path (with its query). An empty file allows all. */
export type RobotsRules = (path: string) => boolean;

export function robotsRules(text: string | undefined): RobotsRules {
  const rules = text ? rulesForEveryone(text) : [];
  return (path) => {
    let best: Rule | undefined;
    for (const rule of rules) {
      if (!rule.pattern.test(path)) continue;
      if (!best || rule.length > best.length || (rule.length === best.length && rule.allow)) {
        best = rule;
      }
    }
    return best?.allow ?? true;
  };
}

function rulesForEveryone(text: string): Rule[] {
  const rules: Rule[] = [];
  let agents: string[] = [];
  let inRules = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const field = (match[1] ?? "").toLowerCase();
    const value = (match[2] ?? "").trim();
    if (field === "user-agent") {
      // A user-agent line after rules starts a new group.
      if (inRules) agents = [];
      inRules = false;
      agents.push(value.toLowerCase());
    } else if (field === "allow" || field === "disallow") {
      inRules = true;
      // An empty Disallow allows everything; it adds no rule.
      if (agents.includes("*") && value !== "") {
        rules.push({ allow: field === "allow", length: value.length, pattern: toPattern(value) });
      }
    }
  }
  return rules;
}

function toPattern(rule: string): RegExp {
  const anchored = rule.endsWith("$");
  const body = (anchored ? rule.slice(0, -1) : rule)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}
