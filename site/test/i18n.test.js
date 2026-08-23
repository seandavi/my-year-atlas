// i18n foundation (#39): locale completeness, es/pt number fixtures
// (exact strings — Node's ICU is the reference), and the grammar layer.
import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';
import es from '../src/i18n/es.js';
import pt from '../src/i18n/pt.js';
import { setLocale, t } from '../src/i18n/index.js';

const NBSP = ' ';

test('en/es/pt export identical key sets with matching types', () => {
  const keys = Object.keys(en).sort();
  assert.deepEqual(Object.keys(es).sort(), keys);
  assert.deepEqual(Object.keys(pt).sort(), keys);
  for (const k of keys) {
    assert.equal(typeof es[k], typeof en[k], `es.${k} type`);
    assert.equal(typeof pt[k], typeof en[k], `pt.${k} type`);
  }
});

test('en locale keeps the FIXSPEC fixtures byte-identical', () => {
  assert.equal(en.fmtPeople(91070227), '91.1 million');
  assert.equal(en.fmtPeople(8300678397), '8.3 billion');
  assert.equal(en.fmtPct(0.802), '80%');
  assert.equal(en.placeIn('Philippines'), 'in the Philippines');
  assert.equal(en.placeIn('Brazil'), 'in Brazil');
});

test('es number fixtures (FIXSPEC magnitudes, Spanish forms)', () => {
  const cases = {
    91070227: '91,1 millones',
    4297760: '4,3 millones',
    123739681: '124 millones',
    1957713: '1,96 millones',
    97736443: '97,7 millones',
    8300678397: '8,3 mil millones',
    232060: '232.000',
    38108: '38.100',
    847: '850',
    4: '4',
  };
  for (const [n, want] of Object.entries(cases)) {
    assert.equal(es.fmtPeople(Number(n)), want, `es fmtPeople(${n})`);
  }
  assert.equal(es.fmtPct(0.83), `83${NBSP}%`);
  assert.equal(es.fmtPct(0.999), `99${NBSP}%`); // clamp: never 100
  assert.equal(es.fmtPct(0.001), `1${NBSP}%`);  // clamp: never 0
  assert.equal(es.fmt1(2.9), '2,9');
});

test('pt number fixtures (FIXSPEC magnitudes, pt-BR forms)', () => {
  const cases = {
    91070227: '91,1 milhões',
    4297760: '4,3 milhões',
    123739681: '124 milhões',
    1957713: '1,96 milhão', // pt plural rule: 1 ≤ n < 2 is singular
    97736443: '97,7 milhões',
    8300678397: '8,3 bilhões',
    232060: '232.000',
    38108: '38.100',
    847: '850',
    4: '4',
  };
  for (const [n, want] of Object.entries(cases)) {
    assert.equal(pt.fmtPeople(Number(n)), want, `pt fmtPeople(${n})`);
  }
  assert.equal(pt.fmtPct(0.83), '83%');
  assert.equal(pt.fmtPct(0.999), '99%');
  assert.equal(pt.fmt1(5.02), '5,0');
});

test('es grammar: articles after "en"', () => {
  assert.equal(es.placeIn('United States of America', 'US'), 'en Estados Unidos');
  assert.equal(es.placeIn('El Salvador', 'SV'), 'en El Salvador');
  assert.equal(es.placeIn('France', 'FR'), 'en Francia');
  assert.equal(es.placeIn('India', 'IN'), 'en la India');
  assert.equal(es.placeIn('Spain', 'ES'), 'en España');
  assert.equal(es.placeIn('United Kingdom of Great Britain and Northern Ireland', 'GB'), 'en el Reino Unido');
  assert.equal(es.placeIn('Netherlands (Kingdom of the)', 'NL'), 'en los Países Bajos');
});

test('pt grammar: gendered contractions', () => {
  assert.equal(pt.placeIn('Brazil', 'BR'), 'no Brasil');
  assert.equal(pt.placeIn('France', 'FR'), 'na França');
  assert.equal(pt.placeIn('United States of America', 'US'), 'nos Estados Unidos');
  assert.equal(pt.placeIn('Portugal', 'PT'), 'em Portugal');
  assert.equal(pt.placeIn('Angola', 'AO'), 'em Angola');
  assert.equal(pt.placeIn('Philippines', 'PH'), 'nas Filipinas');
  // genitive for the anchor line
  assert.match(pt.anchorLine('Mexico', 'MX'), /a população do México\.$/);
});

test('displayName falls back to the English short name without iso2', () => {
  assert.equal(es.displayName('Democratic Republic of the Congo', undefined), 'DR Congo');
  assert.equal(pt.displayName('Viet Nam', undefined), 'Vietnam');
  // and uses the curated override where CLDR is awkward
  assert.equal(pt.displayName('Democratic Republic of the Congo', 'CD'), 'República Democrática do Congo');
  assert.equal(es.displayName('China, Hong Kong SAR', 'HK'), 'Hong Kong');
});

test('the "millones de personas" join is conditional on magnitude', () => {
  assert.match(es.ogDesc(91070227, 'en España', '1971'), /91,1 millones de personas/);
  assert.match(es.ogDesc(232060, 'en Andorra', '1971'), /232\.000 personas/);
  assert.match(pt.ogDesc(2600000, 'no Brasil', '1971'), /2,6 milhões de pessoas que vivem no Brasil/);
  assert.match(pt.ogDesc(232060, 'em Portugal', '1971'), /232\.000 pessoas/);
});

test('setLocale switches the live binding and loads lazy locales', async () => {
  await setLocale('pt');
  assert.equal(t.lang, 'pt');
  await setLocale('en');
  assert.equal(t.lang, 'en');
});
