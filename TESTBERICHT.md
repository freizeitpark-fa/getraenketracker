# Testbericht CruiseSip v5.3.0a

Prüfdatum: 14.07.2026

## Automatisch erfolgreich geprüft

- JavaScript-Syntax mit Node.js.
- Versions-, Build- und Cachekennungen auf `5.3.0` / `5.3.0a` abgeglichen.
- Alle JSON-Dateien erfolgreich geparst.
- Mitgelieferte Barkarte enthält weiterhin 233 Getränke.
- Sämtliche 30 Service-Worker-Ressourcen sind im Projekt vorhanden.
- CSS-Klammerstruktur ist ausgeglichen; alle verwendeten v5.3-Farbvariablen sind definiert.
- Kritische v5.3-Funktionen sind jeweils nur einmal vorhanden.
- ZIP-Integrität wurde ohne Fehler geprüft; eine SHA-256-Prüfsumme wurde erzeugt.

## Funktionstests der Versionierungslogik

Erfolgreich getestet wurden:

- Normalisierung deutscher Dezimalpreise und Paketstatus.
- Ergänzung der systemseitigen Paketdefinitionen `none` und `unclear`.
- Aufbau einer vollständigen Referenzversion mit Getränken und Paketen.
- Auswahl der zur aktuellen Reise gehörenden Referenzversion.
- CSV-Import mit Semikolon und Dezimalkomma.
- Vergleich neuer und entfallener Getränke.
- Erkennung von Preis-, Kategorie- und Paketstatusänderungen.
- Erkennung neuer und geänderter Paketdefinitionen.
- Paket-only-JSON-Import mit Übernahme der aktuellen Getränkeliste.
- Barkarten-only-Import mit Übernahme der aktuellen Paketdefinitionen.
- Kollision zweier inhaltlich unterschiedlicher Referenzversionen mit gleicher ID beim Geräteabgleich: Die importierte Version erhält eine getrennte ID und die importierte Reise verweist auf diese Variante.
- Kollision einer Referenzversion beim ergänzenden Vollbackup: Die Vorschau behandelt den abweichenden Stand als getrennt zu speichernde Version statt als überschreibbaren Konflikt.
- Vollbackup-Prüfung berücksichtigt Getränke-IDs aus allen enthaltenen Referenzversionen.

## Statische Integrationsprüfung

- `index.html`, `app.js` und `sw.js` verwenden denselben Build.
- Die neue Dokumentation `BARKARTEN_VERSIONIERUNG_V53.md` ist im Offline-Cache enthalten.
- Reiseexport, Importvorschau, Importprotokoll und Vollbackup enthalten beziehungsweise berücksichtigen Referenzversionen.
- Bestehende IndexedDB-Version 2 und alle bisherigen Stores bleiben erhalten.

## Noch auf dem Zielgerät zu prüfen

- Update einer bereits installierten v5.2-PWA auf v5.3 ohne Verlust lokaler Reisen.
- Sichtbare Darstellung der Versionskarten auf dem verwendeten iPhone.
- Import einer realen Barkarten-JSON-, Paket-only-JSON- und CSV-Datei aus der Dateien-App.
- Wechsel einer Reise auf eine neue Version und anschließende Erfassung.
- Reiseexport auf ein zweites Gerät einschließlich automatischer Übernahme der Referenzversion.
- Start im Flugmodus nach vollständigem Service-Worker-Update.

Die Zielgeräteprüfung ist erforderlich, weil iOS-Safari, Teilen-Menü und PWA-Cache nicht vollständig in der Entwicklungsumgebung simuliert werden können.
