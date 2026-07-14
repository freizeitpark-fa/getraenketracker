# CruiseSip v5.0.0 – Umsetzung

## Neue Funktionen

### Reiseverlauf auf Home

CruiseSip zeigt bei hinterlegtem Reiseverlauf den heutigen Reisetag. Liegt die Reise noch in der Zukunft, wird der nächste Reisetag angezeigt. Enthalten sind Tagesnummer, Datum, Hafen oder Seetag, Land sowie vorhandene Ankunfts- und Abfahrtszeiten.

### Automatische Tageszuordnung

Neue Buchungen erhalten zusätzlich den Reiseverlaufs-Kontext des lokalen Buchungstags. Die Berechnung von Barkartenwert und Paketstatus bleibt unabhängig davon. Ist für den Tag kein Reiseverlauf vorhanden, wird nur das lokale Buchungsdatum gespeichert.

### Noch einmal erfassen

Auf Home erscheint je Person das zuletzt erfasste Getränk. In der Erfassungsansicht steht für die aktive Einzelperson ebenfalls eine kompakte Wiederholungsaktion bereit.

### Mehrfacherfassung

Über „Mehrere“ können mehrere Personen markiert werden. Beim Antippen eines Getränks entsteht für jede ausgewählte Person ein eigenständiger Buchungssatz mit:

- eigener ID und eigenem Merge-Key,
- individuellem Getränkepaket,
- individuell ermitteltem Paketstatus,
- gemeinsamer Buchungszeit,
- identischem Reiseverlaufs-Kontext.

„Rückgängig“ entfernt die gesamte zuletzt erzeugte Mehrfachbuchung.

### Neue Diagramme

Die Analyse enthält zusätzlich:

- Verteilung der Getränke nach Kategorien,
- Barkartenwert je Konsumtag.

Die Diagramme werden ohne externe Bibliotheken vollständig lokal erzeugt.

### v5-Migrationssicherung

Beim ersten Start nach dem Update von v4 auf v5 wird vor der Migration einmalig eine interne Kopie der sieben bisherigen Kern-Stores erstellt. Die Sicherung liegt in einem getrennten IndexedDB-Store und wird nicht in normale Vollbackups aufgenommen. Eine kontrollierte Wiederherstellung ist unter Setup möglich.

## Technischer Stand

- App-Version: 5.0.0
- Build: 5.0.0a
- IndexedDB-Version: 2
- Neue Store-Struktur: `snapshots`
- Bestehende Kern-Stores und IDs bleiben unverändert.
