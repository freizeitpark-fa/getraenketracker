# Testbericht CruiseSip v5.1.0a

## Geprüft

- JavaScript-Syntax von `js/app.js` und `sw.js` mit `node --check`.
- JSON-Syntax von Manifest, Barkarte und Paketdefinitionen.
- HTML-Grundstruktur und CSS-Klammerbalance.
- Einheitliche Versions-, Build- und Cachekennungen auf `5.1.0a`.
- Vollständigkeit aller 28 im Service Worker hinterlegten Offline-Ressourcen.
- Barkartenbestand mit 233 Getränken unverändert vorhanden.
- Unit-Test der tatsächlichen Snapshot-Funktionen:
  - Erstellung vollständiger interner Sicherungspunkte,
  - Begrenzung auf fünf reguläre Stände,
  - Erhalt der separaten v5-Migrationssicherung,
  - Sortierung nach dem neuesten Stand,
  - korrekte Bestandszahlen je Store,
  - Verarbeitung von ISO-Zeitstempeln in der Anzeige.
- Automatische Sicherungsaufrufe vor Reise-Löschung, Barkartenwechsel, Reiseverlaufs-Löschung, Vollbackup-Ersetzung, Vollbackup-Ergänzung, Geräteimport und Massenänderung bestehender Buchungen.
- Reiseexport- und Vollbackupformat bleiben unverändert; der Store `snapshots` wird weiterhin nicht exportiert.
- ZIP- und SHA-256-Prüfung nach der Paketierung.

## Unverändert

- Kompakte Erfassungsreihenfolge: Kategorien → Person → Suche → Getränke.
- Einzelerfassung je ausgewählter Person.
- Home-Schnellzugriff und „Noch einmal erfassen“.
- Themes, Reiseverlauf, Paketprognose, Analyse, Berichtsexport und Geräteabgleich.
- IndexedDB-Version 2; kein erneutes Datenbank-Upgrade erforderlich.

## Noch auf dem iPhone prüfen

- Erstellen eines manuellen Wiederherstellungspunkts unter Setup.
- Automatischer Sicherungspunkt vor einer testweisen kritischen Aktion.
- Wiederherstellung eines Teststands mit Bestätigung `WIEDERHERSTELLEN`.
- Verhalten bei fünf vorhandenen Sicherungspunkten und Erstellung eines sechsten Stands.
- Offline-Update nach einmaligem Online-Aufruf.

Eine automatisierte visuelle Safari-/iPhone-Prüfung ist in der Entwicklungsumgebung nicht möglich. Deshalb bleibt der abschließende Praxistest auf dem verwendeten iPhone erforderlich.
