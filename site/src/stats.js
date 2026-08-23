// The seven statistics from SPEC §6, as pure functions over plain row arrays.
// Rows use the column names from data/DATA.md. Values may arrive as BigInt
// (int64 parquet columns); everything is normalized through Number() here.

const num = (v) => (v == null ? null : Number(v));

/** Find the row for a birth year in a per-location row array. */
export function findYear(rows, birthYear) {
  return rows.find((r) => Number(r.birth_year) === birthYear) ?? null;
}

/** 1. Cohort size now: people alive at the reference year, born in birthYear. */
export function cohortSizeNow(rows, birthYear) {
  const r = findYear(rows, birthYear);
  return r ? num(r.alive) : null;
}

/** 2. Original cohort size (world only): births in birthYear. Null before 1950. */
export function originalCohortSize(rows, birthYear) {
  const r = findYear(rows, birthYear);
  return r ? num(r.births) : null;
}

/** 3. Share still living (world only): alive / births. ≤ 1 by construction. */
export function shareStillLiving(rows, birthYear) {
  const r = findYear(rows, birthYear);
  if (!r || r.births == null) return null;
  return num(r.alive) / num(r.births);
}

/**
 * 4. Age rank: fraction of people alive now who are younger than you,
 * counting your own single-year bucket as half (spec §6.4).
 * "Older than N% of people alive right now."
 */
export function ageRankPercentile(rows, birthYear) {
  const r = findYear(rows, birthYear);
  if (!r) return null;
  return (num(r.cum_alive_younger) + 0.5 * num(r.alive)) / num(r.total_alive);
}

/** 5. Cohort trajectory: alive for one birth year across reference years, sorted. */
export function cohortTrajectory(trajRows, birthYear) {
  return trajRows
    .filter((r) => Number(r.birth_year) === birthYear)
    .map((r) => ({ ref_year: Number(r.ref_year), alive: num(r.alive) }))
    .sort((a, b) => a.ref_year - b.ref_year);
}

// Contrast pool: deliberate spread of region and size (spec §6.6).
const CONTRAST_POOL = ['JPN', 'NGA', 'BRA', 'USA', 'IND', 'DEU'];

/** Pick 3 informative contrast countries, excluding the user's own. */
export function pickContrastCountries(userIso3) {
  return CONTRAST_POOL.filter((c) => c !== userIso3).slice(0, 3);
}

/**
 * 6. Passport contrast: same birth year under other passports.
 * cohortRows is the full cohorts-now slice (all locations).
 * Returns cohort size and rank percentile per country — never survival
 * (country births are net of migration, spec §4.2).
 */
export function passportContrast(cohortRows, birthYear, isoList) {
  return isoList
    .map((iso3) => {
      const rows = cohortRows.filter((r) => r.iso3 === iso3);
      const r = findYear(rows, birthYear);
      if (!r) return null;
      return {
        iso3,
        location_name: r.location_name,
        alive: num(r.alive),
        percentile: ageRankPercentile(rows, birthYear),
      };
    })
    .filter(Boolean);
}

/**
 * 7. Bigger cohorts: birth years whose living cohort outnumbers the user's,
 * largest first, with the ratio to the user's cohort.
 */
export function biggerCohorts(rows, birthYear) {
  const mine = cohortSizeNow(rows, birthYear);
  if (mine == null) return [];
  return rows
    .filter((r) => Number(r.birth_year) !== birthYear && num(r.alive) > mine)
    .map((r) => ({
      birth_year: Number(r.birth_year),
      alive: num(r.alive),
      ratio: num(r.alive) / mine,
    }))
    .sort((a, b) => b.alive - a.alive);
}

/**
 * Median birth year: the smallest birth year Y such that the people born
 * after Y are fewer than half of everyone alive — i.e. the year holding the
 * age-median person. World rows only (needs cum_alive_younger/total_alive).
 */
export function medianBirthYear(rows) {
  const half = num(rows[0].total_alive) / 2;
  const hit = [...rows]
    .sort((a, b) => Number(a.birth_year) - Number(b.birth_year))
    .find((r) => num(r.cum_alive_younger) < half);
  return hit ? Number(hit.birth_year) : null;
}

/**
 * Climate delta: mean anomaly of the 5 most recent years minus the anomaly
 * of birthYear (°C, GISTEMP v4 rows [{year, anomaly}]). Null when birthYear
 * is missing or later than the latest data year.
 */
export function climateDelta(rows, birthYear) {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const last5 = sorted.slice(-5);
  if (last5.length < 5 || birthYear > last5[4].year) return null;
  const r = sorted.find((x) => x.year === birthYear);
  if (!r) return null;
  return last5.reduce((s, x) => s + x.anomaly, 0) / 5 - r.anomaly;
}

// --- formatting helpers (used by UI and share card) ---

/**
 * FIXSPEC display formatter: people-counts never carry more than 3
 * significant figures. "91.1 million", "4.3 million", "232,000", "850".
 */
export function fmtPeople(n) {
  n = Number(n);
  const m = Number((n / 1e6).toPrecision(3));
  if (n >= 1e9 || m >= 1000) return `${Number((n / 1e9).toPrecision(3))} billion`;
  if (n >= 1e6) return `${m} million`;
  if (n >= 1e5) return (Math.round(n / 1000) * 1000).toLocaleString('en-US');
  if (n >= 1e3) return (Math.round(n / 100) * 100).toLocaleString('en-US');
  if (n < 10) return String(Math.round(n));
  return String(Math.round(n / 10) * 10);
}

/**
 * FIXSPEC percentile display: whole number, clamped so a true fraction never
 * reads as 100% or 0%. Returns the "%" with it ("83%"; clamped to "99%"/"1%").
 */
export function fmtPctWhole(x) {
  const v = Math.round(x * 100);
  if (v >= 100) return '99%';
  if (v <= 0) return '1%';
  return `${v}%`;
}
