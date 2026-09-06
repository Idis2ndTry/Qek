import { getDatabase } from './database';
import type { Photo, Place, PlaceSummary, PlaceWithDetails } from './types';
import { CATEGORIES, type Category } from '@/constants/categories';

type PlaceRow = {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  source_id: string | null;
  country: string | null;
  visited_from: string | null;
  visited_to: string | null;
  nights: number | null;
  price_per_night: number | null;
  notes: string | null;
  favorite: number;
  would_return: number | null;
  created_at: string;
  updated_at: string;
};

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lon: row.lon,
    sourceId: row.source_id,
    country: row.country,
    visitedFrom: row.visited_from,
    visitedTo: row.visited_to,
    nights: row.nights,
    pricePerNight: row.price_per_night,
    notes: row.notes,
    favorite: row.favorite === 1,
    wouldReturn: row.would_return === null ? null : row.would_return === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Gewichteter Durchschnitt der abgegebenen Sterne.
 * Übersprungene Kategorien fließen nicht ein - wer WLAN nicht bewertet,
 * wird dafür auch nicht abgestraft.
 */
export function computeOverall(
  ratings: Record<string, number>,
  categories: Category[] = CATEGORIES,
): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const category of categories) {
    const stars = ratings[category.key];
    if (typeof stars === 'number' && stars > 0) {
      sum += stars * category.defaultWeight;
      weightSum += category.defaultWeight;
    }
  }
  if (weightSum === 0) return null;
  return sum / weightSum;
}

export type NewPlaceInput = {
  name: string;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  sourceId?: string | null;
  country?: string | null;
};

export async function createPlace(input: NewPlaceInput): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO places (name, address, lat, lon, source_id, country, favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      input.name.trim(),
      input.address ?? null,
      input.lat ?? null,
      input.lon ?? null,
      input.sourceId ?? null,
      input.country ?? null,
      now,
      now,
    ],
  );
  return result.lastInsertRowId;
}

export type PlaceUpdate = Partial<
  Pick<
    Place,
    | 'name'
    | 'address'
    | 'lat'
    | 'lon'
    | 'country'
    | 'visitedFrom'
    | 'visitedTo'
    | 'nights'
    | 'pricePerNight'
    | 'notes'
    | 'favorite'
    | 'wouldReturn'
  >
>;

const UPDATE_COLUMNS: Record<keyof PlaceUpdate, string> = {
  name: 'name',
  address: 'address',
  lat: 'lat',
  lon: 'lon',
  country: 'country',
  visitedFrom: 'visited_from',
  visitedTo: 'visited_to',
  nights: 'nights',
  pricePerNight: 'price_per_night',
  notes: 'notes',
  favorite: 'favorite',
  wouldReturn: 'would_return',
};

export async function updatePlace(id: number, patch: PlaceUpdate): Promise<void> {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;

  const db = await getDatabase();
  const assignments: string[] = [];
  const values: SQLiteValue[] = [];

  for (const [key, value] of entries) {
    assignments.push(`${UPDATE_COLUMNS[key as keyof PlaceUpdate]} = ?`);
    values.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as SQLiteValue));
  }
  assignments.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(`UPDATE places SET ${assignments.join(', ')} WHERE id = ?`, values);
}

type SQLiteValue = string | number | null;

export async function deletePlace(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM places WHERE id = ?', [id]);
}

export async function toggleFavorite(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE places SET favorite = 1 - favorite, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id],
  );
}

export async function setRating(
  placeId: number,
  categoryKey: string,
  stars: number | null,
): Promise<void> {
  const db = await getDatabase();
  if (stars === null) {
    await db.runAsync('DELETE FROM ratings WHERE place_id = ? AND category_key = ?', [
      placeId,
      categoryKey,
    ]);
  } else {
    await db.runAsync(
      `INSERT INTO ratings (place_id, category_key, stars) VALUES (?, ?, ?)
       ON CONFLICT(place_id, category_key) DO UPDATE SET stars = excluded.stars`,
      [placeId, categoryKey, stars],
    );
  }
  await db.runAsync('UPDATE places SET updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    placeId,
  ]);
}

