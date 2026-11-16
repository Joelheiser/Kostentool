// Fixkosten-Vorlagen (und wiederkehrende Einnahmen) → konkrete Termine.
import { iso, zerlege, plusMonate, tageImMonat } from './datum.js';
import { gehaltstag } from './periode.js';

export const RHYTHMEN = {
  monatlich: { monate: 1, name: 'monatlich' },
  quartalsweise: { monate: 3, name: 'quartalsweise' },
  jaehrlich: { monate: 12, name: 'jährlich' },
};

export const AM_GEHALTSTAG = 'gehaltstag';

function terminImMonat(vorlage, jahr, monat) {
  if (vorlage.termin === AM_GEHALTSTAG) return gehaltstag(jahr, monat);
  const tag = Math.min(Number(vorlage.termin), tageImMonat(jahr, monat));
  return iso(jahr, monat, tag);
}

/**
 * Alle ursprünglichen Termine einer Vorlage bis einschließlich `bis`.
 * Jeder Termin wird vom Startmonat aus berechnet (kein Wegdriften nach Februar).
 */
export function termine(vorlage, bis) {
  const schritt = RHYTHMEN[vorlage.rhythmus]?.monate;
  if (!schritt) return [];
  const start = zerlege(vorlage.startDatum);
  const ergebnis = [];
  for (let k = 0; k < 2400; k++) {
    const { jahr, monat } = plusMonate(start.jahr, start.monat, k * schritt);
    const datum = terminImMonat(vorlage, jahr, monat);
    if (datum > bis) break;
    if (vorlage.endDatum && datum > vorlage.endDatum) break;
    // Beim Termin "am Gehaltstag" zählt der Startmonat immer mit,
    // auch wenn der Gehaltstag ein, zwei Tage vor dem Startdatum liegt.
    if (vorlage.termin !== AM_GEHALTSTAG && datum < vorlage.startDatum) continue;
    ergebnis.push(datum);
  }
  return ergebnis;
}

export function ausnahmeId(vorlageId, ursprungsDatum) {
  return `${vorlageId}@${ursprungsDatum}`;
}

/**
 * Einträge aller Vorlagen, deren (ggf. per Ausnahme geändertes) Datum
 * im Zeitraum [von, bis] liegt.
 */
export function vorlagenEintraege(vorlagen, ausnahmen, von, bis) {
  const nachId = new Map(ausnahmen.map((a) => [a.id, a]));
  // Puffer: eine Ausnahme kann einen Termin bis zu einem Jahr verschieben.
  const { jahr, monat, tag } = zerlege(bis);
  const pufferBis = iso(jahr + 1, monat, Math.min(tag, tageImMonat(jahr + 1, monat)));
  const eintraege = [];
  for (const v of vorlagen) {
    for (const ursprung of termine(v, pufferBis)) {
      const ausnahme = nachId.get(ausnahmeId(v.id, ursprung));
      if (ausnahme?.aktion === 'ueberspringen') continue;
      const geaendert = ausnahme?.aktion === 'aendern' ? ausnahme : null;
      const datum = geaendert?.neuesDatum || ursprung;
      if (datum < von || datum > bis) continue;
      eintraege.push({
        id: ausnahmeId(v.id, ursprung),
        quelle: 'vorlage',
        vorlageId: v.id,
        ursprungsDatum: ursprung,
        art: v.art,
        betragCent: geaendert?.betragCent ?? v.betragCent,
        bezeichnung: geaendert?.bezeichnung || v.bezeichnung,
        datum,
        geaendert: Boolean(geaendert),
      });
    }
  }
  return eintraege;
}

/** Nächster (ursprünglicher) Termin ab einem Datum, oder null. */
export function naechsterTermin(vorlage, ab) {
  const { jahr, monat, tag } = zerlege(ab);
  const bis = iso(jahr + 2, monat, Math.min(tag, tageImMonat(jahr + 2, monat)));
  return termine(vorlage, bis).find((d) => d >= ab) ?? null;
}
