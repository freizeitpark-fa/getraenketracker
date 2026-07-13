# CruiseSip auf einem zweiten Gerät einrichten und Daten abgleichen

Diese Anleitung beschreibt den sicheren manuellen Datenaustausch zwischen zwei iPhones. CruiseSip synchronisiert keine Daten automatisch. Beim Export öffnet sich das iOS-Teilen-Menü. Über „In Dateien sichern“ wird der Zielordner in der Dateien-App, in iCloud Drive oder bei einem eingebundenen Dateidienst ausgewählt; alternativ kann die JSON-Datei per AirDrop bereitgestellt werden.

## Grundprinzip

- Beide Geräte dürfen für alle Personen Getränke erfassen.
- Personen sind nicht an ein bestimmtes Gerät gebunden.
- Jede Buchung speichert sowohl die konsumierende Person als auch das Gerät, auf dem sie erfasst wurde.
- Beim späteren Import werden neue Personen und Buchungen ergänzt.
- Bereits vorhandene Buchungen werden anhand ihrer stabilen Buchungskennung nicht doppelt importiert.
- Die Geräte-ID des zweiten Geräts muss eigenständig bleiben.

## Teil 1: Vollbackup auf dem ersten Gerät erstellen

1. CruiseSip auf dem ersten Gerät öffnen.
2. In der unteren Navigation `Setup` auswählen.
3. Den Bereich `Vollständige Datensicherung` öffnen.
4. `Vollständiges Backup exportieren` antippen.
5. Im iOS-Dialog `In Dateien sichern` auswählen.
6. Als Speicherort entweder
   - `Auf meinem iPhone`,
   - einen Ordner in `iCloud Drive`
   - oder einen anderen erreichbaren Ordner wählen.
7. Die vorgeschlagene JSON-Datei speichern.

Die Datei enthält den vollständigen lokalen CruiseSip-Datenbestand einschließlich Reisen, Personen, Buchungen, Favoriten, Einstellungen und individueller Getränkedaten.

## Teil 2: Backupdatei für das zweite Gerät bereitstellen

Die JSON-Datei kann auf eine der folgenden Arten bereitgestellt werden:

### Variante A: iCloud Drive

1. Die Backupdatei auf dem ersten Gerät in einem Ordner in `iCloud Drive` speichern.
2. Auf dem zweiten Gerät die Dateien-App öffnen.
3. Zum gleichen iCloud-Drive-Ordner navigieren.
4. Prüfen, ob die JSON-Datei vollständig sichtbar ist.

Voraussetzung ist, dass beide Geräte Zugriff auf diesen Ordner haben. CruiseSip selbst greift nicht automatisch auf iCloud zu.

### Variante B: AirDrop

1. Die Backupdatei in der Dateien-App auf dem ersten Gerät auswählen.
2. `Teilen` und anschließend `AirDrop` wählen.
3. Das zweite Gerät als Empfänger auswählen.
4. Die Datei auf dem zweiten Gerät in der Dateien-App sichern.

### Variante C: Andere manuelle Übertragung

Die Datei kann auch über eine andere geeignete Übertragungsmöglichkeit weitergegeben und anschließend in der Dateien-App des zweiten Geräts gespeichert werden. Wichtig ist, dass die Datei unverändert als `.json` vorliegt.

## Teil 3: CruiseSip auf dem zweiten Gerät vorbereiten

1. CruiseSip auf dem zweiten Gerät über Safari öffnen.
2. Warten, bis die App vollständig geladen ist.
3. Über `Teilen` → `Zum Home-Bildschirm` installieren.
4. CruiseSip über das neue Home-Bildschirm-Icon öffnen.
5. Die Ersteinrichtung abschließen.
6. Für das zweite Gerät einen eigenen Gerätenamen vergeben, zum Beispiel `iPhone Partnerin`.

Der Gerätename sollte eindeutig sein, damit später erkennbar bleibt, auf welchem Gerät eine Buchung erfasst wurde.

## Teil 4: Sicherung auf dem zweiten Gerät erstmals einspielen

