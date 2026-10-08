# Update v0.7.4 – Absolvierte Trainings nachträglich zuordnen

## Bedienung

- In Planung ein erledigtes Training am Griff auf die passende geplante Zykluseinheit ziehen. Das Training zählt sofort als absolvierte Einheit.
- Auf die Zykluskarte ziehen, um eine passende offene Einheit aus allen Wochen dieses Zyklus auszuwählen.
- Alternativ „Zuordnen“ beim Training, „Training zuordnen“ am Zyklus oder „Absolviertes Training zuordnen“ an einer geplanten Einheit verwenden. In der Historie gibt es ebenfalls „Zyklus zuordnen“.
- „Zugeordnet“ öffnet die bestehende Verbindung. Mit „Zuordnung lösen“ wird die Zykluseinheit wieder offen; das Training bleibt gespeichert.

## Daten und Schutz

Keine Trainingskopien: Nur die Verknüpfung des vorhandenen Historieneintrags wird geändert. Satzwerte, Übungen, Notizen, Datum und eine vorhandene Referenz auf eine zusätzliche Planung bleiben erhalten. Dadurch taucht eine erledigte Zusatzplanung nicht erneut als offen auf.

Zuordnung nur zum selben Trainingstag, zu einem offenen Platz in einem nicht abgeschlossenen oder vorgemerkten Zyklus und ab dessen Startdatum. Bereits belegte oder aktuell laufende Plätze sind geschützt. Verbindungen zu gelöschten Zyklen können durch eine neue gültige Zuordnung ersetzt werden. Neue Doppelbelegungen durch gleichzeitige Zuordnungen auf verschiedenen Geräten werden als Abgleichkonflikt behandelt.

## Prüfung

78 automatisierte Tests bestanden, einschließlich Maus-/Touch-Zuordnung, Auswahl über mehrere Wochen, Wiederlösen, Speicherung und Wiederladen, Backups, fehlgeschlagenem Speichern, Datenerhalt, Schutz ungültiger Ziele und Konflikten beim Geräteabgleich. Im lokalen Browser mit Beispieldaten überprüft: Ziehen auf eine geplante Einheit und eine Zykluskarte, Auswahl, Zähleränderung und Wiederlösen mit unveränderten Satzwerten.

## Veröffentlichung

Release v0.7.4, freigegeben am 7. Oktober 2026. Geänderte Laufzeitdateien: app.js, core.js, cycles.js, planning.js, styles.css, sync-core.js, index.html, pwa.js, sw.js. Versionsnummer und Offline-Cache: v0.7.4. Die Vorschau mit Beispieldaten gehört nicht zum Veröffentlichungspaket.
