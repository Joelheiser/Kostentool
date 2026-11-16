// Tatsächlicher Kontostand, von Hand eingetragen (höchstens ein Wert pro Tag).
import { parseBetrag } from './geld.js';

/** Wie parseBetrag, erlaubt aber ein Minus (überzogenes Konto). */
export function parseKontostand(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  const negativ = /^[-−–]/.test(t);
  const cent = parseBetrag(negativ ? t.slice(1) : t);
  if (cent === null) return null;
  return negativ ? -cent : cent;
}

/** Letzter Eintrag im Zeitraum [von, bis], sonst null. */
export function letzterKontostand(kontostaende, von, bis) {
  let bester = null;
  for (const k of kontostaende) {
    if (k.datum < von || k.datum > bis) continue;
    if (!bester || k.datum > bester.datum) bester = k;
  }
  return bester;
}
