# Krafttraining v0.5.0

Mobile Trainings-App mit frei bearbeitbaren Trainingstagen, Supersätzen, Satzprotokoll, Historie und JSON-Backups.

## Start

In Safari über die GitHub-Pages-Adresse öffnen und bei Bedarf zum Home-Bildschirm hinzufügen. Nach der Meldung **Bereit für Offline-Start** kann die App ohne Netz erneut geöffnet werden. Auf dem eigenen iPhone vor dem ersten Training im Flugmodus prüfen.

Trainingsdaten werden ausschließlich lokal im Browser gespeichert. Es gibt keine Anmeldung innerhalb der App und keine Cloud-Synchronisierung. Regelmäßig unter **Verwalten → Backup exportieren** sichern. Beim Wechsel von einer anderen Webadresse das Backup in der neuen App importieren.

## Hosting

Statische Dateien ohne Build-Schritt. In GitHub unter **Settings → Pages** die Quelle **Deploy from a branch**, den Branch **main** und **/(root)** auswählen. Der Upload umfasst App-Dateien und Ausgangspläne, keine persönlichen Trainingseinträge oder Backups.

Offline-Caches sind auf dieses Projektverzeichnis beschränkt. Aktualisierte Versionen werden vorbereitet und erst nach Bestätigung über **Update laden** aktiviert, solange noch eine alte App-Instanz geöffnet ist.

## Trainingsplanung

Unter Planung einen Block mit drei Durchläufen anlegen. Offene Einheiten können vorgezogen und optional terminiert werden. Folgeblöcke übernehmen die aktuellen Pläne als eigene Kopie. Historie, Blöcke und Termine sind im JSON-Backup enthalten.
