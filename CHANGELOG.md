## v5.4.1c – Reiseverlauf-Aufklappen und Setup-Reihenfolge

- Der Reiseverlauf verwendet jetzt einen nativen Checkbox-/Label-Mechanismus, der auch ohne JavaScript-Klickverarbeitung auf iPhone und in der installierten PWA zuverlässig auf- und zuklappt.
- Der gesamte Balken einschließlich Pfeil ist antippbar; Pfeil und Beschriftung wechseln sichtbar zwischen Anzeigen und Ausblenden.
- Die Verwaltung mit Reisen, Geräten/Personen und Barkarte wurde auf der Setup-Seite direkt unter die aktive Reise verschoben.
- App- und Service-Worker-Build auf `5.4.1c` erhöht.

# CruiseSip – Changelog

## v5.4.1b – Reiseverlauf zuverlässig aufklappen

- „Gespeicherten Verlauf anzeigen“ verwendet jetzt eine eigene, iPhone-taugliche Auf-/Zuklappsteuerung statt des nativen Details-Elements.
- Der gesamte Kopfbereich einschließlich Pfeil ist antippbar; Pfeilrichtung und Beschriftung zeigen den aktuellen Zustand eindeutig an.
- Nach dem Aufklappen sind die Aktionen „Bearbeiten“ und „Löschen“ je Reisetag sichtbar.
- Beim Öffnen eines Reisetag-Editors bleibt der gespeicherte Verlauf geöffnet.
- Schaltflächen erhielten explizit `type="button"`, um unbeabsichtigte Formularaktionen zu verhindern.
- App- und Service-Worker-Build auf `5.4.1b` erhöht.

# CruiseSip Changelog

## 5.4.1 – Reiseverlauf bearbeiten

- Reiseverlauf unter „Reisen“ als lokale, bearbeitbare Tagesliste erweitert.
- Reisetage können einzeln ergänzt, bearbeitet und gelöscht werden.
- Änderbar sind Datum, Tagesart, Hafen/Station, Land, Ankunft, Abfahrt und Hinweise.
- Nach jeder Änderung sortiert CruiseSip automatisch nach Datum und nummeriert die Reisetage neu.
- Vor Ergänzen, Bearbeiten, Löschen oder vollständigem Entfernen wird ein interner Wiederherstellungspunkt erstellt.
- Buchungszeitpunkte, Preise und Paketstatus bleiben unverändert; Auswertungen verwenden den korrigierten Verlauf.
- Abgeschlossene Reisen bleiben schreibgeschützt und müssen vor Änderungen reaktiviert werden.
- Abweichende Reiseverläufe werden beim Geräteabgleich als Reisekonflikt erkannt und können kontrolliert übernommen werden.
- App- und Service-Worker-Build auf `5.4.1a` erhöht.
- Dokumentation `docs/REISEVERLAUF_BEARBEITEN_V541.md` ergänzt.

## 5.4.0 – Reiseabschluss und Archivmodus

- Vor jedem Reiseabschluss wird automatisch ein interner Wiederherstellungspunkt erstellt.
- Abschlusszeitpunkt, abschließendes Gerät, App-Build, Prüfergebnis und kompakte Abschlusskennzahlen werden im Reisedatensatz gespeichert.
- SHA-256-Prüfsumme über Reise, Personen und Buchungen ergänzt; der Abschlussbericht zeigt, ob der lokale Datenbestand seit dem Abschluss unverändert ist.
- Abgeschlossene Reisen öffnen direkt in der Abschlussauswertung statt im Verlauf.
- Abschlussberichte und Dateinamen werden in CSV, HTML und Druck/PDF eindeutig als Endstand gekennzeichnet.
- Geräteimporte dürfen lokal abgeschlossene Reisen nicht mehr verändern. Neue oder geänderte Buchungen werden blockiert und erfordern eine bewusste Reaktivierung.
- Vor einer Reaktivierung wird ebenfalls ein Wiederherstellungspunkt erstellt.
- Dokumentation `docs/REISEABSCHLUSS_V54.md` ergänzt.

# Changelog

## 5.3.1 – Barkartenversion direkt an der Reise

- Beim manuellen Anlegen, beim Onboarding und beim Import eines Reiseverlaufs kann die Barkarten- und Paketversion unmittelbar ausgewählt werden.
- Unter „Reisen → Bearbeiten“ lässt sich eine falsch zugeordnete Version gezielt für genau diese Reise korrigieren.
- Ohne vorhandene Buchungen wird die Version ohne zusätzliche Rückfrage gewechselt.
- Bei vorhandenen Buchungen stehen „nur für neue Erfassungen“ und „bestehende Buchungen prüfen“ zur Auswahl.
- Die Prüfvorschau trennt eindeutig zuordenbare, geänderte und unklare Buchungen. Unklare Buchungen werden niemals automatisch verändert.
- Vor einem Wechsel mit vorhandenen Buchungen wird automatisch ein interner Wiederherstellungspunkt erstellt.
- Bei einer bestätigten Aktualisierung werden nur eindeutig zuordenbare Buchungen auf Preis, Kategorie und Paketstatus der neuen Version umgestellt.
- Neue und kontrolliert aktualisierte Buchungen speichern zusätzlich die verwendete Barkarten- und Paketversions-ID.
- IndexedDB-Version bleibt `2`; App- und Service-Worker-Build wurden auf `5.3.1a` erhöht.

## 5.3.0 – Versionierte Barkarten und Getränkepakete

- Barkarten und Paketdefinitionen werden als vollständige Referenzversionen im bestehenden Store `barkarten` gespeichert.
- Jede Reise erhält eine feste Zuordnung über `barkarteVersionId` und `packageVersionId`. Bestehende Reisen behalten ihren bisherigen Stand.
- JSON-Importe können `drinks[]`, `packages[]` oder beide Bereiche enthalten; CSV-Dateien übernehmen die aktuellen Paketdefinitionen.
- Vor dem Speichern zeigt CruiseSip neue und entfallene Getränke sowie Preis-, Kategorie-, Paketstatus- und Paketdefinitionsänderungen.
- Importversionen können nur gespeichert, für die aktuelle Reise aktiviert oder als Standard für neue Reisen festgelegt werden.
- Vor einem Versionswechsel der aktuellen Reise wird automatisch ein interner Wiederherstellungspunkt erstellt.
- Manuelle Artikeländerungen erzeugen bei gemeinsam genutzten oder geschützten Daten eine lokale abgeleitete Arbeitsversion.
- Reiseexporte enthalten die vollständige zugehörige Referenzversion; der Geräteabgleich ergänzt fehlende Versionen.
- Vollbackup-Prüfung und Importprotokoll wurden um Referenzversionen erweitert.
- IndexedDB-Version bleibt `2`; App- und Service-Worker-Build wurden auf `5.3.0a` erhöht.

## 5.2.0 – Sicherer Geräteabgleich

- Reiseexporte werden vor dem Import vollständig geprüft; lokale Daten bleiben bis zur Bestätigung unverändert.
- Neue, geänderte und bereits vorhandene Buchungen werden getrennt ausgewiesen.
- Änderungen derselben Buchung auf mehreren Geräten werden über den stabilen Merge-Key erkannt.
- Für sicher auflösbare Reise-, Personen- und Buchungskonflikte kann je Datensatz zwischen lokaler und importierter Version gewählt werden.
- Nicht sicher zuordenbare Datensätze bleiben gesperrt und werden nicht automatisch übernommen.
- Vor jedem bestätigten Geräteabgleich wird automatisch ein lokaler Wiederherstellungspunkt erstellt.
- Das Importprotokoll speichert je Datei Zählwerte, Konfliktentscheidungen und den Bezug zum Wiederherstellungspunkt.
- Die Erfassungsansicht und das bestehende Datenmodell bleiben unverändert.
- App- und Service-Worker-Build auf `5.2.0a` erhöht.

## 5.1.0 – Interne Wiederherstellungspunkte

