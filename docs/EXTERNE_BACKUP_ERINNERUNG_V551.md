# CruiseSip v5.5.1 – externe Backup-Erinnerung

## Zweck

CruiseSip speichert die laufenden Daten lokal in der iPhone-PWA. Interne Wiederherstellungspunkte schützen gegen Fehlbedienung, liegen jedoch im selben iOS-Webspeicher. Ein vollständiges JSON-Backup in der Dateien-App ist deshalb die externe Sicherung.

## Erinnerung

Die Home-Seite zeigt eine dezente Sicherungsempfehlung nur, wenn:

- seit dem letzten erfolgreichen Vollbackup mindestens eine neue oder geänderte Erfassung vorliegt,
- mindestens ein neuer Kalendertag begonnen hat,
- die Erinnerung für den aktuellen Tag nicht ausgeblendet wurde.

Die Schaltfläche **Heute nicht mehr erinnern** unterdrückt den Hinweis nur bis zum nächsten Kalendertag.

## Status im Setup

Unter **Setup → Externe Datensicherung** werden angezeigt:

- Zeitpunkt des letzten externen Vollbackups,
- Zahl der Erfassungen seitdem,
- Zahl der Erfassungen im letzten Backup,
- Empfehlung, wenn eine neue Tagessicherung fällig ist.

## Erfolgreiches Backup

Erst wenn der Teilen- oder Downloadvorgang nicht abgebrochen wurde, speichert CruiseSip den neuen Backup-Zeitpunkt. Ein abgebrochener iOS-Teilen-Dialog gilt nicht als Sicherung.

Empfohlener Zielordner während der Reise: **Auf meinem iPhone → CruiseSip Backups**.
