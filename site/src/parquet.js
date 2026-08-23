// Lazy data layer: hyparquet lives only in this chunk, dynamically imported
// when the trajectory chart scrolls into view. Never on the critical path —
// the "now" data is plain JSON (/data/now/{ISO3}.json, /data/contrast.json).
import { parquetReadObjects } from 'hyparquet';

async function fetchParquet(url, columns) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return parquetReadObjects({ file: await res.arrayBuffer(), columns });
}

let cohortsNow;
/** Full current-year slice (all locations incl. WLD) — for the map (#37). */
export function loadCohortsNow() {
  cohortsNow ??= fetchParquet(`${import.meta.env.BASE_URL}data/cohorts-now.parquet`,
    ['iso3', 'location_name', 'birth_year', 'alive']);
  return cohortsNow;
}

const trajCache = new Map();
/** Trajectory rows for one location, or null if there is no file for it. */
export function loadTraj(iso3) {
  if (!trajCache.has(iso3)) {
    trajCache.set(iso3,
      fetchParquet(`${import.meta.env.BASE_URL}data/traj/${iso3}.parquet`)
        .catch(() => null));
  }
  return trajCache.get(iso3);
}
