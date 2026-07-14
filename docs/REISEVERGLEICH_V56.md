# Reiseübergreifende Auswertung ab v5.6.0

Unter **Analyse** kann zwischen **Aktuelle Reise** und **Reisevergleich** gewechselt werden.

Der Reisevergleich arbeitet ausschließlich mit den lokal auf dem Gerät gespeicherten Daten. Er verändert keine Reise, Buchung oder Barkartenversion.

## Verglichen werden

- Barkartenwert und Getränkeanzahl je Reise
- Reisedauer und Durchschnitt je Reisetag
- eindeutig im Paket enthaltener Wert
- Kosten außerhalb des Pakets
- unklare Paketstatus
- hinterlegte Paketkosten und konservatives Paketergebnis
- häufigste Getränke und Kategorien
- gleich geschriebene Personennamen über mehrere Reisen

Unterschiedliche Barkartenversionen werden nicht vereinheitlicht. Maßgeblich bleibt der in der jeweiligen Buchung gespeicherte Preis.

## CSV-Export

Der Export erzeugt eine Excel-taugliche CSV mit einer Zeile je Reise. Personen mit identischer Schreibweise werden nur in der Bildschirmstatistik reiseübergreifend zusammengeführt; die Reisedaten selbst bleiben getrennt.
