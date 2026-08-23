// Country display names (FIXSPEC): short conventional names where the UN name
// is unwieldy, everything else passes through as-is. The worker duplicates
// this table; both sides fixture-test a sample so they cannot drift.

export const SHORT_NAMES = {
  'United States of America': 'United States',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'Russian Federation': 'Russia',
  'Iran (Islamic Republic of)': 'Iran',
  'Bolivia (Plurinational State of)': 'Bolivia',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Republic of Korea': 'South Korea',
  "Dem. People's Republic of Korea": 'North Korea',
  "Lao People's Democratic Republic": 'Laos',
  'Syrian Arab Republic': 'Syria',
  'Viet Nam': 'Vietnam',
  'United Republic of Tanzania': 'Tanzania',
  'Democratic Republic of the Congo': 'DR Congo',
  'Micronesia (Fed. States of)': 'Micronesia',
  'State of Palestine': 'Palestine',
  'China, Taiwan Province of China': 'Taiwan',
  'China, Hong Kong SAR': 'Hong Kong',
  'China, Macao SAR': 'Macao',
};

export function shortName(unName) {
  return SHORT_NAMES[unName] ?? unName;
}

// Short names that take a definite article in running text
// ("people living in the Philippines").
const THE = new Set([
  'United States', 'United Kingdom', 'Netherlands', 'Philippines',
  'United Arab Emirates', 'Bahamas', 'Gambia', 'Maldives', 'Holy See',
  'DR Congo', 'Congo', 'Dominican Republic', 'Central African Republic',
  'Comoros', 'Marshall Islands', 'Solomon Islands', 'Russian Federation',
  'Cayman Islands', 'Cook Islands', 'Falkland Islands (Malvinas)',
  'Turks and Caicos Islands', 'British Virgin Islands',
  'United States Virgin Islands', 'Northern Mariana Islands',
  'Faroe Islands', 'Isle of Man', 'Channel Islands', 'Seychelles',
]);

/** "the Philippines" / "Brazil" — for use mid-sentence after a preposition. */
export function inSentence(unName) {
  const n = shortName(unName);
  return THE.has(n) ? `the ${n}` : n;
}
