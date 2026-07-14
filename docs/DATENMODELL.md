# Datenmodell

CruiseSip speichert Daten lokal in IndexedDB.

## Stores

- `settings`: App-Einstellungen, Geräte-ID, Gerätename, Barkarten-Version, Favoriten
- `trips`: Reisen
- `persons`: Personen je Reise
- `drinks`: aktive Barkarte
- `logs`: getrackte Getränke
- `imports`: Importprotokoll
- `barkarten`: Barkarten-Metadaten
- `snapshots`: interne, nicht exportierte Sicherheitskopien vor Datenmigrationen

## Logik Ersparnis

- `included`: Getränk gilt als im Paket enthalten. Preis zählt als Ersparnis.
- `not_included`: Getränk gilt als nicht enthalten. Preis zählt als zu zahlender Betrag.
- `unclear`: Getränk ist unklar. Preis zählt konservativ als zu zahlender Betrag und zusätzlich als unklarer Betrag.

## Dublettenerkennung

Jeder Eintrag erhält einen `mergeKey`:

```text
<Geraete-ID>:<urspruengliche Eintrags-ID>
```

Beim Import wird dieser Schlüssel geprüft. Bereits vorhandene Einträge werden übersprungen. Dadurch bleiben wiederholte Importe derselben Geräteexporte dublettensicher.


## Vollbackupformat ab 4.4.0

Das Format `CruiseSipFullBackup` mit `backupFormatVersion: 1` enthält unveränderte Datensätze aller Stores `settings`, `trips`, `persons`, `drinks`, `logs`, `imports` und `barkarten`. Zusätzlich werden App-/Datenbankversion, Exportzeitpunkt, Gerätekennung, Bestandszahlen, Paketdefinitionen und der aktive Barkartenstand gespeichert.

Die Integrität wird über SHA-256 auf einer kanonisch sortierten JSON-Darstellung aller Backupfelder mit Ausnahme des Feldes `integrity` geprüft.

Beim Ergänzen sind IDs maßgeblich. Personen mit gleicher ID werden wiederverwendet; gleiche Namen mit unterschiedlichen IDs werden nicht automatisch zusammengeführt. Buchungsdubletten werden über `mergeKey` beziehungsweise über Geräte-ID und ursprüngliche Buchungs-ID erkannt.


## Geräteherkunft und Importvorschau ab 4.4.3

Jede Buchung enthält zusätzlich:

- `trackedByDeviceId`: stabile ID des Geräts, auf dem die Buchung ursprünglich erfasst wurde
- `trackedByDeviceName`: zum Erfassungszeitpunkt verwendeter Gerätename
- `importedAt`: Zeitpunkt, zu dem eine fremde Buchung auf dem aktuellen Gerät ergänzt wurde

Die Geräteherkunft bleibt bei späteren Korrekturen der Person, des Getränks, des Preises oder des Paketstatus unverändert.

Reiseexporte werden zunächst ausschließlich im Arbeitsspeicher geprüft. Die Vorschau erstellt einen Importplan mit Ergänzungen, Dubletten und Konflikten. Erst nach ausdrücklicher Bestätigung werden neue Datensätze in einer gemeinsamen IndexedDB-Transaktion gespeichert. Vor dem Schreiben wird der Importplan nochmals mit dem dann aktuellen lokalen Bestand verglichen.

## Reiseabschluss ab 4.5.0

Der bestehende boolesche Wert `trips.archived` dient als Abschluss- und Schreibschutzstatus. Es wurde kein neuer Store und keine neue IndexedDB-Version eingeführt.

- `archived: false` – Reise ist aktiv und darf bebucht beziehungsweise geändert werden.
- `archived: true` – Reise ist abgeschlossen; Buchungen, Personen und Paketdaten sind schreibgeschützt.
- Abschluss und Reaktivierung ändern keine Reise-, Personen- oder Buchungs-ID.
- Beim Geräteabgleich ist `archived` ein lokaler Schutzstatus. Ein abweichender Wert eines anderen Geräts überschreibt den lokalen Status nicht.
- Vollständige Backups enthalten den Status weiterhin und können ihn beim ausdrücklich gewählten vollständigen Ersetzen wiederherstellen.


## Erweiterungen ab 5.0.0

- IndexedDB-Version 2 ergänzt den Store `snapshots`. Die bisherigen sieben Kern-Stores bleiben unverändert.
- Vor der ersten v5-Migration wird einmalig eine interne Sicherheitskopie der Kern-Stores angelegt. Sie ist nicht Bestandteil normaler Vollbackups und kann im Setup kontrolliert wiederhergestellt werden.
- Neue Buchungen können zusätzlich den Reiseverlaufs-Kontext (`itineraryDate`, `itineraryType`, `itineraryLocation`, Hafen/Land und Liegezeiten) enthalten. Die finanzielle Berechnung bleibt davon unabhängig.
- Bei Mehrfacherfassung entsteht je Person ein eigenständiger Buchungssatz mit eigener ID, eigenem Paketstatus und eigenem Merge-Key.

## Interne Wiederherstellungspunkte ab 5.1.0

Der bestehende Store `snapshots` enthält neben der einmaligen v5-Migrationssicherung reguläre Wiederherstellungspunkte vom Typ `CruiseSipInternalRestorePoint`.

Jeder Wiederherstellungspunkt enthält:

- stabile Snapshot-ID
- App-Version und Build
- Anlass und optionale Kontextdaten
- Erstellungszeitpunkt
- Anzahl der Datensätze je Kern-Store
- vollständige Kopie der sieben Kern-Stores

Es werden höchstens fünf reguläre Wiederherstellungspunkte aufbewahrt. Die v5-Migrationssicherung wird separat behandelt. Der Store `snapshots` bleibt weiterhin außerhalb von Vollbackup und Reiseexport, damit Sicherungen nicht rekursiv vervielfacht werden.
