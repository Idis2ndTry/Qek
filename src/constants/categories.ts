import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Category = {
  /** Stabiler Schlüssel - wird so in der Datenbank gespeichert. */
  key: string;
  label: string;
  /** Frage im Bewertungs-Durchlauf. */
  question: string;
  /** Kurzer Hinweis unter der Frage. */
  hint: string;
  icon: IoniconName;
  /** Standardgewicht für die Gesamtnote (in den Einstellungen änderbar). */
  defaultWeight: number;
};

/**
 * Die Bewertungskategorien in der Reihenfolge des Durchklick-Flows.
 * Reihenfolge, Gewichtung und Aktiv-Status kommen aus den Einstellungen -
 * diese Liste ist die Vorgabe beim ersten Start.
 */
export const CATEGORIES: Category[] = [
  {
    key: 'size',
    label: 'Größe & Stellplatz',
    question: 'Wie viel Platz hattet ihr?',
    hint: 'Stellplatzgröße, Abstand zum Nachbarn, Rangieren mit Gespann',
    icon: 'resize-outline',
    defaultWeight: 1,
  },
  {
    key: 'sanitary',
    label: 'Sanitäranlagen',
    question: 'Wie waren Duschen und WC?',
    hint: 'Sauberkeit, Zustand, Warmwasser, Wartezeiten',
    icon: 'water-outline',
    defaultWeight: 1.5,
  },
  {
    key: 'food',
    label: 'Essen & Verpflegung',
    question: 'Wie war die Verpflegung?',
    hint: 'Restaurant, Imbiss, Brötchenservice, Einkaufsmöglichkeit',
    icon: 'restaurant-outline',
    defaultWeight: 1,
  },
  {
    key: 'price',
    label: 'Preis-Leistung',
    question: 'War der Preis fair?',
    hint: 'Übernachtung, Kurtaxe, Strom, Duschmünzen und versteckte Kosten',
    icon: 'pricetag-outline',
    defaultWeight: 1.5,
  },
  {
    key: 'entertainment',
    label: 'Unterhaltung & Freizeit',
    question: 'Was gab es zu erleben?',
    hint: 'Spielplatz, Pool, Animation, Ausflüge in der Nähe',
    icon: 'happy-outline',
    defaultWeight: 1,
  },
  {
    key: 'location',
    label: 'Lage & Umgebung',
    question: 'Wie schön war die Lage?',
    hint: 'Aussicht, Wasser, Wald, Anbindung, Wege',
    icon: 'map-outline',
    defaultWeight: 1.5,
  },
  {
    key: 'quiet',
    label: 'Ruhe & Atmosphäre',
    question: 'Konntet ihr entspannen?',
    hint: 'Lärmpegel, Nachtruhe, Stimmung auf dem Platz',
    icon: 'moon-outline',
    defaultWeight: 1,
  },
  {
    key: 'supply',
    label: 'Ver- & Entsorgung',
    question: 'Wie war die Infrastruktur?',
    hint: 'Strom, Frischwasser, Chemie-WC, Mülltrennung',
    icon: 'flash-outline',
    defaultWeight: 1,
  },
  {
    key: 'service',
    label: 'Personal & Service',
    question: 'Wie war das Team vor Ort?',
    hint: 'Freundlichkeit, Erreichbarkeit, Check-in, Hilfsbereitschaft',
    icon: 'people-outline',
    defaultWeight: 1,
  },
  {
    key: 'connectivity',
    label: 'WLAN & Empfang',
    question: 'Wie war die Verbindung?',
    hint: 'WLAN-Qualität, Mobilfunknetz, Kosten für Internet',
    icon: 'wifi-outline',
    defaultWeight: 0.5,
  },
];

export const CATEGORY_BY_KEY: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

/** Was die einzelnen Sterne bedeuten - erscheint im Bewertungs-Flow. */
export const STAR_LABELS: Record<number, string> = {
  1: 'Mangelhaft',
  2: 'Geht so',
  3: 'Solide',
  4: 'Richtig gut',
  5: 'Spitzenklasse',
};

/** Vorschläge für Schnell-Merkmale, die pro Platz angehakt werden können. */
export const SUGGESTED_TAGS = [
  'Am Wasser',
  'Hunde erlaubt',
  'Stromanschluss',
  'Sanitär modern',
  'Kinderfreundlich',
  'Ruhig gelegen',
  'Pool',
  'Brötchenservice',
  'Wohnwagen-tauglich',
  'Ganzjährig offen',
  'Bar/Restaurant',
  'Waschmaschine',
  'Wanderwege',
  'Fahrradverleih',
  'Angeln',
  'Stellplatz befestigt',
];
