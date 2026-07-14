# Reiseverlauf importieren

CruiseSip kann Häfen, Seetage und optionale Liegezeiten als lokale JSON-Datei importieren. Diese Daten dienen ausschließlich als Kontext im Tages- und Reisebericht. Getränkebuchungen werden weiterhin nur anhand ihres Datums und ihrer Uhrzeit zugeordnet.

## Importformat

```json
{
  "type": "CruiseSipItinerary",
  "formatVersion": 1,
  "generatedAt": "2026-07-14T12:00:00Z",
  "source": "Offizielle Reisebestätigung / Reederei",
  "trip": {
    "name": "AIDA Metropolen ab Hamburg",
    "ship": "AIDAprima",
    "startDate": "2026-08-23",
    "endDate": "2026-08-30"
  },
  "days": [
    {
      "date": "2026-08-23",
      "dayNumber": 1,
      "type": "embarkation",
      "port": "Hamburg",
      "country": "Deutschland",
      "arrival": "",
      "departure": "18:00",
      "overnight": false,
      "notes": "Einschiffung"
    },
    {
      "date": "2026-08-24",
      "dayNumber": 2,
      "type": "sea",
      "port": "",
      "country": "",
      "arrival": "",
      "departure": "",
      "overnight": false,
      "notes": "Seetag"
    }
  ]
}
```

Zulässige Werte für `type`:

- `embarkation`
- `port`
- `sea`
- `overnight`
- `disembarkation`
- `unknown`

Datumswerte müssen `YYYY-MM-DD`, Uhrzeiten möglichst `HH:MM` entsprechen. Pro Datum ist genau ein Reisetag zulässig.

## Import auf dem iPhone

1. JSON-Datei in der Dateien-App speichern.
2. In CruiseSip die betreffende Reise öffnen.
3. `Reisen` aufrufen.
4. Unter `Reiseverlauf` auf `Reiseverlauf importieren` tippen.
5. Datei auswählen und die Importvorschau prüfen.
6. Import bestätigen.

Ein bereits gespeicherter Verlauf wird nur nach einer zusätzlichen Bestätigung ersetzt. Buchungen, Personen, Preise und Paketdaten bleiben unverändert.

## Mehrere Geräte

Wird eine Reise erstmals über einen Reiseexport auf einem zweiten Gerät angelegt, wird ein bereits enthaltener Reiseverlauf mit übertragen. Existiert dieselbe Reise dort schon, wird der lokale Reiseverlauf aus Sicherheitsgründen nicht automatisch überschrieben. In diesem Fall dieselbe Reiseverlaufsdatei auf dem zweiten Gerät separat importieren.
