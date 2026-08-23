// UN WPP location name -> short conventional display name, per
// evaluation/FIXSPEC.md. Never show ISO3 in human-facing text (folasade F8,
// tereza P2-1, gudrun P2-3). Duplicated on the site by contract.

const SHORT = {
  "United States of America": "United States",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
  "Russian Federation": "Russia",
  "Iran (Islamic Republic of)": "Iran",
  "Bolivia (Plurinational State of)": "Bolivia",
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Republic of Korea": "South Korea",
  "Dem. People's Republic of Korea": "North Korea",
  "Lao People's Democratic Republic": "Laos",
  "Syrian Arab Republic": "Syria",
  "Viet Nam": "Vietnam",
  "United Republic of Tanzania": "Tanzania",
  "Democratic Republic of the Congo": "DR Congo",
  "Micronesia (Fed. States of)": "Micronesia",
  "State of Palestine": "Palestine",
  "China, Taiwan Province of China": "Taiwan",
  "China, Hong Kong SAR": "Hong Kong",
  "China, Macao SAR": "Macao",
};

export const shortName = (unName) => SHORT[unName] || unName;
