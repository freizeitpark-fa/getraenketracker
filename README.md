# CruiseSip

CruiseSip ist eine vollständig offline nutzbare iPhone-PWA zum Erfassen von Getränken während einer Kreuzfahrt. Die App speichert alle Daten lokal im Browser per IndexedDB und benötigt weder Backend noch Cloud, Anmeldung, externe Bibliotheken oder Tracker.

## Version

Aktuelle Entwicklungsfassung: **4.1.0**

Version 4.1.0 erweitert die stabile 4.0.0-Basis um Auswertungen und Artikelverwaltung. Änderungen werden im `CHANGELOG.md` dokumentiert.

## GitHub Pages Veröffentlichung

1. ZIP entpacken.
2. Inhalt des Ordners `CruiseSip/` in das GitHub-Repository kopieren und vorhandene Dateien ersetzen.
3. In GitHub Desktop prüfen, ob die Änderungen korrekt erkannt werden.
4. Commit erstellen, z. B. `CruiseSip v4.1.0 Auswertungen Artikelverwaltung`.
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
- dauerhaft sichtbarer Rückgängig-Dock
- stabile Suche ohne Fokusverlust
- Favoriten, Kategorien und zuletzt verwendete Getränke
- Verlauf als Timeline mit Bearbeiten/Löschen und Filtern
- Auswertungen nach Person, Getränk, Kategorie, Tag und Reise inklusive Paket-Break-even und Bordrechnung außerhalb Paket
- Export/Import je Reise
- Zusammenführen mehrerer Geräte mit Dublettenerkennung
- Importprotokoll
- Barkartenimport mit Preis- und Paketvergleich
- Artikelverwaltung für manuelle Preis- und Paketstatus-Anpassungen je Getränkepaket
- Offline-Onboarding und Backup-Test

## Technische Hinweise

- Hosting: GitHub Pages
- Installation: Safari → Zum Home-Bildschirm
- Speicher: IndexedDB auf dem Gerät
- Offline: Service Worker mit Cache-first-Fallback
- Keine externen Skripte oder Bibliotheken

## Datenbasis

Die mitgelieferte Barkarte basiert auf den bereits strukturierten Stammdaten aus der Vorgängerversion. Paketstatus wird konservativ verwendet: Nur eindeutig als `included` gekennzeichnete Getränke werden als Ersparnis berücksichtigt. `unclear` wird nicht als Ersparnis gezählt.
