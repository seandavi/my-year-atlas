// people interleave (#41), events gate (#40), baby-names wording (#19).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interleavePeople, personUrl, eventsFor, namesInRange, decadeLabel,
} from '../src/sections.js';
import en from '../src/i18n/en.js';
import es from '../src/i18n/es.js';
import pt from '../src/i18n/pt.js';

const P = (n, wiki = `${n}_T`) => [n, `${n} desc`, `Q${n}`, wiki];
// harvest order: 5 women, 5 men, 1 other
const fixture = ['f1', 'f2', 'f3', 'f4', 'f5', 'm1', 'm2', 'm3', 'm4', 'm5', 'x1'].map((n) => P(n));

test('people interleave: W,M,W,M…, capped at 8', () => {
  assert.deepEqual(interleavePeople(fixture).map((p) => p[0]),
    ['f1', 'm1', 'f2', 'm2', 'f3', 'm3', 'f4', 'm4']);
});

test('people interleave: short years pass through in raw order', () => {
  assert.deepEqual(interleavePeople(fixture.slice(0, 4)).map((p) => p[0]),
    ['f1', 'f2', 'f3', 'f4']);
});

test('person links: Wikipedia when titled, Wikidata otherwise', () => {
  assert.equal(personUrl(['A', 'd', 'Q1', 'A_B']), 'https://en.wikipedia.org/wiki/A_B');
  assert.equal(personUrl(['A', 'd', 'Q1', null]), 'https://www.wikidata.org/wiki/Q1');
});

test('events gate: en renders up to 3, es/pt hidden, absent file hidden', () => {
  const ev = { 1971: [{ t: 'a', w: 'A' }, { t: 'b', w: 'B' }, { t: 'c', w: 'C' }, { t: 'd', w: 'D' }] };
  assert.deepEqual(eventsFor(ev, 1971, 'en').map((e) => e.t), ['a', 'b', 'c']);
  assert.deepEqual(eventsFor(ev, 1971, 'es'), []);
  assert.deepEqual(eventsFor(ev, 1971, 'pt'), []);
  assert.deepEqual(eventsFor(ev, 1999, 'en'), []);
  assert.deepEqual(eventsFor(null, 1971, 'en'), []);
});

test('names gate: coverage + year range', () => {
  const idx = { USA: { from: 1926, to: 2025, basis: 'birth' }, BRA: { from: 1930, to: 2009, basis: 'birth', granularity: 'decade' } };
  assert.ok(namesInRange(idx, 'USA', 1971));
  assert.ok(!namesInRange(idx, 'USA', 1925));
  assert.ok(!namesInRange(idx, 'BRA', 2010));
  assert.ok(!namesInRange(idx, 'DEU', 1971));
  assert.ok(!namesInRange(null, 'USA', 1971));
});

test('names wording: decade granularity says the decade, not the year', () => {
  assert.equal(decadeLabel(1975), 1970);
  assert.equal(en.namesDecadePhrase(1970), 'in the 1970s');
  assert.equal(en.namesYearPhrase(1971), 'in 1971');
  assert.equal(es.namesDecadePhrase(1970), 'en los años 1970');
  assert.equal(pt.namesDecadePhrase(1970), 'nos anos 1970');
  assert.equal(pt.namesYearPhrase(1975), 'em 1975');
  assert.match(pt.namesLine('no Brasil', pt.namesDecadePhrase(1970), 'Maria', 'Jose'),
    /nascidos no Brasil nos anos 1970/);
  assert.match(en.namesLine('in the United States', en.namesYearPhrase(1971), 'Jennifer', 'Michael'),
    /named Jennifer and Michael\.$/);
});

test('names attribution links the national source', () => {
  const line = en.namesAttribution('Social Security Administration', 'https://www.ssa.gov/oact/babynames/', 'Public domain');
  assert.match(line, /^Names: <a href="https:\/\/www\.ssa\.gov\/oact\/babynames\/">Social Security Administration<\/a> \(Public domain\)\.$/);
});
