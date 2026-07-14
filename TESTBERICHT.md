# Testbericht CruiseSip v5.2.0a

## Automatisierte Prüfungen

- JavaScript-Syntax von `js/app.js` und `sw.js` mit Node.js geprüft.
- Versions-, Build- und Cachekennungen auf `5.2.0` / `5.2.0a` abgeglichen.
- `manifest.json`, `data/barkarte.json` und `data/pakete.json` als gültiges JSON geprüft.
- Vollständigkeit aller im Service Worker aufgeführten Offline-Ressourcen geprüft.
- Barkartenbestand unverändert mit 233 Getränken bestätigt.
- Reihenfolge der Erfassungsansicht unverändert bestätigt: Kategorien → Person → Suche → Getränke.
- Logiktest für einen Geräteimport mit einer neuen, einer geänderten und einer identischen Buchung ausgeführt.
- Konservative Vorauswahl „Lokale Version“ für Konflikte geprüft.
- Übernahme der importierten Version einer geänderten Buchung geprüft; lokale Datensatz-ID und stabiler Merge-Key bleiben erhalten.
- Sperre einer unsicheren Personen-/Reisezuordnung geprüft.
- Automatische Erstellung eines Wiederherstellungspunkts vor der Zusammenführung im Logiktest bestätigt.
- Erweiterte Importprotokollfelder einschließlich Konfliktentscheidung und Wiederherstellungspunkt geprüft.
- Darstellungstexte der Importvorschau für neue, geänderte und doppelte Buchungen geprüft.

## Fachliche Sicherheitslogik

- Identische Buchungen werden über den stabilen Merge-Key und den relevanten Buchungsinhalt als Dublette erkannt.
- Abweichende Buchungen mit demselben Merge-Key werden als Änderung beziehungsweise Konflikt behandelt.
- Die lokale Version bleibt standardmäßig ausgewählt.
- Eine importierte Version wird nur bei sicher verwendbarer Reise- und Personenzuordnung angeboten.
- Nicht sicher zuordenbare Datensätze bleiben gesperrt und werden nicht automatisch geschrieben.
- Bei mehreren Importdateien kann je Ziel-Datensatz höchstens eine importierte Konfliktversion angewendet werden.

## Nicht automatisiert prüfbar

Die abschließende visuelle und haptische Prüfung in der installierten iPhone-PWA bleibt erforderlich. Dabei sollten insbesondere das Aufklappen der Konfliktkarten, die Auswahlbuttons, der iOS-Dateidialog, die Bestätigungsdialoge und die Wiederherstellung nach einem realen Geräteimport geprüft werden.