Für die erstmalige Übernahme des gemeinsamen Ausgangsbestands wird auf dem zweiten Gerät `Vollständig ersetzen` verwendet.

1. Auf dem zweiten Gerät CruiseSip öffnen.
2. `Setup` → `Vollständige Datensicherung` auswählen.
3. `Vollbackup auswählen und prüfen` antippen.
4. In der Dateien-App die zuvor übertragene JSON-Datei auswählen.
5. Die Importvorschau vollständig prüfen. Insbesondere kontrollieren:
   - Quellgerät,
   - Exportzeitpunkt,
   - Anzahl der Reisen,
   - Anzahl der Personen,
   - Anzahl der Buchungen,
   - Anzahl der Getränke.
6. `Vollständig ersetzen` auswählen.
7. Die Sicherheitsbestätigung `DATEN ERSETZEN` exakt eingeben.
8. Die zusätzliche Sicherheitsabfrage bestätigen.
9. Die Option zur Übernahme der Backup-Geräte-ID **nicht aktivieren**.
10. Nach erfolgreichem Import CruiseSip vollständig neu laden beziehungsweise neu öffnen.
11. Unter `Setup` prüfen, ob der eigene Gerätename des zweiten Geräts weiterhin korrekt ist.

### Warum die Backup-Geräte-ID nicht übernommen werden darf

Wenn beide Geräte dieselbe Geräte-ID verwenden, können spätere Buchungen nicht mehr zuverlässig ihrer Geräteherkunft zugeordnet werden. Die Übernahme der Backup-Geräte-ID ist nur für die echte Wiederherstellung eines verlorenen oder dauerhaft ersetzten Geräts vorgesehen.

## Teil 5: Personen und Reisen auf beiden Geräten verwenden

Nach der ersten Wiederherstellung sind dieselben Reisen und Personen auf beiden Geräten vorhanden.

Beispiel:

- Gerät 1 erfasst überwiegend Getränke für Person 1 und 2.
- Gerät 2 erfasst überwiegend Getränke für Person 3 und 4.
- Gerät 2 darf bei Bedarf auch Getränke für Person 1 oder 2 erfassen.

Vor jeder Buchung muss lediglich die tatsächlich konsumierende Person ausgewählt werden. CruiseSip speichert zusätzlich automatisch die Geräteherkunft der Buchung.

## Teil 6: Spätere Daten vom zweiten Gerät auf das Hauptgerät übertragen

Für den laufenden Abgleich wird grundsätzlich `Daten ergänzen` verwendet.

### Auf dem zweiten Gerät

1. CruiseSip öffnen.
2. `Setup` → `Vollständige Datensicherung` öffnen.
3. `Vollständiges Backup exportieren` wählen.
4. Die JSON-Datei in der Dateien-App oder in iCloud Drive speichern beziehungsweise per AirDrop an das Hauptgerät übertragen.

### Auf dem Hauptgerät

1. CruiseSip öffnen.
2. Vor dem Import vorsorglich ein aktuelles Vollbackup des Hauptgeräts erstellen.
3. `Setup` → `Vollständige Datensicherung` öffnen.
4. `Vollbackup auswählen und prüfen` wählen.
5. Die Backupdatei des zweiten Geräts auswählen.
6. Die Importvorschau prüfen.
7. `Daten ergänzen` auswählen.
8. Das Importergebnis kontrollieren.

Beim Ergänzen gilt:

- fehlende Reisen werden ergänzt,
- fehlende Personen werden anhand ihrer stabilen ID ergänzt,
- bereits vorhandene Personen werden wiederverwendet,
- neue Buchungen werden ergänzt,
- bereits importierte Buchungen werden übersprungen,
- vorhandene lokale Daten werden nicht gelöscht,
- Geräte-ID und Gerätename des Hauptgeräts bleiben unverändert.

## Teil 7: Daten in beide Richtungen abgleichen

Wenn auf beiden Geräten neue Buchungen entstanden sind, sollte der Abgleich nacheinander in beide Richtungen erfolgen:

1. Gerät 2 exportiert ein Vollbackup.
2. Gerät 1 importiert dieses mit `Daten ergänzen`.
3. Gerät 1 erstellt anschließend ein neues Vollbackup mit dem zusammengeführten Bestand.
4. Gerät 2 importiert dieses neue Backup ebenfalls mit `Daten ergänzen`.

