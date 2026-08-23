// Lazy data layer: hyparquet lives only in this chunk, dynamically imported
// when the trajectory chart scrolls into view. Never on the critical path —
// the "now" data is plain JSON (/data/now/{ISO3}.json, /data/contrast.json).
import { parquetReadObjects } from 'hyparquet';
import trajManifest from './traj-manifest.json';

async function fetchParquet(url, columns) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return parquetReadObjects({ file: await res.arrayBuffer(), columns });
}

const trajCache = new Map();
/** Trajectory rows for one location, or null if we have no partition for it. */
export function loadTraj(iso3) {
  const n = trajManifest[iso3];
  if (!n) return Promise.resolve(null);
  if (!trajCache.has(iso3)) {
    trajCache.set(iso3, Promise.all(
      Array.from({ length: n }, (_, i) =>
        fetchParquet(`/data/traj/iso3=${iso3}/data_${i}.parquet`)),
    ).then((parts) => parts.flat()));
  }
  return trajCache.get(iso3);
}
