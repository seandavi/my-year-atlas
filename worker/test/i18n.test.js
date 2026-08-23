// The worker's locale registry resolves the shared site modules via relative
// import — this test proves the path works outside vite and that the worker
// renders localized card/meta copy.
import test from "node:test";
import assert from "node:assert/strict";
import { getLocale } from "../src/i18n.js";

test("getLocale: en default, es/pt selectable", () => {
  assert.equal(getLocale("en").lang, "en");
  assert.equal(getLocale(null).lang, "en");
  assert.equal(getLocale("es").lang, "es");
  assert.equal(getLocale("pt").lang, "pt");
});

test("en og copy is unchanged (FIXSPEC templates)", () => {
  const t = getLocale("en");
  assert.equal(
    t.ogDesc(91070227, null, "1971"),
    "About 91.1 million people alive right now were born in 1971 (mid-2026, UN projection).",
  );
  assert.equal(t.ogRank(t.fmtPct(0.802), null), "older than 80% of the world");
});

test("pt og copy: grammar + localized numbers", () => {
  const t = getLocale("pt");
  const inPlace = t.placeIn("Brazil", "BR");
  assert.equal(inPlace, "no Brasil");
  assert.equal(
    t.ogDesc(2568660, inPlace, "1971"),
    "Cerca de 2,57 milhões de pessoas que vivem no Brasil nasceram em 1971 (meados de 2026, projeção da ONU).",
  );
  assert.match(t.ogTitle("1971", t.displayName("Brazil", "BR"), 2568660), /^Nascidos em 1971, Brasil — 2,57 milhões/);
});

test("es og copy: article countries", () => {
  const t = getLocale("es");
  assert.equal(t.placeIn("United States of America", "US"), "en Estados Unidos");
  assert.match(t.ogDesc(620000, t.placeIn("Spain", "ES"), "1971"), /personas que viven en España nacieron en 1971/);
});
