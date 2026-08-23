// Spanish locale. Same key set and signatures as en.js (tested). Country
// names come from Intl.DisplayNames('es'); grammar.es.js supplies articles.
// §9 voice: factual, warm, sentence case, cohort-as-company.
import { makeFmt } from './num.js';
import { shortName } from '../names.js';
import { inSentence, ofSentence } from './grammar.es.js';

const { fmtPeople: f, fmt1, fmt2, group } = makeFmt('es');
const NBSP = ' ';

let dn;
const OVERRIDE = { HK: 'Hong Kong', MO: 'Macao', PS: 'Palestina' };
function displayName(unName, iso2) {
  if (!iso2) return shortName(unName);
  if (OVERRIDE[iso2]) return OVERRIDE[iso2];
  dn ??= new Intl.DisplayNames(['es'], { type: 'region' });
  let name;
  try { name = dn.of(iso2); } catch { /* bad code */ }
  return name ?? shortName(unName);
}

// "91,1 millones" needs "de" before a noun; "232.000" doesn't. Gendered
// "about": "unos 91,1 millones" (millones is masculine) / "unas 232.000
// personas" (agrees with personas).
const M = (n) => Number(n) >= 1e6;
const dePersonas = (n) => (M(n) ? `${f(n)} de personas` : `${f(n)} personas`);
const unos = (n) => (M(n) ? `unos ${f(n)}` : `unas ${f(n)}`);

// "China e India", not "y India"
const listAnd = (names) => (names.length < 2 ? names.join('')
  : `${names.slice(0, -1).join(', ')} ${/^h?i/i.test(names.at(-1)) ? 'e' : 'y'} ${names.at(-1)}`);

const dotLabel = (scale) => (scale === 1 ? 'una persona' : `${dePersonas(scale)}`);

