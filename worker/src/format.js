// Shared display formatting per evaluation/FIXSPEC.md. Pure functions,
// duplicated on the site by contract; fixture-tested on both sides so the
// surfaces can never disagree (tereza P1-2 / folasade F7).

const trim = (s) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

// Displayed people-counts never carry more than 3 significant figures.
export function fmtPeople(n) {
  n = Number(n);
  if (n >= 1e9) return `${trim((n / 1e9).toFixed(1))} billion`;
  if (n >= 1e8) return `${Math.round(n / 1e6)} million`;
  if (n >= 1e7) return `${trim((n / 1e6).toFixed(1))} million`;
  if (n >= 1e6) return `${trim((n / 1e6).toFixed(2))} million`;
  if (n >= 1e5) return (Math.round(n / 1e3) * 1e3).toLocaleString("en-US");
  if (n >= 1e3) return (Math.round(n / 100) * 100).toLocaleString("en-US");
  return String(Math.round(n / 10) * 10);
}

// Own single-year bucket counted half (spec §6.4). Returns raw percentage.
export function percentile(cumYounger, alive, total) {
  return (100 * (Number(cumYounger) + 0.5 * Number(alive))) / Number(total);
}

// Whole number, clamped: never "100%" (tereza P1-3), never "0%".
export function fmtPct(pct) {
  const r = Math.round(pct);
  if (r >= 100) return "more than 99";
  if (r <= 0) return "less than 1";
  return String(r);
}
