// Portuguese (pt-BR) locale. Same key set and signatures as en.js (tested).
// Country names from Intl.DisplayNames('pt'); grammar.pt.js supplies the
// gendered contractions ("no Brasil", "na França", "nos Estados Unidos").
// §9 voice: factual, warm, sentence case, cohort-as-company.
import { makeFmt } from './num.js';
import { shortName } from '../names.js';
import { inSentence, ofSentence } from './grammar.pt.js';

const { fmtPeople: f, fmt1, fmt2, group } = makeFmt('pt');

let dn;
const OVERRIDE = {
  HK: 'Hong Kong',
  MO: 'Macau',
  PS: 'Palestina',
  CD: 'República Democrática do Congo', // CLDR pt says "Congo - Kinshasa"
};
function displayName(unName, iso2) {
  if (!iso2) return shortName(unName);
  if (OVERRIDE[iso2]) return OVERRIDE[iso2];
  dn ??= new Intl.DisplayNames(['pt'], { type: 'region' });
  let name;
  try { name = dn.of(iso2); } catch { /* bad code */ }
  return name ?? shortName(unName);
}

// "91,1 milhões de pessoas" vs "232.000 pessoas"
const M = (n) => Number(n) >= 1e6;
const dePessoas = (n) => (M(n) ? `${f(n)} de pessoas` : `${f(n)} pessoas`);

