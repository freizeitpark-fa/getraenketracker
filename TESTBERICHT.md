# Testbericht CruiseSip v5.0.2b

## Geprüft

- JavaScript-Syntax (`node --check`).
- Reihenfolge in `viewTrack`: Kategorien → Person → Hinweis bei fehlender Person → Suche → Getränkeliste.
- CSS-Reihenfolge der kompakten Erfassung.
- Versions-, Build- und Cachekennungen auf 5.0.2b abgeglichen.
- Service-Worker-Dateiliste und lokale Ressourcenpfade geprüft.
- JSON-Stammdaten syntaktisch geprüft.
- ZIP-Integrität geprüft.

## Unverändert

- Einzelerfassung pro ausgewählter Person.
- Home-Funktion „Noch einmal erfassen“.
- Themes, Reiseverlauf, Analyse und lokale Datenspeicherung.

## Noch auf dem iPhone prüfen

- Sichtbare Höhe der Getränkeliste im Hochformat.
- Fokus und Tastaturverhalten der Suche.
- Offline-Update nach einmaligem Online-Aufruf.
