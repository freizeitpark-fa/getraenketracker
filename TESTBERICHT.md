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