const listAnd = (names) => (names.length < 2 ? names.join('')
  : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`);

const dotLabel = (scale) => (scale === 1 ? 'uma pessoa' : dePessoas(scale));

export default {
  lang: 'pt',

  fmtPeople: f,
  fmtPct: (x) => {
    const v = Math.round(x * 100);
    return `${v >= 100 ? 99 : v <= 0 ? 1 : v}%`;
  },
  fmt1,
  fmt2,
  sharePct: (v) => (v < 0.1 ? '<0,1%' : `${v < 10 ? fmt1(v) : group(Math.round(v))}%`),
  ratioX: (x) => `${fmt2(x)}×`,

  displayName,
  placeIn: (unName, iso2) => inSentence(displayName(unName, iso2), iso2),
  theWorld: 'o mundo',
  inTheWorld: 'no mundo',
  orEarlier: (y) => `${y} ou antes`,

  docTitle: (y, place) => `Nascidos em ${y}${place ? `, ${place}` : ''} — Year Atlas`,
  docTitleDefault: 'Year Atlas — todas as pessoas nascidas no seu ano',
  tagline: 'Todas as pessoas nascidas no seu ano.',
  yearFieldLabel: 'Ano em que você nasceu',
  yearHint: 'Um ano entre 1926 e 2026',
  prevYear: 'Ano anterior',
  nextYear: 'Próximo ano',
  countryLabelHtml: 'País <span class="muted">(opcional)</span>',
  countryPlaceholder: 'Mundo',
  invite: 'Digite o ano em que você nasceu.',
  footerProjection: `Os números de meados de 2026 são uma projeção da ONU (variante média),
       não uma contagem. <a href="/methods.html">Metodologia (em inglês)</a>.`,
  footerSource: `Fonte: <a href="https://population.un.org/wpp/">Nações Unidas, World
       Population Prospects 2024</a> (variante média), CC BY 3.0 IGO
       · Temperatura: <a href="https://data.giss.nasa.gov/gistemp/">NASA GISTEMP v4</a>
       · Pessoas: <a href="https://www.wikidata.org/">Wikidata</a> (CC0).`,
  vintageMeta: (m) => `${m.source}, variante ${m.variant} · referência: meados de ${m.ref_year} · build ${m.commit}`,

  lookingUp: 'Procurando seu país…',
  noDataYear: (y, inPlace) => `Não há dados de ${y} ${inPlace}.`,
  noDataCountry: (iso3) => `Não há dados para ${iso3}.`,
  hiddenHeading: (yl, inPlace) => `Pessoas nascidas em ${yl}${inPlace ? ` ${inPlace}` : ''}`,
  headlineCountry: (n, inPlace, yl, pct) => `<p class="headline"><span class="big">cerca de ${f(n)}</span>
      ${M(n) ? 'de ' : ''}pessoas que vivem ${inPlace} nasceram em <strong>${yl}</strong> —
      você tem mais idade que <strong>${pct}</strong> das pessoas do país (meados de 2026, projeção da ONU).</p>`,
  headlineWorld: (n, yl, pct) => `<p class="headline"><span class="big">cerca de ${f(n)}</span>
      ${M(n) ? 'de ' : ''}pessoas vivas agora nasceram em <strong>${yl}</strong> —
      você tem mais idade que <strong>${pct}</strong> de todas as pessoas da Terra (meados de 2026, projeção da ONU).</p>`,
  medianLine: (mY, cmp) => {
    const side = cmp < 0 ? 'você está na metade mais velha'
      : cmp > 0 ? 'você está na metade mais jovem' : 'você está bem no meio';
    return `<p class="note">Metade de todas as pessoas vivas hoje nasceu depois de ${mY} — ${side}.</p>`;
  },
  migrationCaveat: (inPlace, y) => `<p class="note">Esta conta inclui os moradores de hoje nascidos em qualquer lugar — as pessoas se mudam.
      Pode até ser maior que o número de bebês que nasceram ${inPlace} em ${y},
      então não é uma taxa de sobrevivência.</p>`,
  smallPop: 'População pequena — as estimativas são imprecisas.',
  anchorLine: (unName, iso2) => `Isso é aproximadamente a população ${ofSentence(displayName(unName, iso2), iso2)}.`,
  projectedBirths: (n, y) => `A ONU projeta cerca de ${f(n)}${M(n) ? ' de' : ''} nascimentos em ${y}.`,
  survivalLine: (alive, births, y, s) => `${M(births) ? `Dos ${f(births)} de` : `Das ${f(births)}`} pessoas
        nascidas em ${y}, cerca de ${f(alive)} ainda estão vivas (${s}%).`,
  noBirthsSeries: (y) => `A série de nascimentos da ONU começa em 1950,
        então não há um número da coorte original para ${y}.`,
  openEndedNote: (y) => `Este número conta todas as pessoas nascidas em ${y} ou antes — o grupo aberto de 100 anos ou mais da ONU.`,

  contextHeading: (place) => (place ? 'O país em que você chegou' : 'O mundo em que você chegou'),
  imrWorld: (y, imr) => `Em ${y}, cerca de ${imr} de cada 1.000 bebês no mundo não chegaram ao primeiro aniversário.`,
  imrCountry: (inPlace, y, imr, wimr) => `${inPlace[0].toUpperCase()}${inPlace.slice(1)}, em ${y}, cerca de ${imr} de cada 1.000 bebês não chegaram ao primeiro aniversário${wimr != null ? ` — no mundo, foram ${wimr}` : ''}.`,
  medianAgeLine: (age) => `A pessoa mediana ao seu redor tinha ${age} anos.`,
  tfrLine: (x) => `Em média, cada mulher tinha ${fmt1(x)} filhos ao longo da vida.`,
  climateSame: (y) => `Em ${y}, a superfície da Terra tinha aproximadamente a mesma temperatura de hoje.`,
  climateDiff: (y, d) => `A superfície da Terra era cerca de ${fmt1(Math.abs(d))} °C mais ${d > 0 ? 'fria' : 'quente'} em ${y} do que é hoje.`,

  peopleHeading: 'Na sua companhia',
  peopleBrought: (y, listHtml) => `${y} também trouxe ${listHtml}.`,
  peopleNote: 'Classificados pela presença na Wikipédia, alternando mulheres e homens — uma medida de fama entre muitas. Os nomes levam à Wikipédia.',

  eventsHeading: 'O ano em si',
  eventsLink: '→ Wikipedia',

  namesHeading: 'Os nomes do seu ano',
  namesLine: (inPlace, yearPhrase, f0, m0) => `Os bebês nascidos ${inPlace} ${yearPhrase}
      receberam com mais frequência os nomes ${f0} e ${m0}.`,
  namesYearPhrase: (y) => `em ${y}`,
  namesDecadePhrase: (d) => `nos anos ${d}`,
  namesAlso: (fs, ms) => `Também comuns: ${fs.join(', ')} · ${ms.join(', ')}.`,
  namesRegNote: '(por ano de registro)',
  namesAttribution: (source, url, license) => `Nomes: <a href="${url}">${source}</a> (${license}).`,

  infoTitle: 'Como contamos isso',
  footerGitHub: 'Código no GitHub',

  viewAsTable: 'Ver como tabela',
  dotTableCaption: (place) => `Pessoas vivas em meados de 2026 por ano de nascimento — ${place}`,
  thBornIn: 'Nascidos em',
  thAliveNow: 'Vivos hoje',
  dotCaption: (scale, place) => `Um ponto ${scale === 1 ? 'é uma pessoa viva' : `são ${dePessoas(scale)} vivas`} em meados de 2026 (projeção da ONU), por ano de nascimento — ${place}. Anos mais recentes à esquerda.`,
  dotAria: (o) => `População por ano de nascimento — ${o.place}. O campo é maior por volta de ${o.peakYear}, `
    + `com cerca de ${f(o.peakAlive)}, e se reduz a cerca de ${f(o.oldestAlive)} em ${o.oldestYear}.`
    + (o.youAlive != null ? ` A coluna destacada de ${o.userYear} tem cerca de ${f(o.youAlive)}.` : '')
    + ` Um ponto ${o.scale === 1 ? 'é' : 'são'} ${dotLabel(o.scale)}.`,

  companyHeading: 'Companhia',
  biggerHeading: 'Coortes maiores',
  openerCountry: (n, inPlace, worldN) => `Cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas ${inPlace} compartilham o seu ano${
    worldN != null ? `, e cerca de ${f(worldN)} no mundo todo` : ''}.`,
  openerWorld: (n) => `Cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas no mundo compartilham o seu ano.`,
  largestCohort: (y, inPlace) => `Nenhum outro ano de nascimento tem mais pessoas vivas hoje — ${y} é a maior coorte ${inPlace}.`,
  biggerBand: (y0, y1, each, ratio) => `As maiores coortes vivas hoje nasceram todas entre ${y0}
      e ${y1} — cerca de ${each} cada uma, por volta de
      ${fmt1(ratio)}× o seu ano.`,
  biggerIntro: 'Estes anos de nascimento são maiores:',
  thTimesYours: '× seu ano',

  contrastHeading: 'Mesmo ano, outro passaporte',
  contrastCaption: `Tamanho da coorte e posição etária por país — migração incluída:
      são pessoas que vivem lá agora, não sobreviventes daquele ano de nascimento.`,
  thPlace: 'Lugar',
  thBornAliveThere: (y) => `Nascidos em ${y}, vivem lá`,
  thOlderThan: 'Mais velho que',

  trajHeadingCountry: (y) => `Moradores nascidos em ${y} ao longo do tempo`,
  trajHeadingWorld: 'Sua coorte até agora',
  trajCaptionCountry: (y, inPlace, x0) => `Pessoas nascidas em ${y} que vivem ${inPlace}, contadas em cada ano desde ${x0} —
       migração incluída: são pessoas que vivem lá, não sobreviventes. As barras
       abaixo são a migração líquida do país em todas as idades, não só a sua coorte.`,
  trajCaptionWorld: (y, x0) => `Pessoas nascidas em ${y}, contadas em cada ano desde ${x0} — a linha contínua
       são estimativas da ONU; a tracejada, a projeção 2024–2026.`,
  migCallout: (start, end, n, unName, iso2, out) => (out
    ? `Entre ${start} e ${end}, em média, cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas
        a mais deixaram o país do que chegaram, a cada ano.`
    : `Entre ${start} e ${end}, em média, cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas
        a mais chegaram ao país do que saíram, a cada ano.`),
  stripLegend: 'migração líquida, todas as idades — dourado: chegaram mais · cinza: saíram mais',
  trajAria: (o) => `Pessoas nascidas em ${o.y}, contadas em cada ano de ${o.x0} a ${o.x1}: `
    + `cerca de ${f(o.firstAlive)} em ${o.x0}, `
    + (o.peakAlive != null ? `pico de cerca de ${f(o.peakAlive)} por volta de ${o.peakYear}, ` : '')
    + `cerca de ${f(o.nowAlive)} em ${o.x1}. O último trecho, de 2024 a 2026, é uma projeção da ONU.`,
  thYear: 'Ano',
  thBornYearAlive: (y) => `Nascidos em ${y}, vivos`,

  mapHeading: 'Onde o seu ano vive',
  mapCaption: (yearText) => `Pessoas vivas hoje que nasceram em ${yearText}, por onde vivem agora. Meados de 2026, projeção da ONU.`,
  mapAria: (yearText, places) => `Mapa-múndi das pessoas nascidas em ${yearText}, por onde vivem agora. `
    + `A maioria vive hoje ${listAnd(places.map((p) => inSentence(displayName(p.name, p.iso2), p.iso2)))}. Números completos na tabela abaixo.`,
  binUnder: (n) => `menos de ${n}`,
  binOver: (n) => `mais de ${n}`,
  legendNoData: 'sem dados',
  mapTooltip: (name, n, yearText) => `${name}: cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas nascidas em ${yearText}`,
  mapTooltipNoData: (name) => `${name}: sem dados`,
  thCountry: 'País',
  thPeople: 'Pessoas',
  thShare: 'Parte da coorte',
  moreCountries: (n) => `…e mais ${n} países.`,
  mapTableCaption: (yearText) => `Pessoas nascidas em ${yearText} por país de residência, meados de 2026`,

  shareBtnDownload: 'Baixar imagem',
  shareBtnShare: 'Compartilhar imagem',
  sharedStatus: 'Compartilhado.',
  savedStatus: (name) => `Imagem salva: ${name}.`,
  shareText: (n, inPlace, yl) => (inPlace
    ? `Cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas que vivem ${inPlace} nasceram em ${yl} — Year Atlas`
    : `Cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas vivas agora nasceram em ${yl} — Year Atlas`),
  cardAbout: () => 'cerca de',
  cardSentence: (n, inPlace, yl) => (inPlace
    ? `${M(n) ? 'de ' : ''}pessoas que vivem ${inPlace} nasceram em ${yl}`
    : `${M(n) ? 'de ' : ''}pessoas vivas agora nasceram em ${yl}`),
  cardRank: (pct, place) => (place
    ? `Mais velho que ${pct} das pessoas em ${place}.`
    : `Mais velho que ${pct} do mundo.`),
  cardVintage: 'meados de 2026 · ONU, World Population Prospects 2024',

  ogRank: (pct, inPlace) => (inPlace
    ? `mais velho que ${pct} das pessoas ${inPlace}`
    : `mais velho que ${pct} do mundo`),
  ogTitle: (yl, place, n) => (place
    ? `Nascidos em ${yl}, ${place} — ${f(n)} vivos em meados de 2026 · Year Atlas`
    : `Nascidos em ${yl} — ${f(n)} vivos em meados de 2026 · Year Atlas`),
  ogDesc: (n, inPlace, yl) => (inPlace
    ? `Cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas que vivem ${inPlace} nasceram em ${yl} (meados de 2026, projeção da ONU).`
    : `Cerca de ${f(n)} ${M(n) ? 'de ' : ''}pessoas vivas agora nasceram em ${yl} (meados de 2026, projeção da ONU).`),
  ogTitleDefault: 'Year Atlas',
  ogDescDefault: 'Digite seu ano de nascimento e veja quantas pessoas vivas hoje o compartilham.',
  worldwideLabel: 'Mundo todo',
  genericQuestion: 'Quantas pessoas vivas hoje compartilham o seu ano de nascimento?',

  errYearOutside: (min, max) => `Esse ano está fora de ${min}–${max}.`,
  errNoCountry: (typed, sug) => `Não há nenhum país chamado “${typed}”.${sug ? ` Você quis dizer ${sug}?` : ''}`,

  // country stat figures
  figOneInN: (n) => `1 em cada ${n.toLocaleString('pt')}`,
  figOneInNLabel: 'pessoas de lá compartilha seu ano',
  figWorldShare: (x) => {
    const v = x * 100;
    const s = v >= 10 ? Math.round(v).toLocaleString('pt') : v >= 1 ? v.toFixed(1).replace('.', ',') : v.toFixed(2).replace('.', ',');
    return `${s}%`;
  },
  figWorldShareLabel: (yl) => `dos nascidos em ${yl} no mundo vivem lá`,
  figRank: (r) => `${r}.º`,
  figRankLabel: (of) => `maior ano de nascimento de ${of}`,
  figMedianLabel: (unName, iso2) => `metade ${ofSentence(displayName(unName, iso2), iso2)} nasceu depois de`,
};