Danach verfügen beide Geräte über denselben zusammengeführten Buchungsbestand. Ein erneuter Import derselben Datei erzeugt keine doppelten Buchungen.

## Wann `Daten ergänzen` verwendet wird

`Daten ergänzen` ist die Standardauswahl für:

- den laufenden Geräteabgleich,
- neue Buchungen eines anderen Geräts,
- neue Personen eines anderen Geräts,
- den Import einer Datei, die möglicherweise bereits teilweise importiert wurde.

Diese Option löscht keine vorhandenen Reisen oder Buchungen.

## Wann `Vollständig ersetzen` verwendet wird

`Vollständig ersetzen` ist nur vorgesehen für:

- die erstmalige Einrichtung eines zweiten Geräts mit dem gemeinsamen Ausgangsbestand,
- die Wiederherstellung nach Datenverlust,
- den bewussten vollständigen Austausch des lokalen Datenbestands.

Vor einem vollständigen Ersetzen immer zuerst den aktuellen lokalen Stand exportieren.

## Wichtige Sicherheitsregeln

1. Vor jedem vollständigen Ersetzen ein aktuelles Backup des Zielgeräts erstellen.
2. Beim normalen Datenaustausch immer `Daten ergänzen` verwenden.
3. Die Backup-Geräte-ID auf einem parallel genutzten zweiten Gerät niemals übernehmen.
4. Backupdateien nicht manuell in einem Texteditor verändern.
5. Die Importvorschau vor jeder Bestätigung kontrollieren.
6. Wichtige Backups zusätzlich außerhalb der PWA speichern.
7. Safari-Websitedaten nicht löschen, solange kein aktuelles Backup vorhanden ist.

## Empfohlener Ablauf während der Kreuzfahrt

- Beide Geräte tracken vollständig offline.
- Einmal täglich oder bei Bedarf wird ein Vollbackup des zweiten Geräts erstellt.
- Das Hauptgerät importiert dieses Backup mit `Daten ergänzen`.
- Anschließend kann das Hauptgerät einen neuen Gesamtstand exportieren und auf das zweite Gerät zurückspielen.
- Eine Internetverbindung ist hierfür nicht erforderlich, wenn die Datei per AirDrop übertragen wird.

## Kontrolle nach dem Import

Nach jedem Import sollten kurz geprüft werden:

- Anzahl der Personen,
- neu importierte Buchungen,
- richtige Zuordnung zur konsumierenden Person,
- Geräteherkunft einzelner Buchungen,
- Tagesübersicht,
- Verlauf,
- Analysewerte.

Bei einer Warnung oder einem unerwarteten Konflikt den Import nicht als `Vollständig ersetzen` fortsetzen. Zunächst die vorhandenen Backupdateien aufbewahren und die angezeigten Angaben prüfen.

## Mehrere Geräteexporte in einem Schritt zusammenführen

Ab Version 4.4.2 können bis zu 20 Reiseexporte gleichzeitig ausgewählt werden:

1. Auf den beteiligten Geräten jeweils `Aktuelle Reise exportieren` wählen.
2. Die JSON-Dateien in einem gemeinsamen Ordner der Dateien-App ablegen.
3. Auf dem Zielgerät `Geräteexporte auswählen und zusammenführen` antippen.
4. In der Dateien-App mehrere JSON-Dateien markieren und öffnen.
5. Die Abschlussmeldung zu neuen Reisen, Personen, Buchungen, Dubletten und Konflikten prüfen.

Reisen und Personen werden anhand ihrer internen IDs erkannt. Dieselbe Person wird daher auch dann korrekt verwendet, wenn die Buchung auf einem anderen Gerät erfasst wurde. Gleichnamige Personen mit unterschiedlichen IDs werden bewusst nicht automatisch zusammengeführt.

Bereits importierte Buchungen werden über ihren stabilen Merge-Key erkannt und übersprungen. Ein wiederholter Import derselben Dateien ist deshalb zulässig.

