// Portuguese (pt-BR) country-name grammar. Most country names take a
// gendered article: "no Brasil", "na França", "nos Estados Unidos",
// "em Portugal". iso2 → article; absent = no article (the safe fallback for
// names we haven't classified: "em X" is always grammatical, if flat).
// Checked against pt-BR press usage (Folha/G1) for the most-populous ~80.

const ART = {
  // masculine singular → "no"
  BR: 'o', CA: 'o', MX: 'o', JP: 'o', EG: 'o', IR: 'o', IQ: 'o', AF: 'o',
  PK: 'o', VN: 'o', GB: 'o', SD: 'o', SS: 'o', TD: 'o', NE: 'o', KE: 'o',
  MA: 'o', YE: 'o', NP: 'o', UZ: 'o', KZ: 'o', PE: 'o', EC: 'o', CL: 'o',
  PY: 'o', UY: 'o', LB: 'o', SN: 'o', ML: 'o', LK: 'o', MW: 'o', ZW: 'o',
  BJ: 'o', BI: 'o', TG: 'o', KH: 'o', LA: 'o', HT: 'o', PA: 'o', TL: 'o',
  // feminine singular → "na"
  FR: 'a', DE: 'a', IN: 'a', CN: 'a', RU: 'a', IT: 'a', ES: 'a', AR: 'a',
  CO: 'a', VE: 'a', BO: 'a', NG: 'a', ET: 'a', TZ: 'a', DZ: 'a', TR: 'a',
  TH: 'a', KR: 'a', KP: 'a', UA: 'a', PL: 'a', SA: 'a', ID: 'a', MY: 'a',
  AU: 'a', ZA: 'a', SY: 'a', JO: 'a', TN: 'a', LY: 'a', GR: 'a', SE: 'a',
  NO: 'a', FI: 'a', DK: 'a', CH: 'a', AT: 'a', BE: 'a', RO: 'a', HU: 'a',
  CZ: 'a', CI: 'a', SO: 'a', ZM: 'a', GN: 'a', ER: 'a', CR: 'a', GT: 'a',
  NI: 'a', JM: 'a', DO: 'a', CF: 'a', CD: 'a', CG: 'a', MK: 'a', BG: 'a',
  RS: 'a', HR: 'a', SK: 'a', SI: 'a', IE: 'a', IS: 'a', EE: 'a', LV: 'a',
  LT: 'a', MD: 'a', GE: 'a', AM: 'a', BY: 'a', GW: 'a', NA: 'a',
  // plural → "nos" / "nas"
  US: 'os', NL: 'os', AE: 'os', CM: 'os',
  PH: 'as', BS: 'as', KM: 'as', MV: 'as', MH: 'as', SB: 'as', SC: 'as',
  KY: 'as', CK: 'as', FO: 'as', FK: 'as', TC: 'as', VG: 'as', VI: 'as',
  MP: 'as',
};

const EM = { o: 'no', a: 'na', os: 'nos', as: 'nas' };
const DE = { o: 'do', a: 'da', os: 'dos', as: 'das' };

/** "no Brasil" / "na França" / "em Portugal" */
export function inSentence(name, iso2) {
  const a = ART[iso2];
  return a ? `${EM[a]} ${name}` : `em ${name}`;
}

/** "do Brasil" / "da França" / "de Portugal" — genitive. */
export function ofSentence(name, iso2) {
  const a = ART[iso2];
  return a ? `${DE[a]} ${name}` : `de ${name}`;
}
