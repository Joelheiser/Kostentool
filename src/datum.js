// Kalendertage als Text "JJJJ-MM-TT". Gerechnet wird intern in UTC,
// damit Zeitzonen und Sommerzeit nie einen Tag verschieben.

const TAG_MS = 86400000;

export function iso(jahr, monat, tag) {
  return `${String(jahr).padStart(4, '0')}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
}

export function zerlege(datum) {
  const [j, m, t] = datum.split('-').map(Number);
  return { jahr: j, monat: m, tag: t };
}

function alsUtc(datum) {
  const { jahr, monat, tag } = zerlege(datum);
  return Date.UTC(jahr, monat - 1, tag);
}

function ausUtc(ms) {
  const d = new Date(ms);
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function plusTage(datum, n) {
  return ausUtc(alsUtc(datum) + n * TAG_MS);
}

export function tageZwischen(von, bis) {
  return Math.round((alsUtc(bis) - alsUtc(von)) / TAG_MS);
}

/** 0 = Sonntag … 6 = Samstag */
export function wochentag(datum) {
  return new Date(alsUtc(datum)).getUTCDay();
}

export function tageImMonat(jahr, monat) {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

/** Monat verschieben: liefert {jahr, monat} */
export function plusMonate(jahr, monat, n) {
  const index = jahr * 12 + (monat - 1) + n;
  return { jahr: Math.floor(index / 12), monat: (index % 12 + 12) % 12 + 1 };
}

/** Heutiger Kalendertag nach der Uhr des Geräts (Ortszeit). */
export function heute(jetzt = new Date()) {
  return iso(jetzt.getFullYear(), jetzt.getMonth() + 1, jetzt.getDate());
}

export function istGueltig(datum) {
  if (typeof datum !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return false;
  const { jahr, monat, tag } = zerlege(datum);
  return monat >= 1 && monat <= 12 && tag >= 1 && tag <= tageImMonat(jahr, monat);
}

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONATE = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONATE_KURZ = ['Jän', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** "Mittwoch, 18. Nov" */
export function tagUeberschrift(datum) {
  const { monat, tag } = zerlege(datum);
  return `${WOCHENTAGE[wochentag(datum)]}, ${tag}. ${MONATE_KURZ[monat - 1]}`;
}

/** "Mi 18.11." */
export function kurz(datum) {
  const { monat, tag } = zerlege(datum);
  return `${WOCHENTAGE_KURZ[wochentag(datum)]} ${tag}.${monat}.`;
}

/** "13. Nov – 14. Dez 2026" */
export function zeitraum(von, bis) {
  const a = zerlege(von);
  const b = zerlege(bis);
  const jahrA = a.jahr !== b.jahr ? ` ${a.jahr}` : '';
  return `${a.tag}. ${MONATE_KURZ[a.monat - 1]}${jahrA} – ${b.tag}. ${MONATE_KURZ[b.monat - 1]} ${b.jahr}`;
}

export function monatsname(monat) {
  return MONATE[monat - 1];
}

/** "13.11.2026" */
export function lang(datum) {
  const { jahr, monat, tag } = zerlege(datum);
  return `${tag}.${monat}.${jahr}`;
}
