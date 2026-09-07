# Play-Store-Eintrag — Reise-Tagebuch

Alles zum Abtippen bzw. Kopieren für die Google Play Console.
Die Zeichengrenzen sind eingehalten.

---

## App-Details

| Feld | Wert |
| --- | --- |
| App-Name (max. 30) | `Reise-Tagebuch` |
| Paketname | `de.qektothefuture.reisetagebuch` |
| Kategorie | Reisen & Lokales |
| Tags | Camping, Reise, Tagebuch |
| Kostenlos / Kostenpflichtig | Kostenlos |
| Enthält Werbung | Nein |
| In-App-Käufe | Nein |

> Der Paketname lässt sich nach der ersten Veröffentlichung **nie wieder
> ändern**. Er ist bereits gesetzt und passt.

---

## Kurzbeschreibung (max. 80 Zeichen)

```
Campingplätze festhalten, ehrlich bewerten und beim nächsten Mal wiederfinden.
```

*(77 Zeichen)*

---

## Vollständige Beschreibung (max. 4000 Zeichen)

```
Dein persönliches Camping-Reisetagebuch.

Halte fest, wo du mit Wohnwagen, Wohnmobil oder Zelt gestanden hast – und
finde beim nächsten Mal wieder, wo es sich wirklich gelohnt hat.

BEWERTEN OHNE AUFWAND
Nach jedem Platz klickst du dich einmal durch zehn kurze Fragen: Größe des
Stellplatzes, Sanitäranlagen, Essen, Preis-Leistung, Unterhaltung, Lage,
Ruhe, Ver- und Entsorgung, Personal und WLAN. Eine Frage pro Bildschirm,
fünf große Sterne, fertig. Was dich nicht interessiert, überspringst du.

EINE NOTE, DIE ZU DIR PASST
Aus deinen Sternen entsteht eine gewichtete Gesamtnote. Sanitär, Preis und
Lage zählen stärker, WLAN weniger. Übersprungene Kategorien fließen gar
nicht ein – wer das Internet nicht bewertet, wird dafür auch nicht
abgestraft.

PLÄTZE FINDEN, AUCH DIE KLEINEN
Tipp den Namen ein oder einfach nur den Ort: Die App durchsucht die
Campingplatz-Daten von OpenStreetMap und zeigt dir auch die kleinen,
namenlosen Plätze in der Umgebung – mit Entfernung und Ausstattung. Oder
lass dir per GPS zeigen, was gerade in deiner Nähe liegt. Fehlt ein Platz,
trägst du ihn über die Adresse oder direkt auf der Karte selbst ein.

DEIN TAGEBUCH
Zu jedem Platz gehören deine eigenen Zeilen, Fotos aus der Galerie oder
direkt aus der Kamera, Reisedaten, der Preis pro Nacht und Merkmale wie
"Am Wasser" oder "Hunde erlaubt". Auf einer Karte siehst du alle Ziele auf
einen Blick, die Nadeln färben sich nach deiner Note.

DEINE REISEBILANZ
Wie viele Nächte warst du unterwegs? Was hast du ausgegeben? Welcher Platz
war der beste? Und worauf solltest du beim nächsten Mal besonders achten?
Die Statistik beantwortet das auf einen Blick.

TEILEN
Einen gelungenen Platz empfiehlt man gern weiter. Ein Tipp auf "Teilen"
erzeugt eine fertige Nachricht mit Note, Einzelbewertungen und Kartenlink –
für WhatsApp, Mail oder was du sonst nutzt.

DEINE DATEN BLEIBEN BEI DIR
Kein Konto, keine Anmeldung, kein Server, keine Werbung. Alle Einträge,
Bewertungen und Fotos liegen ausschließlich auf deinem Gerät. Damit nichts
verloren geht, kannst du jederzeit eine Sicherungsdatei erstellen und sie
später wieder einlesen.

Kartendaten von OpenStreetMap.

Entwickelt aus dem eigenen Wohnwagen heraus.
Rückmeldungen gern über Instagram: @Qek_to_the_Future
```

