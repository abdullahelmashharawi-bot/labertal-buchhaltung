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
   - **Sicher** (alles klar lesbar, Summe passt): direkt buchen. Felder: `vendor, number, date, dueDate, items:[{cat,vat,gross,net,tax}], gross, status ('bezahlt'|'offen'), paidDate, payMethod, payments:[{date,amount,method}], note, readBy:'claude', readAt`, dazu `archiveLabel` = kurze Bezeichnung für den Dateinamen wie Abdullah sie nutzt (Tankbeleg → `Tankstelle`, sonst Firma oder Artikel, z. B. `Bauhaus`, `Abisolierzange`). Die **Ablage-Nummer** (`archive`) vergibt die App selbst – nicht setzen.
     - **Ablage-Regeln (von Abdullah festgelegt, 24.11.2026):** Vergebene Nummern werden **nie** geändert oder verschoben – Abdullah schreibt sie auf den Papierbeleg. Ein nachträglich eingetragener (vergessener) Beleg bekommt immer die **nächste freie laufende Nummer** (höchste vergebene + 1), auch wenn sein Datum älter ist; niemals eine schon vergebene Nummer. Eine PDF mit mehreren Seiten bleibt **eine** Datei; `NNNN_1von2_…`/`NNNN_2von2_…` nur, wenn es zwei getrennte Blätter/PDFs sind, die zusammengehören. Vor dem Ablegen prüfen, dass die Nummer im Ordner noch nicht existiert.
     Netto/Steuer je Position: `net = round(gross/(1+vat/100),2)`, `tax = gross-net`.
   - **Unsicher:** Status `claude` lassen, `data.question` mit einer kurzen Frage an Abdullah setzen und im Bericht nennen.
   Kategorien (Schlüssel): Fuel (Tanken), MaterialsGoods (Material), SmallParts (Werkzeug), MotorVehicle (Kfz-Reparatur/Wäsche), MotorVehicleInsurance, MotorVehicleTax, EntertainmentExpenses (Bewirtung), OfficeSupplies, LicencesConcessions (Software, Lexware/Haufe), Telecommunication, InsurancesContributions, AssociationContributions, Seminar, Advertising, WasteDisposalExpenses, OtherExpenditure, PrivateWithdrawal (privat, 0 %), VatPrepayments (Finanzamt USt). Für bekannte Firmen die bisherige Kategorie nehmen (`select data->>'vendor', data->'items'->0->>'cat' ...`).
2. **Doppelte suchen – nur melden, wenn 100 % sicher:** Kandidaten sind gleiche Firma + gleiche Belegnummer, gleicher Betrag + gleiches Datum oder gleicher `files[].hash`. Ein Kandidat gilt erst als doppelt, wenn du **beide Belegbilder geöffnet** und verglichen hast: **Tankstelle/Firma, Datum, Uhrzeit, Betrag (und Belegnummer)** stimmen alle überein. Dann im Bericht nennen (Firma, Datum, Uhrzeit, Betrag), damit Abdullah nachsehen kann. Stimmt etwas nicht überein (z. B. andere Uhrzeit), ist es **kein** Doppel – nicht melden. Belege mit Status `pruefen` (alte Lexware-Entwürfe) zählen steuerlich nicht und werden nur als Info genannt.
   **Nie selbst löschen** – Abdullah löscht selbst oder sagt ausdrücklich, dass Claude löschen soll. (Einzige Ausnahme: exakt gleiche Datei-Hash bei einem neuen Beleg im Status `claude` → diesen löschen.)
3. **Plausibilität:** MwSt.-Satz passt zur Kategorie (Versicherungen 0 %, Kraftstoff 19 %), Beträge > 0, Datum nicht in der Zukunft, Tankbelege ohne Kfz-Bezug, Bewirtung ohne Notiz (Anlass/Personen fehlen).
4. **Offene Posten:** überfällige Rechnungen (`sales`, status `offen`, `dueDate` < heute), offene Ausgaben, Angebote ohne Antwort.
5. **Fristen:** Umsatzsteuer-Voranmeldung des Vormonats bis zum 10. – gemeldet, wenn `ustva/<JJJJ-MM>` existiert. Ist-Versteuerung: Umsatz bei Zahlung, Vorsteuer nach Belegdatum.
6. **Bank & Wiederkehrendes:** Bankumsätze älter als 30 Tage → an N26-CSV erinnern. Regelmäßige Ausgaben (Versicherung, Kfz-Steuer, Abos) prüfen: fehlt ein erwarteter Beleg, im Bericht nennen.
6b. **Ordner abgleichen (statt Abdullah am PC):** Wenn die Werkzeuge für seinen PC da sind (`device_list_dir`, `device_commit_files`), fehlende Ablage-Dateien selbst nach `Z:\Firma\Ausgaben\<archive.dir ohne "Ausgaben/">\<names>` schreiben (Datei aus `labertal-belege/dateien/<files[].id>`, Bilder vorher zu PDF). Nur schreiben, was im Ordner fehlt – nie etwas überschreiben oder umbenennen. Danach `cfg/company.archive.lastSync` = jetzt, `lastSyncRoot` = `Firma (durch Claude)`.
7. **Sicherung:** `cfg/company.lastBackupAt` älter als 30 Tage → erinnern.
8. **Bericht speichern:** `cfg/check` = `{ at, summary (1–2 Sätze), findings: [{text, level:'info'|'warn'|'bad', ref?}], booked: <Anzahl>, waiting: <Anzahl> }`. Die App zeigt das auf der Startseite.
9. Abdullah eine kurze Zusammenfassung schicken (auf Deutsch, einfache Worte).

## Regeln
- Festgeschriebene Rechnungen (`sales` mit `finalizedAt`) nie ändern (GoBD).
- Nichts löschen außer exakt doppelten Dateien im Status `claude` – oder wenn Abdullah es ausdrücklich verlangt.
- Nur melden, was sicher ist; Vermutungen als Frage formulieren, nicht als „bitte korrigieren“.
- Schreiben per `insert ... on conflict (col,id) do update set data = excluded.data` bzw. `update docs set data = data || '{...}'::jsonb where col='vouchers' and id='...'`.
