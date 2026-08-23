// English locale: every user-facing string, extracted verbatim from the
// original call sites. Plain ESM, no vite-isms — the worker imports this too.
// en/es/pt export the same key set with identical signatures (tested).
import { fmtPeople, fmtPctWhole } from '../stats.js';
import { shortName, inSentence } from '../names.js';

const f = fmtPeople;

const listAnd = (names) => (names.length < 2 ? names.join('')
  : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

const dotLabel = (scale) => (scale === 1 ? 'one person' : `${f(scale)} people`);

export default {
  lang: 'en',

  // numbers (FIXSPEC hand-rolled path — byte-identical fixtures)
  fmtPeople: f,
  fmtPct: fmtPctWhole,
  fmt1: (x) => Number(x).toFixed(1),
  fmt2: (x) => Number(x).toFixed(2),
  sharePct: (v) => (v < 0.1 ? '<0.1%' : `${v.toFixed(v < 10 ? 1 : 0)}%`),
  ratioX: (x) => `${Number(x).toFixed(2)}×`,

  // names + grammar
  displayName: (unName) => shortName(unName),
  placeIn: (unName) => `in ${inSentence(unName)}`,
  theWorld: 'the world',
  inTheWorld: 'in the world',
  orEarlier: (y) => `${y} or earlier`,

  // document + static chrome
  docTitle: (y, place) => `Born in ${y}${place ? ` in ${place}` : ''} — Year Atlas`,
  docTitleDefault: 'Year Atlas — everyone born in your year',
  tagline: 'Everyone born in your year.',
  yearFieldLabel: 'Year you were born',
  yearHint: 'A year between 1926 and 2026',
  prevYear: 'Previous year',
  nextYear: 'Next year',
  countryLabelHtml: 'Country <span class="muted">(optional)</span>',
  countryPlaceholder: 'World',
  invite: 'Type the year you were born.',
  footerProjection: `Figures for mid-2026 are a UN projection (medium variant), not a count.
       <a href="/methods.html">How we count</a>.`,
  footerSource: `Source: <a href="https://population.un.org/wpp/">United Nations, World
       Population Prospects 2024</a> (medium variant), CC BY 3.0 IGO
       · Temperature: <a href="https://data.giss.nasa.gov/gistemp/">NASA GISTEMP v4</a>
       · People: <a href="https://www.wikidata.org/">Wikidata</a> (CC0).`,
  vintageMeta: (m) => `${m.source}, ${m.variant} variant · mid-${m.ref_year} reference · build ${m.commit}`,

  // answer block
  lookingUp: 'Looking up your country…',
  noDataYear: (y, inPlace) => `No data for ${y} ${inPlace}.`,
  noDataCountry: (iso3) => `No data for ${iso3}.`,
  hiddenHeading: (yl, inPlace) => `People born in ${yl}${inPlace ? ` ${inPlace}` : ''}`,
  headlineCountry: (n, inPlace, yl, pct) => `<p class="headline"><span class="big">about ${f(n)}</span>
      people living ${inPlace} were born in <strong>${yl}</strong> —
      you're older than <strong>${pct}</strong> of people there (mid-2026, UN projection).</p>`,
  headlineWorld: (n, yl, pct) => `<p class="headline"><span class="big">about ${f(n)}</span>
      people alive right now were born in <strong>${yl}</strong> —
      you're older than <strong>${pct}</strong> of everyone on Earth (mid-2026, UN projection).</p>`,
  medianLine: (mY, cmp) => {
    const side = cmp < 0 ? "you're in the older half"
      : cmp > 0 ? "you're in the younger half" : "you're right at the middle";
    return `<p class="note">Half of everyone alive today was born after ${mY} — ${side}.</p>`;
  },
  migrationCaveat: (inPlace, y) => `<p class="note">This counts today's residents born anywhere — people move.
      It can even be larger than the number of babies born ${inPlace} in ${y},
      so it's not a survival rate.</p>`,
  smallPop: 'Small population — estimates are noisy.',
  anchorLine: (unName) => `That's about the population of ${shortName(unName)}.`,
  projectedBirths: (n, y) => `The UN projects about ${f(n)} births in ${y}.`,
  survivalLine: (alive, births, y, s) => `About ${f(alive)} of the ${f(births)} people
        born in ${y} are still living (${s}%).`,
  noBirthsSeries: (y) => `The UN's births series starts in 1950,
        so there's no original-cohort figure for ${y}.`,
  openEndedNote: (y) => `This figure counts everyone born in or before ${y} — the UN's open-ended 100-plus group.`,

  // context panel
  contextHeading: (place) => `The ${place ?? 'world'} you arrived in`,
  imrWorld: (y, imr) => `In ${y}, about ${imr} of every 1,000 babies worldwide did not reach their first birthday.`,
  imrCountry: (inPlace, y, imr, wimr) => `${inPlace[0].toUpperCase()}${inPlace.slice(1)} in ${y}, about ${imr} of every 1,000 babies did not reach their first birthday${wimr != null ? ` — worldwide it was ${wimr}` : ''}.`,
  medianAgeLine: (age) => `The median person around you was ${age} years old.`,
  tfrLine: (x) => `The average woman had about ${Number(x).toFixed(1)} children over her lifetime.`,
  climateSame: (y) => `In ${y}, Earth's surface was about the same temperature as it is now.`,
  climateDiff: (y, d) => `Earth's surface was about ${Math.abs(d).toFixed(1)}°C ${d > 0 ? 'cooler' : 'warmer'} in ${y} than it is now.`,

  // people
  peopleHeading: 'In your company',
  peopleBrought: (y, listHtml) => `${y} also brought ${listHtml}.`,
  peopleNote: 'Ranked by Wikipedia presence, women and men alternating — one measure of fame among many. Names link to Wikipedia.',

  // events (#40, en-only for now)
  eventsHeading: 'The year itself',
  eventsLink: '→ Wikipedia',

  // baby names (#19)
  namesHeading: 'The names of your year',
  namesLine: (inPlace, yearPhrase, f0, m0) => `Babies born ${inPlace} ${yearPhrase}
      were most often named ${f0} and ${m0}.`,
  namesYearPhrase: (y) => `in ${y}`,
  namesDecadePhrase: (d) => `in the ${d}s`,
  namesAlso: (fs, ms) => `Also common: ${fs.join(', ')} · ${ms.join(', ')}.`,
  namesRegNote: '(by year of registration)',
  namesAttribution: (source, url, license) => `Names: <a href="${url}">${source}</a> (${license}).`,

  // info links + footer GitHub (#42)
  infoTitle: 'How we count this',
  footerGitHub: 'Source on GitHub',

  // dot field + tables
  viewAsTable: 'View as table',
  dotTableCaption: (place) => `People alive in mid-2026 by birth year — ${place}`,
  thBornIn: 'Born in',
  thAliveNow: 'Alive now',
  dotCaption: (scale, place) => `One dot is ${dotLabel(scale)} alive in mid-2026 (UN projection), by birth year — ${place}. Newest years on the left.`,
  dotAria: (o) => `Population of ${o.place} by birth year. The field is largest around ${o.peakYear} `
    + `at about ${f(o.peakAlive)} and thins to about ${f(o.oldestAlive)} by ${o.oldestYear}.`
    + (o.youAlive != null ? ` The highlighted ${o.userYear} column sits at about ${f(o.youAlive)}.` : '')
    + ` One dot is ${dotLabel(o.scale)}.`,

  // company / bigger cohorts
  companyHeading: 'Company',
  biggerHeading: 'Bigger cohorts',
  openerCountry: (n, inPlace, worldN) => `About ${f(n)} people ${inPlace} share your year${
    worldN != null ? `, and about ${f(worldN)} people worldwide` : ''}.`,
  openerWorld: (n) => `About ${f(n)} people worldwide share your year.`,
  largestCohort: (y, inPlace) => `No other birth year has more people alive today — ${y} is the largest cohort ${inPlace}.`,
  biggerBand: (y0, y1, each, ratio) => `The largest cohorts alive today were all born between ${y0}
      and ${y1} — about ${each} people each, around
      ${ratio.toFixed(1)}× your year.`,
  biggerIntro: 'These birth years are larger:',
  thTimesYours: '× your year',

  // passport contrast
  contrastHeading: 'Same year, different passport',
  contrastCaption: `Cohort size and age rank by country — migration included,
      so these are people living there now, not survivors of that birth year.`,
  thPlace: 'Place',
  thBornAliveThere: (y) => `Born ${y}, alive there`,
  thOlderThan: 'Older than',

  // trajectory
  trajHeadingCountry: (y) => `Residents born in ${y} over time`,
  trajHeadingWorld: 'Your cohort so far',
  trajCaptionCountry: (y, inPlace, x0) => `People born in ${y} living ${inPlace}, counted in each year since ${x0} —
       migration included, so this is people living there now, not survivors. The bars
       underneath are the country's net migration across all ages, not just your cohort.`,
  trajCaptionWorld: (y, x0) => `People born in ${y}, counted in each year since ${x0} — solid is UN estimates,
       dashed is the 2024–2026 projection.`,
  migCallout: (start, end, n, unName, iso2, out) => {
    const place = inSentence(unName);
    const dir = out ? `left ${place} than arrived` : `arrived in ${place} than left`;
    return `Between ${start} and ${end}, about
        ${f(n)} more people ${dir} each year, on average.`;
  },
  stripLegend: 'net migration, all ages — gold: more arrived · grey: more left',
  trajAria: (o) => `People born in ${o.y}, counted in each year from ${o.x0} to ${o.x1}: `
    + `about ${f(o.firstAlive)} in ${o.x0}, `
    + (o.peakAlive != null ? `peaking at about ${f(o.peakAlive)} around ${o.peakYear}, ` : '')
    + `about ${f(o.nowAlive)} in ${o.x1}. The last stretch, 2024 to 2026, is a UN projection.`,
  thYear: 'Year',
  thBornYearAlive: (y) => `Born ${y}, alive`,

  // map
  mapHeading: 'Where your year lives',
  mapCaption: (yearText) => `People alive today who were born in ${yearText}, by where they live now. mid-2026, UN projection.`,
  mapAria: (yearText, places) => `World map of people born in ${yearText} by where they live now. `
    + `Most now live in ${listAnd(places.map((p) => inSentence(p.name)))}. Full figures in the table below.`,
  binUnder: (n) => `under ${n}`,
  binOver: (n) => `over ${n}`,
  legendNoData: 'no data',
  mapTooltip: (name, n, yearText) => `${name}: about ${f(n)} people born in ${yearText}`,
  mapTooltipNoData: (name) => `${name}: no data`,
  thCountry: 'Country',
  thPeople: 'People',
  thShare: 'Share of cohort',
  moreCountries: (n) => `…and ${n} more countries.`,
  mapTableCaption: (yearText) => `People born in ${yearText} by country of residence, mid-2026`,

  // share (button + canvas card)
  shareBtnDownload: 'Download image',
  shareBtnShare: 'Share image',
  sharedStatus: 'Shared.',
  savedStatus: (name) => `Saved ${name}.`,
  shareText: (n, inPlace, yl) => (inPlace
    ? `About ${f(n)} people living ${inPlace} were born in ${yl} — Year Atlas`
    : `About ${f(n)} people alive right now were born in ${yl} — Year Atlas`),
  cardAbout: () => 'about',
  cardSentence: (n, inPlace, yl) => (inPlace
    ? `people living ${inPlace} were born in ${yl}`
    : `people alive right now were born in ${yl}`),
  cardRank: (pct, place) => (place
    ? `Older than ${pct} of people in ${place}.`
    : `Older than ${pct} of the world.`),
  cardVintage: 'mid-2026 · UN World Population Prospects 2024',

  // worker: OG card + meta
  ogRank: (pct, inPlace) => (inPlace
    ? `older than ${pct} of people ${inPlace}`
    : `older than ${pct} of the world`),
  ogTitle: (yl, place, n) => (place
    ? `Born in ${yl}, ${place} — ${f(n)} alive mid-2026 · Year Atlas`
    : `Born in ${yl} — ${f(n)} alive mid-2026 · Year Atlas`),
  ogDesc: (n, inPlace, yl) => (inPlace
    ? `About ${f(n)} people living ${inPlace} were born in ${yl} (mid-2026, UN projection).`
    : `About ${f(n)} people alive right now were born in ${yl} (mid-2026, UN projection).`),
  ogTitleDefault: 'Year Atlas',
  ogDescDefault: 'Enter a birth year and see how many people alive today share it.',
  worldwideLabel: 'Worldwide',
  genericQuestion: 'How many people alive today share your birth year?',

  // errors
  errYearOutside: (min, max) => `That year is outside ${min}–${max}.`,
  errNoCountry: (typed, sug) => `No country called “${typed}”.${sug ? ` Did you mean ${sug}?` : ''}`,
};
