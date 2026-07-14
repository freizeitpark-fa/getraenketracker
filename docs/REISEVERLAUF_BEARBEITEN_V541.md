# Reiseverlauf bearbeiten – CruiseSip 5.4.1

## Zweck

Der importierte Reiseverlauf kann vor oder während einer aktiven Reise lokal korrigiert werden. Dafür ist kein erneuter Dateiimport erforderlich.

## Bedienung

1. Unter **Setup → Reisen** die gewünschte Reise öffnen.
2. Im Bereich **Reiseverlauf** den gespeicherten Verlauf aufklappen.
3. Einen Reisetag über **Bearbeiten** öffnen oder über **Reisetag hinzufügen** ergänzen.
4. Datum, Tagesart, Hafen/Station, Land, Ankunft, Abfahrt und Hinweise anpassen.
5. Speichern.

CruiseSip sortiert die Liste danach automatisch nach Datum und vergibt die Tagesnummern fortlaufend neu.

## Sicherheitslogik

- Vor jeder Ergänzung, Änderung oder Löschung wird automatisch ein interner Wiederherstellungspunkt erstellt.
- Ein Datum darf innerhalb derselben Reise nur einmal vorkommen.
- Das Datum muss innerhalb des hinterlegten Reisezeitraums liegen.
- Liegezeiten werden im Format `HH:MM` gespeichert.
- Buchungszeitpunkte, Preise und Paketstatus werden nicht verändert.
- Die Tages- und Abschlussauswertung verwendet den aktuell gespeicherten Reiseverlauf.
- Abgeschlossene Reisen sind schreibgeschützt. Für Änderungen ist zunächst eine Reaktivierung erforderlich.

## Geräteabgleich

Ein geänderter Reiseverlauf ist im Reiseexport enthalten. Weicht der Verlauf auf zwei Geräten voneinander ab, zeigt CruiseSip beim Import einen Reisekonflikt. Die lokale Version bleibt vorausgewählt; die importierte Version kann bewusst übernommen werden.

## Vollständiges Entfernen

Über **Gesamten Verlauf entfernen** kann der gesamte Verlauf gelöscht werden. Auch davor wird ein Wiederherstellungspunkt erstellt. Personen und Getränkebuchungen bleiben erhalten.


## Korrektur Build 5.4.1b

Der Bereich „Gespeicherten Verlauf anzeigen“ wird über eine eigene Schaltfläche gesteuert. Der sichtbare Pfeil klappt den Inhalt zuverlässig auf und zu. Nach dem Öffnen stehen je Reisetag die Aktionen „Bearbeiten“ und „Löschen“ bereit.
