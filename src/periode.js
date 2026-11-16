// Gehaltstag und Gehaltsperiode.
// Gehaltstag = der 15.; ist das ein Samstag, Sonntag oder österreichischer
// Feiertag, dann der letzte Bankarbeitstag (Mo–Fr, kein Feiertag) davor.
import { iso, plusTage, wochentag, zerlege, plusMonate } from './datum.js';
import { istFeiertag } from './feiertage.js';

export const GEHALTS_TAG = 15;

export function istBankarbeitstag(datum) {
  const wt = wochentag(datum);
  return wt !== 0 && wt !== 6 && !istFeiertag(datum);
}

export function gehaltstag(jahr, monat) {
  let d = iso(jahr, monat, GEHALTS_TAG);
  while (!istBankarbeitstag(d)) d = plusTage(d, -1);
  return d;
}

/** Periode, in der das Datum liegt: { start, ende, naechsterGehaltstag } */
export function periodeFuer(datum) {
  const { jahr, monat } = zerlege(datum);
  let start = gehaltstag(jahr, monat);
  let startMonat = { jahr, monat };
  if (datum < start) {
    startMonat = plusMonate(jahr, monat, -1);
    start = gehaltstag(startMonat.jahr, startMonat.monat);
  }
  const folge = plusMonate(startMonat.jahr, startMonat.monat, 1);
  const naechsterGehaltstag = gehaltstag(folge.jahr, folge.monat);
  return { start, ende: plusTage(naechsterGehaltstag, -1), naechsterGehaltstag };
}

/** Vorherige (n = -1) oder nächste (n = 1) Periode. */
export function periodeVerschieben(periode, n) {
  if (n === 0) return periode;
  if (n > 0) return periodeVerschieben(periodeFuer(periode.naechsterGehaltstag), n - 1);
  return periodeVerschieben(periodeFuer(plusTage(periode.start, -1)), n + 1);
}
