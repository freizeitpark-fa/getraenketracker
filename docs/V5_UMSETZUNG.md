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

- App-Version: 5.0.2
- Build: 5.0.2b
- IndexedDB-Version: 2
- Neue Store-Struktur: `snapshots`
- Bestehende Kern-Stores und IDs bleiben unverändert.

## Ergänzung 5.0.1

- Die Darstellung wird über zentrale CSS-Variablen und `data-theme` am HTML-Element gesteuert.
- Verfügbare Themes: `system`, `light`, `dark`, `ocean`, `sunset`, `nordic`, `contrast`.
- Die Einstellung `reducedEffects` deaktiviert Animationen, stärkere Schatten, Transparenzen und dekorative Verläufe.
- Theme und Effekte werden lokal in den Geräteeinstellungen gespeichert und nicht durch Reiseexporte verändert.
- Home-Reihenfolge: aktive Reise, Schnellzugriff, persönliche Wiederholung, Kennzahlen, Reisetag, Tagesübersicht.


## Ergänzung 5.0.2

Die Erfassungsansicht wurde für den praktischen iPhone-Einsatz neu verdichtet. Die Suche steht an erster Stelle, „Noch einmal erfassen“ bleibt ausschließlich auf Home und die Mehrfachauswahl ist in der regulären Erfassung nicht mehr verfügbar. Die technische Mehrfachbuchungslogik älterer Datensätze bleibt im Datenmodell kompatibel; neue normale Getränkekacheln buchen eindeutig für eine Person.


## Ergänzung 5.0.2b

Die Suchleiste wurde innerhalb des kompakten Erfassungskopfs hinter Kategorien und Person verschoben. Sie steht damit unmittelbar über der Getränkeliste.
