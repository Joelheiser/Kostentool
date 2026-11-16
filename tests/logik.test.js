import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ostersonntag, feiertage, istFeiertag } from '../src/feiertage.js';
import { gehaltstag, periodeFuer, periodeVerschieben } from '../src/periode.js';
import { termine, vorlagenEintraege } from '../src/wiederkehrend.js';
import { eintraegeDerPeriode, summen } from '../src/berechnung.js';
import { parseBetrag, formatEuro } from '../src/geld.js';
import { exportDaten, pruefeImport, erinnerungFaellig } from '../src/sicherung.js';
import { plusTage, wochentag, heute, tageZwischen } from '../src/datum.js';
import { parseKontostand, letzterKontostand } from '../src/kontostand.js';

test('Ostersonntag', () => {
  assert.equal(ostersonntag(2024), '2024-03-31');
  assert.equal(ostersonntag(2025), '2025-04-20');
  assert.equal(ostersonntag(2026), '2026-04-05');
  assert.equal(ostersonntag(2027), '2027-03-28');
  assert.equal(ostersonntag(2028), '2028-04-16');
});

test('bewegliche Feiertage 2026 und 2027', () => {
  const f26 = feiertage(2026);
  assert.equal(f26.get('2026-04-06'), 'Ostermontag');
  assert.equal(f26.get('2026-05-14'), 'Christi Himmelfahrt');
  assert.equal(f26.get('2026-05-25'), 'Pfingstmontag');
  assert.equal(f26.get('2026-06-04'), 'Fronleichnam');
  const f27 = feiertage(2027);
  assert.equal(f27.get('2027-03-29'), 'Ostermontag');
  assert.equal(f27.get('2027-05-06'), 'Christi Himmelfahrt');
  assert.equal(f27.get('2027-05-17'), 'Pfingstmontag');
  assert.equal(f27.get('2027-05-27'), 'Fronleichnam');
});

test('feste Feiertage', () => {
  for (const d of ['01-01', '01-06', '05-01', '08-15', '10-26', '11-01', '12-08', '12-25', '12-26']) {
    assert.ok(istFeiertag(`2026-${d}`), d);
  }
  assert.equal(feiertage(2026).size, 13);
  assert.ok(!istFeiertag('2026-12-24'));
});

test('Gehaltstage', () => {
  assert.equal(gehaltstag(2026, 11), '2026-11-13'); // 15. = Sonntag
  assert.equal(gehaltstag(2026, 12), '2026-12-15'); // Dienstag
  assert.equal(gehaltstag(2027, 1), '2027-01-15');
  assert.equal(gehaltstag(2027, 5), '2027-05-14'); // 15. = Samstag
  assert.equal(gehaltstag(2027, 8), '2027-08-13'); // 15. = Sonntag + Feiertag
  assert.equal(gehaltstag(2025, 8), '2025-08-14'); // 15. = Freitag, aber Mariä Himmelfahrt
  assert.equal(gehaltstag(2026, 8), '2026-08-14'); // 15. = Samstag (und Feiertag)
});

test('Gehaltstag ist immer Mo–Fr und nie Feiertag (2025–2035)', () => {
  for (let j = 2025; j <= 2035; j++) {
    for (let m = 1; m <= 12; m++) {
      const g = gehaltstag(j, m);
      const wt = wochentag(g);
      assert.ok(wt >= 1 && wt <= 5, g);
      assert.ok(!istFeiertag(g), g);
      assert.ok(g <= `${j}-${String(m).padStart(2, '0')}-15`);
    }
  }
});

test('Periode', () => {
  const p = periodeFuer('2026-11-16');
  assert.deepEqual(p, { start: '2026-11-13', ende: '2026-12-14', naechsterGehaltstag: '2026-12-15' });
  assert.deepEqual(periodeFuer('2026-11-13'), p);
  assert.deepEqual(periodeFuer('2026-12-14'), p);
  assert.equal(periodeFuer('2026-11-12').start, '2026-10-15');
  assert.equal(periodeFuer('2026-11-12').ende, '2026-11-12');
  assert.equal(periodeFuer('2027-01-03').start, '2026-12-15');
  assert.equal(periodeVerschieben(p, 1).start, '2026-12-15');
  assert.equal(periodeVerschieben(p, 1).ende, '2027-01-14');
  assert.equal(periodeVerschieben(p, -1).start, '2026-10-15');
  assert.deepEqual(periodeVerschieben(periodeVerschieben(p, 3), -3), p);
});

