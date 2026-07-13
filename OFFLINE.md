# Offline-Nutzung auf dem iPhone

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

## Wichtige Hinweise

- Daten liegen nur auf dem jeweiligen Gerät.
- Wird Safari-Websitedaten gelöscht, können lokale Daten verloren gehen.
- Vor Reiseende regelmäßig exportieren.
- Beim Zusammenführen mehrerer Geräte immer je Gerät eine Exportdatei erzeugen und auf dem Hauptgerät importieren.


## Aktualisierung ab Version 4.3.4

Bei bestehender Internetverbindung prüft die installierte PWA beim Start und bei Rückkehr in die App auf neue Dateien. Ein bereitstehendes Update wird angezeigt und nach Bestätigung aktiviert. Die lokalen Reisedaten in IndexedDB bleiben erhalten.


## Einmalige Wiederherstellung bei einer festhängenden älteren Version

1. Vor einer Neuinstallation jede wichtige Reise über den Reiseexport sichern.
2. Zunächst das iPhone vollständig neu starten und CruiseSip bei bestehender Internetverbindung erneut öffnen.
3. Bleibt die angezeigte App-Version unverändert, die aktuelle GitHub-Pages-Adresse in Safari mit dem Zusatz `?v=4.3.4` öffnen.
4. Erst nach vorhandener Sicherung die alte Home-Bildschirm-App entfernen und die aktuelle Seite erneut zum Home-Bildschirm hinzufügen.
5. Falls lokale Daten nicht übernommen wurden, die zuvor erzeugten Reiseexporte wieder importieren.

Das Löschen von Safari-Websitedaten ist keine bevorzugte Update-Methode, da dadurch lokale IndexedDB-Daten verloren gehen können.