- Bis zu fünf vollständige lokale Sicherungsstände im getrennten Snapshot-Store.
- Automatische Sicherung vor dem Löschen einer Reise, dem Ersetzen der Barkarte, kritischen Backup- und Geräteimporten sowie Massenänderungen bestehender Buchungen.
- Manueller Sicherungspunkt jederzeit unter Setup.
- Übersicht mit Anlass, Zeitpunkt und Anzahl von Reisen, Personen und Buchungen.
- Kontrollierte Wiederherstellung mit Texteingabe; vor dem Zurücksetzen wird der aktuelle Stand nochmals gesichert.
- Interne Sicherungen bleiben gerätebezogen und werden nicht in Backups oder Reiseexporte aufgenommen.
- App- und Service-Worker-Build auf `5.1.0a` erhöht.

## 5.0.2b – Suche direkt über der Getränkeliste

- Reihenfolge der Erfassungsansicht korrigiert: Kategorien → Person → Suche → Getränke.
- Die Suche bleibt kompakt und befindet sich unmittelbar vor der Getränkeliste.
- Mehrfachauswahl und Wiederholungsleiste bleiben aus der Erfassungsansicht entfernt.
- Service-Worker- und Ressourcen-Build auf `5.0.2b` erhöht.

## 5.0.2 – Kompakte Erfassungsansicht

- Getränkesuche als erstes Bedienelement oberhalb von Kategorien und Personenauswahl angeordnet.
- „Noch einmal erfassen“ aus der Erfassungsansicht entfernt; die Funktion bleibt auf Home verfügbar.
- Mehrfachauswahl aus der regulären Erfassung zurückgenommen. Getränkekacheln buchen wieder eindeutig für genau eine ausgewählte Person.
- Personen-Schnellwechsel verkleinert und nicht notwendige Zähler entfernt.
- Kategorien, Suchfeld und Sortierleiste kompakter gestaltet.
- Listenüberschrift und Sortierung zu einer flachen Werkzeugleiste zusammengeführt.
- Verfügbaren Scrollbereich für Getränkekacheln auf dem iPhone vergrößert.
- App- und Service-Worker-Build auf `5.0.2a` erhöht.

## 5.0.1 – Themes und Home-Priorisierung

- Sieben Darstellungen: Automatisch, Hell, Dunkel, Ocean, Sunset, Nordic und Hoher Kontrast.
- Ocean ist als empfohlenes CruiseSip-Theme gekennzeichnet.
- Live-Vorschau und lokale, gerätebezogene Speicherung der Theme-Auswahl.
- Option „Reduzierte Effekte“ für weniger Animationen, Schatten, Transparenzen und dekorative Verläufe.
- Home neu geordnet: Schnellzugriff direkt oben, „Noch einmal erfassen“ darunter, Kennzahlen und Tagesbereiche anschließend.
- Tagesübersicht bewusst weiter nach unten verschoben.
- Navigation, Statusbereiche und Bedienelemente auf die neuen Theme-Farbvariablen umgestellt.
- App- und Service-Worker-Build auf `5.0.1a` erhöht.

## 5.0.0 – Reiseintelligenz und Mehrfacherfassung

- Home zeigt den heutigen oder nächsten Reisetag mit Hafen, Land, Tagesart und Liegezeiten.
- Mehrfacherfassung speichert ein ausgewähltes Getränk in einem Schritt separat für mehrere Personen.
- „Noch einmal erfassen“ ergänzt persönliche Ein-Tipp-Wiederholungen.
- Neue Diagramme zeigen Kategorienverteilung und Barkartenwert je Konsumtag.
- Neue Buchungen erhalten automatisch den passenden Reiseverlaufs-Kontext.
- Interne v5-Migrationssicherung mit kontrollierter Wiederherstellung im Setup.
- IndexedDB-Version 2 ergänzt den separaten Snapshot-Store.

## Build 4.5.4d – Aktive Reise grün hervorgehoben

- In Analyse und Einstellungen wird die aktuell geöffnete Reise durch eine kompakte grüne Reiseleiste eindeutig angezeigt.
- Die Kennzeichnung erscheint auch in den Einstellungsbereichen Reisen, Geräte & Personen sowie Barkarte.
- In der Reiseverwaltung ist die ausgewählte Reise grün hinterlegt; weitere und abgeschlossene Reisen bleiben optisch unterscheidbar.
- Reiseauswahl, IndexedDB, Buchungen, Auswertungen, Backup und Geräteabgleich bleiben unverändert.
- Service-Worker-Cache und Asset-Versionen auf Build `4.5.4d` erhöht.

## Build 4.5.4c – Bezeichnung „Erfassen"

- Hauptnavigation, Seitenkopf, Schnellzugriff und aktuelle Bedienhinweise verwenden jetzt einheitlich „Erfassen" statt „Tracken".
- Interne Route `track`, Funktionsnamen, IndexedDB, Reisen, Personen und Buchungen bleiben unverändert.
- Service-Worker-Cache und Asset-Versionen auf Build `4.5.4c` erhöht.

## Build 4.5.4b – Exportbereich am Ende der Analyse

- Der Bereich „Bericht exportieren“ wurde an das Ende der Reiseanalyse verschoben.
- Kennzahlen, Paket-Amortisation, Tagesbericht, Personen-, Getränke-, Kategorien- und Tagesauswertungen werden zuerst angezeigt.
- CSV-, HTML- und PDF-Export sowie sämtliche Berichtsinhalte bleiben unverändert.
- Keine Änderung an IndexedDB, Reisen, Personen, Buchungen, Backup oder Geräteabgleich.

## Version 4.5.4 – Paket-Amortisation und Verbrauchsprognose

- Grafischer Amortisationsgrad je Person mit eindeutig enthaltenem Paketwert, Paketpreis und Restwert bis zum Break-even.
- Tatsächlicher Break-even-Tag wird aus dem kumulierten Wert der eindeutig enthaltenen Buchungen ermittelt.
- Durchschnittlicher Paketwert je verstrichenem Reisetag und Hochrechnung bis zum Reiseende.
- Klare Einstufung in amortisiert, voraussichtlich amortisiert, voraussichtlich nicht amortisiert oder keine belastbare Prognose.
- Gesamtübersicht mit Paketfortschritt und Vergleich aller Personen.
- Unklare Paketstatus werden getrennt ausgewiesen und nicht in Fortschritt oder Prognose eingerechnet.
- HTML- und PDF-Bericht um eine Amortisations- und Prognosetabelle erweitert.
- Hauptnavigation setzt Home, Tracken, Verlauf, Analyse und Setup beim Öffnen zuverlässig an den Seitenanfang.
- Keine Änderung an IndexedDB, Reisen, Personen, Buchungen, Backup oder Geräteabgleich.

## 4.5.3c – Rückkehr aus der Druckansicht

- Die eigenständige PDF-Druckansicht enthält nun einen klaren Button „Zurück zu CruiseSip“.
- In der PWA wird nach Möglichkeit das Berichtfenster geschlossen und die bereits geöffnete App wieder fokussiert.
- Falls iOS das Schließen nicht zulässt, führt die Rückfalllogik zuverlässig zur CruiseSip-App zurück.
- CSV-, HTML- und PDF-Inhalte bleiben unverändert.

## Version 4.5.3b – iOS-PDF-Druckansicht

- Schwarze PDF-Druckvorschau auf iPhone und iPad behoben.
- Druckbericht wird nicht mehr innerhalb der laufenden PWA erzeugt, sondern in einer eigenständigen, ausdrücklich hellen Berichtseite.
- Die neue Druckseite verwendet den bereits bewährten HTML-Bericht und öffnet den iOS-Druckdialog automatisch.
- Falls der automatische Dialog ausbleibt, steht in der Druckseite weiterhin der Button „Drucken / als PDF sichern“ bereit.
- CSV- und HTML-Export, IndexedDB, Reisen, Personen, Buchungen, Backup und Geräteabgleich bleiben unverändert.

## Version 4.5.3 – Berichtsexport

- CSV-Export für Excel mit einer strukturierten Zeile je Getränkebuchung.
- CSV enthält Reise, Reisetag, Hafen oder Seetag, Person, Paket, Getränk, Kategorie, Paketstatus, Preis und Geräteherkunft.
- Eigenständiger, vollständig offline nutzbarer HTML-Bericht mit Gesamtübersicht, Kreisgrafik, Personen-, Tages-, Routen-, Kategorien- und Buchungsauswertung.
- CSV und HTML werden auf unterstützten iPhones und iPads über das native Teilen-Menü bereitgestellt; Download-Fallback für andere Browser.
- Druckfreundliche Abschlussansicht mit PDF-Erstellung über die iOS-Druckfunktion.
- Keine externen Bibliotheken und keine Änderung an IndexedDB, Reisen, Personen, Buchungen, Backup oder Geräteabgleich.

