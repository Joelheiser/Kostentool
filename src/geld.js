// Beträge werden immer als ganze Cent gespeichert.

/** "1.234,56" / "12,5" / "12.50" / "1000" → Cent, sonst null */
export function parseBetrag(text) {
  if (typeof text !== 'string') return null;
  let t = text.trim().replace(/\s|€/g, '');
  if (!t) return null;
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [ganz, nach = ''] = t.split('.');
  const cent = Number(ganz) * 100 + Number((nach + '00').slice(0, 2));
  return Number.isSafeInteger(cent) ? cent : null;
}

/** Cent → "1.234,56 €" (mit echtem Minuszeichen) */
export function formatEuro(cent, { vorzeichen = false, ohneCent = false } = {}) {
  const negativ = cent < 0;
  const betrag = Math.abs(cent);
  const euro = Math.floor(betrag / 100);
  const rest = String(betrag % 100).padStart(2, '0');
  const tausender = String(euro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const zahl = ohneCent && rest === '00' ? tausender : `${tausender},${rest}`;
  const zeichen = negativ ? '−' : vorzeichen && cent > 0 ? '+' : '';
  return `${zeichen}${zahl} €`;
}

/** Cent → Eingabetext "1234,56" */
export function alsEingabe(cent) {
  return `${Math.floor(cent / 100)},${String(cent % 100).padStart(2, '0')}`;
}
