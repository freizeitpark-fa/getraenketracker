# Offline-Nutzung

Aktueller Stand: **CruiseSip 4.5.2**, Build **4.5.2h**. Neue Reisen können vollständig offline über einen Assistenten eingerichtet werden. Das responsive Layout und die Analyse einschließlich Kreisgrafik werden vollständig lokal aus den gespeicherten Buchungen dargestellt. Sämtliche Reisedaten bleiben ausschließlich auf dem Gerät.

## Einrichtung vor der Kreuzfahrt

1. GitHub-Pages-Link in Safari auf dem iPhone öffnen.
2. Warten, bis CruiseSip vollständig geladen ist.
3. In Safari das Teilen-Symbol öffnen.
4. „Zum Home-Bildschirm“ auswählen.
5. Name „CruiseSip“ bestätigen.
6. CruiseSip über das neue Icon starten.
7. Onboarding durchlaufen.
8. Backup-Test ausführen.
9. Kurz den Flugmodus aktivieren und CruiseSip erneut öffnen.

## Nutzung an Bord ohne Internet

- Tracking funktioniert vollständig lokal.
- Verlauf, Reisen, Personen, Favoriten und Auswertungen bleiben lokal gespeichert.
- Exportdateien können lokal erzeugt und später weitergegeben werden.
- Neue Barkarten können nur importiert werden, wenn sie als strukturierte JSON- oder CSV-Datei auf dem Gerät verfügbar sind.
- Der tatsächliche Reiseverlauf kann vor der Reise als strukturierte JSON-Datei in der Dateien-App abgelegt und vollständig offline importiert werden.

## Wichtige Hinweise

- Daten liegen nur auf dem jeweiligen Gerät.
- Wird Safari-Websitedaten gelöscht, können lokale Daten verloren gehen.
- Vor Reiseende regelmäßig exportieren.
- Beim Zusammenführen mehrerer Geräte immer je Gerät eine Exportdatei erzeugen, die Importvorschau prüfen und erst danach auf dem Hauptgerät zusammenführen.
- Konflikte werden nicht automatisch überschrieben; CruiseSip zeigt den lokalen und den importierten Stand vergleichbar an.



## Offline-Sicherheitsstatus ab Version 4.3.8

Unter `Setup` kann die Aktion `Offline-Status prüfen` ausgeführt werden. Die Prüfung kontrolliert:

- ob CruiseSip als Home-Bildschirm-PWA läuft,
- ob der Service Worker aktiv ist und die App steuert,
- ob der Cache der aktuellen Version einschließlich der Kerndateien vorhanden ist,
- ob IndexedDB lokal lesen und schreiben kann,
- und ob die App aktuell ohne gemeldete Internetverbindung läuft.

Die Diagnose löscht keine Reisen oder Buchungen. Für den endgültigen Praxistest CruiseSip vor der Abfahrt einmal im Flugmodus vollständig schließen und neu öffnen. Auch bei erfolgreichem Status bleiben regelmäßige Reiseexporte die notwendige Datensicherung.

## Aktualisierung ab Version 4.3.4

Bei bestehender Internetverbindung prüft die installierte PWA beim Start und bei Rückkehr in die App auf neue Dateien. Ein bereitstehendes Update wird angezeigt und nach Bestätigung aktiviert. Die lokalen Reisedaten in IndexedDB bleiben erhalten.


## Einmalige Wiederherstellung bei einer festhängenden älteren Version

1. Vor einer Neuinstallation jede wichtige Reise über den Reiseexport sichern.
2. Zunächst das iPhone vollständig neu starten und CruiseSip bei bestehender Internetverbindung erneut öffnen.
3. Bleibt die angezeigte App-Version unverändert, die aktuelle GitHub-Pages-Adresse in Safari mit dem Zusatz `?v=4.3.4` öffnen.
4. Erst nach vorhandener Sicherung die alte Home-Bildschirm-App entfernen und die aktuelle Seite erneut zum Home-Bildschirm hinzufügen.
5. Falls lokale Daten nicht übernommen wurden, die zuvor erzeugten Reiseexporte wieder importieren.

Das Löschen von Safari-Websitedaten ist keine bevorzugte Update-Methode, da dadurch lokale IndexedDB-Daten verloren gehen können.

## Vollbackup und Geräteabgleich

Der Abgleich erfolgt bewusst manuell über JSON-Dateien. CruiseSip lädt keine Daten automatisch in eine Cloud. Beim Export öffnet CruiseSip auf unterstützten iPhones und iPads das Teilen-Menü. Über „In Dateien sichern“ kann der gewünschte Ordner lokal unter „Auf meinem iPhone“, in iCloud Drive oder bei einem eingebundenen Dateidienst ausgewählt werden. Anschließend kann die Datei bei Bedarf auf einem anderen Gerät ausgewählt werden. Offline erfasste Buchungen bleiben vollständig in IndexedDB gespeichert, bis sie manuell exportiert werden.

Eine vollständige Anleitung zur Ersteinrichtung, zur korrekten Auswahl von `Vollständig ersetzen` und zum späteren Reiseabgleich mit Importvorschau steht in `docs/ZWEITES_GERAET.md`.

