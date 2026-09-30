# Krafttraining v0.7.0

Mobile Trainings-App mit flexiblen Trainingsblöcken, Supersätzen, Historie, JSON-Backups und optionalem privaten Geräteabgleich.

## Start und Update

Die veröffentlichte HTTPS-Adresse öffnen. Bei älterer Version „Update laden“ auswählen. Nach „Bereit für Offline-Start“ ist die App offline nutzbar. Die ZIP enthält die Projektdateien; direktes Öffnen einer lokalen index.html unterstützt keinen Offline-Cache.

## Erster Geräteabgleich

1. Zuerst auf dem Gerät mit den aktuellen Trainingsdaten ein JSON-Backup exportieren.
2. Unter Verwalten mit dem persönlichen App-Konto anmelden. Das ist nicht das Supabase-Datenbankpasswort.
3. Dieses Gerät verbinden. Ist die Cloud leer, den aktuellen Stand erstmals in die Cloud sichern.
4. Auf dem zweiten Gerät dasselbe Konto verwenden, Gerät verbinden und den Cloud-Stand übernehmen. Vorher lokale Daten sichern; die Übernahme ersetzt dortige Daten.

Die Anmeldung allein überträgt keine Trainingsdaten. Der Abgleich startet erst nach Verbindung des Geräts. Er läuft bei aktiver App mit Netz, beim Wiederöffnen und nach lokalen Änderungen. Laufendes Training, offene Dialoge und Planbearbeitung verschieben den Abgleich bis zum Abschluss. Vor dem Gerätewechsel unter Verwalten „Synchronisiert“ kontrollieren. Offline erfasste Änderungen warten auf die nächste Verbindung bei geöffneter App.

Änderungen an verschiedenen Datensätzen werden zusammengeführt. Unterschiedliche Änderungen am selben Trainingstag, Block oder Training erfordern eine Auswahl. Vor der Entscheidung beide Stände exportieren. Ein Import trennt die bisherige Sync-Zuordnung und erfordert erneute Einrichtung. Abmelden lässt lokale Daten auf diesem Gerät zurück.

## Speicherung

Trainingsdaten werden lokal und nach bewusster Aktivierung im angemeldeten Supabase-Konto gespeichert. Row Level Security trennt die Konten. Im Frontend ist nur ein öffentlicher Publishable Key enthalten. Backups enthalten keine Zugangstokens und keine Sync-Metadaten.

## Technik

Statisches HTML/CSS/JavaScript. Supabase-SDK lokal gebündelt, somit keine CDN-Abhängigkeit für den Offline-Start. Die Datenbankeinrichtung liegt im vollständigen Projekt unter supabase/schema.sql. Dienstschlüssel und Datenbankpasswörter gehören niemals ins Frontend.

## Backup in Safari
Backups werden ausschließlich durch Antippen eines Backup-Buttons heruntergeladen. Erstabgleich und Konfliktauflösung starten keine automatischen Downloads. Lokalen und Cloud-Stand bei Konflikten einzeln sichern. Die Meldung „Download gestartet“ bestätigt nur den Start; die JSON-Datei anschließend in Downloads prüfen.

## Flexible Planung ab v0.7.0
Am Griff ⠿ offene Einheiten auf einen Kalendertag ziehen; auf Touchgeräten den Griff verwenden. Durch Antippen lässt sich ein beliebiges Datum wählen, auch außerhalb der sichtbaren Woche. „Noch ohne Termin“ entfernt die Terminzuordnung. Zusätzliche Trainingstage lassen sich unabhängig von Blöcken beliebig oft einfügen; dabei wird der aktuelle Übungsplan kopiert.

Blöcke lassen sich verschieben oder löschen. Beim Verschieben wandern nur offene, bereits terminierte Einheiten um den gleichen Abstand. Abgeschlossene Trainings bleiben an ihrem tatsächlichen Datum in der Historie. Eine gerade laufende Einheit muss zuerst beendet werden. Vorbereitete Blöcke behalten bei Aktivierung ihr gewähltes Startdatum. Alle Geräte auf v0.7.0 aktualisieren, bevor die neue Planung bearbeitet wird.
