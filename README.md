# Qek to the Future — Camping-Reisetagebuch

Eine Handy-App, in der du besuchte Campingplätze festhältst, sie Kategorie für
Kategorie mit Sternen bewertest und Fotos, Notizen und den Standort dazulegst.
Alles bleibt auf deinem Gerät.

![Rot-weiß, Retro-Look](assets/icon.png)

## Was die App kann

- **Plätze finden** — drei Wege, damit auch kleine Plätze auftauchen:
  Namenssuche über die Campingplatz-Daten von OpenStreetMap; einen Ort
  eintippen und alle Plätze im Umkreis von 25 km auflisten lassen; oder
  „Plätze in meiner Nähe" per GPS. Adresse, Koordinaten und Land trägt die
  App selbst ein, bekannte Merkmale (Strom, Hunde, Wohnwagen) kommen gleich
  als Chips mit.
- **Wenn ein Platz gar nicht eingetragen ist** — Standort selbst auf der
  Karte antippen, die Adresse wird dazu nachgeschlagen.
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
direkt ab („alles, was hier als Campingplatz eingetragen ist") und liefert
damit auch kleine, namenlose und abgelegene Plätze. Beide laufen parallel,
der Ausfall eines Dienstes kippt die Suche nicht.

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

### Weg 2: Als richtige App (APK, dauerhaft)

Erzeugt eine Installationsdatei, die dauerhaft auf dem Handy bleibt — mit
eigenem Icon, ohne Rechner, ohne Expo Go.

```bash
npm install -g eas-cli
eas login                                  # kostenloses Expo-Konto
eas build --platform android --profile preview
```

Der Build läuft auf Expos Servern (im kostenlosen Tarif enthalten) und dauert
etwa 10–20 Minuten. Am Ende gibt es einen Link und einen QR-Code: auf dem
Handy öffnen, die `.apk` herunterladen und installieren. Android fragt dabei
einmal nach der Erlaubnis, Apps aus unbekannten Quellen zu installieren.

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
npm run typecheck   # TypeScript prüfen
npx expo start --android
```

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
