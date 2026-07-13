# Changelog

Alle wesentlichen Änderungen an CruiseSip werden hier dokumentiert.

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
