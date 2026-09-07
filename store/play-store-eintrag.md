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

## Texte

Alle Texte liegen als reine Textdateien unter `store/texte/` — dort öffnen,
alles markieren, kopieren, in die Play Console einfügen. Die Zeichengrenzen
sind geprüft.

| Datei | Feld in der Console | Länge |
| --- | --- | --- |
| `texte/app-name.txt` | App-Name | 23 / 30 |
| `texte/beschreibung-kurz.txt` | Kurzbeschreibung | 66 / 80 |
| `texte/beschreibung-vollstaendig.txt` | Vollständige Beschreibung | 2693 / 4000 |
| `texte/release-notes-v1.1.0.txt` | Neuerungen in dieser Version | 378 / 500 |

### Zum App-Namen

Der Name im Store und der Name auf dem Startbildschirm sind zwei getrennte
Dinge. Auf dem Handy steht weiterhin schlicht **Reise-Tagebuch** (aus
`app.json`); im Store darf der Eintrag anders lauten.

Empfohlen ist **„Reise-Tagebuch: Camping"**. Der Grund: Der Store findet
Apps auch über den Namen, und „Reise-Tagebuch" allein trifft nicht das Wort,
nach dem gesucht wird. Wer schlicht **„Reise-Tagebuch"** bevorzugt, kann das
ohne Weiteres nehmen — die Auffindbarkeit leidet, die App bleibt dieselbe.

### Warum die Beschreibung so aufgebaut ist

In der Trefferliste und über der Beschreibung sind nur die **ersten zwei bis
drei Zeilen** sichtbar, alles Weitere erst nach „Mehr". Deshalb steht ganz
vorn keine Aufzählung, sondern die Situation, die jeder kennt: Der Platz war
gut, der Name ist weg. Die Abschnitte darunter sind mit ● abgesetzt, weil die
Console keine Formatierung erlaubt — Überschriften in Großbuchstaben und ein
Aufzählungszeichen sind alles, was zur Gliederung bleibt.

## Grafiken

| Was | Format | Status |
| --- | --- | --- |
| App-Symbol | 512 × 512 PNG | aus `assets/icon.png` skalieren |
| Feature-Grafik | 1024 × 500 PNG | ✅ `store/feature-grafik-1024x500.png` |
| Screenshots Handy | mind. 2, empfohlen 4–8 | ✅ `store/screenshots/handy/` |
| Screenshots Tablet | optional | ✅ `store/screenshots/tablet-*/` |

### Screenshots

Liegen fertig unter `store/screenshots/` — je sechs Stück in drei Größen:

| Ordner | Auflösung | Feld in der Console |
| --- | --- | --- |
| `screenshots/handy/` | 1080 × 2338 | Smartphone |
| `screenshots/tablet-7-zoll/` | 1200 × 1920 | Tablet (7 Zoll) |
| `screenshots/tablet-10-zoll/` | 1600 × 2560 | Tablet (10 Zoll) |

Die Bilder sind aus der laufenden App aufgenommen, mit drei angelegten
Plätzen: Tagebuch-Liste, ein Bewertungsschritt, die Zusammenfassung mit
Gesamtnote, ein Platz im Detail, die Statistik und der Info-Bereich.

**Tablet-Screenshots sind keine Pflicht.** Ohne sie wird die App auf
Tablets nur schlechter gefunden; die Veröffentlichung blockiert das nicht.
Die Dateien liegen trotzdem bereit.

**Eigene Screenshots sind besser**, sobald echte Reisen mit eigenen Fotos
drin sind — Fotos machen im Store den größten Unterschied. Aufnehmen auf
dem Handy mit *Leiser + Ein/Aus* gleichzeitig; die hier abgelegten Bilder
zeigen, welche Bildschirme sich lohnen.

---

## Formular „Datensicherheit"

Google fragt das beim Einrichten ab. Für diese App lauten die Antworten:

| Frage | Antwort |
| --- | --- |
| Erhebt oder teilt die App Nutzerdaten? | **Nein** |
| Verwendet die App eine Werbe-ID? | **Nein** |
| Werden Daten bei der Übertragung verschlüsselt? | Ja (HTTPS) |
| Können Nutzer das Löschen ihrer Daten anfordern? | Nicht zutreffend — es werden keine Daten erhoben |

**Belegt für die Werbe-ID:** Im Projekt steckt keine Werbe-, Analyse- oder
Tracking-Bibliothek, und im erzeugten Android-Manifest taucht die
Berechtigung `com.google.android.gms.permission.AD_ID` nirgends auf. Nur
wer diese Berechtigung deklariert — auch unbeabsichtigt über eine
Bibliothek — muss hier „Ja" antworten.

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

## Berechtigungen der App

Was die fertige App anfordert und wofür:

| Berechtigung | Wofür |
| --- | --- |
| `INTERNET` | Platzsuche und Kartenkacheln |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | nur für „Plätze in meiner Nähe“ |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | Fotos auswählen und im App-Ordner ablegen |
| `CAMERA` | Foto direkt aufnehmen |
| `VIBRATE` | leichtes Rütteln beim Setzen der Sterne |

`RECORD_AUDIO` und `SYSTEM_ALERT_WINDOW` bringt Expos Vorlage mit; beide
sind über `blockedPermissions` in `app.json` entfernt, weil die App weder
Ton aufnimmt noch Fenster über andere Apps legt. Ohne das stünde im Store
bei den Zugriffen „Audio aufnehmen“.

## Inhaltseinstufung

Fragebogen ausfüllen, Kategorie **Referenz, Nachrichten oder Bildung** bzw.
**Dienstprogramm**. Alle Fragen nach Gewalt, Sexualität, Drogen, Glücksspiel
und nutzergeneriertem Austausch mit **Nein** beantworten. Ergebnis wird
voraussichtlich **USK 0 / PEGI 3**.

---

## Zielgruppe

„Zielgruppe und Inhalte" → Altersgruppe **18 und älter** wählen. Damit
entfallen die zusätzlichen Auflagen für Kinder-Apps.
