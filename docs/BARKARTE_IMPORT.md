# Barkarten- und Paketimport

CruiseSip 5.3.0 speichert Barkarten und Getränkepakete als vollständige Referenzversionen. Ein Import überschreibt keine bereits verwendete Version.

## JSON-Format

Eine Datei kann nur Getränke, nur Paketdefinitionen oder beide Bereiche enthalten. Fehlt ein Bereich, übernimmt CruiseSip ihn aus der aktuell geöffneten Reise und erstellt daraus eine neue vollständige Version.

```json
{
  "version": "2026-08-01_aida_barkarte",
  "source": "AIDA Barkarte Stand 01.08.2026",
  "notes": "Optionaler Hinweis",
  "packages": [
    {
      "id": "all_in",
      "name": "ALL IN",
      "minAge": 18,
      "source": "AIDA Paketübersicht Stand 01.08.2026"
    }
  ],
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

Mindestens `drinks[]` oder `packages[]` muss vorhanden sein.

## Paketstatus

Zulässige Werte:

- `included`
- `not_included`
- `unclear`

Unklare Fälle müssen als `unclear` importiert werden. CruiseSip zählt `unclear` konservativ nicht als Ersparnis.

## CSV-Format

CSV ist für Getränkedaten vorgesehen. Die Paketdefinitionen selbst werden aus der aktuell geöffneten Reise übernommen.

Mindestspalten:

```csv
id;name;category;price;all_in;fun;kids_teens_all_in;kids_teens_fun
cappuccino;Cappuccino;Heißgetränke;3,90;included;included;included;included
```

CruiseSip erkennt Semikolon- und Komma-Dateien sowie deutsch benannte Spalten wie `Name`, `Kategorie` und `Preis`.

## Importvorschau

Vor dem Speichern vergleicht CruiseSip die Datei mit der Version der aktuell geöffneten Reise:

- neue und entfallene Getränke
- Preisänderungen
- Kategorieänderungen
- Änderungen des Paketstatus je Getränk
- neue, geänderte oder entfallene Paketdefinitionen

Die Vorschau verändert keine lokalen Daten.

## Speichermöglichkeiten

Nach der Prüfung stehen drei Aktionen zur Verfügung:

1. **Nur speichern** – legt die Version ab, verändert aber keine Reise.
2. **Für aktuelle Reise verwenden** – ordnet die neue Version der aktuellen Reise zu. Vorhandene Buchungen behalten ihre gespeicherten Preise und Paketstatus.
3. **Als Standard für neue Reisen** – neue Reisen verwenden diese Version; bestehende Reisen bleiben unverändert.

## Lokale Artikeländerungen

Manuelle Änderungen in der Artikelverwaltung überschreiben keine gemeinsam genutzte oder mitgelieferte Version. CruiseSip erstellt bei Bedarf automatisch eine lokale Arbeitsversion und ordnet sie nur der betroffenen Reise zu. Bei einer abgeschlossenen Reise bleibt der archivierte Stand unverändert; die abgeleitete Version kann als Grundlage für künftige Reisen dienen.
