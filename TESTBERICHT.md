# Testbericht CruiseSip v5.4.1d

## Schwerpunkt

Der Bereich „Gespeicherten Verlauf anzeigen“ wurde nicht erneut über Checkbox, Label oder das native `details`-Element umgesetzt. Die neue Schaltfläche setzt den geöffneten Zustand direkt im CruiseSip-App-Zustand und rendert die Liste anschließend neu.

## Geprüft

- JavaScript-Syntax von `app.js` und `sw.js`
- JSON-Syntax von Manifest, Barkarte und Paketdefinitionen
- echte Schaltfläche mit `data-action="toggleItineraryDetails"`
- Öffnen und Schließen über den tatsächlichen `handleClick`-Code mit simuliertem Klick
- Zustandswechsel `expandedItineraryTripId`: `null` → Reise-ID → `null`
- erneuter Renderaufruf beim Öffnen und Schließen
- Reisetage und Bearbeiten-/Löschen-Schaltflächen sind bereits im erzeugten Inhalt enthalten
- sichtbarer Zustand über `is-open`, `hidden` und `aria-expanded`
- eigener Service-Worker-Cache `cruisesip-v5-4-1-20260714d`
- Versionsparameter aller Kernressourcen auf Build `5.4.1d`
- ZIP-Integrität

## Ergebnis

Die Aufklapplogik ist nun unabhängig von den zuvor auf dem iPhone problematischen nativen Aufklappmechanismen. Ein realer Touch-Test in der installierten iPhone-PWA bleibt nach Veröffentlichung erforderlich.