export async function getRatings(placeId: number): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ category_key: string; stars: number }>(
    'SELECT category_key, stars FROM ratings WHERE place_id = ?',
    [placeId],
  );
  return Object.fromEntries(rows.map((r) => [r.category_key, r.stars]));
}

export async function setTags(placeId: number, tags: string[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM place_tags WHERE place_id = ?', [placeId]);
    for (const tag of tags) {
      const clean = tag.trim();
      if (clean) {
        await db.runAsync('INSERT OR IGNORE INTO place_tags (place_id, tag) VALUES (?, ?)', [
          placeId,
          clean,
        ]);
      }
    }
  });
}

export async function addPhoto(
  placeId: number,
  uri: string,
  caption: string | null = null,
): Promise<number> {
  const db = await getDatabase();
  const next = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM photos WHERE place_id = ?',
    [placeId],
  );
  const result = await db.runAsync(
    'INSERT INTO photos (place_id, uri, caption, created_at, sort_order) VALUES (?, ?, ?, ?, ?)',
    [placeId, uri, caption, new Date().toISOString(), next?.next ?? 0],
  );
  return result.lastInsertRowId;
}

export async function deletePhoto(photoId: number): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM photos WHERE id = ?', [
    photoId,
  ]);
  await db.runAsync('DELETE FROM photos WHERE id = ?', [photoId]);
  return row?.uri ?? null;
}

export async function getPlace(id: number): Promise<PlaceWithDetails | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PlaceRow>('SELECT * FROM places WHERE id = ?', [id]);
  if (!row) return null;

  const [ratingRows, tagRows, photoRows] = await Promise.all([
    db.getAllAsync<{ category_key: string; stars: number }>(
      'SELECT category_key, stars FROM ratings WHERE place_id = ?',
      [id],
    ),
    db.getAllAsync<{ tag: string }>('SELECT tag FROM place_tags WHERE place_id = ? ORDER BY tag', [
      id,
    ]),
    db.getAllAsync<{
      id: number;
      place_id: number;
      uri: string;
      caption: string | null;
      created_at: string;
      sort_order: number;
    }>('SELECT * FROM photos WHERE place_id = ? ORDER BY sort_order, id', [id]),
  ]);

  const ratings = Object.fromEntries(ratingRows.map((r) => [r.category_key, r.stars]));
  const photos: Photo[] = photoRows.map((p) => ({
    id: p.id,
    placeId: p.place_id,
    uri: p.uri,
    caption: p.caption,
    createdAt: p.created_at,
    sortOrder: p.sort_order,
  }));

  return {
    ...toPlace(row),
    ratings,
    tags: tagRows.map((t) => t.tag),
    photos,
    photoCount: photos.length,
    overall: computeOverall(ratings),
  };
}

export type PlaceSort = 'recent' | 'rating' | 'name' | 'visited';

