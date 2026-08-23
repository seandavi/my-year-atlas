import test from 'node:test';
import assert from 'node:assert/strict';
import { shortName, inSentence } from '../src/names.js';

test('shortName maps the FIXSPEC sample', () => {
  assert.equal(shortName('United States of America'), 'United States');
  assert.equal(shortName('Russian Federation'), 'Russia');
  assert.equal(shortName('Viet Nam'), 'Vietnam');
  assert.equal(shortName('Democratic Republic of the Congo'), 'DR Congo');
  assert.equal(shortName('China, Taiwan Province of China'), 'Taiwan');
});

test('shortName passes unmapped names through unchanged', () => {
  assert.equal(shortName('Iceland'), 'Iceland');
  assert.equal(shortName('Türkiye'), 'Türkiye');
  assert.equal(shortName("Côte d'Ivoire"), "Côte d'Ivoire");
});

test('inSentence adds the article where English wants one', () => {
  assert.equal(inSentence('Philippines'), 'the Philippines');
  assert.equal(inSentence('Netherlands'), 'the Netherlands');
  assert.equal(inSentence('United States of America'), 'the United States');
  assert.equal(inSentence('Brazil'), 'Brazil');
});
