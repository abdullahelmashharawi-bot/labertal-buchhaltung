# Prüfanleitung für Claude

Diese Datei beschreibt, wie Claude die Buchhaltung von Elektrotechnik Labertal (Abdullah El Mashharawi) prüft – wöchentlich per geplanter Aufgabe oder wenn Abdullah in der App auf „Jetzt prüfen lassen“ tippt.

## Zugriff
- **Daten:** Supabase-Connector, Projekt `labertal-buchhaltung` (id `skhgixekbfnfctkbxjrr`), Tabelle `public.docs(col, id, data jsonb, updated_at)`.
  Sammlungen (`col`): `vouchers` (Belege), `sales` (Rechnungen/Angebote), `contacts`, `bank`, `assets`, `trips`, `ustva` (gemeldete Monate), `cfg` (`company`, `github`, `check`).
- **Belegbilder:** privates Repo `abdullahelmashharawi-bot/labertal-belege`, Datei `dateien/<file.id>` (ohne Endung; JPEG, PNG oder PDF). Zum Ansehen klonen und die Datei mit Read öffnen (PDF ggf. mit pdftoppm in ein Bild umwandeln).
- **Den GitHub-Token in `cfg/github` nie ausgeben, kopieren oder verwenden.**

## Ablauf
1. **Neue Belege auslesen:** `select id, data from docs where col='vouchers' and data->>'status'='claude'`.
   Für jeden Beleg das Bild aus `labertal-belege` öffnen und auslesen: Firma, Belegnummer, Datum, Fälligkeit, bezahlt ja/nein (Kassenbon mit Karte/bar = bezahlt), Positionen je Steuersatz (Brutto), Kategorie, kurze Notiz.
   `data.hint` enthält, was Abdullah beim Fotografieren selbst eingegeben hat (Betrag, Kategorie, Zahlart, Notiz) – bevorzugen.
   - **Sicher** (alles klar lesbar, Summe passt): direkt buchen. Felder: `vendor, number, date, dueDate, items:[{cat,vat,gross,net,tax}], gross, status ('bezahlt'|'offen'), paidDate, payMethod, payments:[{date,amount,method}], note, readBy:'claude', readAt`.
     Netto/Steuer je Position: `net = round(gross/(1+vat/100),2)`, `tax = gross-net`.
   - **Unsicher:** Status `claude` lassen, `data.question` mit einer kurzen Frage an Abdullah setzen und im Bericht nennen.
   Kategorien (Schlüssel): Fuel (Tanken), MaterialsGoods (Material), SmallParts (Werkzeug), MotorVehicle (Kfz-Reparatur/Wäsche), MotorVehicleInsurance, MotorVehicleTax, EntertainmentExpenses (Bewirtung), OfficeSupplies, LicencesConcessions (Software, Lexware/Haufe), Telecommunication, InsurancesContributions, AssociationContributions, Seminar, Advertising, WasteDisposalExpenses, OtherExpenditure, PrivateWithdrawal (privat, 0 %), VatPrepayments (Finanzamt USt). Für bekannte Firmen die bisherige Kategorie nehmen (`select data->>'vendor', data->'items'->0->>'cat' ...`).
2. **Doppelte suchen:** gleiche Firma + gleiche Belegnummer, oder gleicher Betrag + gleiches Datum. Gleicher `files[].hash` = sicher doppelt. Nicht selbst löschen, sondern im Bericht nennen (Ausnahme: exakt gleiche Datei-Hash bei Status `claude` → löschen).
3. **Plausibilität:** MwSt.-Satz passt zur Kategorie (Versicherungen 0 %, Kraftstoff 19 %), Beträge > 0, Datum nicht in der Zukunft, Tankbelege ohne Kfz-Bezug, Bewirtung ohne Notiz (Anlass/Personen fehlen).
4. **Offene Posten:** überfällige Rechnungen (`sales`, status `offen`, `dueDate` < heute), offene Ausgaben, Angebote ohne Antwort.
5. **Fristen:** Umsatzsteuer-Voranmeldung des Vormonats bis zum 10. – gemeldet, wenn `ustva/<JJJJ-MM>` existiert. Ist-Versteuerung: Umsatz bei Zahlung, Vorsteuer nach Belegdatum.
6. **Sicherung:** `cfg/company.lastBackupAt` älter als 30 Tage → erinnern.
7. **Bericht speichern:** `cfg/check` = `{ at, summary (1–2 Sätze), findings: [{text, level:'info'|'warn'|'bad', ref?}], booked: <Anzahl>, waiting: <Anzahl> }`. Die App zeigt das auf der Startseite.
8. Abdullah eine kurze Zusammenfassung schicken (auf Deutsch, einfache Worte).

## Regeln
- Festgeschriebene Rechnungen (`sales` mit `finalizedAt`) nie ändern (GoBD).
- Nichts löschen außer exakt doppelten Dateien im Status `claude`.
- Schreiben per `insert ... on conflict (col,id) do update set data = excluded.data` bzw. `update docs set data = data || '{...}'::jsonb where col='vouchers' and id='...'`.
