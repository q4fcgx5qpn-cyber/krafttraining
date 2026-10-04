# Update v0.7.3 – Vorwerte und Zyklusbeginn

## Korrekturen

- Vorwerte stammen aus der letzten abgeschlossenen Ausführung derselben Übung. Übungsname und Erfassungsart müssen übereinstimmen; eine alte Kennung allein reicht nicht mehr. Groß-/Kleinschreibung und zusätzliche Leerzeichen sind unerheblich. Gleich benannte Übungen dürfen Vorwerte aus anderen Trainingstagen übernehmen.
- Beim Ersetzen einer Übung durch Umbenennen werden alte, aus Backups importierte Vorwerte nicht weitergetragen. Ohne passende Historie bleiben die Felder leer.
- Ein Zyklus zählt erst ab seinem Startdatum. Vorher gestartete freie Trainings bleiben außerhalb des Zyklus. Direkte Starts von Zykluseinheiten und das Aktivieren eines Folgezyklus sind vor dem Startdatum gesperrt.
- Bereits zu früh verknüpfte Trainings bleiben vollständig in Historie und Kalender, zählen aber nicht als absolvierte Zykluseinheiten. Die betroffenen Plätze sind wieder offen und bearbeitbar.
- Beim Verschieben eines Zyklus ab dieser Version bleibt die zeitliche Zuordnung bereits korrekt absolvierter Einheiten erhalten. Neue Einheiten berücksichtigen das neue Startdatum.

## Prüfung

69 automatisierte Tests bestanden, darunter gezielte Regressionstests für Clean/Swing, Schrägbank/KH-Bankdrücken, Übungen mit wiederverwendeten Kennungen, den Tag vor Zyklusbeginn und den ersten Tag, verschobene Zyklen, alte falsche Zuordnungen, Offline-Updates und Geräteabgleich. Lokale Browserprüfung mit separaten Testdaten durchgeführt.

## Daten und Grenzen

Keine gespeicherten Gewichte, Wiederholungen oder historischen Übungen werden umgeschrieben. Bereits falsch bestätigte Leistungswerte können nicht automatisch rekonstruiert werden. Für ältere Einträge ohne gespeicherte Startgrenze wird das vorhandene Zyklusstartdatum verwendet. Falls ein Zyklus bereits vor diesem Update nachträglich verschoben wurde, lässt sich seine damalige Startgrenze nicht immer eindeutig wiederherstellen.

## Veröffentlichung

Release v0.7.3, freigegeben am 4. Oktober 2026.
Geänderte Laufzeitdateien gegenüber v0.7.2: core.js, app.js, cycles.js, index.html, pwa.js, sw.js. Versionsnummer und Offline-Cache sind auf v0.7.3 gesetzt.