*(rund 2200 Zeichen)*

---

## Grafiken

| Was | Format | Status |
| --- | --- | --- |
| App-Symbol | 512 × 512 PNG | aus `assets/icon.png` skalieren |
| Feature-Grafik | 1024 × 500 PNG | ✅ `store/feature-grafik-1024x500.png` |
| Screenshots Handy | mind. 2, empfohlen 4–8 | selbst aufnehmen (siehe unten) |

### Screenshots aufnehmen

Mindestens zwei, besser vier bis acht. Empfohlene Reihenfolge, weil sie die
App in der Nutzungsreihenfolge zeigt:

1. **Tagebuch-Liste** mit drei, vier eingetragenen Plätzen
2. **Bewertungs-Durchlauf** — ein Kategorie-Bildschirm mit gesetzten Sternen
3. **Zusammenfassung** mit Gesamtnote
4. **Platz-Detail** mit Karte und Fotos
5. **Karte** mit mehreren farbigen Nadeln
6. **Statistik**

Vorher ein paar echte Plätze mit Fotos eintragen — leere Bildschirme wirken
im Store unfertig.

---

## Formular „Datensicherheit"

Google fragt das beim Einrichten ab. Für diese App lauten die Antworten:

| Frage | Antwort |
| --- | --- |
| Erhebt oder teilt die App Nutzerdaten? | **Nein** |
| Werden Daten bei der Übertragung verschlüsselt? | Ja (HTTPS) |
| Können Nutzer das Löschen ihrer Daten anfordern? | Nicht zutreffend — es werden keine Daten erhoben |

**Begründung, falls nachgefragt wird:** Alle Eingaben bleiben in einer
lokalen Datenbank auf dem Gerät. Es gibt keinen Server des Anbieters, kein
Konto und keine Analyse. Die Suchanfragen an OpenStreetMap enthalten nur den
Suchbegriff; sie werden nicht gespeichert und nicht dem Nutzer zugeordnet.

> Der Standortzugriff ist **einmalig zur Suche** und wird nicht gespeichert.
> Im Formular unter „Standort" daher **nicht** als erhobene Datenart
> angeben — er verlässt das Gerät nur als Koordinatenpaar an
> OpenStreetMap zur Umkreissuche und wird dort nicht gespeichert.

---

## Datenschutzerklärung

Pflichtfeld. Die fertige Seite liegt unter `docs/datenschutz.html`.

**So bekommst du eine URL dafür (kostenlos, 2 Minuten):**

1. GitHub-Repository öffnen → **Settings** → **Pages**
2. Bei *Source* **Deploy from a branch** wählen
3. Branch: `main` (oder dein Branch), Ordner: **/docs** → **Save**
4. Nach ein paar Minuten ist die Seite erreichbar unter:
   `https://idis2ndtry.github.io/Qek/datenschutz.html`

Diese Adresse trägst du in der Play Console unter *Datenschutzerklärung* ein.

Anschrift und E-Mail sind eingetragen. Unter `docs/impressum.html` liegt
zusätzlich ein Impressum, das über dieselbe Adresse erreichbar ist:
`https://idis2ndtry.github.io/Qek/impressum.html`

In der Play Console gehört die Kontakt-E-Mail außerdem unter
*Store-Präsenz → Store-Eintrag → Kontaktdaten*.

---

## Inhaltseinstufung

Fragebogen ausfüllen, Kategorie **Referenz, Nachrichten oder Bildung** bzw.
**Dienstprogramm**. Alle Fragen nach Gewalt, Sexualität, Drogen, Glücksspiel
und nutzergeneriertem Austausch mit **Nein** beantworten. Ergebnis wird
voraussichtlich **USK 0 / PEGI 3**.

---

## Zielgruppe

„Zielgruppe und Inhalte" → Altersgruppe **18 und älter** wählen. Damit
entfallen die zusätzlichen Auflagen für Kinder-Apps.
