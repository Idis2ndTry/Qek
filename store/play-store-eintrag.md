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
