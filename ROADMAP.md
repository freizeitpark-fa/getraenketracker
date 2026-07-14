## Version 4.5.4 Paket-Amortisation und Verbrauchsprognose abgeschlossen

- Paketfortschritt und Break-even je Person
- tatsächlicher Amortisationstag
- durchschnittlicher Paketwert je verstrichenem Reisetag
- Hochrechnung bis zum Reiseende
- grafische Fortschrittsbalken und Personenvergleich
- konservative Behandlung unklarer Paketstatus
- Aufnahme in HTML- und PDF-Bericht
- automatischer Sprung an den Seitenanfang beim Wechsel über die Hauptnavigation

## Version 4.5.3 Berichtsexport abgeschlossen

- CSV, HTML und Druck/PDF vollständig offline umgesetzt.
- Nächste größere Entwicklungsversion noch festzulegen.

## Version 4.5.2h Responsives Design

- Responsive Darstellung für Smartphone, Tablet und Desktop umgesetzt.
- Desktopnavigation und mehrspaltige Raster ergänzt.
- Mobile iPhone-Bedienung bleibt Referenz und unverändert.

# Roadmap CruiseSip

## Version 4.5.2g Analyse-Design und grafische Auswertung

- Favoriten und zuletzt getrunkene Getränke von Home entfernen
- Getränkebuchungen nur in der Tracken-Ansicht mit sichtbarer Personenauswahl zulassen
- Favoriten und Zuletzt-Filter auf der Tracken-Seite unverändert erhalten
- Schnellzugriffe auf Tracken, Verlauf und Analyse beibehalten

## Version 4.5.2e Kompakte Reiseanzeige

- neue Reise über einen geführten Ablauf anlegen
- wahlweise Reiseverlaufsdatei importieren oder Reise manuell erfassen
- Reiseverlauf-Import erzeugt immer eine neue Reise mit stabiler ID
- anschließend Personen und Paketpreise einrichten
- Reise einschließlich Verlauf und Personen für ein zweites Gerät exportieren
- vorhandene Reisen beim Reiseverlauf-Import nicht verändern

## Version 4.5.2c Offline-Cache-Diagnose

- Cache-Prüfung automatisch an die aktuelle Build-Kennung koppeln
- Fehlanzeige `3/5 Kerndateien` nach einem Build-Update verhindern
- Offline-Installation, IndexedDB und bestehende Reisedaten unverändert lassen

## Version 4.5.2b Importierter Reiseverlauf

- tatsächlichen Reiseverlauf als lokale JSON-Datei importieren
- Häfen, Länder, Seetage sowie optionale Ankunfts- und Abfahrtszeiten speichern
- geprüfte Importvorschau vor dem Ersetzen bestehender Routendaten
- Reiseverlauf in Tages- und Abschlussbericht anzeigen
- Tracking, Buchungen und Paketberechnungen unverändert lassen

## Version 4.5.2 Tages- und Reisebericht

- chronologische Auswertung je Reisetag
- Getränkeanzahl und Barkartenwert je Tag
- stärkster Konsumtag und Tagesdurchschnitt
- häufigste und teuerste Getränke
- Vergleich der Personen und Getränkekategorien
- übersichtlicher Abschluss- beziehungsweise Zwischenbericht

## Version 4.5.1 Abschlussauswertung je Person

- Getränkeanzahl und Barkartenwert je Person
- enthaltene, nicht enthaltene und unklare Getränke mit Anzahl und Wert
- Kosten außerhalb des Pakets und bezahlter Paketpreis
- konservative Ersparnis- oder Mehrkostenberechnung
- durchschnittlicher Getränkewert pro Reisetag
- Kategorienauswertung je Person
- Gesamtübersicht mit Gesamtwert, Gesamtpaketkosten und Gesamtbilanz

## Version 4.5.0 Reiseabschluss

- strukturierte Abschlussprüfung mit kritischen Fehlern und nicht blockierenden Hinweisen
- Sicherheitsabfrage vor Abschluss und Reaktivierung
- zentraler Schreibschutz für Tracking, Verlauf, Rückgängig, Personen und Paketdaten
- deutlicher Abschlussstatus auf allen relevanten Ansichten
- lokaler Abschlussstatus bleibt beim Mehrgeräteabgleich geschützt

## Version 4.4.3 Importvorschau und Herkunftsanzeige

- Ausgewählte Reiseexporte zunächst vollständig prüfen, ohne lokale Daten zu verändern.
- Neue Reisen, Personen und Buchungen sowie Dubletten und Konflikte vor dem Import anzeigen.
- Konflikte mit lokalem und importiertem Inhalt vergleichbar darstellen; lokale Datensätze bleiben vorrangig.
- Vorschau vor dem tatsächlichen Schreiben erneut gegen den aktuellen lokalen Datenbestand prüfen.
- Erfassenes Gerät je Buchung im Verlauf, in der Bearbeitungsansicht und in der personenbezogenen Analyse anzeigen.

## Version 4.4.2 Geräteabgleich

- Bis zu 20 Reiseexporte in einem Arbeitsschritt auswählen und atomar zusammenführen.
- Reisen und Personen anhand stabiler IDs erkennen und fehlende Datensätze mit unveränderter ID ergänzen.
- Buchungen über den stabilen Merge-Key deduplizieren; lokale Daten bei Konflikten nicht überschreiben.
- Reiseexportformat mit Formatversion, Export-ID, Bestandsübersicht und SHA-256-Prüfsumme absichern.
- Zusätzliche Textdatei beim iOS-Teilen entfernen.

## Version 4.4.1 Dateien-App-Export

- Vollbackup, Reiseexport und Backup-Test über das native iOS-Teilen-Menü bereitstellen.
- Zielordner über `In Dateien sichern` bewusst auswählen.
- Direkten JSON-Download als Fallback für nicht unterstützte Browser erhalten.
- Abgebrochene Teilen-Dialoge nicht als erfolgreiches Backup protokollieren.

## Version 4.4.0 Vollständige Datensicherung

- Vollbackup aller lokalen IndexedDB-Stores als JSON.
- SHA-256-Integritätsprüfung und Importvorschau.
- Nicht löschendes Ergänzen anhand stabiler Reise-, Personen- und Buchungs-IDs.
- Atomare vollständige Wiederherstellung mit ausdrücklicher Sicherheitsbestätigung.
- Geräte-ID und Gerätename bleiben standardmäßig auf dem Zielgerät erhalten.

## Version 4.3.8 Offline-Sicherheitsstatus

- Home-Bildschirm-/Standalone-Modus erkennen.
- Service Worker und aktive Steuerung prüfen.
- Aktuellen App-Cache und Kerndateien kontrollieren.
- IndexedDB mit einem sofort gelöschten temporären Eintrag testen.
- Offline-Praxistest und iOS-Speicherverwaltung transparent ausweisen.


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



## Erledigt mit Version 4.5.3

- CSV-Export für Excel
- druckfreundliche, eigenständige HTML-Auswertung
- Export über das iOS-Teilen-Menü und Speichern in der Dateien-App
- PDF-Erstellung über die iOS-Druckfunktion
- vollständig offline und ohne externe Bibliotheken