## Version 4.5.2h – Responsives Design

- Mobile Referenzansicht für das iPhone unverändert beibehalten.
- Layout für schmale Android-Geräte, iPad, Tablets sowie Desktop- und Notebook-Browser ergänzt.
- App-Breite, Abstände, Kennzahlenraster, Getränkekacheln, Personen- und Analysebereiche passen sich an die verfügbare Breite an.
- Ab 1024 Pixeln wird die Hauptnavigation als kompakte Seitenleiste dargestellt; auf Mobilgeräten bleibt sie unten fixiert.
- Tracken-Ansicht nutzt auf größeren Displays drei beziehungsweise vier Getränkekacheln pro Zeile.
- Viewport-Berechnung der Tracken-Liste berücksichtigt die seitliche Desktopnavigation.
- Keine Änderung an IndexedDB, Reisen, Personen, Buchungen, Backup oder Geräteabgleich.

# CruiseSip – Änderungsprotokoll

## Version 4.5.2g – Analyse-Design und grafische Auswertung

- Analyseansicht auf eine einheitliche, bildschirmfüllende Kartenbreite gebracht.
- Lange Reisenamen in der Kopfzeile werden gekürzt und verursachen kein horizontales Überlaufen mehr.
- Neue Kreisgrafik zur Verteilung nach Paketstatus: enthalten, nicht enthalten und unklar.
- Legende zeigt Anzahl, Anteil und Barkartenwert je Status.
- Grafik reagiert auf die Filter Heute, Gestern und Reise.
- Keine externen Bibliotheken; vollständig offline und ohne Änderung am Datenmodell.

## Version 4.5.2f – Home ohne Direktbuchungen

- Favoriten und „Zuletzt getrunken“ von der Home-Seite entfernt.
- Getränke werden nur noch über die Tracken-Seite gebucht, auf der die Person sichtbar ausgewählt werden kann.
- Favoritenfunktion, Favoritenfilter und Zuletzt-Filter bleiben auf der Tracken-Seite vollständig erhalten.
- Schnellzugriffe auf Tracken, Verlauf und Auswertung bleiben auf Home bestehen.
- Keine Änderung an Reisen, Personen, Buchungen, IndexedDB, Backup oder Geräteabgleich.

## Version 4.5.2e – Kompakte Reiseanzeige auf Home

- Karte der aktuellen Reise auf der Home-Seite deutlich kompakter gestaltet.
- Schiff, Status, Reisename und Zeitraum bleiben vollständig erkennbar.
- Lange Reisenamen werden auf höchstens zwei Zeilen begrenzt.
- Anzahl der Reisetage wird platzsparend neben dem Zeitraum angezeigt.
- Keine Änderung an Reisen, Buchungen, Reiseverlauf oder Auswertungslogik.

## Version 4.5.2d – Assistent zur Reiseeinrichtung

- Neue Reisen werden über einen dreistufigen Assistenten eingerichtet: Reise anlegen, Personen erfassen, optionaler Export für ein zweites Gerät.
- Im ersten Schritt kann zwischen einer Reiseverlaufsdatei und der manuellen Erfassung gewählt werden.
- Der Import einer `CruiseSipItinerary`-Datei erzeugt immer eine neue Reise mit eigener stabiler Reise-ID. Vorhandene Reisen, Personen und Buchungen werden nicht verändert.
- Reisename und Schiff können in der Importvorschau geprüft und angepasst werden; der Reisezeitraum wird aus dem ersten und letzten Routentag abgeleitet.
- Nach dem Import oder der manuellen Anlage führt CruiseSip direkt zur Personen- und Paketverwaltung.
- Der abschließende Reiseexport enthält Reise, Reiseverlauf und sämtliche angelegten Personen mit identischen IDs für das zweite Gerät.
- IndexedDB-Version, Stores, Tracking, Buchungen, Barkarte, Vollbackup und bestehender Geräteabgleich bleiben unverändert.

## Version 4.5.2c – Offline-Cache-Diagnose

- Offline-App-Cache-Prüfung verwendet für CSS und JavaScript automatisch die aktuelle Build-Kennung.
- Fehlanzeige `3/5 Kerndateien` nach dem Update auf Build 4.5.2b behoben.
- Keine Änderung an IndexedDB, Reisen, Buchungen, Personen, Barkarte, Backup oder Geräteabgleich.

## 4.5.2b – Importierter Reiseverlauf

### Neu

- Reiseverlauf mit Häfen, Seetagen, Ankunfts- und Abfahrtszeiten als lokale JSON-Datei importieren.
- Importvorschau mit Prüfung von Format, Datumswerten, doppelten Tagen, Reisezeitraum, Reisename und Schiff.
- Bereits vorhandenen Reiseverlauf nach ausdrücklicher Bestätigung vollständig ersetzen oder gezielt entfernen.
- Importierte Häfen und Seetage werden im Tages- und Reisebericht angezeigt; das Getränketracking bleibt ausschließlich datumsbasiert.
- Reiseverlauf kann auch bei einer abgeschlossenen Reise ergänzt werden, ohne Buchungen, Personen, Preise oder Paketdaten zu verändern.
- Vollbackup und vollständige Wiederherstellung enthalten den Reiseverlauf automatisch.

### Technisch

- App-Version bleibt `4.5.2`, Build auf `4.5.2b` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-5-2-20260714b` erhöht.
- Keine Änderung an IndexedDB-Version, Stores, IDs oder Buchungslogik.
- Reiseverlauf wird beim Geräteabgleich nicht als Stammdatenkonflikt bewertet. Bei bereits vorhandener Reise muss er bei Bedarf auf dem zweiten Gerät separat importiert werden.

## 4.5.2 – Tages- und Reisebericht

### Neu

- Chronologische Auswertung je Reisetag mit Getränkeanzahl, Barkartenwert und Verteilung auf enthalten, nicht enthalten und unklar.
- Bei vollständig hinterlegtem Reisezeitraum werden auch Tage ohne Buchungen mit 0 berücksichtigt.
- Stärkster Konsumtag sowie durchschnittliche Getränkeanzahl und durchschnittlicher Barkartenwert pro Reisetag.
- Ranglisten für häufigste Getränke und teuerste Getränke nach gespeichertem Einzelpreis.
- Direkter Vergleich der Personen und Getränkekategorien innerhalb des Reiseberichts.
- Abgeschlossene Reisen zeigen den Bereich als Abschlussbericht, aktive Reisen als Zwischenbericht.

### Technisch

- App-Version auf `4.5.2`, Build auf `4.5.2a` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-5-2-20260714a` erhöht.
- IndexedDB, Stores, IDs, Backupformate, Reiseexport und Geräteabgleich bleiben unverändert.
- Sämtliche Kennzahlen werden ausschließlich aus lokal gespeicherten Buchungen berechnet.

## 4.5.1b – Hotfix zuverlässige PWA-Aktualisierung auf iOS

### Behoben

- Die ausgelieferte Version 4.5.1 enthielt bereits die korrekte App-Version, konnte auf einer installierten iPhone-PWA jedoch weiterhin als 4.5.0 erscheinen, wenn iOS den bisherigen Service-Worker-Skriptpfad weiterverwendete.
- Der Service Worker wird nun über eine versionsgebundene URL `sw.js?v=4.5.1b` registriert. Dadurch wird die neue Worker-Datei eindeutig als neuer Build erkannt.
- CSS, JavaScript und Manifest erhalten ebenfalls die Build-Kennung `4.5.1b`.
- Der Offline-Cache wurde auf `cruisesip-v4-5-1-20260714b` erhöht.
- Im Setup wird zusätzlich zur App-Version der technische Build angezeigt.
- IndexedDB, Reisen, Personen, Buchungen, Backups und Geräteabgleich bleiben unverändert.

## 4.5.1 – Abschlussauswertung je Person und Gesamtübersicht

