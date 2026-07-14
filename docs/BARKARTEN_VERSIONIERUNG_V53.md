# Barkarten- und Paketversionierung ab CruiseSip 5.3

## Ziel

Preise und Paketregeln ändern sich im Zeitverlauf. CruiseSip muss deshalb verhindern, dass eine neue Barkarte rückwirkend den Datenstand älterer Reisen verändert.

## Referenzversion

Jeder Datensatz im Store `barkarten` kann ab Version 5.3 eine vollständige Referenzversion enthalten:

- Versions-ID und Bezeichnung
- Quelle und Importzeitpunkt
- vollständige Getränkeliste
- vollständige Paketdefinitionen
- Herkunft einer lokalen Ableitung
- Kennzeichnung als mitgelieferte Stammversion oder lokale Arbeitsversion

Eine Referenzversion ist nur verwendbar, wenn vollständige Getränkedaten vorliegen. Alte reine Metadatensätze bleiben lesbar, werden aber als nicht verfügbar gekennzeichnet.

## Zuordnung zur Reise

Jede Reise enthält:

- `barkarteVersionId`
- `packageVersionId`

Bei der normalen Bedienung verweist beides auf dieselbe vollständige Referenzversion. Die getrennten Felder halten das Datenmodell für spätere unabhängige Versionen offen.

Neue Reisen übernehmen die unter Setup festgelegte Standardversion. Bereits bestehende Reisen behalten ihre Zuordnung.

## Wirkung auf Buchungen

Jede Buchung speichert weiterhin den zum Erfassungszeitpunkt maßgeblichen Preis und Paketstatus. Ein späterer Versionswechsel wirkt daher ausschließlich auf neue Erfassungen. Bestehende Buchungen werden nur bei einer ausdrücklich gewählten lokalen Massenaktualisierung verändert.

## Import und Aktivierung

Ein Import erfolgt in zwei Phasen:

1. Datei lesen, normalisieren und mit der aktuellen Reiseversion vergleichen.
2. Version ausdrücklich nur speichern, für die aktuelle Reise aktivieren oder als Standard festlegen.

Vor der Aktivierung für eine Reise wird ein interner Wiederherstellungspunkt erstellt.

## Export und Geräteabgleich

Der Reiseexport enthält die zur Reise gehörende vollständige Referenzversion im Feld `referenceDataVersion`. Beim Import auf einem anderen Gerät ergänzt CruiseSip eine fehlende Version, bevor Reise und Buchungen gespeichert werden. Damit bleibt die Reise auch ohne vorherigen separaten Barkartenimport vollständig nutzbar.

## Vollbackup

Vollbackups enthalten den Store `barkarten` einschließlich sämtlicher verfügbarer Referenzversionen. Die Validierung prüft, ob die von Reisen referenzierten Versions-IDs im Backup vorhanden sind.

## Löschschutz

Eine Version kann nicht gelöscht werden, wenn sie:

- einer Reise zugeordnet ist,
- als Standard für neue Reisen festgelegt ist,
- oder zur mitgelieferten Stammversion gehört.

Nur ungenutzte Import- oder Arbeitsversionen können gelöscht werden.

## Reisebearbeitung ab v5.3.1

Die einer Reise zugeordnete Referenzversion kann direkt unter **Reisen → Bearbeiten** gewählt werden. Ohne Buchungen erfolgt der Wechsel unmittelbar. Bei vorhandenen Buchungen kann entweder nur für zukünftige Erfassungen gewechselt oder eine konservative Prüfvorschau geöffnet werden.
