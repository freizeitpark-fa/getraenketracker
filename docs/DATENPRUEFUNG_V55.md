# Datenprüfung und Diagnose – CruiseSip 5.5.0

CruiseSip 5.5.0 ergänzt eine zentrale, vollständig lokale Prüfung des Datenbestands. Die Prüfung verändert keine Daten und führt keine automatischen Reparaturen aus.

## Aufruf

`Setup → Verwaltung → Datenprüfung & Diagnose`

Der Prüfumfang kann gewählt werden:

- **Aktuelle Reise**: prüft die geöffnete Reise einschließlich Personen, Buchungen, Reiseverlauf und zugeordneter Barkarten-/Paketversionen.
- **Alle Daten**: prüft den vollständigen lokalen Datenbestand auf dem Gerät.

## Prüfinhalte

### Reisen und Reiseverlauf

- fehlende oder ungültige Reise-IDs
- unplausible Start- und Enddaten
- fehlende Barkarten- oder Paketversionen
- doppelte Reisetage
- Reisetage außerhalb des Reisezeitraums
- ungültige Tagesarten und Liegezeiten
- veränderte Abschluss-Prüfsummen

### Personen und Pakete

- Personen ohne gültige Reise
- fehlende Namen
- doppelte Namen innerhalb einer Reise
- Paketzuordnungen, die nicht in der Reiseversion vorhanden sind
- ungültige Paketpreise

### Buchungen

- Buchungen ohne Reise oder Person
- widersprüchliche Personen-/Reisezuordnung
- fehlende oder doppelte Merge-Keys
- ungültige Zeitpunkte und Preise
- Buchungen außerhalb des Reisezeitraums
- fehlende Barkartenversionen oder nicht mehr auflösbare Getränke

### Barkarten und Getränkepakete

- Versionen ohne Daten
- doppelte Getränke-IDs oder Bezeichnungen
- ungültige Preise und Paketstatus
- Paketstatus ohne passende Paketdefinition

### App und Speicher

- fehlende Geräteinformationen
- ungültige aktive Reise
- lokale Speicherbelegung und verfügbarer Speicher
- Hinweis, wenn der Browser den Speicher nicht dauerhaft schützt

## Ergebnisstufen

- **Fehler**: Beziehungen oder Daten sind technisch inkonsistent und sollten vor weiteren Importen geprüft werden.
- **Hinweis**: Daten bleiben nutzbar, können aber zu unklaren Auswertungen oder Importen führen.
- **Information**: nachvollziehbare Abweichung ohne unmittelbaren Reparaturbedarf.
- **OK**: Prüfung ohne kritische Feststellung.

## Prüfbericht

Das Ergebnis kann als JSON-Datei exportiert werden. Der Bericht enthält technische Metadaten, Zählwerte und die angezeigten Feststellungen. Getränke- und Buchungsdaten werden nicht automatisch verändert.

Vor manuellen Korrekturen sollte ein vollständiges Backup erstellt werden.