### Neu

- Gesamtübersicht mit Anzahl aller Getränke, Gesamt-Barkartenwert, Gesamtpaketkosten, Kosten außerhalb des Pakets, unklaren Paketstatus sowie Gesamtersparnis oder Gesamtmehrkosten.
- Je Person werden Getränkeanzahl, Barkartenwert, enthaltene, nicht enthaltene und unklare Getränke jeweils mit Anzahl und Wert ausgewiesen.
- Bezahlter Paketpreis, Kosten außerhalb des Pakets und die rechnerische Ersparnis beziehungsweise Mehrkosten werden transparent getrennt dargestellt.
- Durchschnittlicher Getränkewert pro Reisetag auf Basis des hinterlegten Reisezeitraums; bei fehlenden Reisedaten erfolgt ein sichtbar gekennzeichneter Rückgriff auf Tage mit Buchungen.
- Kategorienauswertung je Person mit Getränkeanzahl, Barkartenwert und Verteilung auf enthalten, nicht enthalten und unklar.
- Abgeschlossene Reisen zeigen die Überschrift `Abschlussauswertung`; aktive Reisen zeigen denselben Datenstand als `Reiseauswertung – Zwischenstand`.

### Berechnungslogik

- Die Paketbilanz bleibt konservativ: Nur eindeutig als `included` gespeicherte Getränke werden dem Paketpreis gegenübergestellt.
- Eindeutig nicht enthaltene Getränke werden als Kosten außerhalb des Pakets ausgewiesen und verändern die Paketbilanz nicht, da sie auch ohne Paket zum Barkartenpreis angefallen wären.
- Unklare Paketstatus werden separat ausgewiesen und nicht als Ersparnis berücksichtigt.
- Bei fehlendem Paketpreis oder dem Paketstatus `Unklar / an Bord prüfen` wird kein scheinbar genauer Vergleich berechnet.
- Personen ohne Getränkepaket erhalten ausdrücklich keinen Paketvergleich statt einer irreführenden Mehrkostenanzeige.

### Technisch

- App-Version auf `4.5.1` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-5-1-20260714a` erhöht.
- IndexedDB, Stores, IDs, Exportformate, Backup und Geräteabgleich bleiben unverändert.
- Barkarte weiterhin vollständig mit 233 Getränken.

## 4.5.0c – Hotfix abgeschlossene Reise öffnen

### Behoben

- Der bisherige Button `Öffnen` wirkte bei einer bereits ausgewählten, abgeschlossenen Reise ohne sichtbare Reaktion, weil lediglich die Reise-ID gesetzt und die Reiseverwaltung neu gerendert wurde.
- Bei abgeschlossenen Reisen heißt die Aktion jetzt `Buchungen ansehen` und öffnet unmittelbar den vollständigen Reiseverlauf.
- Beim Öffnen wird automatisch der Filter `Gesamte Reise` gesetzt, sodass sämtliche Buchungen der abgeschlossenen Reise sichtbar sind.
- Aktive Reisen werden über `Öffnen` weiterhin ausgewählt und nun direkt auf der Home-Seite geöffnet.
- Service-Worker-Cache und Asset-Versionen wurden auf `cruisesip-v4-5-0-20260714c` beziehungsweise `4.5.0c` erhöht.

## 4.5.0b – Hotfix Kategorienauflösung

### Behoben

- Die Abschlussprüfung meldet eine fehlende Kategorie nur noch, wenn weder die gespeicherte Buchung noch der über `drinkId` zugeordnete Barkartenartikel eine Kategorie enthält.
- Die Kategorienauswertung und die Kategorieanzeige im personenbezogenen Verlauf verwenden dieselbe rückwärtskompatible Fallback-Logik. Ältere Buchungen werden dadurch korrekt ausgewertet, ohne ihre gespeicherten Daten zu verändern.
- Service-Worker-Cache und Asset-Versionen wurden auf `cruisesip-v4-5-0-20260714b` beziehungsweise `4.5.0b` erhöht.

## 4.5.0 – Kontrollierter Reiseabschluss und Schreibschutz

### Neu

- Reisen können über `Reise abschließen` kontrolliert abgeschlossen werden. Vor dem Speichern erscheint eine vollständige Abschlussprüfung; bis zur Bestätigung werden keine lokalen Daten verändert.
- Die Prüfung unterscheidet zwischen kritischen Fehlern und Hinweisen. Kritische Identitäts-, Zuordnungs-, Zeitstempel- oder Preisfehler blockieren den Abschluss.
- Unklare Paketstatus, fehlende beziehungsweise 0,00-EUR-Preise, fehlende Paketpreise, Buchungen außerhalb des Reisezeitraums, fehlende Kategorien, fehlende Barkartenreferenzen und fehlende Geräteherkunft werden sichtbar ausgewiesen, verhindern den Abschluss aber nicht.
- Vor dem endgültigen Abschluss wird der lokale Datenbestand erneut geprüft.
- Abgeschlossene Reisen können nach einer gesonderten Sicherheitsabfrage wieder reaktiviert werden.

### Schreibschutz

- Abgeschlossene Reisen sind auf Home, Tracken, Verlauf, Auswertung, Reisen, Geräte & Personen sowie in der Barkartenverwaltung deutlich gekennzeichnet.
- Neue Getränkebuchungen sind sowohl über die Tracken-Seite als auch über Home-Favoriten und zuletzt verwendete Getränke gesperrt.
- Rückgängig, Verlaufskorrekturen, Löschungen, Personenänderungen, Paketänderungen und Änderungen des Paketpreises sind bis zur Reaktivierung gesperrt.
- Barkarten-Stammdaten bleiben bearbeitbar. Die Übernahme geänderter Stammdaten auf vorhandene Buchungen einer abgeschlossenen Reise ist gesperrt.
- Reise- und Personendaten sowie sämtliche Buchungen bleiben beim Abschluss unverändert erhalten; gespeichert wird ausschließlich der bestehende Status `archived: true` und ein aktualisierter Änderungszeitpunkt.

### Mehrgeräteabgleich

- Der lokale Abschlussstatus wird beim Geräteabgleich nicht durch den Status eines anderen Geräts überschrieben. Ein Unterschied ausschließlich bei `archived` wird nicht mehr als Reisestammdatenkonflikt behandelt.
- Neue Buchungen für eine lokal abgeschlossene Reise werden in der Importvorschau gesondert angezeigt und müssen vor dem Schreiben zusätzlich bestätigt werden. Die Reise bleibt danach abgeschlossen.

### Technisch

- App-Version auf `4.5.0` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-5-0-20260714a` erhöht.
- IndexedDB-Name `cruisesip_v4`, Datenbankversion `1`, Stores, stabile Reise-, Personen- und Buchungs-IDs sowie Exportformatversionen bleiben unverändert.
- Barkarte und Paketdaten bleiben unverändert; weiterhin exakt 233 Getränke.

## 4.4.3 – Importvorschau, Konflikterkennung und Buchungsherkunft

### Neu

- Reiseexporte werden nach der Dateiauswahl zunächst vollständig geprüft; zu diesem Zeitpunkt werden noch keine lokalen Daten verändert.
- Die Importvorschau zeigt je Datei Quellgerät, Reise, Exportzeitpunkt, neue Personen und Buchungen, bereits vorhandene Buchungen sowie Konflikte.
- Konflikte können aufgeklappt und als Vergleich zwischen lokalem und importiertem Datensatz geprüft werden.
- Konfliktbehaftete Reisen, Personen oder Buchungen werden nicht übernommen; der vorhandene lokale Datensatz bleibt unverändert.
- Vor dem tatsächlichen Schreiben wird die Vorschau nochmals gegen den aktuellen lokalen Datenbestand geprüft. Bei zwischenzeitlichen Änderungen muss die aktualisierte Vorschau erneut bestätigt werden.
- Im Verlauf zeigt jede Buchung das erfassende Gerät an. Die Herkunft ist außerdem in der Verlaufskorrektur und im personenbezogenen Getränkeverlauf sichtbar.
- Das Importprotokoll zeigt bei Geräteabgleichen zusätzlich den Namen des Quellgeräts.

### Technisch

