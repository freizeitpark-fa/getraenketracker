# Berichtsexport

CruiseSip 4.5.3 stellt unter **Analyse → Reise → Bericht exportieren** drei lokale Exportwege bereit.

## CSV für Excel

Die CSV-Datei verwendet ein Semikolon als Trennzeichen und enthält eine Zeile je Getränkebuchung. Enthalten sind Reise- und Routendaten, Person, Getränkepaket, Getränk, Kategorie, Paketstatus, Preis und Geräteherkunft. Die Datei beginnt mit einer UTF-8-Kennung und der Excel-Trennzeichenangabe `sep=;`.

## HTML-Bericht

Der HTML-Bericht ist eine eigenständige Datei mit eingebettetem CSS. Er enthält Gesamtübersicht, Paketstatusgrafik, Personenvergleich, Reiseverlauf, Tagesauswertung, häufigste und teuerste Getränke, Kategorien sowie sämtliche Buchungen. Es werden keine externen Ressourcen geladen.

## Drucken und PDF auf iPhone

1. Unter Analyse den Zeitraum **Reise** wählen.
2. **Drucken / PDF** antippen.
3. In der iOS-Druckansicht die Vorschau vergrößern.
4. Über **Teilen** die PDF-Datei in der Dateien-App sichern oder weitergeben.

Alle Exporte werden ausschließlich aus den lokal gespeicherten Daten der aktuell geöffneten Reise erzeugt.

## iOS-Druckansicht ab Build 4.5.3b

Die PDF-Funktion öffnet eine eigenständige helle Berichtseite und startet von dort den Druckdialog. Dadurch wird der dunkle Hintergrund der installierten PWA nicht mehr in die PDF-Vorschau übernommen. Falls der Dialog nicht automatisch erscheint, kann in der geöffneten Berichtseite der Button **Drucken / als PDF sichern** verwendet werden.
