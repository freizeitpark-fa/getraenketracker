# Barkartenimport

CruiseSip 4.0.0 unterstützt den Import strukturierter Barkarten als JSON oder CSV.

## JSON-Format

```json
{
  "version": "2026-08-01_aida_barkarte",
  "source": "AIDA Barkarte Stand 01.08.2026",
  "drinks": [
    {
      "id": "cappuccino",
      "name": "Cappuccino",
      "category": "Heißgetränke",
      "price": 3.9,
      "volume": "",
      "notes": "",
      "packages": {
        "all_in": "included",
        "fun": "included",
        "kids_teens_all_in": "included",
        "kids_teens_fun": "included"
      }
    }
  ]
}
```

## Paketstatus

Zulässige Werte:

- `included`
- `not_included`
- `unclear`

Unklare Fälle müssen als `unclear` importiert werden. CruiseSip zählt `unclear` nicht als Ersparnis.

## CSV-Format

Mindestspalten:

```csv
id;name;category;price;all_in;fun;kids_teens_all_in;kids_teens_fun
cappuccino;Cappuccino;Heißgetränke;3,90;included;included;included;included
```

Alternativ erkennt CruiseSip auch deutsch benannte Spalten wie `Name`, `Kategorie` und `Preis`.

## Vergleich

Beim Import vergleicht CruiseSip die neue Barkarte mit der aktiven Barkarte:

- neue Getränke
- Preisänderungen
- Paketänderungen

Erst nach Bestätigung wird die neue Barkarte übernommen.