- App-Version auf `4.4.3` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-4-3-20260714a` erhöht.
- IndexedDB-Name `cruisesip_v4` und Datenbankversion `1` bleiben unverändert.
- Keine Änderung an Barkarte, Paketdaten, stabilen Reise-, Personen- oder Buchungs-IDs.

## 4.4.2 – Mehrere Geräteexporte sicher zusammenführen

### Hotfix Setup-Anordnung

- Die Aktionen `Aktuelle Reise exportieren` und `Geräteexporte auswählen und zusammenführen` werden jetzt direkt auf der Setup-Seite unter `Geräteabgleich` angezeigt.
- Die zuvor notwendige Navigation über `Setup → Verwaltung → Geräte & Personen` entfällt.
- Cache und Dateiversionen wurden auf `cruisesip-v4-4-2-20260713b` erhöht, damit der Hotfix auf iPhone-PWAs sicher geladen wird.

### Neu

- Bis zu 20 Reiseexporte können gleichzeitig über die Dateien-App ausgewählt und in einem Schritt zusammengeführt werden.
- Reiseexporte verwenden das neue Format `CruiseSipTripExport` mit Formatversion `2`, Export-ID, App-Version, Gerätekennung, Bestandsübersicht und SHA-256-Integritätsprüfung.
- Fehlende Reisen und Personen werden mit ihren bestehenden stabilen IDs ergänzt. Dadurch können alle Geräte weiterhin für jede gemeinsame Person buchen.
- Buchungen werden geräteübergreifend über ihren stabilen `mergeKey` erkannt und bei Mehrfachimporten nicht doppelt angelegt.
- Ältere Reiseexporte vom Typ `CruiseSipExport` bleiben importierbar und werden als kompatibler Altbestand protokolliert.
- Nach dem Abgleich erscheint eine Zusammenfassung zu Dateien, neuen Reisen, Personen, Buchungen, Dubletten und Konflikten.

### Sicherheit

- Der gesamte Mehrdateiimport wird vor dem Schreiben validiert. Eine fehlerhafte Datei bricht den Vorgang ab, bevor lokale Daten verändert werden.
- Gleichnamige Personen mit unterschiedlichen IDs werden nicht automatisch zusammengeführt.
- Bei derselben ID beziehungsweise demselben Merge-Key mit abweichenden Inhalten bleibt der lokale Datensatz unverändert; der Fall wird als Konflikt protokolliert.
- Neue Datensätze mehrerer Dateien werden gemeinsam in einer atomaren IndexedDB-Transaktion geschrieben.

### Behoben

- Beim iOS-Teilen wird nur noch die eigentliche JSON-Datei übergeben. Der zusätzliche Freigabetext, der in der Dateien-App als separate Textdatei erscheinen konnte, wurde entfernt.

### Technisch

- App-Version auf `4.4.2` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-4-2-20260713a` erhöht.
- IndexedDB-Name `cruisesip_v4` und Datenbankversion `1` bleiben unverändert.
- Barkarte, Paketdaten, Navigation und bestehende lokale Daten bleiben unverändert.

Alle wesentlichen Änderungen an CruiseSip werden hier dokumentiert.

## 4.4.1 – Speichern über die iPhone-Dateien-App

### Neu / verbessert

- Vollbackup, Reiseexport und Backup-Test öffnen auf unterstützten iPhones und iPads jetzt das native Teilen-Menü.
- Über `In Dateien sichern` kann der Zielordner unter `Auf meinem iPhone`, iCloud Drive oder einem eingebundenen Dateidienst bewusst ausgewählt werden.
- Bei Browsern ohne Dateifreigabe bleibt der bisherige direkte JSON-Download als Fallback erhalten.
- Ein abgebrochener Teilen-Dialog wird nicht als erfolgreiches Backup protokolliert.
- Für eine breitere iOS-Kompatibilität wird die JSON-Datei bei Bedarf zusätzlich als teilbare Textdatei mit unveränderter `.json`-Endung angeboten.

### Technisch

- App-Version auf `4.4.1` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-4-1-20260713a` erhöht.
- Keine Änderung an IndexedDB-Name, Datenbankversion, Reisen, Personen, Buchungs-IDs, Barkarte oder Paketstatus.

## 4.4.0 – Vollständige Datensicherung und sichere Wiederherstellung

### Neu

- Vollständiger Offline-Export aller sieben IndexedDB-Stores: Einstellungen, Reisen, Personen, Getränke, Buchungen, Importprotokoll und Barkartenstände.
- Backupformat `CruiseSipFullBackup` mit eigener Formatversion, App-Version, Datenbankversion, Exportzeitpunkt, Geräte-ID, Gerätename und Bestandsübersicht.
- SHA-256-Integritätsprüfung erkennt beschädigte oder veränderte Backupdateien vor dem Import.
- Importvorschau vergleicht lokale Daten und Backupdaten und zeigt Ergänzungen, Dubletten, Konflikte und strukturelle Warnungen.
- Modus `Daten ergänzen`: Fehlende Reisen, Personen und Buchungen werden anhand stabiler IDs ergänzt; vorhandene lokale Datensätze bleiben vorrangig bestehen.
- Personen bleiben geräteunabhängig nutzbar. Buchungen behalten gleichzeitig ihre konsumierende Person und die Geräteherkunft.
- Modus `Vollständig ersetzen`: Alle Stores werden in einer einzigen atomaren IndexedDB-Transaktion ersetzt. Ohne erfolgreichen Abschluss bleibt der bisherige Datenbestand erhalten.
- Vor dem vollständigen Ersetzen ist die exakte Texteingabe `DATEN ERSETZEN` und eine weitere Sicherheitsabfrage erforderlich.
- Die aktuelle Geräte-ID und der aktuelle Gerätename bleiben standardmäßig erhalten. Die Backup-Geräte-ID kann nur über eine klar gekennzeichnete Expertenoption übernommen werden.
- Der Geräteabgleich bleibt bewusst manuell über lokale JSON-Dateien, die über die iPhone-Dateien-App, iCloud Drive oder AirDrop weitergegeben werden können; es erfolgt keine automatische Cloud-Synchronisation.
- Ausführliche Anleitung `docs/ZWEITES_GERAET.md` für die Bereitstellung des gemeinsamen Ausgangsbestands, die Ersteinrichtung eines zweiten Geräts, den laufenden bidirektionalen Abgleich und die sichere Wahl zwischen `Daten ergänzen` und `Vollständig ersetzen`.

### Behoben

- Beim Speichern lokal bearbeiteter Getränkepreise wurde eine nicht definierte Variable verwendet. Der Preis wird jetzt korrekt aus dem Formular gelesen und validiert.
- Offline-Sicherheitsstatus korrigiert: App-Diagnose und Service Worker verwenden wieder dieselbe Cache-Bezeichnung; die fälschliche Anzeige `0/5 Kerndateien` trotz vorhandenem Offline-Cache entfällt.

### Technisch

- IndexedDB-Name `cruisesip_v4` und Datenbankversion `1` bleiben unverändert; bestehende lokale Daten benötigen keine Migration.
- App-Version auf `4.4.0` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-4-0-20260713c` erhöht.
- Keine Änderung an Barkartenstammdaten, Paketdefinitionen, Navigation oder Trackingablauf.

## 4.3.8 – Offline-Sicherheitsstatus im Setup

### Neu

- Rein diagnostische Offline-Prüfung im Setup ergänzt.
- Prüft Home-Bildschirm-/Standalone-Modus, Service-Worker-Unterstützung und aktive Steuerung, aktuellen App-Cache einschließlich Kerndateien sowie die tatsächliche Lese- und Schreibfähigkeit von IndexedDB.
- Zeigt die aktuelle Speicherbelegung an, soweit iOS diese Information bereitstellt.
- Ein Start ohne gemeldete Internetverbindung wird separat als praktischer Offline-Test ausgewiesen.
- Gesamtergebnis unterscheidet konservativ zwischen `Offline bereit`, `Technisch bereit – Installation empfohlen` und `Offline-Vorbereitung prüfen`.

### Technisch

