// Locale-aware FIXSPEC number formatting for the non-English locales.
// English keeps the hand-rolled path in site/src/stats.js (byte-identical
// fixtures); es/pt use Intl. Plain ESM — imported by the worker too.

export function makeFmt(lang) {
  // 3 significant digits reproduces every FIXSPEC magnitude rule for ≥ 1M:
  // 91,070,227 → "91,1 millones", 1,957,713 → "1,96 millones",
  // 123,739,681 → "124 millones", 8,300,678,397 → "8,3 mil millones".
  const compact = new Intl.NumberFormat(lang, {
    notation: 'compact', compactDisplay: 'long', maximumSignificantDigits: 3,
  });
  const group = new Intl.NumberFormat(lang);
  const d1 = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const d2 = new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // FIXSPEC rounding floors below 1M, exact integers under 10 (never 0 for a
  // living cohort — alive counts are ≥ 1 integers).
  const fmtPeople = (n) => {
    n = Number(n);
    if (n >= 1e6) return compact.format(n);
    if (n >= 1e5) return group.format(Math.round(n / 1000) * 1000);
    if (n >= 1e3) return group.format(Math.round(n / 100) * 100);
    if (n < 10) return group.format(Math.round(n));
    return group.format(Math.round(n / 10) * 10);
  };

  return {
    fmtPeople,
    fmt1: (x) => d1.format(x),
    fmt2: (x) => d2.format(x),
    group: (n) => group.format(n),
  };
}
