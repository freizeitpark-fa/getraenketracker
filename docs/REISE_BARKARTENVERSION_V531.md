# Barkarten- und Paketversion je Reise – v5.3.1

## Normaler Ablauf vor der Reise

1. Neue Barkarte unter **Setup → Barkarte** importieren und als eigene Version speichern.
2. Reise manuell, über das Onboarding oder über eine Reiseverlaufsdatei anlegen.
3. Im Feld **Barkarten- und Paketversion** den passenden Stand auswählen.
4. Personen und Getränkepakete einrichten.
5. Reise starten und Getränke erfassen.

## Falsche Version korrigieren

Unter **Reisen → Bearbeiten** kann die Version nachträglich geändert werden.

- **Noch keine Buchungen:** Der Wechsel wird direkt gespeichert.
- **Bereits Buchungen vorhanden:** Wahl zwischen
  - **Nur für neue Erfassungen verwenden** – bisherige Preise und Paketstatus bleiben unverändert.
  - **Bestehende Buchungen prüfen** – CruiseSip zeigt vorab, welche Buchungen eindeutig zugeordnet werden können, welche Werte sich ändern und welche Zuordnungen unklar sind.

Unklare Buchungen werden nicht automatisch verändert. Vor jedem Wechsel mit vorhandenen Buchungen wird ein interner Wiederherstellungspunkt erstellt.

## Prüflogik

CruiseSip ordnet Buchungen zunächst über die Artikel-ID und ersatzweise über einen eindeutigen normalisierten Getränkenamen zu. Bei fehlender oder mehrdeutiger Zuordnung bleibt die Buchung unverändert.

Bei einer bestätigten Aktualisierung können folgende Felder angepasst werden:

- Artikel-ID und Getränkename
- Kategorie
- Barkartenpreis
- Paketstatus anhand des aktuell zugeordneten Pakets der Person
- verwendete Barkarten- und Paketversions-ID

## Datenbestand

Die IndexedDB-Version bleibt unverändert. Bestehende Reisen, Buchungen, Exporte und Backups bleiben kompatibel.