- Diagnose verwendet nur einen temporären IndexedDB-Prüfeintrag, der unmittelbar wieder gelöscht wird.
- Keine Änderung an IndexedDB-Struktur, Reisen, Personen, Buchungen, Barkarte, Paketdaten oder Tracking-Logik.
- App-Version auf `4.3.8` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-8-20260713a` erhöht.

## 4.3.7 – Preis beim Getränkewechsel automatisch aktualisieren

### Verbessert

- Beim Wechsel des Getränks in der Verlaufskorrektur wird der aktuelle Preis aus der lokalen Barkarte sofort in das Preisfeld übernommen.
- Der Paketstatus wird gleichzeitig passend zur ausgewählten Person und deren Getränkepaket neu bestimmt.
- Zusätzliche Absicherung beim Speichern: Wurde das Getränk geändert und der Preis danach nicht bewusst manuell angepasst, wird immer der aktuelle Stammdatenpreis gespeichert.
- Eine manuelle Preisabweichung bleibt für begründete Sonderfälle weiterhin möglich.

### Technisch

- Eigener, gezielter Change-Handler für Person und Getränk im Verlaufsformular; keine globalen Touch-, Click- oder Pointer-Hacks.
- App-Version auf `4.3.7` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-7-20260713a` erhöht.
- Keine Änderung an IndexedDB-Struktur, Barkarte, Paketdaten, Tracking-Erfassung oder Navigation.

## 4.3.6 – Fehlbuchungen direkt im Verlauf korrigieren

### Neu / verbessert

- Bearbeiten öffnet den gewählten Eintrag direkt innerhalb der Verlaufskarte; keine Prompt-Fenster und kein Overlay.
- Person, Getränk, Datum, Uhrzeit, Preis und Paketstatus können korrigiert werden.
- Beim Wechsel von Person oder Getränk werden Barkartenpreis und Paketstatus passend zur aktuellen Barkarte vorgeschlagen und bleiben vor dem Speichern prüfbar.
- Löschen bleibt mit Sicherheitsabfrage sowohl in der normalen Ansicht als auch im Bearbeitungsformular möglich.
- Nach einer Korrektur greifen Tagesübersicht, Analyse, personenbezogene Häufigkeit und Zuletzt-Sortierung unmittelbar auf den aktualisierten Datensatz zu.

### Technisch

- App-Version auf `4.3.6` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-6-20260713a` erhöht.
- Keine Änderung an IndexedDB-Struktur, Barkarte, Paketdaten, Tracking-Erfassung oder Navigation.

## 4.3.5 – Vereinfachte Personenauswahl

### Neu / verbessert

- Separate Karte `Aktive Person` oberhalb der Tracken-Ansicht entfernt.
- Personen-Schnellwechsel ist jetzt die einzige sichtbare Steuerung für die Zielperson einer Buchung.
- Kompakte Kopfzeile `Getränk erfassen für …` zeigt die aktuell ausgewählte Person eindeutig an.
- Zugeordnetes Getränkepaket bleibt direkt in der Kopfzeile sichtbar.
- Anzahl bisheriger Erfassungen bleibt an den jeweiligen Personenbuttons erhalten.
- Interne Personen-ID, reisenspezifische Speicherung, Paketstatus und Tracking-Zuordnung bleiben unverändert.

### Technisch

- App-Version auf `4.3.5` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-5-20260713a` erhöht.
- Keine Änderungen an IndexedDB-Struktur, Formularen, Getränkestammdaten oder Navigation.

## 4.3.4 – PWA-Update-Stabilisierung

- Service-Worker-Registrierung verwendet nun `updateViaCache: none`.
- Aktive Update-Prüfung beim Start, bei Rückkehr in die App und nach Wiederherstellung der Internetverbindung ergänzt.
- Sichtbarer Update-Hinweis mit kontrollierter Aktivierung und anschließendem Neustart ergänzt.
- Manuelle Aktion „Jetzt auf Update prüfen“ im Setup ergänzt.
- Service Worker wird nicht mehr als eigene Offline-Datei gecacht.
- Versionsparameter für CSS und JavaScript verhindern veraltete HTTP-Zwischenspeicherungen.
- Lokale IndexedDB-Daten werden bei Updates nicht gelöscht oder verändert.

## 4.3.3 - Personen-Schnellwechsel

### Neu / verbessert

- Kompakter Personen-Schnellwechsel direkt oberhalb der Getränkekacheln ergänzt.
- Aktive Person wird deutlich hervorgehoben; Name, Initialen und bisherige Anzahl der Erfassungen sind sofort sichtbar.
- Beim Wechsel werden Paketstatus, Nutzungshäufigkeit, Empfehlungen, Sortierung und Zielperson der Getränkekacheln unmittelbar synchron aktualisiert.
- Die zuletzt gewählte Person wird je Reise dauerhaft und ausschließlich lokal gespeichert.
- Wechsel erfolgt ohne vollständigen Neuaufbau der App und erhält die aktuelle Scrollposition der Getränkeliste.

### Technisch

- App-Version auf `4.3.3` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-3-20260713a` erhöht.
- Bestehende Personen-, Tracking-, Such-, Favoriten-, Formular- und Navigationslogik wurde nicht strukturell umgebaut.



## 4.3.2 - Individuelle Sortierung der Getränkekacheln

### Neu / verbessert

- Kompakte Sortierauswahl direkt oberhalb der Getränkekacheln ergänzt.
- Sortieroptionen: `Häufig genutzt`, `Zuletzt genutzt`, `Preis aufsteigend`, `Preis absteigend` und `Alphabetisch`.
- Nutzungsabhängige Sortierungen beziehen sich auf die aktuell ausgewählte Person.
- Gewählte Sortierung wird dauerhaft und ausschließlich lokal im bestehenden Einstellungs-Speicher abgelegt.
- Filter, Suche, Favoriten, Personenwahl und Tracking bleiben unverändert nutzbar.

### Technisch

- App-Version auf `4.3.2` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-2-20260713a` erhöht.
- Sortierung arbeitet ausschließlich auf einer Kopie der gefilterten Getränkeliste und verändert die Stammdatenreihenfolge nicht.


## 4.3.1 - Helle und dunkle Ansicht

### Neu / verbessert

- Im Setup einen direkt antippbaren Wechsler zwischen heller und dunkler Ansicht ergänzt.
- Gewählte Darstellung wird dauerhaft und ausschließlich lokal im bestehenden Einstellungs-Speicher abgelegt.
- Statusleisten- und PWA-Theme-Farbe werden an die gewählte Ansicht angepasst.
- Abstände zwischen den Home-Kacheln `Schnellzugriff`, `Favoriten` und `Zuletzt getrunken` auf einheitlich 12 Pixel gesetzt.
- Bestehende Tracking-, Such-, Favoriten-, Rückgängig-, Formular- und Navigationslogik wurde nicht verändert.

### Technisch

- App-Version auf `4.3.1` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-1-20260713a` erhöht.
- Bereits vorhandene Theme-Einstellung gezielt um eine sichtbare Bedienoberfläche und konsistente explizite Hell-/Dunkel-Styles erweitert.


## 4.3.0 - Tagesübersicht auf der Home-Seite

### Neu / verbessert

- Kompakte Tagesübersicht für den aktuellen Kalendertag auf der Home-Seite ergänzt.
- Barkartenwert wird konservativ nach `im Paket`, `außerhalb des Pakets` und `unklar` getrennt dargestellt.
- Tagesverbrauch wird pro Person mit Anzahl und Barkartenwert aufgeschlüsselt.
- Letzte Erfassung des Tages zeigt Getränk, Person und Zeitpunkt.
- Ohne heutige Buchungen erscheint ein klarer Leerzustand.
- Bestehende Tracking-, Such-, Favoriten-, Rückgängig-, Formular- und Navigationslogik wurde nicht verändert.

### Technisch

- App-Version auf `4.3.0` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-3-0-20260712a` erhöht.
- Tagesübersicht greift ausschließlich lesend auf die vorhandenen lokalen Verlaufsdaten zu.


## 4.2.0 - Tracken-Ansicht

### Neu / verbessert

