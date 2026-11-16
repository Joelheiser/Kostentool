// Export / Import als JSON-Datei und Backup-Erinnerung.
import { istGueltig, tageZwischen } from './datum.js';
import { RHYTHMEN, AM_GEHALTSTAG } from './wiederkehrend.js';

export const FORMAT = 'kostentool-backup';
export const VERSION = 2;
export const ERINNERUNG_TAGE = 30;
export const SCHLUMMER_TAGE = 7;

export function exportDaten(daten, exportiertAm) {
  return {
    format: FORMAT,
    version: VERSION,
    exportiertAm,
    buchungen: daten.buchungen,
    vorlagen: daten.vorlagen,
    ausnahmen: daten.ausnahmen,
    kontostaende: daten.kontostaende ?? [],
  };
}

const istCent = (x) => Number.isSafeInteger(x) && x >= 0;
const istArt = (x) => x === 'einnahme' || x === 'ausgabe';
const istText = (x) => typeof x === 'string' && x.length > 0 && x.length <= 200;

/** Prüft eine Backup-Datei. Wirft einen Fehler mit deutscher Meldung. */
export function pruefeImport(json) {
  let d;
  try { d = typeof json === 'string' ? JSON.parse(json) : json; } catch { throw new Error('Die Datei ist kein gültiges Backup (kein JSON).'); }
  if (!d || d.format !== FORMAT) throw new Error('Die Datei ist kein Kostentool-Backup.');
  if (d.version > VERSION) throw new Error('Das Backup stammt aus einer neueren App-Version.');
  for (const k of ['buchungen', 'vorlagen', 'ausnahmen']) if (!Array.isArray(d[k])) throw new Error(`Im Backup fehlt „${k}“.`);
  for (const b of d.buchungen) {
    if (!istText(b.id) || !istArt(b.art) || !istCent(b.betragCent) || !istText(b.bezeichnung) || !istGueltig(b.datum)) throw new Error('Eine Buchung im Backup ist fehlerhaft.');
  }
  for (const v of d.vorlagen) {
    const terminOk = v.termin === AM_GEHALTSTAG || (Number.isInteger(v.termin) && v.termin >= 1 && v.termin <= 31);
    if (!istText(v.id) || !istArt(v.art) || !istCent(v.betragCent) || !istText(v.bezeichnung) || !terminOk || !RHYTHMEN[v.rhythmus] || !istGueltig(v.startDatum) || (v.endDatum != null && !istGueltig(v.endDatum))) throw new Error('Eine Fixkosten-Vorlage im Backup ist fehlerhaft.');
  }
  for (const a of d.ausnahmen) {
    if (!istText(a.id) || !istText(a.vorlageId) || !istGueltig(a.datum) || !['ueberspringen', 'aendern'].includes(a.aktion)) throw new Error('Eine Ausnahme im Backup ist fehlerhaft.');
    if (a.neuesDatum != null && !istGueltig(a.neuesDatum)) throw new Error('Eine Ausnahme im Backup ist fehlerhaft.');
    if (a.betragCent != null && !istCent(a.betragCent)) throw new Error('Eine Ausnahme im Backup ist fehlerhaft.');
  }
  // Backups aus Version 1 haben noch keine Kontostände.
  const kontostaende = d.kontostaende ?? [];
  if (!Array.isArray(kontostaende)) throw new Error('Im Backup sind die Kontostände fehlerhaft.');
  for (const k of kontostaende) {
    if (!istText(k.id) || !istGueltig(k.datum) || !Number.isSafeInteger(k.betragCent)) throw new Error('Ein Kontostand im Backup ist fehlerhaft.');
  }
  // Ein Wert pro Tag, die id ist immer das Datum.
  const proTag = new Map(kontostaende.map((k) => [k.datum, { id: k.datum, datum: k.datum, betragCent: k.betragCent }]));
  return { buchungen: d.buchungen, vorlagen: d.vorlagen, ausnahmen: d.ausnahmen, kontostaende: [...proTag.values()] };
}

/**
 * Tage seit dem letzten Backup, wenn die Erinnerung fällig ist, sonst null.
 * Ohne bisherigen Export zählt ab der ersten Buchung.
 */
export function erinnerungFaellig(einstellungen, heute) {
  const { letzterExport, ersteBuchungAm, schlummerBis } = einstellungen;
  if (schlummerBis && heute < schlummerBis) return null;
  const bezug = letzterExport || ersteBuchungAm;
  if (!bezug) return null;
  const tage = tageZwischen(bezug, heute);
  return tage >= ERINNERUNG_TAGE ? tage : null;
}