export async function listPlaces(options?: {
  search?: string;
  sort?: PlaceSort;
  favoritesOnly?: boolean;
}): Promise<PlaceSummary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlaceRow>('SELECT * FROM places');

  const [allRatings, allTags, allPhotos] = await Promise.all([
    db.getAllAsync<{ place_id: number; category_key: string; stars: number }>(
      'SELECT place_id, category_key, stars FROM ratings',
    ),
    db.getAllAsync<{ place_id: number; tag: string }>(
      'SELECT place_id, tag FROM place_tags ORDER BY tag',
    ),
    db.getAllAsync<{ place_id: number; uri: string }>(
      'SELECT place_id, uri FROM photos ORDER BY sort_order, id',
    ),
  ]);

  const ratingsByPlace = new Map<number, Record<string, number>>();
  for (const r of allRatings) {
    const bucket = ratingsByPlace.get(r.place_id) ?? {};
    bucket[r.category_key] = r.stars;
    ratingsByPlace.set(r.place_id, bucket);
  }
  const tagsByPlace = new Map<number, string[]>();
  for (const t of allTags) {
    tagsByPlace.set(t.place_id, [...(tagsByPlace.get(t.place_id) ?? []), t.tag]);
  }
  const photosByPlace = new Map<number, string[]>();
  for (const p of allPhotos) {
    photosByPlace.set(p.place_id, [...(photosByPlace.get(p.place_id) ?? []), p.uri]);
  }

  let summaries: PlaceSummary[] = rows.map((row) => {
    const ratings = ratingsByPlace.get(row.id) ?? {};
    const photos = photosByPlace.get(row.id) ?? [];
    return {
      ...toPlace(row),
      overall: computeOverall(ratings),
      ratedCount: Object.keys(ratings).length,
      photoCount: photos.length,
      coverPhoto: photos[0] ?? null,
      tags: tagsByPlace.get(row.id) ?? [],
    };
  });

  const search = options?.search?.trim().toLowerCase();
  if (search) {
    summaries = summaries.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.address ?? '').toLowerCase().includes(search) ||
        (p.notes ?? '').toLowerCase().includes(search) ||
        p.tags.some((t) => t.toLowerCase().includes(search)),
    );
  }
  if (options?.favoritesOnly) {
    summaries = summaries.filter((p) => p.favorite);
  }

  const sort = options?.sort ?? 'recent';
  summaries.sort((a, b) => {
    switch (sort) {
      case 'rating':
        return (b.overall ?? -1) - (a.overall ?? -1);
      case 'name':
        return a.name.localeCompare(b.name, 'de');
      case 'visited':
        return (b.visitedFrom ?? '').localeCompare(a.visitedFrom ?? '');
      case 'recent':
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return summaries;
}

export type Stats = {
  placeCount: number;
  ratedCount: number;
  averageOverall: number | null;
  totalNights: number;
  totalSpent: number;
  favoriteCount: number;
  photoCount: number;
  bestPlace: { id: number; name: string; overall: number } | null;
  worstPlace: { id: number; name: string; overall: number } | null;
  /** Durchschnitt pro Kategorie über alle Plätze. */
  categoryAverages: { key: string; average: number; count: number }[];
  countries: { country: string; count: number }[];
};

export async function getStats(): Promise<Stats> {
  const places = await listPlaces({ sort: 'rating' });
  const db = await getDatabase();
  const allRatings = await db.getAllAsync<{ category_key: string; stars: number }>(
    'SELECT category_key, stars FROM ratings',
  );

  const rated = places.filter((p) => p.overall !== null);
  const averageOverall =
    rated.length > 0 ? rated.reduce((sum, p) => sum + (p.overall ?? 0), 0) / rated.length : null;

  const perCategory = new Map<string, { sum: number; count: number }>();
  for (const r of allRatings) {
    const entry = perCategory.get(r.category_key) ?? { sum: 0, count: 0 };
    entry.sum += r.stars;
    entry.count += 1;
    perCategory.set(r.category_key, entry);
  }

  const countryCounts = new Map<string, number>();
  for (const p of places) {
    if (p.country) countryCounts.set(p.country, (countryCounts.get(p.country) ?? 0) + 1);
  }

  return {
    placeCount: places.length,
    ratedCount: rated.length,
    averageOverall,
    totalNights: places.reduce((sum, p) => sum + (p.nights ?? 0), 0),
    totalSpent: places.reduce((sum, p) => sum + (p.nights ?? 0) * (p.pricePerNight ?? 0), 0),
    favoriteCount: places.filter((p) => p.favorite).length,
    photoCount: places.reduce((sum, p) => sum + p.photoCount, 0),
    bestPlace: rated[0]
      ? { id: rated[0].id, name: rated[0].name, overall: rated[0].overall as number }
      : null,
    worstPlace:
      rated.length > 1
        ? {
            id: rated[rated.length - 1].id,
            name: rated[rated.length - 1].name,
            overall: rated[rated.length - 1].overall as number,
          }
        : null,
    categoryAverages: CATEGORIES.map((c) => {
      const entry = perCategory.get(c.key);
      return {
        key: c.key,
        average: entry && entry.count > 0 ? entry.sum / entry.count : 0,
        count: entry?.count ?? 0,
      };
    }).filter((c) => c.count > 0),
    countries: [...countryCounts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count),
  };
}
