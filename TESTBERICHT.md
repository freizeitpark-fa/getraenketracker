# Testbericht CruiseSip v5.4.0a

## Automatisierte Prüfungen

- JavaScript-Syntax mit Node.js
- JSON-Syntax von Manifest, Barkarte und Paketen
- Service-Worker-Dateiliste und Versionsreferenzen
- ZIP-Integrität
- Logiktest mit synthetischer Reise: SHA-256-Abschlussprüfung erkennt unveränderte und nachträglich veränderte Buchungsdaten
- Logiktest mit synthetischem Geräteexport: neue Buchung für eine lokal abgeschlossene Reise wird blockiert
- statische Prüfung der Abschlussmetadaten und Archivintegritätsfunktionen
- statische Prüfung des Archivschutzes im Geräteimport
- statische Prüfung der Abschlussbericht-Dateinamen und Exportfelder

## Manuell auf dem iPhone prüfen

1. Laufende Testreise abschließen.
2. Prüfen, dass direkt die Analyse mit „Archivierter Abschlussstand“ geöffnet wird.
3. Abschlussbericht als HTML und über Drucken/PDF öffnen.
4. Reise reaktivieren, eine Testbuchung ergänzen und erneut abschließen.
5. Geräteexport mit zusätzlicher Buchung in eine lokal abgeschlossene Reise importieren; die Buchung muss blockiert werden.
6. Flugmodus aktivieren und Abschlussbericht erneut öffnen.

## Hinweis

Die automatisierten Prüfungen ersetzen nicht den Safari-/Home-Bildschirm-Praxistest auf dem konkret verwendeten iPhone.