- Tracken-Ansicht für die schnelle iPhone-Bedienung überarbeitet.
- Getränke werden als große, zweispaltige Kacheln mit deutlich sichtbarem Symbol und Namen dargestellt.
- Kategorie, Barkartenpreis und Paketstatus sind direkt in jeder Getränkekachel sichtbar.
- Favoritenstern bleibt separat antippbar; Favoriten werden zusätzlich optisch hervorgehoben.
- Filter `Alle`, `Empfohlen`, `Favoriten` und `Zuletzt` bleiben im horizontalen Filterband sichtbar und zeigen die jeweilige Trefferzahl.
- `Alle` bleibt links im Filterband; `Empfohlen` bleibt beim Start der Tracken-Ansicht vorausgewählt.
- Die bestehende Such-, Personen-, Tracking-, Rückgängig- und Speicherlogik wurde nicht umgebaut.

### Technisch

- App-Version auf `4.2.0` erhöht.
- Service-Worker-Cache auf `cruisesip-v4-2-0-20260710a` erhöht.
- Keine globalen Touch-/Pointer-Hacks und keine Änderungen an der Formularstruktur.

## 4.1.0 - Auswertungen

### Korrekturen 2026-07-10
- Bottom-Navigation erneut stabilisiert: Tracken verwendet keine eigene 100dvh-App-Shell mehr; die Getränkeliste erhält stattdessen eine berechnete Innenhöhe oberhalb der festen Navigation.
- Karte „Aktive Person“ in der Tracken-Ansicht weiter verkleinert, damit mehr Getränke sichtbar sind.
- Service-Worker-Cache auf `cruisesip-v4-1-0-20260710f` erhöht.


### Korrekturen
- Untere Navigation erneut stabilisiert: `Home | Tracken | Verlauf | Analyse | Setup` ist jetzt auf allen Seiten viewport-fixiert und wird nicht mehr an die Tracken-Scrollhoehe gebunden.
- Tracken-Getraenkeliste behaelt ihren eigenen Scrollbereich; die Navigation bleibt dennoch exakt an derselben Bildschirmposition wie auf Home/Analyse.
- Rueckgaengig-Hinweis und Toast bleiben oberhalb der fixen Navigation.
- Service-Worker-Cache auf `cruisesip-v4-1-0-20260710e` erhoeht.


### Korrekturen
- Untere Hauptnavigation in der Tracken-Ansicht fixiert: Die Leiste bleibt an exakt derselben Position am unteren Rand der App-Shell, auch wenn die Getränkeliste scrollt oder nach dem Tracken neu gerendert wird.
- Vorheriger Tracken-Navigationsfix mit `100svh` wurde durch eine viewport-fixierte Navigation ersetzt.
- Navigationslabel von „Heute“ auf „Home“ angepasst.
- Service-Worker-Cache auf `cruisesip-v4-1-0-20260710d` erhöht.


### Neu / erweitert

- Analyse-Dashboard ergänzt: eine antippbare Kachel pro Person für Restbetrag zum Paketpreis oder rechnerische Ersparnis nach Break-even.
- Personen-Detailansicht in der Analyse ergänzt: Paketpreis, Paketwert, Restbetrag/Ersparnis, Bordrechnung außerhalb Paket, unklare Getränke und vollständiger Getränkeverlauf der Person.
- Zurück-Button aus der Personen-Detailansicht zurück zum Analyse-Dashboard ergänzt.
- Auswertung pro Person erweitert: Es wird jetzt klar angezeigt, welcher rechnerische Paketwert bis zum Paketpreis noch fehlt.
- Pro Person wird die voraussichtliche Bordrechnung für eindeutig nicht im Paket enthaltene Getränke separat ausgewiesen.
- Unklare Getränke werden pro Person weiterhin getrennt ausgewiesen und nicht als Ersparnis gerechnet.
- Artikelverwaltung in der Barkarten-Seite ergänzt: Artikel suchen, Preis ändern und Paketstatus je Getränkepaket manuell setzen.
- Ein Artikel kann in mehreren Paketen gleichzeitig als enthalten markiert werden, z. B. Erwachsenenpaket und Kinderpaket.
- Optional können bestehende Einträge der aktiven Reise beim Speichern eines Artikels auf den neuen Preis/Paketstatus aktualisiert werden.

### Technisch

- Service-Worker-Cache auf `cruisesip-v4-1-0-20260710c` erhöht.
- Basis bleibt die stabile Eingabefeld-Version; keine erneuten Formular-/Touch-Experimente.

### Neu

- Auswertungsseite erweitert: Zeitraumfilter Heute / Gestern / Reise.
- Paket-Break-even pro Person ergänzt: eindeutig im Paket enthaltener Barkartenwert wird konservativ gegen den hinterlegten Paketpreis gerechnet.
- Statusübersicht ergänzt: im Paket enthalten, nicht enthalten und unklar werden getrennt ausgewiesen.
- Analyse „Außerhalb Paket / unklar“ ergänzt, damit kostenrelevante oder zu prüfende Getränke schnell sichtbar sind.
- Detailtabellen erweitert: Pro Getränk nun bis zu 20 Einträge, Lieblingsgetränke bis zu 10 Einträge.

### Technisch

- App-Version auf 4.1.0 erhöht.
- Service-Worker-Cache auf `cruisesip-v4-1-0-20260710a` erhöht.
- Keine Änderungen an den zuletzt funktionierenden Eingabefeldern/Formularen.

## 4.0.0 - stabile Basis vor 4.1.0

### Korrekturen

- Rollback-Basis: Wieder auf die Eingabefeld-Version `CruiseSip_v4_0_0_input_layer_hard_fix.zip` zurückgebaut, da diese auf dem iPhone funktionierende Eingaben hatte.
- Getränkeliste im Tracker korrigiert: Die technische Begrenzung auf 80 Einträge wurde entfernt; `Alle` zeigt wieder die vollständige Barkarte mit 233 Getränken.
- Filterlogik beibehalten: `Alle` steht links im Filterband, `Empfohlen` bleibt vorausgewählt.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709t` erhöht.

- Eingabefelder-Hardfix: Globale Fokus-/Touch-Hilfslogik entfernt, Formularwerte werden während der Eingabe zwischengespeichert und Formular-Cards verwenden keinen Blur-/Backdrop-Layer mehr. Dadurch sollen Reise-, Geräte-, Personen- und Suchfelder wieder nativ antippbar bleiben.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709q` erhöht.

- Eingabefeld-Fokus grundlegend bereinigt: keine globalen Touch-/Pointer-Workarounds mehr; Formularfelder und Track-Suche bekommen eine native Fokus-Absicherung ohne `preventDefault`.
- Track-Suche wieder als Suchbox mit Eingabefeld aufgebaut, sodass auch der freie Bereich der Suchleiste das Feld fokussiert.
- Filterband bleibt horizontal scrollbar; `Alle` steht ganz links, `Empfohlen` bleibt die vorausgewählte Logik.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709p` erhöht.

- Filterband angepasst: `Alle` steht jetzt ganz links, `Empfohlen` bleibt weiterhin vorausgewählt und sortiert die Empfehlungen anhand Favoriten, zuletzt erfasster Getränke und bisheriger Nutzung.
- Eingabefelder in Reise-, Geräte- und Personenformularen technisch bereinigt: Labels sind nun von den Eingabeelementen getrennt, Eingabefelder liegen explizit oberhalb anderer Touch-Flächen und bleiben nativ antippbar.
- Track-Suche vereinfacht: Das Suchfeld ist jetzt selbst die vollständige antippbare Fläche; Klick in den freien Bereich öffnet die Tastatur.
- Rückgängig-Dock angepasst: Nach dem Erfassen bleibt `Rückgängig` sichtbar, verschwindet aber automatisch nach 3 Sekunden.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709o` erhöht.

- Eingabefelder und Suchfeld wieder auf native iPhone-/Safari-Bedienung zurückgeführt: keine globalen Pointer-/Touch-Hacks mehr. Die Track-Suche ist jetzt ein echtes Label-Feld, sodass auch der freie Bereich der Suchleiste die Tastatur öffnet.
- Filterband korrigiert: `Empfohlen`, `Favoriten`, `Zuletzt`, `Alle` und weitere Kategorien sind in einem eigenen horizontal scrollbareren Band.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709n` erhöht.

- Erfassen-Ansicht erneut vereinfacht: CruiseSip-Kopfzeile dient jetzt als fester Seitenkopf mit Tracken-Hinweis, die Kategorieauswahl bleibt ein eigenes horizontales Band und die Artikel erscheinen darunter als kompakte einspaltige Liste.
- Horizontales Seiten-Scrolling nochmals unterbunden; vertikales Scrollen findet nur in der Artikelliste statt.
- Favoritenstern links neben jedem Artikel bestätigt und Artikel-/Symbolgrößen weiter reduziert.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709j` erhöht.

