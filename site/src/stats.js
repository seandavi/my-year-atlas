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

// --- formatting helpers (used by UI and share card) ---

export function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

/** "91.1 million", "8.3 billion", "232,060" */
export function fmtCompact(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`;
  return fmt(n);
}

export function fmtPct(x, digits = 1) {
  let v = (x * 100).toFixed(digits);
  // a true fraction should never display as 100% ("older than 100.0%")
  if (x < 1 && parseFloat(v) >= 100) v = (100 - 10 ** -digits).toFixed(digits);
  return `${v}%`;
}
