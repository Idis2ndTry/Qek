import * as SQLite from 'expo-sqlite';

const DB_NAME = 'qek-reisetagebuch.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Öffnet die Datenbank genau einmal und wendet dabei alle Migrationen an.
 * Alle Aufrufer teilen sich dieselbe Verbindung.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

/**
 * Schema-Migrationen. Jede neue Version hängt einen Block unten an und
 * erhöht `TARGET_VERSION` - vorhandene Installationen wandern dann Schritt
 * für Schritt nach oben, ohne dass Daten verloren gehen.
 */
const TARGET_VERSION = 1;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS places (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT    NOT NULL,
        address        TEXT,
        lat            REAL,
        lon            REAL,
        source_id      TEXT,
        country        TEXT,
        visited_from   TEXT,
        visited_to     TEXT,
        nights         INTEGER,
        price_per_night REAL,
        notes          TEXT,
        favorite       INTEGER NOT NULL DEFAULT 0,
        would_return   INTEGER,
        created_at     TEXT    NOT NULL,
        updated_at     TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ratings (
        place_id     INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        category_key TEXT    NOT NULL,
        stars        INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
        PRIMARY KEY (place_id, category_key)
      );

      CREATE TABLE IF NOT EXISTS photos (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id   INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        uri        TEXT    NOT NULL,
        caption    TEXT,
        created_at TEXT    NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS place_tags (
        place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        tag      TEXT    NOT NULL,
        PRIMARY KEY (place_id, tag)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_place ON ratings(place_id);
      CREATE INDEX IF NOT EXISTS idx_photos_place  ON photos(place_id);
      CREATE INDEX IF NOT EXISTS idx_tags_place    ON place_tags(place_id);
    `);
    version = 1;
  }

  if (version !== TARGET_VERSION) {
    version = TARGET_VERSION;
  }
  await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION};`);
}

/** Nur für Tests und den "Alle Daten löschen"-Knopf in den Einstellungen. */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM place_tags;
    DELETE FROM photos;
    DELETE FROM ratings;
    DELETE FROM places;
  `);
}
