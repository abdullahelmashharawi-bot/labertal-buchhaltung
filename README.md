# Labertal Buchhaltung

Die eigene Buchhaltungs-App von Elektrotechnik Labertal: Belege fotografieren, Rechnungen und Angebote schreiben (mit E-Rechnung), Umsatzsteuer-Voranmeldung und EÜR, Fahrtenbuch, Bank-Abgleich mit N26 – Ersatz für Lexware Office.

**App:** https://abdullahelmashharawi-bot.github.io/labertal-buchhaltung/

## So ist es aufgebaut
- **App:** dieses öffentliche Repo (GitHub Pages). Enthält keine Daten.
- **Daten** (Belege, Rechnungen, Kontakte, Bank, Fahrten): Supabase-Projekt `labertal-buchhaltung` (Frankfurt), Tabelle `public.docs`. Nur das Inhaber-Konto darf lesen und schreiben (Row Level Security).
- **Belegbilder:** privates Repo `labertal-belege`, Ordner `dateien/`. Das ist gleichzeitig die Sicherung, und Claude kann die Fotos dort lesen.
- **Claude** prüft einmal pro Woche alles (siehe `PRUEFUNG.md`) und auf Knopfdruck in der App („Jetzt prüfen lassen“).

## Einmalig einrichten
1. App öffnen → **„Erstes Mal? Konto einrichten“** → E-Mail und Code (mind. 6 Zeichen) festlegen.
2. Bestätigungs-Mail von Supabase öffnen, Link antippen (die Seite danach darf einen Fehler zeigen), dann in der App anmelden.
3. GitHub-Token für `labertal-belege` eintragen (Fine-grained, Contents: Read and write). Danach übernimmt die App alle Daten aus Lexware.

## Aufs Handy
- **iPhone (Safari):** Teilen-Knopf → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“

## Token abgelaufen?
Neuen Token wie oben erstellen → App → Mehr → Einstellungen → „Token erneuern“. Es geht nichts verloren.
