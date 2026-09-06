# Qek to the Future — Camping-Reisetagebuch

Eine Handy-App, in der du besuchte Campingplätze festhältst, sie Kategorie für
Kategorie mit Sternen bewertest und Fotos, Notizen und den Standort dazulegst.
Alles bleibt auf deinem Gerät.

![Rot-weiß, Retro-Look](assets/icon.png)

## Was die App kann

- **Plätze finden** — die Ergebnisliste enthält ausschließlich
  Campingplätze, nie Orte. Drei Wege laufen dafür nebeneinander: die
  Namenssuche, dieselbe Suche noch einmal mit „Campingplatz" davor (so
  heißen die Plätze in der Karte meist — wer nur „Timmeler Meer" eingibt,
  bekäme sonst den See), und die Umkreissuche um den besten Treffer, die
  auch namenlose und winzige Plätze liefert. Dazu „Plätze in meiner Nähe"
  per GPS. Adresse, Koordinaten und Land trägt die App selbst ein, bekannte
  Merkmale (Strom, Hunde, Wohnwagen) kommen gleich als Chips mit.
- **Wenn ein Platz nicht dabei ist** — unter jeder Trefferliste steht
  „Dein Platz ist nicht dabei?". Dahinter: Standort selbst auf der Karte
  antippen (die Adresse wird nachgeschlagen), weiter weg suchen, oder den
  Platz ganz ohne Standort anlegen.
- **Durchklick-Bewertung** — zehn Kategorien, eine Frage pro Bildschirm,
  fünf große Sterne. Kategorien lassen sich überspringen.
- **Gewichtete Gesamtnote** — Sanitär, Preis und Lage zählen anderthalbfach,
  WLAN nur halb. Übersprungene Kategorien fließen nicht ein.
- **Eigener Tagebuch-Text** pro Platz.
- **Fotos** aus der Galerie oder direkt aus der Kamera, mit Vollbildansicht.
- **Standort & Google** — Karte in der App (OpenStreetMap), dazu ein Knopf, der
  den vollständigen Google-Maps-Eintrag mit Fotos, Öffnungszeiten und
  Google-Bewertungen öffnet. Plus Route und Websuche.
- **Reisedaten** — An- und Abreise, Nächte werden berechnet, Preis pro Nacht.
- **Merkmale** als Chips („Am Wasser", „Hunde erlaubt", …), eigene möglich.
- **Karte** mit allen Plätzen als farbige Nadeln, die Farbe zeigt die Note.
- **Statistik** — Nächte, Ausgaben, Lieblingsplatz, Stärken je Kategorie.
- **Sicherung** — Export als JSON (wahlweise mit eingebetteten Fotos) und
  Wiederherstellung.

## Technik

| Bereich | Wahl |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, TypeScript |
| Navigation | expo-router (dateibasiert) |
| Datenbank | expo-sqlite, lokal auf dem Gerät |
| Karten | Leaflet + OpenStreetMap in einer WebView — kein API-Schlüssel nötig |
| Ortssuche | Nominatim (Orte, Adressen) und Overpass (Campingplätze), entprellt und gedrosselt |
| Schriften | Bungee (Logo), Archivo (Oberfläche), Space Mono (Zahlen) |

Es werden bewusst **keine kostenpflichtigen Google-APIs** verwendet. Der
vollständige Google-Eintrag wird per Deeplink in Google Maps geöffnet — das
kostet nichts und braucht kein Konto.

