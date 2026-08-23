// Pure logic for the people/events/baby-names sections and the ⓘ info
// links — DOM-free so node:test can exercise it (main.js owns fetch + DOM).
import { t } from './i18n/index.js';

// people.json rows are [name, desc, qid, wikiTitle], ordered top-5 women,
// then top-5 men, then non-binary/other (#41). Interleave W,M,W,M… and
// append the leftovers; show at most 8. Short years (fewer than 10 rows)
// carry no marker for where women end, so they render in raw order.
export function interleavePeople(list) {
  let out = list;
  if (list.length >= 10) {
    out = [];
    for (let i = 0; i < 5; i++) out.push(list[i], list[i + 5]);
    out.push(...list.slice(10));
  }
  return out.slice(0, 8);
}

export const personUrl = ([, , qid, wiki]) => (wiki
  ? `https://en.wikipedia.org/wiki/${wiki}`
  : `https://www.wikidata.org/wiki/${qid}`);

// events.json (#40) is English-only for now: es/pt hide the section.
export const eventsFor = (events, y, lang) =>
  (lang === 'en' ? (events?.[y] ?? []).slice(0, 3) : []);

// names/index.json gate (#19): country selected, covered, year in range.
export const namesInRange = (index, iso3, y) => {
  const e = index?.[iso3];
  return !!e && y >= e.from && y <= e.to;
};

export const decadeLabel = (y) => Math.floor(y / 10) * 10;

export const infoLink = (anchor) =>
  `<a class="info" href="/methods.html#${anchor}" title="${t.infoTitle}" aria-label="${t.infoTitle}">ⓘ</a>`;
