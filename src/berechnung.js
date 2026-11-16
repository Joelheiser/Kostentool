// Buchungen einer Periode und ihre Summen.
import { vorlagenEintraege } from './wiederkehrend.js';

/** Alle Einträge (einmalig + aus Vorlagen) einer Periode, chronologisch. */
export function eintraegeDerPeriode(daten, periode) {
  const { start, ende } = periode;
  const einmalig = daten.buchungen
    .filter((b) => b.datum >= start && b.datum <= ende)
    .map((b) => ({ ...b, quelle: 'einmalig' }));
  const ausVorlagen = vorlagenEintraege(daten.vorlagen, daten.ausnahmen, start, ende);
  return [...einmalig, ...ausVorlagen].sort(
    (a, b) => a.datum.localeCompare(b.datum) || (a.art === b.art ? 0 : a.art === 'einnahme' ? -1 : 1) || a.bezeichnung.localeCompare(b.bezeichnung, 'de'),
  );
}

/** Erledigt = Datum bis einschließlich heute. */
export function istErledigt(eintrag, heute) {
  return eintrag.datum <= heute;
}

/**
 * Summen in Cent. Kein Übertrag: jede Periode beginnt bei null.
 * Es gilt immer: standHeute + geplant === uebrig.
 */
export function summen(eintraege, heute) {
  const s = { einnahmen: 0, ausgaben: 0, erledigtEin: 0, erledigtAus: 0, geplantEin: 0, geplantAus: 0 };
  for (const e of eintraege) {
    const ein = e.art === 'einnahme';
    const erledigt = istErledigt(e, heute);
    if (ein) s.einnahmen += e.betragCent; else s.ausgaben += e.betragCent;
    if (erledigt) { if (ein) s.erledigtEin += e.betragCent; else s.erledigtAus += e.betragCent; }
    else if (ein) s.geplantEin += e.betragCent; else s.geplantAus += e.betragCent;
  }
  return {
    ...s,
    uebrig: s.einnahmen - s.ausgaben,
    standHeute: s.erledigtEin - s.erledigtAus,
    geplant: s.geplantEin - s.geplantAus,
  };
}
