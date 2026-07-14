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
