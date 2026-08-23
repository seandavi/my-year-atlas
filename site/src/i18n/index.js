// Locale registry. English is on the critical path (it IS the default copy);
// es/pt load as lazy chunks only when ?lang= asks for them. Plain ESM apart
// from the dynamic imports (which node and vite both handle).
import en from './en.js';

export const LANGS = ['en', 'es', 'pt'];

// Live binding: modules import { t } and read t.key(...) at call time.
export let t = en;

export async function setLocale(lang) {
  if (lang === 'es') t = (await import('./es.js')).default;
  else if (lang === 'pt') t = (await import('./pt.js')).default;
  else t = en;
  return t;
}

// iso3 → iso2 registry (filled from locations.json once it arrives) so call
// sites that only carry iso3 (map, contrast, share) can reach
// Intl.DisplayNames. Missing entries fall back to the English short name.
const iso2ByIso3 = {};
export function registerIso2(locations) {
  for (const l of locations) if (l.iso2) iso2ByIso3[l.iso3] = l.iso2;
}
export const iso2Of = (iso3) => iso2ByIso3[iso3];
