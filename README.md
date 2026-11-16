# Kostentool

Eine kleine Finanz-App fürs iPhone. Sie zeigt pro **Gehaltsperiode**, wie viel nach allen Fixkosten und geplanten Ausgaben noch übrig bleibt.
Die App läuft als Web-App (PWA) offline auf dem Gerät. **Alle Daten bleiben ausschließlich auf dem iPhone.** Es gibt keinen Server, kein Konto und keine Bankanbindung.

## Funktionen

- **Gehaltsperiode:** Sie läuft vom Gehaltstag bis zum Tag vor dem nächsten. Gehaltstag ist der 15. Fällt der 15. auf ein Wochenende oder einen österreichischen Feiertag, ist es der letzte Bankarbeitstag davor. Beispiel: 15.11.2026 ist ein Sonntag, also Freitag, 13.11.2026.
- **Buchungen:** Einnahmen und Ausgaben mit Betrag, Bezeichnung und Datum. Einmalig oder wiederkehrend (monatlich, quartalsweise, jährlich, auf Wunsch „am Gehaltstag“).
- **Einzelne Termine** einer Fixkost lassen sich ändern oder überspringen, ohne die Vorlage anzufassen.
- **Dashboard:**
  - übrig am Periodenende, Stand heute und noch geplant
  - Buchungen nach Tag gruppiert, getrennt nach „Geplant“ und „Erledigt“
  - Status automatisch nach Datum
  - kein Übertrag zwischen Perioden
- **Backup:** Export und Import als Datei. Die App erinnert, wenn das letzte Backup älter als 30 Tage ist.
- **Darstellung:** Hell- und Dunkelmodus nach iPhone-Einstellung.

## Einrichten (einmalig)

### 1. GitHub Pages einschalten

1. Im Repository auf **Settings → Pages** gehen.
2. Unter „Build and deployment“ als **Source** „Deploy from a branch“ wählen.
3. Als **Branch** `main` und den Ordner `/ (root)` wählen, dann **Save**.
4. Nach ein bis zwei Minuten erscheint dort die Adresse, z. B. `https://joelheiser.github.io/Kostentool/`.

### 2. Auf dem iPhone installieren

1. Die Adresse in **Safari** öffnen. Andere Browser können auf dem iPhone keine Web-App installieren.
2. Auf das **Teilen-Symbol** tippen (Quadrat mit Pfeil), dann **„Zum Home-Bildschirm“** und **Hinzufügen**.
3. Die App ab jetzt immer über das neue Symbol am Home-Bildschirm öffnen. Daten, die du in Safari einträgst, sind getrennt von denen der installierten App.

### 3. Loslegen

1. Auf **+** tippen, „Einnahme“ wählen, Betrag und „Gehalt“ eintragen. Dann **Wiederholen** einschalten und als Termin **„am Gehaltstag“** wählen.
2. Fixkosten wie Miete oder Strom genauso mit **Wiederholen** anlegen.
3. Einmalige Ausgaben ohne Wiederholen eintragen.

### 4. Backup

Unter **Einstellungen → Backup exportieren** sicherst du alles als Datei, am besten in die Dateien-App oder nach iCloud Drive.
Wichtig, weil die Daten nur lokal liegen: Löschst du die App oder wechselst du das Handy, stellst du mit **Backup importieren** alles wieder her.

## Für Entwickler

- Reines HTML, CSS und JavaScript (ES-Module), ohne Build-Schritt und ohne Abhängigkeiten.
- Die Rechenlogik liegt in `src/` (`datum`, `feiertage`, `periode`, `wiederkehrend`, `berechnung`, `geld`, `sicherung`). Die Oberfläche steckt in `src/app.js`, der Speicher (IndexedDB) in `src/speicher.js`.
- Tests: `npm test` (Node.js 20 oder neuer).
- Bei jeder Änderung `VERSION` in `sw.js` erhöhen, damit installierte Apps das Update laden.
