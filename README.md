# CruiseSip

CruiseSip ist eine vollständig offline nutzbare iPhone-PWA zum Erfassen von Getränken während einer Kreuzfahrt. Die App speichert alle Daten lokal im Browser per IndexedDB und benötigt weder Backend noch Cloud, Anmeldung, externe Bibliotheken oder Tracker.

## Version

Aktuelle Entwicklungsfassung: **4.4.3**

Version 4.4.3 ergänzt vor dem Geräteabgleich eine vollständige Importvorschau. Neue Reisen, Personen und Buchungen, bereits vorhandene Buchungen sowie Konflikte werden angezeigt, bevor lokale Daten verändert werden. Konflikte lassen sich mit lokalem und importiertem Inhalt vergleichen und werden nicht überschrieben. Im Verlauf und in der personenbezogenen Analyse ist außerdem je Buchung das erfassende Gerät sichtbar. Änderungen werden im `CHANGELOG.md` dokumentiert.


## Manueller Geräteabgleich

CruiseSip führt keinen automatischen Cloud-Abgleich durch. Vollbackups und Reiseexporte werden als lokale JSON-Dateien erstellt. Auf iPhone und iPad öffnet CruiseSip dafür das Teilen-Menü. Über „In Dateien sichern“ kann der Zielordner unter „Auf meinem iPhone“, in iCloud Drive oder bei einem eingebundenen Dateidienst ausgewählt werden; alternativ ist die Weitergabe per AirDrop möglich. Während der gesamten Reise bleibt das Tracking unabhängig von einer Internetverbindung funktionsfähig.

Die vollständige Schritt-für-Schritt-Anleitung für die Einrichtung eines zweiten Geräts und den späteren Abgleich befindet sich in `docs/ZWEITES_GERAET.md`.

## GitHub Pages Veröffentlichung

1. ZIP entpacken.
2. Inhalt des Ordners `CruiseSip/` in das GitHub-Repository kopieren und vorhandene Dateien ersetzen.
3. In GitHub Desktop prüfen, ob die Änderungen korrekt erkannt werden.
4. Commit erstellen, z. B. `CruiseSip v4.4.3 Importvorschau`.
5. Push durchführen.
6. GitHub Pages kurz online öffnen, damit der Service Worker die neuen Dateien cachen kann.
7. Auf dem iPhone über Safari öffnen und über „Teilen“ → „Zum Home-Bildschirm“ installieren.

## Projektstruktur

```text
CruiseSip/
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── OFFLINE.md
├── css/
├── js/
├── data/
├── icons/
├── assets/
└── docs/
```

## Kernfunktionen

- Reiseverwaltung mit Archivierung und Sicherheitslöschung
- Personenverwaltung mit Getränkepaket und optionalem Paketpreis
- Geräte-ID und Gerätename
- extrem schnelles Tracking: Person wählen, Getränk antippen, speichern
- Personen-Schnellwechsel direkt oberhalb der Getränkekacheln
- dauerhaft sichtbarer Rückgängig-Dock
- stabile Suche ohne Fokusverlust
- Favoriten, Kategorien und zuletzt verwendete Getränke
- Verlauf als Timeline mit Bearbeiten/Löschen und Filtern
- Auswertungen nach Person, Getränk, Kategorie, Tag und Reise inklusive Paket-Break-even und Bordrechnung außerhalb Paket
- Personen-Detailanalyse mit Restbetrag zum Paketpreis, rechnerischer Ersparnis und vollständigem Getränkeverlauf
- Export/Import je Reise
- Zusammenführen mehrerer Geräte mit Importvorschau, Dubletten- und Konflikterkennung
- sichtbare Geräteherkunft je Buchung im Verlauf und in der Personenanalyse
- Importprotokoll
- Barkartenimport mit Preis- und Paketvergleich
- Artikelverwaltung für manuelle Preis- und Paketstatus-Anpassungen je Getränkepaket
- Offline-Onboarding und Backup-Test
- Offline-Sicherheitsstatus mit Prüfung von Installation, Service Worker, App-Cache und IndexedDB
- lokal gespeicherter Wechsler zwischen heller und dunkler Ansicht

## Technische Hinweise

- Hosting: GitHub Pages
- Installation: Safari → Zum Home-Bildschirm
- Speicher: IndexedDB auf dem Gerät
- Offline: Service Worker mit Network-first-Aktualisierung und lokalem Offline-Fallback
- Keine externen Skripte oder Bibliotheken

## Datenbasis

Die mitgelieferte Barkarte basiert auf den bereits strukturierten Stammdaten aus der Vorgängerversion. Paketstatus wird konservativ verwendet: Nur eindeutig als `included` gekennzeichnete Getränke werden als Ersparnis berücksichtigt. `unclear` wird nicht als Ersparnis gezählt.


## App-Updates

Ab Version 4.3.4 prüft CruiseSip beim Online-Start aktiv auf eine neue Version. Ein bereitstehendes Update wird sichtbar angezeigt und erst nach Bestätigung aktiviert. Lokale IndexedDB-Daten bleiben erhalten.
