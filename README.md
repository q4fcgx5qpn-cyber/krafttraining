# Krafttraining v0.7.2

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

## Wochenplanung ab v0.7.2

Die zweite Seite des Zyklus-Popups zeigt Wochen mit einzelnen Tagesfeldern. Oben einen Trainingstag wählen und mit + am gewünschten Datum einsetzen. Offene Einheiten mit × entfernen, per Griff verschieben oder über „Verschieben“ ein Datum wählen. „Rückgängig“ setzt die letzten Änderungen an Einheiten zurück. Erst „Zyklus speichern“ übernimmt den Entwurf. Absolvierte Einheiten bleiben gesperrt.

Der erste Aufruf erzeugt einen Vorschlag. Danach bleiben manuelle Änderungen auch beim Zurückgehen zu den Grunddaten erhalten. Geänderter Wochenumfang ist ein Ziel; zusätzliche Einheiten können mit + ergänzt werden. Einheiten außerhalb eines verkürzten Zeitraums bleiben zum Zuordnen sichtbar.
