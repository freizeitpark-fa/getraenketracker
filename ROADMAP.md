# Roadmap CruiseSip


## Version 4.3.7 Preisautomatik bei Verlaufskorrektur

- Beim Wechsel des Getränks den Barkartenpreis sofort automatisch übernehmen.
- Paketstatus passend zur ausgewählten Person neu bestimmen.
- Stammdatenpreis beim Speichern zusätzlich absichern.
- Manuelle Preisabweichung für Sonderfälle erhalten.

## Version 4.3.6 Verlaufskorrektur

- Fehlbuchungen direkt im Verlauf bearbeiten.
- Person, Getränk, Datum, Uhrzeit, Preis und Paketstatus korrigieren.
- Auswertungen und personenbezogene Sortierungen nach dem Speichern automatisch aktualisieren.
- Löschfunktion mit Sicherheitsabfrage beibehalten.

## Version 4.3.5 Vereinfachte Personenauswahl

- Personen-Schnellwechsel als einzige sichtbare Personensteuerung
- Kompakte Kopfzeile `Getränk erfassen für …`
- Paketinformation bleibt sichtbar
- Keine Änderung an Tracking- oder Speicherlogik

## Version 4.3.4 PWA-Update-Stabilisierung

- Aktive Update-Prüfung ohne veralteten Browser-Zwischenspeicher
- Sichtbarer Hinweis, sobald eine neue Version bereitsteht
- Kontrollierte Aktivierung mit anschließendem Neustart
- Lokale IndexedDB-Daten bleiben unverändert

## Version 4.3.3 Personen-Schnellwechsel

- Kompakter Wechsel direkt oberhalb der Getränkekacheln
- Sofortige Synchronisierung von Zielperson, Paketstatus und nutzungsabhängiger Sortierung
- Lokale Speicherung der zuletzt aktiven Person je Reise

## Version 4.3.2 Getränkesortierung

- Sortierung nach Nutzungshäufigkeit und letzter Nutzung je aktiver Person
- Preis aufsteigend oder absteigend
- Alphabetische Sortierung
- Persistente lokale Auswahl

## Version 4.3.1 Darstellung

- Wechsler zwischen heller und dunkler Ansicht im Setup
- Persistente lokale Auswahl ohne Backend
- Einheitliche Abstände der Home-Kacheln

## Version 4.3.0 Tagesübersicht

- Paketstatus und Barkartenwert des aktuellen Tages
- Personenaufteilung und letzte Erfassung

## Version 4.2.0 Tracken-Ansicht

- Große iPhone-taugliche Getränkekacheln
- Sichtbare Symbole, Preise und Paketstatus
- Favoriten und Empfehlungen weiterhin direkt erreichbar
- Stabile Suche und unveränderte Eingabelogik

## Version 4.1.0 Auswertungen und Artikelverwaltung

- Praxistest der erweiterten Personen-Auswertung inklusive Detailansicht und Zurück-Button auf iPhone Safari und als Home-Bildschirm-PWA.
- Test Export/Import zwischen mindestens zwei Geräten.
- Test mehrfacher Import derselben Exportdatei.
- Test Barkartenimport mit Preis- und Paketänderungen.
- Test manueller Artikelanpassungen: Preis, Paketstatus je Paket, Aktualisierung bestehender Einträge.
- Prüfung der Bedienbarkeit bei vielen Getränken.
- Prüfung, ob die v3-Migration auf bereits genutzten Geräten sauber funktioniert.

## Potenzielle Folgeversion nach 4.2.0

Mögliche spätere Punkte:

- dedizierte Edit-Sheets statt Prompt-Fenster für Verlaufseinträge
- CSV-Export für Excel-Auswertung
- optionale Tagesbudgets oder Paket-Amortisation pro Person
- geführter Importassistent für Barkarten-CSV
- besserer Druck-/PDF-Report aus den Auswertungen

