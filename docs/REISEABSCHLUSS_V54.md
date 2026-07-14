# Reiseabschluss und Archivmodus – Version 5.4

## Abschluss

Vor dem Abschluss prüft CruiseSip Reise-, Personen- und Buchungsdaten. Kritische Zuordnungs- oder Identitätsfehler blockieren den Abschluss; Hinweise bleiben sichtbar und können bewusst bestätigt werden. Unmittelbar vor dem Abschluss wird ein interner Wiederherstellungspunkt erstellt.

Beim Abschluss speichert CruiseSip zusätzlich:

- Abschlusszeitpunkt und abschließendes Gerät,
- App-Version und Build,
- eine kompakte Abschlusszusammenfassung,
- Ergebnis der Abschlussprüfung,
- eine lokale SHA-256-Prüfsumme über Reise, Personen und Buchungen.

## Archivschutz

Abgeschlossene Reisen sind schreibgeschützt. Erfassung, Personenänderungen und Buchungskorrekturen bleiben gesperrt. Ab Version 5.4 werden auch neue oder geänderte Buchungen aus Geräteexporten für eine lokal abgeschlossene Reise blockiert. Für einen fehlenden letzten Geräteabgleich muss die Reise zuerst reaktiviert und der Import anschließend erneut ausgeführt werden.

## Abschlussbericht

Das Öffnen einer abgeschlossenen Reise führt direkt zum Abschlussbericht. Dieser enthält Gesamt- und Personenauswertungen, Paketbilanz, Tageswerte, häufigste Getränke sowie Export als CSV, HTML oder Druck/PDF. Abschlusszeitpunkt und lokale Prüfsumme werden im HTML-/PDF-Bericht ausgewiesen.

## Reaktivierung

Vor der Reaktivierung erstellt CruiseSip einen Wiederherstellungspunkt. Danach kann die Reise wieder geändert und erneut abgeschlossen werden. Jeder erneute Abschluss erhöht die Abschlussnummer und erzeugt eine neue Prüfsumme.
