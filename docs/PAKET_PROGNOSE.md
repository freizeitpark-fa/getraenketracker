# Paket-Amortisation und Verbrauchsprognose

CruiseSip 4.5.4 ergänzt die Reiseanalyse um eine konservative Paket-Amortisation je Person.

## Berechnungsgrundlage

- Als Paketwert zählen ausschließlich Buchungen mit dem eindeutigen Status `included`.
- Nicht enthaltene und unklare Buchungen werden nicht auf den Paketpreis angerechnet.
- Der Amortisationsgrad entspricht `eindeutiger Paketwert / Paketpreis`.
- Der tatsächliche Break-even ist der erste Reisetag, an dem der kumulierte eindeutige Paketwert den Paketpreis erreicht.
- Die Hochrechnung verwendet den durchschnittlichen Paketwert je bisher verstrichenem Reisetag. Tage ohne Buchung werden mitgerechnet.
- Vor Reisebeginn, bei fehlendem Reisezeitraum, unklarem Paket oder fehlendem Paketpreis wird keine scheinbar genaue Prognose ausgegeben.

## Status

- **Paket amortisiert:** Der eindeutige Paketwert erreicht oder übersteigt den Paketpreis.
- **Voraussichtlich amortisiert:** Die Hochrechnung bis zum Reiseende erreicht den Paketpreis.
- **Voraussichtlich nicht amortisiert:** Die Hochrechnung bleibt unter dem Paketpreis.
- **Keine belastbare Prognose:** Reise noch nicht begonnen oder notwendige Paket-/Reisedaten fehlen.

Alle Berechnungen erfolgen lokal aus den vorhandenen Reise-, Personen- und Buchungsdaten. IndexedDB, Backup und Geräteabgleich werden nicht verändert.

## Navigation

Beim Wechsel über Home, Tracken, Verlauf, Analyse oder Setup wird die jeweilige Zielseite automatisch am Seitenanfang geöffnet. Auf der Tracken-Seite wird zusätzlich die intern scrollende Getränkeliste auf den Anfang gesetzt.
