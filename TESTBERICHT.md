# Testbericht CruiseSip v5.0.1a

## Prüfgegenstand

Theme-System, reduzierte Effekte, Neuordnung des Home-Bildschirms sowie unveränderte Kernfunktionen aus v5.0.0.

## Automatisierte Strukturprüfungen

- JavaScript-Syntax mit Node.js geprüft.
- Service-Worker-Assetliste gegen vorhandene Dateien geprüft.
- Versionsstände in `index.html`, `app.js` und `sw.js` abgeglichen.
- Alle sieben Theme-IDs in Logik, Setup-Oberfläche und CSS geprüft.
- Home-Reihenfolge statisch geprüft: Schnellzugriff vor Wiederholung, Wiederholung vor Kennzahlen, Tagesübersicht danach.
- ZIP-Struktur und JSON-Stammdaten geprüft.

## Funktionsumfang der Änderung

- Automatisch folgt ausschließlich der Systemdarstellung Hell/Dunkel.
- Feste Themes bleiben von späteren Systemwechseln unberührt.
- Ocean, Sunset, Nordic und Hoher Kontrast verwenden eigenständige Farbvariablen.
- Reduzierte Effekte werden unabhängig vom Theme gespeichert.
- Reiseexporte und Zusammenführungsdateien enthalten keine Darstellungsumschaltung.

## Noch auf dem Zielgerät zu prüfen

- Visuelle Wirkung aller Themes auf dem konkret verwendeten iPhone.
- Statusleistenfarbe nach Theme-Wechsel in der installierten PWA.
- Lesbarkeit bei aktivierter iOS-Textvergrößerung.
- Offline-Update von v5.0.0a auf v5.0.1a nach einmaligem Online-Start.

## Vorheriger v5.0.0-Teststand

# Testbericht CruiseSip v5.0.0a

## Durchgeführte Prüfungen

- JavaScript-Syntaxprüfung mit Node.js erfolgreich.
- JSON-Prüfung für Manifest, Barkarte und Paketdefinitionen erfolgreich.
- HTML-Grundstruktur geprüft.
- CSS mit einem CSS-Parser geprüft; keine Syntaxfehler.
- Alle im Service Worker referenzierten Offline-Dateien sind vorhanden.
- Keine externen Ressourcen in `index.html`.
- Rendering-Logik mit Testdaten geprüft:
  - Reiseverlaufs-Karte,
  - persönliche Wiederholung,
  - Einzel- und Mehrfachauswahl,
  - gemischter Paketstatus,
  - Kategoriengrafik,
  - Tageswertgrafik.
- Mehrfachbuchung mit zwei Personen logisch geprüft:
  - zwei eigenständige Buchungen,
  - unterschiedliche Paketstatus,
  - eindeutige Merge-Keys,
  - Reiseverlaufs-Kontext,
  - gemeinsames Rückgängig.

## Noch auf dem Zielgerät zu prüfen

- Update von der installierten v4.5.4d über GitHub Pages.
- Einmaliger Aufbau der internen v5-Sicherheitskopie in Safari/IndexedDB.
- Darstellung und Bedienung auf dem konkreten iPhone einschließlich Home-Bildschirm-PWA.
- Flugmodusstart nach vollständigem Laden des neuen Service-Worker-Caches.
