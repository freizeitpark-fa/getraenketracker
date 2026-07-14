# Neue Reise aus einem Reiseverlauf anlegen

CruiseSip kann vor Reisebeginn eine vorbereitete JSON-Datei mit Häfen, Seetagen und optionalen Liegezeiten einlesen. Der Import erzeugt **immer eine neue Reise mit eigener stabiler Reise-ID**. Bereits vorhandene Reisen, Personen und Buchungen werden nicht verändert.

Die Routendaten dienen ausschließlich als Kontext im Tages- und Reisebericht. Getränkebuchungen werden weiterhin nur anhand ihres Datums und ihrer Uhrzeit zugeordnet.

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

Datumswerte müssen `YYYY-MM-DD`, Uhrzeiten möglichst `HH:MM` entsprechen. Pro Datum ist genau ein Reisetag zulässig. Der Reisename im Bereich `trip` ist verpflichtend. CruiseSip verwendet als Reisezeitraum den ersten und letzten gültigen Routentag.

## Geführte Einrichtung auf dem iPhone

1. JSON-Datei in der Dateien-App speichern.
2. In CruiseSip `Setup` → `Reisen verwalten` öffnen.
3. `Neue Reise anlegen` antippen.
4. `Reiseverlauf importieren` wählen und die JSON-Datei öffnen.
5. Importvorschau, Reisename, Schiff, Zeitraum, Häfen und Seetage prüfen.
6. `Neue Reise anlegen` bestätigen.
7. Im zweiten Schritt alle Personen, Getränkepakete und Paketpreise erfassen.
8. Im dritten Schritt die Reise optional für ein zweites Gerät exportieren.

Die importierte Datei wird niemals in eine bereits vorhandene Reise geschrieben. Eine versehentliche Veränderung oder Ersetzung eines bisherigen Reiseverlaufs ist damit ausgeschlossen.

## Manuelle Alternative

Im ersten Assistentenschritt kann statt des Imports `Manuell anlegen` gewählt werden. In diesem Fall werden Reisename, Schiff sowie Start- und Enddatum direkt eingegeben. Anschließend folgt dieselbe Personen- und Exportstrecke.

## Zweites Gerät

Der Reiseexport enthält:

- die neu angelegte Reise mit stabiler Reise-ID,
- den vollständigen importierten Reiseverlauf,
- alle angelegten Personen mit stabilen Personen-IDs,
- vorhandene Buchungen und Favoriten.

Auf dem zweiten Gerät wird die Datei unter `Setup` → `Geräteabgleich` importiert. Wird die Reise dort erstmals angelegt, werden Reiseverlauf und Personen gemeinsam übernommen. Danach können beide Geräte mit identischen Reise- und Personen-IDs Getränke erfassen.
