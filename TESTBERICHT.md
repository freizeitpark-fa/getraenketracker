# Testbericht CruiseSip v5.4.1c

## Behobener Fehler

Der gespeicherte Reiseverlauf ließ sich in der iPhone-PWA über den sichtbaren Pfeil nicht zuverlässig aufklappen. Dadurch waren auch die Aktionen zum Bearbeiten und Löschen einzelner Reisetage nicht erreichbar.

## Umsetzung

- Native `details`-Steuerung im Reiseverwaltungsbereich durch eine explizite Schaltfläche mit `aria-expanded` und kontrolliertem Inhaltsbereich ersetzt.
- Gesamte Schaltfläche und Pfeil lösen denselben Auf-/Zuklappvorgang aus.
- Bearbeiten- und Löschen-Schaltflächen sind nach dem Öffnen sichtbar.
- Öffnen eines Editors hält den Verlauf aufgeklappt.
- Reduzierte Effekte deaktivieren auch die Pfeilanimation.

## Prüfungen

- JavaScript-Syntax mit `node --check` geprüft.
- Service-Worker-Cache und Versionsparameter auf Build 5.4.1c geprüft.
- Vorhandensein der Toggle-Aktion, ARIA-Zustände, Inhalts-ID und Bearbeitungsaktionen statisch geprüft.
- JSON-Dateien validiert.
- ZIP-Integrität geprüft.

## Offener Praxistest

Die tatsächliche Touch-Bedienung sollte nach Veröffentlichung einmal auf dem verwendeten iPhone geprüft werden.

## Ergänzende Prüfung Build 5.4.1c

- Checkbox-/Label-Aufklappmechanismus ohne Abhängigkeit vom delegierten Klickhandler geprüft.
- Gesamter Aufklappbalken ist über das zugeordnete Label antippbar.
- CSS-Zustände für Inhalt, Pfeildrehung und wechselnde Beschriftung geprüft.
- Verwaltung steht im Setup unmittelbar unter der aktiven Reise.
