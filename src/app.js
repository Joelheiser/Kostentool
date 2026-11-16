// Oberfläche der App. Alle Daten bleiben im Browser-Speicher dieses Geräts.
import * as D from './datum.js';
import { periodeFuer, periodeVerschieben } from './periode.js';
import { eintraegeDerPeriode, summen, istErledigt } from './berechnung.js';
import { RHYTHMEN, AM_GEHALTSTAG, ausnahmeId, naechsterTermin, termine } from './wiederkehrend.js';
import { parseBetrag, formatEuro, alsEingabe } from './geld.js';
import { exportDaten, pruefeImport, erinnerungFaellig, SCHLUMMER_TAGE } from './sicherung.js';
import * as S from './speicher.js';
import { parseKontostand, letzterKontostand } from './kontostand.js';

const app = document.getElementById('app');

const zustand = {
  daten: { buchungen: [], vorlagen: [], ausnahmen: [], kontostaende: [] },
  einstellungen: {},
  heute: D.heute(),
  periode: periodeFuer(D.heute()),
  ansicht: 'uebersicht',
};

// ---------- Hilfen ----------

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICON = {
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  links: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  rechts: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  schliessen: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ein: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  fix: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  einmal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  uebersicht: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5H12z" fill="currentColor"/></svg>',
  zahnrad: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

function symbolFuer(e) {
  if (e.art === 'einnahme') return `<span class="symbol ein">${ICON.ein}</span>`;
  if (e.quelle === 'vorlage') return `<span class="symbol fix">${ICON.fix}</span>`;
  return `<span class="symbol einmal">${ICON.einmal}</span>`;
}

function betragHtml(e) {
  const cent = e.art === 'einnahme' ? e.betragCent : -e.betragCent;
  return `<span class="betrag${e.art === 'einnahme' ? ' gruen' : ''}">${formatEuro(cent, { vorzeichen: true })}</span>`;
}

/** Für Ring und Kacheln: ohne ",00", Cent nur wenn vorhanden. */
function kompakt(cent) {
  return formatEuro(cent, { ohneCent: true });
}

/** Kachelwert, Schrift schrumpft bei langen Beträgen. */
function kachelWert(cent, klasse = '') {
  const t = kompakt(cent);
  const groesse = t.length <= 8 ? 16 : t.length <= 10 ? 14 : 12;
  return `<span class="wert${klasse}" style="font-size:${groesse}px">${t}</span>`;
}

function ringSchrift(text) {
  const n = text.length;
  return n <= 6 ? 34 : n <= 8 ? 30 : n <= 10 ? 25 : 21;
}

function inTagen(von, bis) {
  const n = D.tageZwischen(von, bis);
  if (n === 0) return 'heute';
  if (n === 1) return 'morgen';
  if (n === -1) return 'gestern';
  return n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`;
}

function vorlageVon(id) {
  return zustand.daten.vorlagen.find((v) => v.id === id);
}

function terminText(v) {
  return v.termin === AM_GEHALTSTAG ? 'am Gehaltstag' : `am ${v.termin}.`;
}

function toast(text) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Daten ändern ----------

async function neuLaden() {
  const { daten, einstellungen } = await S.ladeAlles();
  zustand.daten = daten;
  zustand.einstellungen = einstellungen;
}

async function speichern(operationen) {
  if (!zustand.einstellungen.ersteBuchungAm) {
    operationen.push({ liste: 'einstellungen', put: { key: 'ersteBuchungAm', value: zustand.heute } });
  }
  await S.aendere(operationen);
  await neuLaden();
  render();
}

// ---------- Übersicht ----------

function ringSvg(anteil, negativ, farbeNormal = 'var(--ring)') {
  const r = 80;
  const umfang = 2 * Math.PI * r;
  const laenge = negativ ? umfang : Math.max(0, Math.min(1, anteil)) * umfang;
  const farbe = negativ ? 'var(--orange)' : farbeNormal;
  const bogen = laenge > 0
    ? `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${farbe}" stroke-width="18" stroke-linecap="${laenge >= umfang ? 'butt' : 'round'}" stroke-dasharray="${laenge.toFixed(1)} ${umfang.toFixed(1)}" transform="rotate(-90 100 100)"/>`
    : '';
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="${r}" fill="none" stroke="var(--ring-bg)" stroke-width="18"/>${bogen}</svg>`;
}

function zeilenNachTag(eintraege, absteigend) {
  const gruppen = new Map();
  for (const e of eintraege) {
    if (!gruppen.has(e.datum)) gruppen.set(e.datum, []);
    gruppen.get(e.datum).push(e);
  }
  const tage = [...gruppen.keys()].sort();
  if (absteigend) tage.reverse();
  return tage.map((tag) => {
    const zusatz = tag === zustand.heute ? ' · heute' : tag === D.plusTage(zustand.heute, 1) ? ' · morgen' : '';
    const zeilen = gruppen.get(tag).map((e) => {
      const v = e.quelle === 'vorlage' ? vorlageVon(e.vorlageId) : null;
      const unter = v
        ? `Fixkosten · ${RHYTHMEN[v.rhythmus].name}${e.geaendert ? ' · diesmal geändert' : ''}`
        : 'einmalig';
      const unterText = e.art === 'einnahme' ? unter.replace('Fixkosten', 'wiederkehrend') : unter;
      return `<button class="zeile" data-aktion="eintrag" data-id="${esc(e.id)}">
        ${symbolFuer(e)}
        <span class="zeile-text"><span class="titel">${esc(e.bezeichnung)}</span><span class="klein">${unterText}</span></span>
        ${betragHtml(e)}
      </button>`;
    }).join('');
    return `<h3 class="tag">${D.tagUeberschrift(tag)}${zusatz}</h3><div class="liste">${zeilen}</div>`;
  }).join('');
}

function renderUebersicht() {
  const { periode, heute } = zustand;
  const eintraege = eintraegeDerPeriode(zustand.daten, periode);
  const s = summen(eintraege, heute);
  const aktuell = heute >= periode.start && heute <= periode.ende;
  const vergangen = heute > periode.ende;
  const kuenftig = heute < periode.start;

  const titel = aktuell ? 'Deine Periode' : vergangen ? 'Vergangene Periode' : 'Kommende Periode';
  const anteil = s.einnahmen > 0 ? s.uebrig / s.einnahmen : 0;
  const negativ = s.uebrig < 0;
  const prozent = s.einnahmen > 0 && !negativ ? `${Math.round(anteil * 100)} % übrig` : '';
  const ringLabel = `Übrig am Periodenende: ${formatEuro(s.uebrig)}${prozent ? `, ${prozent}` : ''}`;

  const erinnerung = erinnerungFaellig(zustand.einstellungen, heute);

  const geplant = eintraege.filter((e) => !istErledigt(e, heute));
  const erledigt = eintraege.filter((e) => istErledigt(e, heute));

  const kacheln = kuenftig
    ? `<div class="kachel"><span class="klein">Einnahmen</span>${kachelWert(s.einnahmen, ' gruen')}</div>
       <div class="kachel"><span class="klein">Ausgaben</span>${kachelWert(s.ausgaben)}</div>
       <div class="kachel"><span class="klein">Gehaltstag</span><span class="wert">${D.kurz(periode.start)}</span></div>`
    : `<div class="kachel"><span class="klein">Einnahmen</span>${kachelWert(s.einnahmen, ' gruen')}</div>
       <div class="kachel"><span class="klein">Ausgaben</span>${kachelWert(s.ausgaben)}</div>
       <div class="kachel"><span class="klein">${vergangen ? 'Endstand' : 'Stand heute'}</span>${kachelWert(s.standHeute)}</div>`;

  const geplantZeile = aktuell && geplant.length
    ? `<div class="geplant-zeile">
         <span>Noch geplant<br><span class="klein">${s.geplantEin ? `Einnahmen <span class="gruen">${formatEuro(s.geplantEin, { vorzeichen: true })}</span> · ` : ''}Ausgaben ${formatEuro(-s.geplantAus)}</span></span>
         <strong>${formatEuro(s.geplant, { vorzeichen: true })}</strong>
       </div>`
    : '';

  // Zweiter Kreis: tatsächlicher Kontostand (nicht für kommende Perioden)
  const kStichtag = aktuell ? heute : periode.ende;
  const konto = kuenftig ? null : letzterKontostand(zustand.daten.kontostaende, periode.start, kStichtag);
  let kontoRing = '';
  if (!kuenftig) {
    if (konto) {
      const kNeg = konto.betragCent < 0;
      const alter = D.tageZwischen(konto.datum, heute);
      const wann = konto.datum === heute ? 'heute' : alter === 1 ? 'gestern' : D.kurz(konto.datum);
      const label = `Kontostand ${formatEuro(konto.betragCent)}, eingetragen ${wann}. Tippen zum Eintragen.`;
      kontoRing = `<button class="ring klein-ring ring-knopf" data-aktion="kontostand" aria-label="${esc(label)}">
          ${ringSvg(1, kNeg, 'var(--akzent)')}
          <span class="ring-mitte" aria-hidden="true">
            <span class="klein">Konto</span>
            <span class="gross${konto.betragCent < 0 ? ' negativ' : ''}" style="font-size:${ringSchrift(kompakt(konto.betragCent)) - 6}px">${kompakt(konto.betragCent)}</span>
            <span class="klein${alter >= 2 && aktuell ? ' veraltet' : ''}">${wann}</span>
          </span>
        </button>
        <span class="ring-unter">Kontostand</span>`;
    } else {
      kontoRing = `<button class="ring klein-ring ring-knopf" data-aktion="kontostand" aria-label="Kontostand eintragen">
          ${ringSvg(0, false)}
          <span class="ring-mitte" aria-hidden="true"><span class="klein">Konto</span><span class="gross" style="font-size:22px">${ICON.plus}</span><span class="klein">eintragen</span></span>
        </button>
        <span class="ring-unter">Kontostand</span>`;
    }
  }

  const leer = eintraege.length === 0
    ? `<div class="leer" style="margin-top:20px">Noch keine Buchungen in dieser Periode.<br>Tippe auf <strong>+</strong>, um dein Gehalt und deine Fixkosten einzutragen.</div>`
    : '';

  app.innerHTML = `
    <header class="kopf">
      <div class="kopf-titel"><span class="klein">${D.zeitraum(periode.start, periode.ende)}</span><h1>${titel}</h1></div>
      <div class="kopf-knoepfe">
        ${aktuell ? '' : '<button class="textknopf" data-aktion="heute">Heute</button>'}
        <button class="rundknopf" data-aktion="zurueck" aria-label="Vorherige Periode">${ICON.links}</button>
        <button class="rundknopf" data-aktion="vor" aria-label="Nächste Periode">${ICON.rechts}</button>
      </div>
    </header>
    ${erinnerung !== null ? `<div class="banner" role="status"><span>Letztes Backup vor ${erinnerung} Tagen</span><button class="textknopf" data-aktion="export">Jetzt sichern</button><button class="rundknopf" data-aktion="schlummern" aria-label="Erinnerung für ${SCHLUMMER_TAGE} Tage ausblenden">${ICON.schliessen}</button></div>` : ''}
    <section class="ringkarte" aria-label="Zusammenfassung">
      <div class="ringe${kontoRing ? ' zwei' : ''}">
        <div class="ring-spalte">
          <div class="ring${kontoRing ? ' klein-ring' : ''}" role="img" aria-label="${esc(ringLabel)}">
            ${ringSvg(anteil, negativ)}
            <div class="ring-mitte" aria-hidden="true">
              <span class="klein">übrig</span>
              <span class="gross${negativ ? ' negativ' : ''}" style="font-size:${ringSchrift(kompakt(s.uebrig)) - (kontoRing ? 6 : 0)}px">${kompakt(s.uebrig)}</span>
              <span class="klein">am ${D.kurz(periode.ende).slice(3)}</span>
            </div>
          </div>
          ${kontoRing ? `<span class="ring-unter">${prozent || 'rechnerisch'}</span>` : ''}
        </div>
        ${kontoRing ? `<div class="ring-spalte">${kontoRing}</div>` : ''}
      </div>
      <div class="kacheln">${kacheln}</div>
      ${geplantZeile}
    </section>
    ${leer}
    ${geplant.length ? `<div class="abschnitt"><h2>Geplant</h2><span class="klein">${formatEuro(s.geplant, { vorzeichen: true })}</span></div>${zeilenNachTag(geplant, false)}` : ''}
    ${erledigt.length ? `<div class="abschnitt"><h2>Erledigt</h2><span class="klein">${formatEuro(s.standHeute, { vorzeichen: true })}</span></div>${zeilenNachTag(erledigt, true)}` : ''}
    <p class="hinweis">${aktuell || kuenftig ? `Nächstes Gehalt ${inTagen(heute, periode.naechsterGehaltstag)} · ${D.kurz(periode.naechsterGehaltstag)}` : `Periode beendet am ${D.lang(periode.ende)}`}</p>
  `;
}

// ---------- Fixkosten ----------

function renderFixkosten() {
  const { heute } = zustand;
  const morgen = D.plusTage(heute, 1);
  const istAktiv = (v) => naechsterTermin(v, morgen) !== null;
  const aktiv = zustand.daten.vorlagen.filter(istAktiv);
  const beendet = zustand.daten.vorlagen.filter((v) => !istAktiv(v));
  const zeile = (v) => {
    const naechst = naechsterTermin(v, heute);
    const e = { art: v.art, quelle: 'vorlage', betragCent: v.betragCent };
    return `<button class="zeile" data-aktion="vorlage" data-id="${esc(v.id)}">
      ${symbolFuer(e)}
      <span class="zeile-text"><span class="titel">${esc(v.bezeichnung)}</span>
      <span class="klein">${RHYTHMEN[v.rhythmus].name} ${terminText(v)}${naechst ? ` · nächstes Mal ${D.kurz(naechst)}` : ''}${v.endDatum ? ` · bis ${D.lang(v.endDatum)}` : ''}</span></span>
      ${betragHtml(e)}
    </button>`;
  };
  const sortiert = (liste) => [...liste].sort((a, b) => (a.art === b.art ? 0 : a.art === 'einnahme' ? -1 : 1) || b.betragCent - a.betragCent);
  const monatlichAus = aktiv.filter((v) => v.art === 'ausgabe').reduce((sum, v) => sum + Math.round(v.betragCent / RHYTHMEN[v.rhythmus].monate), 0);

  app.innerHTML = `
    <header class="kopf"><div class="kopf-titel"><span class="klein">Wiederkehrende Buchungen</span><h1>Fixkosten</h1></div></header>
    ${aktiv.length
      ? `<div class="abschnitt"><h2>Aktiv</h2><span class="klein">≈ ${formatEuro(monatlichAus)} / Monat</span></div><div class="liste">${sortiert(aktiv).map(zeile).join('')}</div>`
      : '<div class="leer" style="margin-top:20px">Noch keine Fixkosten.<br>Tippe auf <strong>+</strong> und schalte „Wiederholen“ ein, z. B. für Miete, Strom oder dein Gehalt.</div>'}
    ${beendet.length ? `<div class="abschnitt"><h2>Beendet</h2></div><div class="liste">${sortiert(beendet).map(zeile).join('')}</div>` : ''}
    <p class="fuss" style="padding-top:12px">„≈ pro Monat“ rechnet quartalsweise und jährliche Kosten auf einen Monat um.</p>
  `;
}

// ---------- Einstellungen ----------

function renderEinstellungen() {
  const { letzterExport } = zustand.einstellungen;
  const anzahl = zustand.daten.buchungen.length + zustand.daten.vorlagen.length;
  app.innerHTML = `
    <header class="kopf"><div class="kopf-titel"><span class="klein">Kostentool</span><h1>Einstellungen</h1></div></header>
    <div class="abschnitt"><h2>Datensicherung</h2></div>
    <div class="gruppe">
      <div class="zeile"><span class="zeile-text"><span class="titel">Letztes Backup</span></span><span class="klein" style="color:var(--text2)">${letzterExport ? D.lang(letzterExport) : 'noch nie'}</span></div>
      <button class="zeile aktion" data-aktion="export">Backup exportieren</button>
      <button class="zeile aktion" data-aktion="import">Backup importieren</button>
    </div>
    <p class="fuss">Exportieren speichert eine Datei, z. B. in der Dateien-App oder in iCloud Drive. Beim Importieren werden alle aktuellen Daten durch das Backup ersetzt.</p>
    <input type="file" id="importdatei" accept="application/json,.json" class="versteckt">
    <div class="abschnitt"><h2>Über die App</h2></div>
    <div class="gruppe">
      <div class="zeile"><span class="zeile-text"><span class="titel">Gespeicherte Einträge</span></span><span style="color:var(--text2)">${anzahl}</span></div>
      <div class="zeile"><span class="zeile-text"><span class="titel">Speicher</span></span><span style="color:var(--text2)" id="speicherstatus">nur auf diesem Gerät</span></div>
    </div>
    <p class="fuss">Alle Daten bleiben ausschließlich auf diesem Gerät. Es gibt keinen Server und keine Bankanbindung. Gehaltstag ist der 15. bzw. der letzte Bankarbeitstag davor (Wochenenden und österreichische Feiertage werden übersprungen).</p>
  `;
}

// ---------- Rahmen ----------

function renderRahmen() {
  let rahmen = document.querySelector('.tabbar');
  if (!rahmen) {
    rahmen = document.createElement('div');
    rahmen.className = 'tabbar';
    document.body.append(rahmen);
    const plus = document.createElement('button');
    plus.className = 'plus';
    plus.dataset.aktion = 'neu';
    plus.setAttribute('aria-label', 'Buchung hinzufügen');
    plus.innerHTML = ICON.plus;
    document.body.append(plus);
  }
  const tab = (id, label, icon) => `<button class="tab" data-aktion="ansicht" data-ziel="${id}"${zustand.ansicht === id ? ' aria-current="page"' : ''}>${icon}${label}</button>`;
  rahmen.innerHTML = `<nav aria-label="Bereiche">${tab('uebersicht', 'Übersicht', ICON.uebersicht)}${tab('fixkosten', 'Fixkosten', ICON.fix)}${tab('einstellungen', 'Einstellungen', ICON.zahnrad)}</nav>`;
}

function render() {
  zustand.heute = D.heute();
  if (zustand.ansicht === 'fixkosten') renderFixkosten();
  else if (zustand.ansicht === 'einstellungen') renderEinstellungen();
  else renderUebersicht();
  renderRahmen();
}

// ---------- Eingabe-Sheet ----------

let sheetSchliessenBei = null;

function schliesseSheet() {
  document.querySelector('.schleier')?.remove();
  document.removeEventListener('keydown', sheetSchliessenBei);
  zuletztFokus?.focus?.();
}
let zuletztFokus = null;

/**
 * modus: 'neu' | 'buchung' | 'instanz' | 'vorlage'
 */
function oeffneSheet(modus, objekt = null) {
  zuletztFokus = document.activeElement;
  const heute = zustand.heute;
  const istVorlageModus = modus === 'vorlage';
  const art = objekt?.art ?? 'ausgabe';
  const betrag = objekt ? alsEingabe(objekt.betragCent) : '';
  const bezeichnung = objekt?.bezeichnung ?? '';
  const datum = istVorlageModus ? objekt.startDatum : objekt?.datum ?? (heute >= zustand.periode.start && heute <= zustand.periode.ende ? heute : zustand.periode.start);
  const titel = { neu: 'Neue Buchung', buchung: 'Buchung', instanz: 'Fixkosten-Termin', vorlage: 'Fixkosten-Vorlage' }[modus];

  const v = istVorlageModus ? objekt : null;
  const tagOptionen = Array.from({ length: 31 }, (_, i) => i + 1)
    .map((t) => `<option value="${t}"${v && v.termin === t ? ' selected' : ''}>am ${t}.</option>`).join('');

  const wiederholFelder = `
    <div class="feld"><label for="f-rhythmus">Rhythmus</label>
      <select id="f-rhythmus">${Object.entries(RHYTHMEN).map(([k, r]) => `<option value="${k}"${v?.rhythmus === k ? ' selected' : ''}>${r.name}</option>`).join('')}</select></div>
    <div class="feld"><label for="f-termin">Termin</label>
      <select id="f-termin">${istVorlageModus
        ? `${tagOptionen}<option value="${AM_GEHALTSTAG}"${v.termin === AM_GEHALTSTAG ? ' selected' : ''}>am Gehaltstag</option>`
        : `<option value="tag">am Tag des Datums</option><option value="${AM_GEHALTSTAG}">am Gehaltstag</option>`}</select></div>
    <div class="feld"><label for="f-ende">Endet am</label><input type="date" id="f-ende" value="${v?.endDatum ?? ''}" aria-describedby="ende-info"></div>`;

  const knoepfe = {
    neu: '',
    buchung: '<button type="button" class="knopf gefahr" data-sheet="loeschen">Buchung löschen</button>',
    instanz: `<button type="button" class="knopf" data-sheet="ueberspringen">Diesmal überspringen</button>
              ${objekt?.geaendert ? '<button type="button" class="knopf" data-sheet="zuruecksetzen">Änderung zurücksetzen</button>' : ''}
              <button type="button" class="knopf" data-sheet="vorlage-bearbeiten">Ganze Vorlage bearbeiten</button>`,
    vorlage: `${!v?.endDatum || v.endDatum >= heute ? '<button type="button" class="knopf" data-sheet="beenden">Ab heute beenden</button>' : ''}
              <button type="button" class="knopf gefahr" data-sheet="vorlage-loeschen">Vorlage löschen</button>`,
  }[modus];

  const hinweis = {
    neu: '',
    buchung: '',
    instanz: `<p class="info">Speichern ändert nur diesen Termin (ursprünglich ${D.lang(objekt?.ursprungsDatum ?? heute)}). Die Vorlage bleibt gleich.</p>`,
    vorlage: '<p class="info">Änderungen an Betrag, Rhythmus oder Termin gelten ab dem nächsten Termin. Vergangene Perioden bleiben unverändert.</p>',
  }[modus];

  const schleier = document.createElement('div');
  schleier.className = 'schleier';
  schleier.innerHTML = `
    <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-titel" novalidate>
      <div class="sheet-griff" aria-hidden="true"></div>
      <div class="sheet-kopf">
        <button type="button" class="textknopf" data-sheet="abbrechen">Abbrechen</button>
        <h2 id="sheet-titel">${titel}</h2>
        <button type="submit" class="textknopf fett">Sichern</button>
      </div>
      ${modus === 'instanz' ? '' : `<div class="segment" role="radiogroup" aria-label="Art">
        <label><input type="radio" name="art" value="ausgabe"${art === 'ausgabe' ? ' checked' : ''}><span>Ausgabe</span></label>
        <label><input type="radio" name="art" value="einnahme"${art === 'einnahme' ? ' checked' : ''}><span>Einnahme</span></label>
      </div>`}
      <div class="betragfeld">
        <label for="f-betrag" class="versteckt">Betrag in Euro</label>
        <input id="f-betrag" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(betrag)}">
        <span aria-hidden="true">€</span>
      </div>
      <div class="fehler" id="f-fehler" role="alert"></div>
      <div class="felder">
        <div class="feld"><label for="f-name">Bezeichnung</label><input id="f-name" maxlength="80" placeholder="z. B. Miete" value="${esc(bezeichnung)}" autocomplete="off"></div>
        <div class="feld"><label for="f-datum">${istVorlageModus ? 'Beginnt am' : 'Datum'}</label><input type="date" id="f-datum" value="${esc(datum)}" required></div>
        ${modus === 'neu' ? '<div class="feld"><label for="f-wiederholen">Wiederholen</label><span class="schalter"><input type="checkbox" id="f-wiederholen" role="switch"><span></span></span></div>' : ''}
      </div>
      ${modus === 'neu' || istVorlageModus ? `<div class="felder ${istVorlageModus ? '' : 'versteckt'}" id="wiederholung">${wiederholFelder}</div><p class="info ${istVorlageModus ? '' : 'versteckt'}" id="ende-info">„Endet am“ ist optional. Leer lassen = läuft unbegrenzt.</p>` : ''}
      ${hinweis}
      <div class="knopfreihe">
        <button type="submit" class="knopf haupt">${modus === 'instanz' ? 'Nur diesmal ändern' : 'Sichern'}</button>
        ${knoepfe}
      </div>
    </form>`;
  document.body.append(schleier);

  const form = schleier.querySelector('form');
  const fehler = schleier.querySelector('#f-fehler');
  const wert = (id) => schleier.querySelector(id)?.value ?? '';

  const schalter = schleier.querySelector('#f-wiederholen');
  schalter?.addEventListener('change', () => {
    schleier.querySelector('#wiederholung').classList.toggle('versteckt', !schalter.checked);
    schleier.querySelector('#ende-info').classList.toggle('versteckt', !schalter.checked);
  });

  schleier.addEventListener('click', (ev) => { if (ev.target === schleier) schliesseSheet(); });
  sheetSchliessenBei = (ev) => { if (ev.key === 'Escape') schliesseSheet(); };
  document.addEventListener('keydown', sheetSchliessenBei);

  function eingaben() {
    const cent = parseBetrag(wert('#f-betrag'));
    const name = wert('#f-name').trim();
    const dat = wert('#f-datum');
    if (cent === null || cent === 0) throw new Error('Bitte einen Betrag eingeben, z. B. 12,50.');
    if (!name) throw new Error('Bitte eine Bezeichnung eingeben.');
    if (!D.istGueltig(dat)) throw new Error('Bitte ein gültiges Datum wählen.');
    const ende = wert('#f-ende') || null;
    if (ende && !D.istGueltig(ende)) throw new Error('Das Enddatum ist ungültig.');
    if (ende && ende < dat) throw new Error('Das Enddatum liegt vor dem Beginn.');
    const artWert = schleier.querySelector('input[name="art"]:checked')?.value ?? objekt?.art ?? 'ausgabe';
    return { cent, name, dat, ende, art: artWert };
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const e = eingaben();
      if (modus === 'neu') await speichereNeu(e, schalter?.checked, wert('#f-rhythmus'), wert('#f-termin'));
      else if (modus === 'buchung') await speichern([{ liste: 'buchungen', put: { ...objekt, art: e.art, betragCent: e.cent, bezeichnung: e.name, datum: e.dat } }]);
      else if (modus === 'instanz') await speichereInstanz(objekt, e);
      else if (modus === 'vorlage') await speichereVorlage(objekt, e, wert('#f-rhythmus'), wert('#f-termin'));
      schliesseSheet();
      zeigePeriodeVon(modus === 'vorlage' ? null : e.dat);
    } catch (err) {
      fehler.textContent = err.message;
    }
  });

  schleier.addEventListener('click', async (ev) => {
    const knopf = ev.target.closest('[data-sheet]');
    if (!knopf) return;
    const was = knopf.dataset.sheet;
    try {
      if (was === 'abbrechen') return schliesseSheet();
      if (was === 'loeschen') {
        if (!confirm(`„${objekt.bezeichnung}“ löschen?`)) return;
        await speichern([{ liste: 'buchungen', delete: objekt.id }]);
      }
      if (was === 'ueberspringen') {
        await speichern([{ liste: 'ausnahmen', put: { id: objekt.id, vorlageId: objekt.vorlageId, datum: objekt.ursprungsDatum, aktion: 'ueberspringen' } }]);
        toast(`${objekt.bezeichnung} wird diesmal übersprungen`);
      }
      if (was === 'zuruecksetzen') await speichern([{ liste: 'ausnahmen', delete: objekt.id }]);
      if (was === 'vorlage-bearbeiten') {
        schliesseSheet();
        return oeffneSheet('vorlage', vorlageVon(objekt.vorlageId));
      }
      if (was === 'beenden') {
        await speichern([{ liste: 'vorlagen', put: { ...objekt, endDatum: heute } }]);
        toast(`${objekt.bezeichnung} endet mit heute`);
      }
      if (was === 'vorlage-loeschen') {
        if (!confirm(`„${objekt.bezeichnung}“ komplett löschen? Die Buchung verschwindet auch aus vergangenen Perioden. Wenn sie nur nicht mehr anfallen soll, wähle „Ab heute beenden“.`)) return;
        const ops = [{ liste: 'vorlagen', delete: objekt.id }];
        for (const a of zustand.daten.ausnahmen) if (a.vorlageId === objekt.id) ops.push({ liste: 'ausnahmen', delete: a.id });
        await speichern(ops);
      }
      schliesseSheet();
    } catch (err) {
      fehler.textContent = err.message;
    }
  });

  setTimeout(() => schleier.querySelector(modus === 'neu' ? '#f-betrag' : '.sheet-kopf .textknopf')?.focus(), 50);
}

function oeffneKontostand() {
  zuletztFokus = document.activeElement;
  const heute = zustand.heute;
  const liste = [...zustand.daten.kontostaende].sort((a, b) => b.datum.localeCompare(a.datum));
  const vorhanden = (datum) => zustand.daten.kontostaende.find((k) => k.id === datum);
  const startDatum = zustand.heute <= zustand.periode.ende ? heute : zustand.periode.ende;
  const startWert = vorhanden(startDatum) ?? liste[0];

  const schleier = document.createElement('div');
  schleier.className = 'schleier';
  schleier.innerHTML = `
    <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-titel" novalidate>
      <div class="sheet-griff" aria-hidden="true"></div>
      <div class="sheet-kopf">
        <button type="button" class="textknopf" data-sheet="abbrechen">Abbrechen</button>
        <h2 id="sheet-titel">Kontostand</h2>
        <button type="submit" class="textknopf fett">Sichern</button>
      </div>
      <p class="info" style="margin:8px 4px 4px">Trag ein, was gerade wirklich auf deinem Konto ist. Ein Wert pro Tag. Bei einem überzogenen Konto mit Minus, z. B. -120,00.</p>
      <div class="betragfeld">
        <label for="k-betrag" class="versteckt">Kontostand in Euro</label>
        <input id="k-betrag" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${startWert ? esc(alsEingabe(Math.abs(startWert.betragCent)).replace(/^/, startWert.betragCent < 0 ? '-' : '')) : ''}">
        <span aria-hidden="true">€</span>
      </div>
      <div class="fehler" id="k-fehler" role="alert"></div>
      <div class="felder">
        <div class="feld"><label for="k-datum">Datum</label><input type="date" id="k-datum" value="${startDatum}" max="${heute}"></div>
      </div>
      <div class="knopfreihe">
        <button type="submit" class="knopf haupt">Sichern</button>
        <button type="button" class="knopf gefahr ${vorhanden(startDatum) ? '' : 'versteckt'}" data-sheet="k-loeschen">Eintrag für diesen Tag löschen</button>
      </div>
      ${liste.length ? `<h3 class="tag" style="padding-top:20px">Letzte Einträge</h3><div class="liste">${liste.slice(0, 7).map((k) => `<div class="zeile" style="min-height:44px"><span class="zeile-text"><span class="titel">${D.tagUeberschrift(k.datum)}</span></span><span class="betrag${k.betragCent < 0 ? ' negativ' : ''}">${formatEuro(k.betragCent)}</span></div>`).join('')}</div>` : ''}
    </form>`;
  document.body.append(schleier);
  const fehler = schleier.querySelector('#k-fehler');
  const datumFeld = schleier.querySelector('#k-datum');
  const loeschKnopf = schleier.querySelector('[data-sheet="k-loeschen"]');
  datumFeld.addEventListener('change', () => loeschKnopf.classList.toggle('versteckt', !vorhanden(datumFeld.value)));

  schleier.addEventListener('click', async (ev) => {
    if (ev.target === schleier) return schliesseSheet();
    const was = ev.target.closest('[data-sheet]')?.dataset.sheet;
    if (was === 'abbrechen') schliesseSheet();
    if (was === 'k-loeschen') {
      await S.aendere([{ liste: 'kontostaende', delete: datumFeld.value }]);
      await neuLaden();
      render();
      schliesseSheet();
    }
  });
  sheetSchliessenBei = (ev) => { if (ev.key === 'Escape') schliesseSheet(); };
  document.addEventListener('keydown', sheetSchliessenBei);

  schleier.querySelector('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const cent = parseKontostand(schleier.querySelector('#k-betrag').value);
    const datum = datumFeld.value;
    if (cent === null) { fehler.textContent = 'Bitte einen Betrag eingeben, z. B. 1.234,56 oder -120,00.'; return; }
    if (!D.istGueltig(datum)) { fehler.textContent = 'Bitte ein gültiges Datum wählen.'; return; }
    if (datum > heute) { fehler.textContent = 'Der Kontostand kann nicht in der Zukunft liegen.'; return; }
    try {
      await speichern([{ liste: 'kontostaende', put: { id: datum, datum, betragCent: cent } }]);
      schliesseSheet();
    } catch (err) {
      fehler.textContent = err.message;
    }
  });
  setTimeout(() => schleier.querySelector('#k-betrag')?.select(), 50);
}

async function speichereNeu(e, wiederholen, rhythmus, terminWahl) {
  if (!wiederholen) {
    return speichern([{ liste: 'buchungen', put: { id: S.neueId(), art: e.art, betragCent: e.cent, bezeichnung: e.name, datum: e.dat } }]);
  }
  const termin = terminWahl === AM_GEHALTSTAG ? AM_GEHALTSTAG : D.zerlege(e.dat).tag;
  return speichern([{ liste: 'vorlagen', put: { id: S.neueId(), art: e.art, betragCent: e.cent, bezeichnung: e.name, termin, rhythmus, startDatum: e.dat, endDatum: e.ende } }]);
}

async function speichereInstanz(instanz, e) {
  const v = vorlageVon(instanz.vorlageId);
  const unveraendert = e.cent === v.betragCent && e.name === v.bezeichnung && e.dat === instanz.ursprungsDatum;
  if (unveraendert) return speichern([{ liste: 'ausnahmen', delete: instanz.id }]);
  return speichern([{ liste: 'ausnahmen', put: {
    id: ausnahmeId(v.id, instanz.ursprungsDatum), vorlageId: v.id, datum: instanz.ursprungsDatum, aktion: 'aendern',
    betragCent: e.cent, bezeichnung: e.name, neuesDatum: e.dat,
  } }]);
}

/**
 * Änderungen an Betrag, Art, Rhythmus oder Termin gelten ab dem nächsten Termin:
 * die alte Vorlage endet gestern, ab dem nächsten Termin gilt eine neue.
 * Nur Bezeichnung, Beginn oder Ende → Vorlage direkt ändern.
 */
async function speichereVorlage(v, e, rhythmus, terminWahl) {
  const heute = zustand.heute;
  const termin = terminWahl === AM_GEHALTSTAG ? AM_GEHALTSTAG : Number(terminWahl);
  const neu = { ...v, art: e.art, betragCent: e.cent, bezeichnung: e.name, termin, rhythmus, startDatum: e.dat, endDatum: e.ende };
  const wesentlich = v.art !== neu.art || v.betragCent !== neu.betragCent || v.rhythmus !== neu.rhythmus || v.termin !== neu.termin;
  const hatVergangenheit = termine(v, D.plusTage(heute, -1)).length > 0;
  if (!wesentlich || !hatVergangenheit) {
    return speichern([{ liste: 'vorlagen', put: neu }]);
  }
  const naechster = naechsterTermin(v, heute) ?? heute;
  const ab = e.dat > naechster ? e.dat : naechster;
  const neueId = S.neueId();
  const ops = [
    { liste: 'vorlagen', put: { ...v, bezeichnung: e.name, endDatum: D.plusTage(ab, -1) } },
    { liste: 'vorlagen', put: { ...neu, id: neueId, startDatum: ab } },
  ];
  // Bereits geänderte oder übersprungene künftige Termine an die neue Vorlage hängen.
  for (const a of zustand.daten.ausnahmen) {
    if (a.vorlageId !== v.id || a.datum < ab) continue;
    ops.push({ liste: 'ausnahmen', delete: a.id });
    ops.push({ liste: 'ausnahmen', put: { ...a, id: ausnahmeId(neueId, a.datum), vorlageId: neueId } });
  }
  return speichern(ops);
}

function zeigePeriodeVon(datum) {
  if (zustand.ansicht === 'uebersicht' && datum && (datum < zustand.periode.start || datum > zustand.periode.ende)) {
    toast(`Gespeichert für ${D.lang(datum)}`);
  }
}

// ---------- Export / Import ----------

async function exportieren() {
  const heute = zustand.heute;
  const json = JSON.stringify(exportDaten(zustand.daten, heute), null, 2);
  const name = `kostentool-backup-${heute}.json`;
  const datei = new File([json], name, { type: 'application/json' });
  let geteilt = false;
  try {
    if (navigator.canShare?.({ files: [datei] })) {
      await navigator.share({ files: [datei], title: 'Kostentool-Backup' });
      geteilt = true;
    }
  } catch (err) {
    if (err?.name === 'AbortError') return; // Nutzer hat abgebrochen
  }
  if (!geteilt) {
    const url = URL.createObjectURL(datei);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  await S.aendere([
    { liste: 'einstellungen', put: { key: 'letzterExport', value: heute } },
    { liste: 'einstellungen', put: { key: 'schlummerBis', value: null } },
  ]);
  await neuLaden();
  render();
  toast('Backup erstellt');
}

async function importieren(datei) {
  try {
    const daten = pruefeImport(await datei.text());
    const anzahl = daten.buchungen.length + daten.vorlagen.length;
    if (!confirm(`Backup mit ${anzahl} Einträgen laden? Alle aktuellen Daten werden ersetzt.`)) return;
    await S.ersetzeAlles(daten);
    await S.aendere([
      { liste: 'einstellungen', put: { key: 'letzterExport', value: zustand.heute } },
      { liste: 'einstellungen', put: { key: 'ersteBuchungAm', value: zustand.einstellungen.ersteBuchungAm || zustand.heute } },
    ]);
    await neuLaden();
    render();
    toast('Backup geladen');
  } catch (err) {
    toast(err.message);
  }
}

// ---------- Ereignisse ----------

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-aktion]');
  if (!el || el.closest('.schleier')) return;
  const aktion = el.dataset.aktion;
  if (aktion === 'zurueck') { zustand.periode = periodeVerschieben(zustand.periode, -1); render(); }
  if (aktion === 'vor') { zustand.periode = periodeVerschieben(zustand.periode, 1); render(); }
  if (aktion === 'heute') { zustand.periode = periodeFuer(D.heute()); render(); }
  if (aktion === 'ansicht') { zustand.ansicht = el.dataset.ziel; render(); window.scrollTo(0, 0); }
  if (aktion === 'neu') oeffneSheet('neu');
  if (aktion === 'eintrag') {
    const e = eintraegeDerPeriode(zustand.daten, zustand.periode).find((x) => x.id === el.dataset.id);
    if (!e) return;
    if (e.quelle === 'vorlage') oeffneSheet('instanz', e);
    else oeffneSheet('buchung', zustand.daten.buchungen.find((b) => b.id === e.id));
  }
  if (aktion === 'vorlage') oeffneSheet('vorlage', vorlageVon(el.dataset.id));
  if (aktion === 'kontostand') oeffneKontostand();
  if (aktion === 'export') exportieren();
  if (aktion === 'import') document.getElementById('importdatei')?.click();
  if (aktion === 'schlummern') {
    await S.setzeEinstellung('schlummerBis', D.plusTage(zustand.heute, SCHLUMMER_TAGE));
    await neuLaden();
    render();
  }
});

document.addEventListener('change', (ev) => {
  if (ev.target.id === 'importdatei' && ev.target.files?.[0]) {
    importieren(ev.target.files[0]);
    ev.target.value = '';
  }
});

// Wischen links/rechts wechselt die Periode.
let wischStart = null;
app.addEventListener('touchstart', (ev) => {
  if (zustand.ansicht !== 'uebersicht' || ev.touches.length !== 1) return;
  wischStart = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
}, { passive: true });
app.addEventListener('touchend', (ev) => {
  if (!wischStart) return;
  const dx = ev.changedTouches[0].clientX - wischStart.x;
  const dy = ev.changedTouches[0].clientY - wischStart.y;
  wischStart = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 40) {
    zustand.periode = periodeVerschieben(zustand.periode, dx < 0 ? 1 : -1);
    render();
  }
}, { passive: true });

// Nach Mitternacht oder beim Zurückkehren in die App neu berechnen.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const neu = D.heute();
  if (neu !== zustand.heute) {
    const warAktuell = zustand.heute >= zustand.periode.start && zustand.heute <= zustand.periode.ende;
    if (warAktuell) zustand.periode = periodeFuer(neu);
    render();
  }
});

// ---------- Start ----------

async function start() {
  try {
    await neuLaden();
  } catch (err) {
    app.innerHTML = `<div class="leer" style="margin-top:40px">Der lokale Speicher ist nicht verfügbar (${esc(err?.message ?? err)}).<br>Bitte die App nicht im privaten Safari-Modus öffnen.</div>`;
    return;
  }
  render();
  S.dauerhaftAnfragen();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-Cache optional */ });
  }
}

start();
