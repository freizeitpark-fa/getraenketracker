# Changelog

Alle wesentlichen Änderungen an CruiseSip werden hier dokumentiert.

## 4.0.0 - laufende Entwicklungsfassung

### Korrekturen

- Personenverwaltung erneut korrigiert: Der Button `Person speichern` nutzt jetzt zusätzlich zur Formular-Submit-Logik eine direkte Speicheraktion. Dadurch wird das Speichern auch dann ausgelöst, wenn iPhone/Safari den nativen Submit nicht zuverlässig verarbeitet.
- Nach dem Speichern einer Person wird aktiv geprüft, ob der Datensatz in IndexedDB vorhanden ist und der aktiven Reise zugeordnet wurde. Fehler werden künftig sichtbar gemeldet statt still zu verpuffen.
- Anzeige der Personenliste robuster gemacht: Die aktive Reise-ID wird zentral aufgelöst, damit neu gespeicherte Personen nicht wegen einer abweichenden oder fehlenden Reisezuordnung unsichtbar bleiben.

- Reiseverwaltung korrigiert: Bearbeitete Reisen werden jetzt zuverlässig gespeichert. IndexedDB-Schreibvorgänge warten auf den vollständigen Transaktionsabschluss, bevor die Ansicht neu geladen wird.
- Personenverwaltung korrigiert: Personen können jetzt zuverlässig angelegt und bearbeitet werden. Der Speichervorgang wartet ebenfalls auf den vollständigen IndexedDB-Transaktionsabschluss.
- Paketpreis-Feld bei Personen korrigiert: Es akzeptiert nun deutsche Kommaschreibweise, ohne dass iPhone/Safari den Formularversand blockiert.
- Beim Speichern einer Reise oder Person erscheint jetzt eine sichtbare Bestätigung.
- Aktionsbuttons verhindern jetzt konsequent unbeabsichtigte Standardaktionen im Formularumfeld.

### Neu strukturiert

- Projektstruktur vollständig neu aufgebaut:
  - `css/`
  - `js/`
  - `data/`
  - `icons/`
  - `assets/`
  - `docs/`
- App-Version bleibt bewusst bei `4.0.0`, bis diese Hauptversion vollständig stabil ist.
- README, ROADMAP, OFFLINE und technische Dokumentation ergänzt.

### Redesign

- Komplettes iPhone-orientiertes Redesign.
- Bottom Navigation im nativen App-Stil.
- Card-basiertes Layout.
- SF-Pro-nahe Systemtypografie über Apple-Systemfonts.
- Dark Mode über Systempräferenz.
- Safe-Area-Unterstützung für iPhone.
- Einhändige Bedienung priorisiert.
- Dezente Animationen und reduzierte Bewegung bei entsprechender Systemeinstellung.
- Haptisches Feedback wird ausgelöst, sofern der Browser es unterstützt.

### Onboarding

- Erststart-Onboarding ergänzt:
  - Offline-Einrichtung
  - Hinweis „Zum Home-Bildschirm“
  - Geräteprüfung
  - Offline-Status
  - Barkartenprüfung
  - Backup-Test
  - Reiseanlage

### Dashboard

- Dashboard neu aufgebaut:
  - Heute
  - Gesamtreise
  - Ersparnis
  - zu zahlender Betrag
  - Schnellzugriff
  - Favoriten
  - zuletzt getrunkene Getränke

### Tracking

- Tracking neu aufgebaut.
- Personenauswahl als farbige Chips.
- Getränkesuche ohne Fokusverlust.
- Kategorien, Favoriten und zuletzt verwendete Getränke integriert.
- Rückgängig dauerhaft sichtbar über fixierten Dock.
- Paketstatus wird pro Person und Getränk angezeigt.

### Verlauf

- Verlauf als Timeline umgesetzt.
- Personen farbig unterscheidbar.
- Filter ergänzt:
  - Heute
  - Gestern
  - Reise
- Einträge können bearbeitet und gelöscht werden.

### Reiseverwaltung

- Reisen können angelegt, bearbeitet, archiviert und gelöscht werden.
- Löschen nur mit Sicherheitsabfrage durch Eingabe von `LÖSCHEN`.

### Geräteverwaltung und Zusammenführen

- Geräte-ID und Gerätename sichtbar.
- Export je Reise.
- Import und Zusammenführen mehrerer Geräte.
- Dublettenerkennung über Geräte-ID und ursprüngliche Eintrags-ID.
- Mehrfachimporte desselben Exports werden übersprungen.
- Importprotokoll ergänzt.

### Auswertungen

- Auswertungen ergänzt nach:
  - Person
  - Getränk
  - Kategorie
  - Tag
  - Reise
  - Lieblingsgetränke
- Ersparnis wird konservativ berechnet: Nur `included` zählt als Ersparnis; `unclear` zählt nicht als Ersparnis.

### Barkartenverwaltung

- Aktuelle Barkarte sichtbar.
- Import strukturierter Barkarten per JSON oder CSV.
- Preisvergleich ergänzt.
- Neue Getränke werden erkannt.
- Paketänderungen werden erkannt.
- PDF-Auswertung bewusst nicht offline integriert, da keine externen Bibliotheken genutzt werden.

### Migration

- Beim ersten Start wird eine Migration aus der bisherigen v3-IndexedDB (`gt_db_v3`) versucht.

## 3.1.0

- Neues App-Icon mit Kreuzfahrtschiff und Cocktailglas.
- Visueller Feinschliff mit maritimem Farbschema.
- Apple Touch Icon und Favicons ergänzt.
- Reise-Dashboard ergänzt.
- Rückgängig-Leiste dauerhaft sichtbar.
- Sucheingabe stabilisiert.
- Import weiter dublettensicher auch bei mehrfachen Exporten eines Zweitgeräts.
