export type Place = {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  /** Herkunft der Geo-Daten, z. B. "osm:node/123456". */
  sourceId: string | null;
  country: string | null;
  /** ISO-Datum (YYYY-MM-DD) des Anreisetags. */
  visitedFrom: string | null;
  visitedTo: string | null;
  nights: number | null;
  pricePerNight: number | null;
  notes: string | null;
  favorite: boolean;
  /** Würde ich wieder hinfahren? null = noch nicht beantwortet. */
  wouldReturn: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type Rating = {
  placeId: number;
  categoryKey: string;
  /** 1-5 Sterne. Ein fehlender Eintrag bedeutet "übersprungen". */
  stars: number;
};

export type Photo = {
  id: number;
  placeId: number;
  uri: string;
  caption: string | null;
  createdAt: string;
  sortOrder: number;
};

/** Ein Platz samt allem, was zur Anzeige gebraucht wird. */
export type PlaceWithDetails = Place & {
  ratings: Record<string, number>;
  tags: string[];
  photos: Photo[];
  /** Gewichtete Gesamtnote 1-5, null wenn noch nichts bewertet wurde. */
  overall: number | null;
  photoCount: number;
};

/** Kompakte Variante für die Listenansicht. */
export type PlaceSummary = Place & {
  overall: number | null;
  ratedCount: number;
  photoCount: number;
  coverPhoto: string | null;
  tags: string[];
};

export type CategorySetting = {
  key: string;
  weight: number;
  enabled: boolean;
  order: number;
};