- Erfassen-Ansicht erneut korrigiert: horizontales Seitenscrollen wird unterbunden. Die Kategorieauswahl ist jetzt ein eigenes, bildschirmbreites horizontales Band; nur dieses Band scrollt links/rechts. Der Bereich darunter scrollt vertikal.
- Getränkekacheln kompakter gemacht; Symbole verkleinert und Favoritenstern klar links neben dem Artikel platziert.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709i` erhöht.

- Scrollverhalten in der Erfassen-Ansicht korrigiert: CruiseSip-Kopfbereich, Tracken-Header, Personenauswahl, Suche und Kategoriechips bleiben stehen; nur die Getränkeliste unterhalb der Kategorien scrollt. Inhalte laufen dadurch nicht mehr hinter Suchleiste oder Logo.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709h` erhöht.

- Erfassen-Ansicht für iPhone überarbeitet: größere Suchleiste, 16px Eingabeschrift gegen Safari-Zoom, stabilere Darstellung ohne ungewolltes Verkleinern sowie eine neue Schnellwahl mit großen Kacheln, Symbolen, Favoriten und intelligenten Empfehlungen aus den bisher erfassten Getränken.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709g` erhöht.

- Speicherlogik erneut gehärtet: Reise- und Personenformulare sind jetzt wieder echte `<form>`-Elemente mit Submit-Handler. Zusätzlich bleibt ein direkter Touch-/Click-Fallback auf den Speicherbuttons aktiv. Dadurch funktionieren Speichern, Bearbeiten und Neuanlage auch dann, wenn Safari/iOS einzelne Events anders auslöst.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709f` erhöht.

- Zentrale Speicherlogik für Reisen und Personen neu aufgebaut: Reise bearbeiten, Person anlegen und Person bearbeiten hängen nicht mehr von nativen Formular-Submits ab. Die Felder werden nun über eindeutige Eingabe-IDs gelesen und zusätzlich über direkte Touch-/Click-Handler gespeichert.
- ZIP-Struktur korrigiert: Der Root-Ordner heißt wieder eindeutig `CruiseSip/` und ist direkt für GitHub Desktop/GitHub Pages vorbereitet.
- Service-Worker-Cache auf `cruisesip-v4-0-0-20260709f` erhöht, damit Safari/PWA die korrigierten Dateien neu lädt.

- Personenverwaltung erneut korrigiert: Der Button `Person speichern` nutzt jetzt zusätzlich zur Formular-Submit-Logik eine direkte Speicheraktion. Dadurch wird das Speichern auch dann ausgelöst, wenn iPhone/Safari den nativen Submit nicht zuverlässig verarbeitet.
- Nach dem Speichern einer Person wird aktiv geprüft, ob der Datensatz in IndexedDB vorhanden ist und der aktiven Reise zugeordnet wurde. Fehler werden künftig sichtbar gemeldet statt still zu verpuffen.
- Anzeige der Personenliste robuster gemacht: Die aktive Reise-ID wird zentral aufgelöst, damit neu gespeicherte Personen nicht wegen einer abweichenden oder fehlenden Reisezuordnung unsichtbar bleiben.

- Reiseverwaltung korrigiert: Bearbeitete Reisen werden jetzt zuverlässig gespeichert. IndexedDB-Schreibvorgänge warten auf den vollständigen Transaktionsabschluss, bevor die Ansicht neu geladen wird.
- Personenverwaltung korrigiert: Personen können jetzt zuverlässig angelegt und bearbeitet werden. Der Speichervorgang wartet ebenfalls auf den vollständigen IndexedDB-Transaktionsabschluss.
- Paketpreis-Feld bei Personen korrigiert: Es akzeptiert nun deutsche Kommaschreibweise, ohne dass iPhone/Safari den Formularversand blockiert.
- Beim Speichern einer Reise oder Person erscheint jetzt eine sichtbare Bestätigung.
- Aktionsbuttons verhindern jetzt konsequent unbeabsichtigte Standardaktionen im Formularumfeld.

### Neu strukturiert

- Projektstruktur vollständig neu aufgebaut:
  - `css/`
  - `js/`
  - `data/`
  - `icons/`
  - `assets/`
  - `docs/`
- App-Version bleibt bewusst bei `4.0.0`, bis diese Hauptversion vollständig stabil ist.
- README, ROADMAP, OFFLINE und technische Dokumentation ergänzt.

### Redesign

- Komplettes iPhone-orientiertes Redesign.
- Bottom Navigation im nativen App-Stil.
- Card-basiertes Layout.
- SF-Pro-nahe Systemtypografie über Apple-Systemfonts.
- Dark Mode über Systempräferenz.
- Safe-Area-Unterstützung für iPhone.
- Einhändige Bedienung priorisiert.
- Dezente Animationen und reduzierte Bewegung bei entsprechender Systemeinstellung.
- Haptisches Feedback wird ausgelöst, sofern der Browser es unterstützt.

### Onboarding

- Erststart-Onboarding ergänzt:
  - Offline-Einrichtung
  - Hinweis „Zum Home-Bildschirm“
  - Geräteprüfung
  - Offline-Status
  - Barkartenprüfung
  - Backup-Test
  - Reiseanlage

### Dashboard

- Dashboard neu aufgebaut:
  - Heute
  - Gesamtreise
  - Ersparnis
  - zu zahlender Betrag
  - Schnellzugriff
  - Favoriten
  - zuletzt getrunkene Getränke

### Tracking

- Tracking neu aufgebaut.
- Personenauswahl als farbige Chips.
- Getränkesuche ohne Fokusverlust.
- Kategorien, Favoriten und zuletzt verwendete Getränke integriert.
- Rückgängig dauerhaft sichtbar über fixierten Dock.
- Paketstatus wird pro Person und Getränk angezeigt.

### Verlauf

- Verlauf als Timeline umgesetzt.
- Personen farbig unterscheidbar.
- Filter ergänzt:
  - Heute
  - Gestern
  - Reise
- Einträge können bearbeitet und gelöscht werden.

### Reiseverwaltung

- Reisen können angelegt, bearbeitet, archiviert und gelöscht werden.
- Löschen nur mit Sicherheitsabfrage durch Eingabe von `LÖSCHEN`.

### Geräteverwaltung und Zusammenführen

- Geräte-ID und Gerätename sichtbar.
- Export je Reise.
- Import und Zusammenführen mehrerer Geräte.
- Dublettenerkennung über Geräte-ID und ursprüngliche Eintrags-ID.
- Mehrfachimporte desselben Exports werden übersprungen.
- Importprotokoll ergänzt.

### Auswertungen

- Auswertungen ergänzt nach:
  - Person
  - Getränk
  - Kategorie
  - Tag
  - Reise
  - Lieblingsgetränke
- Ersparnis wird konservativ berechnet: Nur `included` zählt als Ersparnis; `unclear` zählt nicht als Ersparnis.

### Barkartenverwaltung

- Aktuelle Barkarte sichtbar.
- Import strukturierter Barkarten per JSON oder CSV.
- Preisvergleich ergänzt.
- Neue Getränke werden erkannt.
- Paketänderungen werden erkannt.
- PDF-Auswertung bewusst nicht offline integriert, da keine externen Bibliotheken genutzt werden.

### Migration

- Beim ersten Start wird eine Migration aus der bisherigen v3-IndexedDB (`gt_db_v3`) versucht.

## 3.1.0

- Neues App-Icon mit Kreuzfahrtschiff und Cocktailglas.
- Visueller Feinschliff mit maritimem Farbschema.
- Apple Touch Icon und Favicons ergänzt.
- Reise-Dashboard ergänzt.
- Rückgängig-Leiste dauerhaft sichtbar.
- Sucheingabe stabilisiert.
- Import weiter dublettensicher auch bei mehrfachen Exporten eines Zweitgeräts.
