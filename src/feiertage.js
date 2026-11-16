// Gesetzliche Feiertage in Österreich, für jedes Jahr berechnet.
import { iso, plusTage } from './datum.js';

/** Ostersonntag nach der Gaußschen Osterformel (gregorianisch). */
export function ostersonntag(jahr) {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(jahr, monat, tag);
}

const cache = new Map();

/** Map Datum → Name aller gesetzlichen Feiertage eines Jahres. */
export function feiertage(jahr) {
  if (cache.has(jahr)) return cache.get(jahr);
  const ostern = ostersonntag(jahr);
  const liste = new Map([
    [iso(jahr, 1, 1), 'Neujahr'],
    [iso(jahr, 1, 6), 'Heilige Drei Könige'],
    [plusTage(ostern, 1), 'Ostermontag'],
    [iso(jahr, 5, 1), 'Staatsfeiertag'],
    [plusTage(ostern, 39), 'Christi Himmelfahrt'],
    [plusTage(ostern, 50), 'Pfingstmontag'],
    [plusTage(ostern, 60), 'Fronleichnam'],
    [iso(jahr, 8, 15), 'Mariä Himmelfahrt'],
    [iso(jahr, 10, 26), 'Nationalfeiertag'],
    [iso(jahr, 11, 1), 'Allerheiligen'],
    [iso(jahr, 12, 8), 'Mariä Empfängnis'],
    [iso(jahr, 12, 25), 'Christtag'],
    [iso(jahr, 12, 26), 'Stefanitag'],
  ]);
  cache.set(jahr, liste);
  return liste;
}

export function istFeiertag(datum) {
  return feiertage(Number(datum.slice(0, 4))).has(datum);
}