test('Perioden lückenlos 2025–2030', () => {
  let p = periodeFuer('2025-01-20');
  for (let i = 0; i < 72; i++) {
    const n = periodeVerschieben(p, 1);
    assert.equal(plusTage(p.ende, 1), n.start);
    p = n;
  }
});

const vorlage = (x) => ({ id: 'v', art: 'ausgabe', betragCent: 1000, bezeichnung: 'X', rhythmus: 'monatlich', endDatum: null, ...x });

test('Monatsende ohne Wegdriften', () => {
  const t = termine(vorlage({ termin: 31, startDatum: '2027-01-31' }), '2027-05-31');
  assert.deepEqual(t, ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
  assert.ok(termine(vorlage({ termin: 31, startDatum: '2028-01-31' }), '2028-03-01').includes('2028-02-29'));
});

test('quartalsweise, jährlich, Enddatum', () => {
  assert.deepEqual(termine(vorlage({ termin: 10, rhythmus: 'quartalsweise', startDatum: '2026-11-10' }), '2027-12-31'),
    ['2026-11-10', '2027-02-10', '2027-05-10', '2027-08-10', '2027-11-10']);
  assert.deepEqual(termine(vorlage({ termin: 1, rhythmus: 'jaehrlich', startDatum: '2026-03-01' }), '2029-01-01'),
    ['2026-03-01', '2027-03-01', '2028-03-01']);
  assert.deepEqual(termine(vorlage({ termin: 5, startDatum: '2026-11-05', endDatum: '2027-01-31' }), '2027-12-31'),
    ['2026-11-05', '2026-12-05', '2027-01-05']);
});

test('Termin am Gehaltstag', () => {
  const g = vorlage({ art: 'einnahme', termin: 'gehaltstag', startDatum: '2026-11-15' });
  assert.deepEqual(termine(g, '2027-01-31'), ['2026-11-13', '2026-12-15', '2027-01-15']);
});

test('Ausnahmen: überspringen und in andere Periode verschieben', () => {
  const v = vorlage({ termin: 20, startDatum: '2026-11-20' });
  const p = periodeFuer('2026-11-16');
  assert.equal(vorlagenEintraege([v], [], p.start, p.ende).length, 1);
  const skip = [{ id: 'v@2026-11-20', vorlageId: 'v', datum: '2026-11-20', aktion: 'ueberspringen' }];
  assert.equal(vorlagenEintraege([v], skip, p.start, p.ende).length, 0);
  const verschoben = [{ id: 'v@2026-12-20', vorlageId: 'v', datum: '2026-12-20', aktion: 'aendern', neuesDatum: '2026-12-10', betragCent: 1500 }];
  const e = vorlagenEintraege([v], verschoben, p.start, p.ende);
  assert.equal(e.length, 2);
  assert.equal(e.find((x) => x.datum === '2026-12-10').betragCent, 1500);
  const naechste = periodeVerschieben(p, 1);
  assert.equal(vorlagenEintraege([v], verschoben, naechste.start, naechste.ende).length, 0);
});

test('Abnahmebeispiel', () => {
  const daten = {
    buchungen: [{ id: 'w', art: 'ausgabe', betragCent: 40000, bezeichnung: 'Wiener Linien Ticket', datum: '2026-11-18' }],
    vorlagen: [
      { id: 'g', art: 'einnahme', betragCent: 100000, bezeichnung: 'Gehalt', termin: 'gehaltstag', rhythmus: 'monatlich', startDatum: '2026-11-13', endDatum: null },
      { id: 'm', art: 'ausgabe', betragCent: 20000, bezeichnung: 'Miete', termin: 16, rhythmus: 'monatlich', startDatum: '2026-11-16', endDatum: null },
      { id: 's', art: 'ausgabe', betragCent: 10000, bezeichnung: 'Strom', termin: 17, rhythmus: 'monatlich', startDatum: '2026-11-17', endDatum: null },
    ],
    ausnahmen: [],
  };
  const p = periodeFuer('2026-11-16');
  const e = eintraegeDerPeriode(daten, p);
  assert.deepEqual(e.map((x) => x.datum), ['2026-11-13', '2026-11-16', '2026-11-17', '2026-11-18']);
  const s = summen(e, '2026-11-16');
  assert.equal(s.uebrig, 30000);
  assert.equal(s.standHeute, 80000);
  assert.equal(s.geplant, -50000);
  assert.equal(s.geplantEin, 0);
  assert.equal(s.geplantAus, 50000);
  assert.equal(s.standHeute + s.geplant, s.uebrig);
  // Nächste Periode: kein Übertrag, Gehalt 15.12., Miete/Strom 16./17.12.
  const s2 = summen(eintraegeDerPeriode(daten, periodeVerschieben(p, 1)), '2026-11-16');
  assert.equal(s2.uebrig, 70000);
});

test('Beträge', () => {
  assert.equal(parseBetrag('1.000'), 100000);
  assert.equal(parseBetrag('1.234,56'), 123456);
  assert.equal(parseBetrag('12,5'), 1250);
  assert.equal(parseBetrag('12.50'), 1250);
  assert.equal(parseBetrag(' 400 € '), 40000);
  assert.equal(parseBetrag('0,1'), 10);
  assert.equal(parseBetrag('abc'), null);
  assert.equal(parseBetrag('1,234'), null);
  assert.equal(formatEuro(123456), '1.234,56 €');
  assert.equal(formatEuro(-50000), '−500,00 €');
  assert.equal(formatEuro(100000, { vorzeichen: true }), '+1.000,00 €');
  assert.equal(formatEuro(30000, { ohneCent: true }), '300 €');
  assert.equal(10 + 20, 30); // Cent statt 0,1 + 0,2
});

test('Export und Import ergeben dieselben Daten', () => {
  const daten = {
    buchungen: [{ id: 'a', art: 'ausgabe', betragCent: 999, bezeichnung: 'Kaffee', datum: '2026-11-16' }],
    vorlagen: [{ id: 'v', art: 'ausgabe', betragCent: 20000, bezeichnung: 'Miete', termin: 1, rhythmus: 'monatlich', startDatum: '2026-12-01', endDatum: null }],
    ausnahmen: [{ id: 'v@2027-01-01', vorlageId: 'v', datum: '2027-01-01', aktion: 'ueberspringen' }],
  };
  daten.kontostaende = [{ id: '2026-11-16', datum: '2026-11-16', betragCent: -1234 }];
  const text = JSON.stringify(exportDaten(daten, '2026-11-16'));
  assert.deepEqual(pruefeImport(text), daten);
  // Backups aus Version 1 (ohne Kontostände) lassen sich weiter laden.
  const alt = JSON.parse(text); alt.version = 1; delete alt.kontostaende;
  assert.deepEqual(pruefeImport(alt).kontostaende, []);
  assert.throws(() => pruefeImport('{}'), /kein Kostentool-Backup/);
  assert.throws(() => pruefeImport('nicht json'), /kein JSON/);
});

test('Backup-Erinnerung', () => {
  assert.equal(erinnerungFaellig({}, '2026-12-31'), null);
  assert.equal(erinnerungFaellig({ ersteBuchungAm: '2026-11-16' }, '2026-12-15'), null);
  assert.equal(erinnerungFaellig({ ersteBuchungAm: '2026-11-16' }, '2026-12-16'), 30);
  assert.equal(erinnerungFaellig({ ersteBuchungAm: '2026-01-01', letzterExport: '2026-12-01' }, '2026-12-20'), null);
  assert.equal(erinnerungFaellig({ letzterExport: '2026-10-01', schlummerBis: '2026-12-20' }, '2026-12-19'), null);
  assert.equal(erinnerungFaellig({ letzterExport: '2026-10-01', schlummerBis: '2026-12-20' }, '2026-12-20'), 80);
});

test('Datum ohne Zeitzonen-Falle', () => {
  assert.equal(heute(new Date(2026, 10, 16, 23, 59)), '2026-11-16');
  assert.equal(heute(new Date(2026, 10, 17, 0, 1)), '2026-11-17');
  assert.equal(plusTage('2026-03-28', 2), '2026-03-30'); // Sommerzeit
  assert.equal(tageZwischen('2026-11-16', '2026-12-15'), 29);
});

test('Kontostand', () => {
  assert.equal(parseKontostand('1.234,56'), 123456);
  assert.equal(parseKontostand('-120'), -12000);
  assert.equal(parseKontostand('−120,50'), -12050);
  assert.equal(parseKontostand('0'), 0);
  assert.equal(parseKontostand('abc'), null);
  const liste = [
    { id: '2026-11-10', datum: '2026-11-10', betragCent: 1 },
    { id: '2026-11-14', datum: '2026-11-14', betragCent: 2 },
    { id: '2026-11-16', datum: '2026-11-16', betragCent: 3 },
  ];
  assert.equal(letzterKontostand(liste, '2026-11-13', '2026-11-15').betragCent, 2);
  assert.equal(letzterKontostand(liste, '2026-11-13', '2026-12-14').betragCent, 3);
  assert.equal(letzterKontostand(liste, '2026-12-15', '2027-01-14'), null);
});
