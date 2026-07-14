# Sicherer Geräteabgleich in CruiseSip 5.2

## Zweck

Mehrere Geräte erfassen unabhängig voneinander und ohne Internet. Die Daten werden über Reiseexporte als JSON-Dateien zusammengeführt. CruiseSip verändert beim Einlesen noch keine lokalen Daten.

## Importklassen

- **Neue Buchung:** stabiler Merge-Key ist lokal nicht vorhanden.
- **Doppelte Buchung:** Merge-Key und relevante Inhalte stimmen überein.
- **Geänderte Buchung:** Merge-Key stimmt überein, mindestens ein relevanter Inhalt weicht ab.
- **Referenzkonflikt:** Reise oder Person kann nicht sicher zugeordnet werden.

## Konfliktentscheidung

Für sicher auflösbare Konflikte wird je Datensatz eine Version festgelegt:

- **Lokale Version:** vorhandener Datensatz bleibt unverändert. Dies ist die konservative Vorauswahl.
- **Importierte Version:** der lokale Datensatz wird mit den Daten des ausgewählten Exports aktualisiert.

Bei mehreren Exporten für denselben Datensatz kann nur eine importierte Version gewählt werden. Unsichere Referenzkonflikte sind gesperrt und werden nicht übernommen.

## Sicherheit

Unmittelbar vor der bestätigten Zusammenführung erstellt CruiseSip einen internen Wiederherstellungspunkt. Danach werden Ergänzungen, gewählte Aktualisierungen und das Importprotokoll atomar in IndexedDB geschrieben.

## Importprotokoll

Je Datei werden gespeichert:

- Quellgerät und Importzeitpunkt
- neue Reisen, Personen und Buchungen
- geänderte und doppelte Buchungen
- Anzahl der Konflikte
- lokale, importierte und gesperrte Entscheidungen
- Bezug zum erzeugten Wiederherstellungspunkt
