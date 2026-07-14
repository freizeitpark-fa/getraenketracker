# Testbericht CruiseSip v5.5.0a

## Geprüfter Umfang

- Update von v5.4.1d auf v5.5.0a
- neue Route `diagnostics`
- Aufruf über Setup → Verwaltung
- Prüfumfang aktuelle Reise und alle Daten
- Ergebnisdarstellung nach Bereichen und Schweregrad
- JSON-Export des Prüfberichts
- Versions- und Service-Worker-Cachewechsel
- vollständige Offline-Dateiliste

## Automatisierte Prüfungen

- JavaScript-Syntax mit `node --check`
- JSON-Syntax der Barkarten- und Paketdateien
- Existenz aller im Service Worker aufgeführten Offline-Ressourcen
- eindeutige Build-Kennung `5.5.0a` in HTML, App und Service Worker
- statische Prüfung der neuen Aktionen und Route
- Laufzeittest der Prüflogik in einer isolierten JavaScript-Umgebung: konsistenter Testbestand ohne Fehler sowie Erkennung eines doppelten Merge-Keys
- ZIP-Integrität

## Fachliche Prüflogik

Die Datenprüfung kontrolliert unter anderem:

- ungültige oder fehlende Reisezeiträume
- doppelte Reisetage und ungültige Liegezeiten
- Personen ohne Reise und Paketdefinition
- Buchungen ohne Person oder Reise
- doppelte Merge-Keys
- ungültige Preise, Zeitpunkte und Paketstatus
- fehlende Barkarten-/Paketversionen
- nicht auflösbare Getränke
- veränderte Archiv-Prüfsummen
- lokale Speicherbelegung

Die Prüfung ist rein lesend. Es werden keine Reisen, Personen, Buchungen, Barkarten oder Einstellungen automatisch verändert.

## Noch auf dem iPhone zu prüfen

- Darstellung längerer Ergebnislisten
- Dateifreigabe des JSON-Prüfberichts
- Speicherstatistik in Safari/PWA
- erneuter Offline-Start nach dem Update
