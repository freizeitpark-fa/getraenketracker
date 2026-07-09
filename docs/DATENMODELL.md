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
