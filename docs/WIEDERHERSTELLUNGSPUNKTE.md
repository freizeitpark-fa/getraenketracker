# Interne Wiederherstellungspunkte

CruiseSip 5.1.0 kann bis zu fünf vollständige lokale Wiederherstellungspunkte im separaten IndexedDB-Store `snapshots` speichern.

## Automatische Sicherung

Vor folgenden kritischen Aktionen wird automatisch ein Wiederherstellungspunkt erstellt:

- Löschen einer Reise einschließlich Personen und Buchungen
- Entfernen eines importierten Reiseverlaufs
- Ersetzen der Barkarte
- Aktualisieren bestehender Buchungen über die Artikelverwaltung
- Zusammenführen eines Vollbackups
- vollständiges Ersetzen des Datenbestands durch ein Vollbackup
- Zusammenführen von Geräteexporten
- Wiederherstellen eines älteren internen Sicherungsstands

## Manuelle Sicherung

Unter **Setup → Interne Wiederherstellungspunkte** kann jederzeit ein zusätzlicher Sicherungspunkt erstellt werden.

## Aufbewahrung

- Höchstens fünf reguläre Wiederherstellungspunkte werden aufbewahrt.
- Der älteste reguläre Stand wird beim Anlegen eines sechsten Stands automatisch gelöscht.
- Die einmalige v5-Migrationssicherung wird getrennt behandelt und nicht auf dieses Limit angerechnet.
- Wiederherstellungspunkte bleiben ausschließlich auf dem jeweiligen Gerät.
- Sie sind nicht Bestandteil von Vollbackups oder Reiseexporten.

## Wiederherstellung

Vor einer Wiederherstellung verlangt CruiseSip die eindeutige Texteingabe `WIEDERHERSTELLEN`. Unmittelbar vor dem Zurücksetzen wird der aktuelle Datenbestand nochmals als eigener Sicherungspunkt gespeichert. Die installierte App-Version bleibt erhalten.

Interne Wiederherstellungspunkte ersetzen kein extern gespeichertes Vollbackup in der Dateien-App.
