# Testbericht CruiseSip v5.3.1a

Prüfdatum: 14.07.2026

## Automatisch erfolgreich geprüft

- JavaScript-Syntax mit Node.js.
- Versions-, Build- und Cachekennungen auf `5.3.1` / `5.3.1a` abgeglichen.
- Alle JSON-Dateien erfolgreich geparst.
- Mitgelieferte Barkarte enthält weiterhin 233 Getränke.
- Sämtliche im Service Worker genannten Ressourcen sind im Projekt vorhanden.
- CSS-Klammerstruktur ist ausgeglichen.
- ZIP-Integrität wurde ohne Fehler geprüft; eine SHA-256-Prüfsumme wurde erzeugt.

## Funktionstests v5.3.1

Die tatsächlichen Funktionen zur Prüfvorschau wurden aus `app.js` isoliert ausgeführt. Erfolgreich geprüft wurden:

- Zuordnung einer Buchung über identische Artikel-ID.
- Ersatzweise eindeutige Zuordnung über den normalisierten Getränkenamen.
- Kennzeichnung einer geänderten Artikel-ID als kontrollierte Änderung.
- Erkennung von Preisänderungen.
- Erkennung von Änderungen des Paketstatus.
- Erkennung fehlender Getränke als `unklar`.
- Zusammenfassung in Gesamtzahl, eindeutig zuordenbar, geändert und unklar.
- Quellcodeprüfung der beiden Entscheidungswege „nur für neue Erfassungen“ und „bestehende Buchungen prüfen“.
- Quellcodeprüfung der automatischen Wiederherstellung vor einem Wechsel mit vorhandenen Buchungen.

Der Testfall enthielt drei Buchungen:

- zwei eindeutig zuordenbare und geänderte Buchungen,
- davon eine Zuordnung über die Artikel-ID und eine über den Getränkenamen,
- eine nicht zuordenbare Buchung, die unverändert bleiben muss.

Erwartetes und ermitteltes Ergebnis: `3 gesamt / 2 eindeutig / 2 geändert / 1 unklar`.

## Statische Integrationsprüfung

- Die Versionsauswahl ist im manuellen Reiseformular vorhanden.
- Die Versionsauswahl ist im Onboarding vorhanden.
- Die Versionsauswahl ist in der Importvorschau eines Reiseverlaufs vorhanden.
- Unter „Reisen → Bearbeiten“ werden bei vorhandenen Buchungen beide Wechselmodi angeboten.
- Neue und kontrolliert aktualisierte Buchungen können die verwendete Barkarten- und Paketversions-ID speichern.
- Die IndexedDB-Version bleibt `2`; bestehende Stores und Datenformate bleiben erhalten.
- Die neue Dokumentation `REISE_BARKARTENVERSION_V531.md` ist im Offline-Cache enthalten.

## Einschränkung der Entwicklungsumgebung

Ein vollständiger Browser-Automationstest über einen lokalen Webserver war in der Entwicklungsumgebung nicht möglich, weil lokale Webseiten durch eine Organisationsrichtlinie des bereitgestellten Chromium-Browsers blockiert werden. JavaScript-Syntax, isolierte Funktionslogik, Projektstruktur und Offline-Ressourcen wurden stattdessen automatisiert geprüft.

## Noch auf dem Zielgerät zu prüfen

- Update einer installierten v5.3.0-PWA auf v5.3.1 ohne Verlust lokaler Daten.
- Auswahl einer Barkartenversion beim Anlegen einer Testreise.
- Wechsel einer leeren Reise ohne Zusatzdialog.
- Wechsel einer Reise mit Buchungen über „nur für neue Erfassungen“.
- Prüfvorschau mit einer absichtlich geänderten Testkarte.
- Wiederherstellungspunkt vor der bestätigten Änderung.
- Start im Flugmodus nach vollständigem Service-Worker-Update.
