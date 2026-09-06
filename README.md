# Qek to the Future — Camping-Reisetagebuch

Eine Handy-App, in der du besuchte Campingplätze festhältst, sie Kategorie für
Kategorie mit Sternen bewertest und Fotos, Notizen und den Standort dazulegst.
Alles bleibt auf deinem Gerät.

![Rot-weiß, Retro-Look](assets/icon.png)

## Was die App kann

- **Plätze eintragen** — Name tippen, die App sucht den Platz über
  OpenStreetMap und trägt Adresse, Koordinaten und Land automatisch ein.
  Alternativ per GPS („Ich stehe gerade hier").
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
| Ortssuche | Nominatim (OpenStreetMap), entprellt und gedrosselt |
| Schriften | Bungee (Logo), Archivo (Oberfläche), Space Mono (Zahlen) |

Es werden bewusst **keine kostenpflichtigen Google-APIs** verwendet. Der
vollständige Google-Eintrag wird per Deeplink in Google Maps geöffnet — das
kostet nichts und braucht kein Konto.

## Loslegen

```bash
npm install
npx expo start
```

Dann in der App **Expo Go** (Play Store / App Store) den QR-Code scannen — die
App startet direkt auf deinem Handy.

Weitere Befehle:

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
  services/             Ortssuche, Fotos, Sicherung, externe Links
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

## Veröffentlichung im Play Store

Wenn die App später in den Play Store soll:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

Das erzeugt eine `.aab`-Datei zum Hochladen in die Google Play Console. Nötig
sind dafür ein Google-Play-Entwicklerkonto (einmalig 25 US-Dollar), eine
Datenschutzerklärung und die Angaben zur Datensicherheit — dort ist
anzugeben, dass die App keine Daten sammelt oder überträgt.

## Datenschutz

Alle Einträge, Bewertungen und Fotos liegen ausschließlich lokal auf dem Gerät.
Es gibt kein Konto und keinen Server. Nach außen geht nur die Ortssuche bei
OpenStreetMap, wenn du nach einem Platz suchst.
