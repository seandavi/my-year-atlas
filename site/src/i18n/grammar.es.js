// Spanish country-name grammar: which names carry an article in running text
// after a preposition ("en los Estados Unidos", "en la India", "en España").
// Checked against es.wikipedia / El País usage. Default: no article — names
// like "El Salvador" already carry theirs. iso2-keyed so it survives any
// display-name source (Intl.DisplayNames or fallback).

const ART = {
  // US: modern press usage omits the article ('en Estados Unidos' — El País, RAE-tolerated)
  GB: 'el',  // el Reino Unido
  IN: 'la',  // la India
  AE: 'los', // los Emiratos Árabes Unidos
  NL: 'los', // los Países Bajos
  // PH: likewise 'en Filipinas' in contemporary usage
  DO: 'la',  // la República Dominicana
  CF: 'la',  // la República Centroafricana
  CG: 'el',  // el Congo
  CD: 'la',  // la República Democrática del Congo
  LB: 'el',  // el Líbano
  VA: 'la',  // la Ciudad del Vaticano
  KM: 'las', // las Comoras
  BS: 'las', // las Bahamas
  MV: 'las', // las Maldivas
  SC: 'las', // las Seychelles
  MH: 'las', // las Islas Marshall
  SB: 'las', // las Islas Salomón
  KY: 'las', CK: 'las', FO: 'las', FK: 'las', TC: 'las',
  VG: 'las', VI: 'las', MP: 'las',
  IM: 'la',  // la Isla de Man
};

/** "en los Estados Unidos" / "en El Salvador" / "en España" */
export function inSentence(name, iso2) {
  const a = ART[iso2];
  return a ? `en ${a} ${name}` : `en ${name}`;
}

/** "de los Estados Unidos" / "del Reino Unido" / "de México" — genitive. */
export function ofSentence(name, iso2) {
  const a = ART[iso2];
  if (a === 'el') return `del ${name}`;
  return a ? `de ${a} ${name}` : `de ${name}`;
}