Warum zwei Suchdienste: Nominatim ist eine Textsuche und findet einen
Campingplatz nur bei fast exaktem Namenstreffer. Overpass fragt die Karte
direkt ab („alles, was in diesem Umkreis als Campingplatz eingetragen ist")
und liefert damit auch kleine, namenlose und abgelegene Plätze.

Entscheidend ist, dass die Quellen **entkoppelt** laufen
(`campsiteSearch.ts`): Nominatim antwortet in unter einer Sekunde und füllt
die Liste sofort, die Umkreissuche ergänzt später. Würden beide gemeinsam
abgewartet, sähe man sekundenlang nichts — und beim Weitertippen würde alles
verworfen, bevor je ein Treffer erscheint. Fällt eine Quelle aus, bleibt die
andere nutzbar.

Die dritte Quelle ist ein Trick gegen Nominatims Schwäche: Es sucht nur im
eingetragenen Namen. Der Platz am Timmeler Meer heißt in der Karte
„Campingplatz Timmeler Meer" — die Eingabe „Timmeler Meer" trifft daher den
See. Die App schickt deshalb zusätzlich `Campingplatz <Begriff>` und
`Camping <Begriff>` los und führt alle Treffer zusammen.

Overpass-Abfragen sind bewusst in der ausgeschriebenen Form mit einzelnen
node/way/relation-Zeilen und ohne Wert-Regex formuliert — Kurzformen wie
`nwr` versteht nicht jeder Mirror. Schlägt POST fehl, wird GET versucht;
fünf Server werden der Reihe nach durchprobiert.

Overpass wird bewusst nur mit `around:`-Abfragen benutzt. Die laufen über
einen räumlichen Index und antworten in ein bis zwei Sekunden; eine
landesweite Namenssuche per Regex wäre um Größenordnungen teurer und läuft
auf den öffentlichen Servern regelmäßig in den Timeout.

## Aufs Handy bringen

### Weg 1: Zum Ausprobieren (Expo Go, 10 Minuten)

Voraussetzung: [Node.js](https://nodejs.org) auf dem Rechner, Handy und
Rechner im selben WLAN.

```bash
npm install
npx expo start
```

Auf dem Handy die kostenlose App **Expo Go** installieren (Play Store) und
den QR-Code aus dem Terminal scannen. Die App startet sofort. Änderungen am
Code erscheinen live auf dem Handy.

Der Haken: Die App läuft nur, solange der Rechner läuft, und sie hat noch
nicht das eigene Icon.

### Weg 2: Als APK zum Verteilen (für Testgeräte)

Erzeugt eine Installationsdatei, die dauerhaft auf dem Handy bleibt — mit
eigenem Icon, ohne Rechner, ohne Expo Go. Genau richtig, um die App auf
mehreren Testgeräten auszuprobieren.

```bash
npm install                                # WICHTIG: zuerst die Projekt-
                                           # bibliotheken installieren
npm install -g eas-cli
eas login                                  # kostenloses Expo-Konto
eas build --platform android --profile preview
```

Das erste `npm install` ist unverzichtbar — ohne den Ordner `node_modules`
bricht der Build mit „Failed to resolve plugin for module expo-router" ab.
`npm install -g eas-cli` installiert nur das Build-Werkzeug, nicht die
Bausteine des Projekts.

EAS verlangt ein Git-Repository. Beim ZIP-Download fehlt das; EAS bietet
dann von selbst an, `git init` auszuführen und einen ersten Commit
anzulegen — das kann man bestätigen. Fragt es bei späteren Builds nach
uncommitteten Änderungen, ebenfalls bestätigen.

Beim ersten Lauf fragt EAS zweimal nach:

- *„Would you like to automatically create an EAS project?"* → **Yes**
- *„Generate a new Android Keystore?"* → **Yes** (EAS erzeugt und verwahrt
  den Signierschlüssel; nur damit lassen sich später Updates derselben App
  ausliefern)

Der Build läuft auf Expos Servern (im kostenlosen Tarif enthalten) und dauert
etwa 10–20 Minuten. Am Ende gibt es einen Link und einen QR-Code: auf dem
Handy öffnen, die `.apk` herunterladen und installieren. Android fragt dabei
einmal nach der Erlaubnis, Apps aus unbekannten Quellen zu installieren.

Der Download-Link lässt sich weitergeben — für weitere Testgeräte reicht es,
ihn dort im Browser zu öffnen. Alternativ die heruntergeladene `.apk` per
Messenger, Mail oder USB-Kabel auf die anderen Geräte kopieren.

Jeder spätere Build braucht nur noch den einen Befehl; unter
[expo.dev](https://expo.dev) liegen alle Builds mit ihren Links.

### Weg 3: In den Play Store

```bash
eas build --platform android --profile production
```

Das erzeugt eine `.aab`-Datei zum Hochladen in die Google Play Console. Nötig
sind ein Google-Play-Entwicklerkonto (einmalig 25 US-Dollar), eine
Datenschutzerklärung und die Angaben zur Datensicherheit — dort ist
anzugeben, dass die App keine Daten sammelt oder überträgt.

### Weitere Befehle

```bash
npm test            # Tests der Suchlogik (ohne Netz, mit Attrappen)
npm run typecheck   # TypeScript prüfen
npx expo start --android
```

Die Tests in `src/services/__tests__/` decken die Suche ab: Auswertung der
OSM-Antworten, Radius-Erweiterung, Ausweichen auf einen anderen Server,
Zusammenfalten doppelter Einträge und vor allem das Zusammenspiel der
beiden Quellen — dass die schnellen Treffer erscheinen, bevor die langsame
Quelle fertig ist, und dass der Ausfall einer Quelle die andere nicht
mitreißt.

## Aufbau

```
app/                    Bildschirme (expo-router)
  (tabs)/               Tagebuch, Karte, Statistik, Mehr
  place/new.tsx         Platz anlegen mit Ortssuche
  place/[id].tsx        Detailansicht
  place/edit/[id].tsx   Reisedaten, Preis, Merkmale
  rate/[id].tsx         Bewertungs-Durchlauf
src/
  components/           Wiederverwendbare Bausteine im Retro-Stil
  constants/            Bewertungskategorien und Gewichtung
  db/                   SQLite-Schema, Migrationen, Datenzugriff
  services/             Orts- und Campingplatzsuche, Fotos, Sicherung, Links
  theme/                Farben, Schriften, Abstände
  utils/                Datums- und Zahlenformate
```

Die Bewertungskategorien stehen in `src/constants/categories.ts` — dort lassen
sich Fragen, Reihenfolge und Gewichtung ändern.

## Gestaltung

Rot/Weiß, Retro mit modernen Mitteln: warmes Papierweiß als Grund, kräftiges
Signalrot, dicke Konturen und harte Offset-Schatten statt weicher
Weichzeichner — wie aufgeklebte Sticker. Die rot-weiße Markise zieht sich als
Motiv durch alle Kopfbereiche.

## Datenschutz

Alle Einträge, Bewertungen und Fotos liegen ausschließlich lokal auf dem Gerät.
Es gibt kein Konto und keinen Server. Nach außen geht nur die Ortssuche bei
OpenStreetMap, wenn du nach einem Platz suchst.
