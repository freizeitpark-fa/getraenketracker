# Testbericht CruiseSip v5.5.1a

## Geprüfter Umfang

- Update von v5.5.0a auf v5.5.1a
- Status des letzten externen Vollbackups im Setup
- Zahl der Erfassungen seit dem letzten Backup
- Home-Erinnerung ab dem folgenden Kalendertag
- Aktion „Jetzt sichern“
- Aktion „Heute nicht mehr erinnern“
- klare Trennung zwischen internen Wiederherstellungspunkten und externen Dateien-Backups
- Versions- und Service-Worker-Cachewechsel
- vollständige Offline-Dateiliste

## Automatisierte Prüfungen

- JavaScript-Syntax von App und Service Worker mit `node --check`
- JSON-Syntax der Barkarten- und Paketdateien
- Existenz aller im Service Worker aufgeführten Offline-Ressourcen
- eindeutige Build-Kennung `5.5.1a` in HTML, App und Service Worker
- Laufzeittests der Erinnerungslogik:
  - keine Erinnerung ohne Erfassungen
  - keine Erinnerung am ersten Erfassungstag
  - Erinnerung ab dem nächsten Kalendertag
  - keine Erinnerung nach einem aktuellen Backup
  - Tagesausblendung nur für den aktuellen Tag
  - vorhandene v5.5.0-Backups ohne gespeicherten Log-Zähler werden korrekt abgeleitet
- statische Prüfung, dass ein abgebrochener Teilen-Dialog den Backup-Zeitpunkt nicht aktualisiert
- ZIP-Integrität

## Sicherungslogik

CruiseSip protokolliert ein externes Backup erst nach einem nicht abgebrochenen Teilen- oder Downloadvorgang. Der Home-Hinweis erscheint nur, wenn ungesicherte Erfassungen bestehen und mindestens ein neuer Kalendertag begonnen hat. „Heute nicht mehr erinnern“ verändert keine Daten und unterdrückt die Anzeige nur bis zum nächsten Tag.

## Noch auf dem iPhone zu prüfen

- iOS-Teilen-Menü und Auswahl „In Dateien sichern“
- Home-Darstellung auf dem konkret verwendeten Display
- Tageswechsel nach ausgeblendeter Erinnerung
- Offline-Start nach dem Update
