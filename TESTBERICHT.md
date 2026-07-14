# Testbericht CruiseSip v5.4.1a

## Automatisierte Prüfungen

- JavaScript-Syntax mit Node.js
- JSON-Syntax von Manifest, Barkarte und Paketen
- Service-Worker-Dateiliste und Versionsreferenzen
- ZIP-Integrität
- statische Prüfung der neuen Reiseverlauf-Aktionen und des Formular-Submit
- Logiktest für Sortierung und fortlaufende Nummerierung von Reisetagen
- Logiktest für Zeitnormalisierung im Format `HH:MM`
- statische Prüfung der Datums-, Dubletten- und Archivschutz-Validierung
- statische Prüfung der Wiederherstellungspunkte vor Ergänzen, Bearbeiten und Löschen
- Prüfung, dass der Geräteabgleich den eigentlichen Reiseverlauf als Reisekonflikt berücksichtigt

## Manuell auf dem iPhone prüfen

1. Aktive Reise unter **Setup → Reisen** öffnen.
2. Einen vorhandenen Hafentag bearbeiten und Liegezeit oder Hafen ändern.
3. Einen neuen Seetag ergänzen; Reihenfolge und Tagesnummer prüfen.
4. Einen Testtag löschen und den Wiederherstellungspunkt im Setup kontrollieren.
5. Ein doppeltes oder außerhalb des Reisezeitraums liegendes Datum testen; Speichern muss blockiert werden.
6. Reise abschließen; Bearbeitung muss gesperrt sein.
7. Reise reaktivieren und Bearbeitung erneut prüfen.
8. Geänderten Reiseexport auf einem zweiten Gerät importieren; der abweichende Reiseverlauf muss als Reisekonflikt erscheinen.
9. Flugmodus aktivieren und Editor erneut öffnen.

## Hinweis

Die automatisierten Prüfungen ersetzen nicht den Safari-/Home-Bildschirm-Praxistest auf dem konkret verwendeten iPhone.