export default {
  lang: 'es',

  fmtPeople: f,
  fmtPct: (x) => {
    const v = Math.round(x * 100);
    return `${v >= 100 ? 99 : v <= 0 ? 1 : v}${NBSP}%`;
  },
  fmt1,
  fmt2,
  sharePct: (v) => (v < 0.1 ? `<0,1${NBSP}%` : `${v < 10 ? fmt1(v) : group(Math.round(v))}${NBSP}%`),
  ratioX: (x) => `${fmt2(x)}×`,

  displayName,
  placeIn: (unName, iso2) => inSentence(displayName(unName, iso2), iso2),
  theWorld: 'el mundo',
  inTheWorld: 'en el mundo',
  orEarlier: (y) => `${y} o antes`,

  docTitle: (y, place) => `Nacidos en ${y}${place ? `, ${place}` : ''} — Year Atlas`,
  docTitleDefault: 'Year Atlas — todas las personas nacidas en tu año',
  tagline: 'Todas las personas nacidas en tu año.',
  yearFieldLabel: 'Tu año de nacimiento',
  yearHint: 'Un año entre 1926 y 2026',
  prevYear: 'Año anterior',
  nextYear: 'Año siguiente',
  countryLabelHtml: 'País <span class="muted">(opcional)</span>',
  countryPlaceholder: 'Mundo',
  invite: 'Escribe el año en que naciste.',
  footerProjection: `Las cifras de mediados de 2026 son una proyección de la ONU (variante media),
       no un conteo. <a href="/methods.html">Metodología (en inglés)</a>.`,
  footerSource: `Fuente: <a href="https://population.un.org/wpp/">Naciones Unidas, World
       Population Prospects 2024</a> (variante media), CC BY 3.0 IGO
       · Temperatura: <a href="https://data.giss.nasa.gov/gistemp/">NASA GISTEMP v4</a>
       · Personas: <a href="https://www.wikidata.org/">Wikidata</a> (CC0).`,
  vintageMeta: (m) => `${m.source}, variante ${m.variant} · referencia: mediados de ${m.ref_year} · build ${m.commit}`,

  lookingUp: 'Buscando tu país…',
  noDataYear: (y, inPlace) => `No hay datos de ${y} ${inPlace}.`,
  noDataCountry: (iso3) => `No hay datos de ${iso3}.`,
  hiddenHeading: (yl, inPlace) => `Personas nacidas en ${yl}${inPlace ? ` ${inPlace}` : ''}`,
  headlineCountry: (n, inPlace, yl, pct) => `<p class="headline"><span class="big">${unos(n)}</span>
      ${M(n) ? 'de ' : ''}personas que viven ${inPlace} nacieron en <strong>${yl}</strong> —
      eres mayor que el <strong>${pct}</strong> de las personas del país (mediados de 2026, proyección de la ONU).</p>`,
  headlineWorld: (n, yl, pct) => `<p class="headline"><span class="big">${unos(n)}</span>
      ${M(n) ? 'de ' : ''}personas vivas ahora mismo nacieron en <strong>${yl}</strong> —
      eres mayor que el <strong>${pct}</strong> de todas las personas de la Tierra (mediados de 2026, proyección de la ONU).</p>`,
  medianLine: (mY, cmp) => {
    const side = cmp < 0 ? 'estás en la mitad mayor'
      : cmp > 0 ? 'estás en la mitad más joven' : 'estás justo en el medio';
    return `<p class="note">La mitad de las personas vivas hoy nació después de ${mY} — ${side}.</p>`;
  },
  migrationCaveat: (inPlace, y) => `<p class="note">Esto cuenta a los residentes de hoy nacidos en cualquier lugar — la gente se muda.
      Incluso puede ser mayor que el número de bebés que nacieron ${inPlace} en ${y},
      así que no es una tasa de supervivencia.</p>`,
  smallPop: 'Población pequeña — las estimaciones son imprecisas.',
  anchorLine: (unName, iso2) => `Eso es aproximadamente la población ${ofSentence(displayName(unName, iso2), iso2)}.`,
  projectedBirths: (n, y) => `La ONU proyecta unos ${f(n)}${M(n) ? ' de' : ''} nacimientos en ${y}.`,
  survivalLine: (alive, births, y, s) => `De ${M(births) ? `los ${f(births)} de` : `las ${f(births)}`} personas
        nacidas en ${y}, ${unos(alive)} siguen con vida (${s}${NBSP}%).`,
  noBirthsSeries: (y) => `La serie de nacimientos de la ONU comienza en 1950,
        así que no hay una cifra de la cohorte original para ${y}.`,
  openEndedNote: (y) => `Esta cifra cuenta a todas las personas nacidas en ${y} o antes — el grupo abierto de 100 años o más de la ONU.`,

  contextHeading: (place) => (place ? 'El país al que llegaste' : 'El mundo al que llegaste'),
  imrWorld: (y, imr) => `En ${y}, unos ${imr} de cada 1000 bebés en el mundo no llegaron a su primer cumpleaños.`,
  imrCountry: (inPlace, y, imr, wimr) => `${inPlace[0].toUpperCase()}${inPlace.slice(1)}, en ${y}, unos ${imr} de cada 1000 bebés no llegaron a su primer cumpleaños${wimr != null ? ` — en el mundo fueron ${wimr}` : ''}.`,
  medianAgeLine: (age) => `La persona mediana a tu alrededor tenía ${age} años.`,
  tfrLine: (x) => `En promedio, cada mujer tenía ${fmt1(x)} hijos a lo largo de su vida.`,
  climateSame: (y) => `En ${y}, la superficie de la Tierra tenía aproximadamente la misma temperatura que ahora.`,
  climateDiff: (y, d) => `La superficie de la Tierra estaba unos ${fmt1(Math.abs(d))}${NBSP}°C más ${d > 0 ? 'fría' : 'cálida'} en ${y} que ahora.`,

  peopleHeading: 'En tu compañía',
  peopleBrought: (y, listHtml) => `${y} también trajo a ${listHtml}.`,
  peopleNote: 'Ordenados por presencia en Wikipedia, alternando mujeres y hombres — una medida de fama entre muchas. Los nombres enlazan a Wikipedia.',

  eventsHeading: 'El año en sí',
  eventsLink: '→ Wikipedia',

  namesHeading: 'Los nombres de tu año',
  namesLine: (inPlace, yearPhrase, f0, m0) => `Los bebés nacidos ${inPlace} ${yearPhrase}
      recibieron con más frecuencia los nombres ${f0} y ${m0}.`,
  namesYearPhrase: (y) => `en ${y}`,
  namesDecadePhrase: (d) => `en los años ${d}`,
  namesAlso: (fs, ms) => `También comunes: ${fs.join(', ')} · ${ms.join(', ')}.`,
  namesRegNote: '(por año de registro)',
  namesAttribution: (source, url, license) => `Nombres: <a href="${url}">${source}</a> (${license}).`,

  infoTitle: 'Cómo lo contamos',
  footerGitHub: 'Código en GitHub',

  viewAsTable: 'Ver como tabla',
  dotTableCaption: (place) => `Personas vivas a mediados de 2026 por año de nacimiento — ${place}`,
  thBornIn: 'Nacidos en',
  thAliveNow: 'Vivos hoy',
  dotCaption: (scale, place) => `Un punto ${scale === 1 ? 'es una persona viva' : `son ${dePersonas(scale)} vivas`} a mediados de 2026 (proyección de la ONU), por año de nacimiento — ${place}. Los años más recientes, a la izquierda.`,
  dotAria: (o) => `Población por año de nacimiento — ${o.place}. El campo es más grande alrededor de ${o.peakYear}, `
    + `con ${unos(o.peakAlive)}, y se reduce a ${unos(o.oldestAlive)} en ${o.oldestYear}.`
    + (o.youAlive != null ? ` La columna resaltada de ${o.userYear} tiene ${unos(o.youAlive)}.` : '')
    + ` Un punto ${o.scale === 1 ? 'es' : 'son'} ${dotLabel(o.scale)}.`,

  companyHeading: 'Compañía',
  biggerHeading: 'Cohortes más grandes',
  openerCountry: (n, inPlace, worldN) => `${unos(n).replace(/^u/, 'U')} ${M(n) ? 'de ' : ''}personas ${inPlace} comparten tu año${
    worldN != null ? `, y ${unos(worldN)} en todo el mundo` : ''}.`,
  openerWorld: (n) => `${unos(n).replace(/^u/, 'U')} ${M(n) ? 'de ' : ''}personas en el mundo comparten tu año.`,
  largestCohort: (y, inPlace) => `Ningún otro año de nacimiento tiene más personas vivas hoy — ${y} es la cohorte más grande ${inPlace}.`,
  biggerBand: (y0, y1, each, ratio) => `Las cohortes más grandes vivas hoy nacieron todas entre ${y0}
      y ${y1} — aproximadamente ${each} cada una, alrededor de
      ${fmt1(ratio)}× tu año.`,
  biggerIntro: 'Estos años de nacimiento son más numerosos:',
  thTimesYours: '× tu año',

  contrastHeading: 'Mismo año, otro pasaporte',
  contrastCaption: `Tamaño de la cohorte y rango de edad por país — con migración incluida:
      son personas que viven allí ahora, no supervivientes de ese año de nacimiento.`,
  thPlace: 'Lugar',
  thBornAliveThere: (y) => `Nacidos en ${y}, viven allí`,
  thOlderThan: 'Mayor que',

  trajHeadingCountry: (y) => `Residentes nacidos en ${y} a lo largo del tiempo`,
  trajHeadingWorld: 'Tu cohorte hasta ahora',
  trajCaptionCountry: (y, inPlace, x0) => `Personas nacidas en ${y} que viven ${inPlace}, contadas en cada año desde ${x0} —
       con migración incluida: son personas que viven allí, no supervivientes. Las barras
       de abajo son la migración neta del país en todas las edades, no solo tu cohorte.`,
  trajCaptionWorld: (y, x0) => `Personas nacidas en ${y}, contadas en cada año desde ${x0} — la línea continua
       son estimaciones de la ONU y la discontinua, la proyección 2024–2026.`,
  migCallout: (start, end, n, unName, iso2, out) => (out
    ? `Entre ${start} y ${end}, cada año salieron del país, en promedio,
        ${unos(n)} ${M(n) ? 'de ' : ''}personas más de las que llegaron.`
    : `Entre ${start} y ${end}, cada año llegaron al país, en promedio,
        ${unos(n)} ${M(n) ? 'de ' : ''}personas más de las que salieron.`),
  stripLegend: 'migración neta, todas las edades — dorado: llegaron más · gris: salieron más',
  trajAria: (o) => `Personas nacidas en ${o.y}, contadas en cada año de ${o.x0} a ${o.x1}: `
    + `${unos(o.firstAlive)} en ${o.x0}, `
    + (o.peakAlive != null ? `con un máximo de ${unos(o.peakAlive)} hacia ${o.peakYear}, ` : '')
    + `${unos(o.nowAlive)} en ${o.x1}. El último tramo, de 2024 a 2026, es una proyección de la ONU.`,
  thYear: 'Año',
  thBornYearAlive: (y) => `Nacidos en ${y}, vivos`,

  mapHeading: 'Dónde vive tu año',
  mapCaption: (yearText) => `Personas vivas hoy que nacieron en ${yearText}, según dónde viven ahora. Mediados de 2026, proyección de la ONU.`,
  mapAria: (yearText, places) => `Mapa mundial de las personas nacidas en ${yearText} según dónde viven ahora. `
    + `La mayoría vive hoy en ${listAnd(places.map((p) => displayName(p.name, p.iso2)))}. Cifras completas en la tabla de abajo.`,
  binUnder: (n) => `menos de ${n}`,
  binOver: (n) => `más de ${n}`,
  legendNoData: 'sin datos',
  mapTooltip: (name, n, yearText) => `${name}: ${unos(n)} ${M(n) ? 'de ' : ''}personas nacidas en ${yearText}`,
  mapTooltipNoData: (name) => `${name}: sin datos`,
  thCountry: 'País',
  thPeople: 'Personas',
  thShare: 'Parte de la cohorte',
  moreCountries: (n) => `…y ${n} países más.`,
  mapTableCaption: (yearText) => `Personas nacidas en ${yearText} por país de residencia, mediados de 2026`,

  shareBtnDownload: 'Descargar imagen',
  shareBtnShare: 'Compartir imagen',
  sharedStatus: 'Compartido.',
  savedStatus: (name) => `Imagen guardada: ${name}.`,
  shareText: (n, inPlace, yl) => (inPlace
    ? `${unos(n).replace(/^u/, 'U')} ${M(n) ? 'de ' : ''}personas que viven ${inPlace} nacieron en ${yl} — Year Atlas`
    : `${unos(n).replace(/^u/, 'U')} ${M(n) ? 'de ' : ''}personas vivas ahora mismo nacieron en ${yl} — Year Atlas`),
  cardAbout: (n) => (M(n) ? 'unos' : 'unas'),
  cardSentence: (n, inPlace, yl) => (inPlace
    ? `${M(n) ? 'de ' : ''}personas que viven ${inPlace} nacieron en ${yl}`
    : `${M(n) ? 'de ' : ''}personas vivas ahora mismo nacieron en ${yl}`),
  cardRank: (pct, place) => (place
    ? `Mayor que el ${pct} de las personas en ${place}.`
    : `Mayor que el ${pct} del mundo.`),
  cardVintage: 'mediados de 2026 · ONU, World Population Prospects 2024',

  ogRank: (pct, inPlace) => (inPlace
    ? `mayor que el ${pct} de las personas ${inPlace}`
    : `mayor que el ${pct} del mundo`),
  ogTitle: (yl, place, n) => (place
    ? `Nacidos en ${yl}, ${place} — ${f(n)} con vida a mediados de 2026 · Year Atlas`
    : `Nacidos en ${yl} — ${f(n)} con vida a mediados de 2026 · Year Atlas`),
  ogDesc: (n, inPlace, yl) => (inPlace
    ? `${unos(n).replace(/^u/, 'U')} ${M(n) ? 'de ' : ''}personas que viven ${inPlace} nacieron en ${yl} (mediados de 2026, proyección de la ONU).`
    : `${unos(n).replace(/^u/, 'U')} ${M(n) ? 'de ' : ''}personas vivas ahora mismo nacieron en ${yl} (mediados de 2026, proyección de la ONU).`),
  ogTitleDefault: 'Year Atlas',
  ogDescDefault: 'Escribe tu año de nacimiento y descubre cuántas personas vivas hoy lo comparten.',
  worldwideLabel: 'Todo el mundo',
  genericQuestion: '¿Cuántas personas vivas hoy comparten tu año de nacimiento?',

  errYearOutside: (min, max) => `Ese año está fuera de ${min}–${max}.`,
  errNoCountry: (typed, sug) => `No hay ningún país llamado «${typed}».${sug ? ` ¿Quisiste decir ${sug}?` : ''}`,

  // country stat figures
  figOneInN: (n) => `1 de cada ${n.toLocaleString('es')}`,
  figOneInNLabel: 'personas allí comparte tu año',
  figWorldShare: (x) => {
    const v = x * 100;
    const s = v >= 10 ? Math.round(v).toLocaleString('es') : v >= 1 ? v.toFixed(1).replace('.', ',') : v.toFixed(2).replace('.', ',');
    return `${s}\u00a0%`;
  },
  figWorldShareLabel: (yl) => `de los nacidos en ${yl} del mundo viven allí`,
  figRank: (r) => `${r}.º`,
  figRankLabel: (of) => `año de nacimiento más numeroso de ${of}`,
  figMedianLabel: (unName, iso2) => `la mitad ${ofSentence(displayName(unName, iso2), iso2)} nació después de`,
};
