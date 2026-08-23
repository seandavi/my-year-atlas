import test from "node:test";
import assert from "node:assert/strict";
import { fmtPeople, fmtPct, percentile } from "../src/format.js";
import { shortName } from "../src/names.js";

test("fmtPeople FIXSPEC fixtures", () => {
  const cases = {
    91070227: "91.1 million",
    4297760: "4.3 million",
    123739681: "124 million",
    232060: "232,000",
    38108: "38,100",
    847: "850",
    1957713: "1.96 million",
    97736443: "97.7 million",
    8300678397: "8.3 billion",
  };
  for (const [n, want] of Object.entries(cases)) {
    assert.equal(fmtPeople(Number(n)), want, `fmtPeople(${n})`);
  }
});

test("percentile clamp — never 100%, never 0%", () => {
  // world 1926-or-earlier row: rounds to 100 without the clamp
  assert.equal(fmtPct(percentile(8300006464, 671933, 8300678397)), "99");
  assert.equal(fmtPct(0.2), "1");
  assert.equal(fmtPct(87.6), "88");
  assert.equal(fmtPct(99.4), "99");
});

test("short-name mapping sample", () => {
  assert.equal(shortName("United States of America"), "United States");
  assert.equal(shortName("Russian Federation"), "Russia");
  assert.equal(shortName("Viet Nam"), "Vietnam");
  assert.equal(shortName("Democratic Republic of the Congo"), "DR Congo");
  assert.equal(shortName("Côte d'Ivoire"), "Côte d'Ivoire");
  assert.equal(shortName("Nigeria"), "Nigeria");
});
