import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { getDatabase } from '@/db/database';

/**
 * Sicherung und Wiederherstellung des kompletten Tagebuchs als eine
 * JSON-Datei. Auf Wunsch werden die Fotos als Base64 mit eingepackt, damit
 * ein Backup wirklich alles enthält.
 */

const BACKUP_FORMAT = 'qek-reisetagebuch';
const BACKUP_VERSION = 1;

type BackupPhoto = {
  id: number;
  place_id: number;
  uri: string;
  caption: string | null;
  created_at: string;
  sort_order: number;
  /** Dateiname im Backup - nur gesetzt, wenn Fotos mitgesichert wurden. */
  file_name?: string;
  data_base64?: string;
};

type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  includesPhotos: boolean;
  places: Record<string, unknown>[];
  ratings: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  photos: BackupPhoto[];
};

const PHOTO_DIR_NAME = 'platz-fotos';

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Baut das Backup-Objekt aus der Datenbank. */
async function buildBackup(includePhotos: boolean): Promise<BackupFile> {
  const db = await getDatabase();
  const [places, ratings, tags, photoRows] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM places ORDER BY id'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM ratings ORDER BY place_id'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM place_tags ORDER BY place_id'),
    db.getAllAsync<BackupPhoto>('SELECT * FROM photos ORDER BY place_id, sort_order'),
  ]);

  const photos: BackupPhoto[] = [];
  for (const row of photoRows) {
    const photo: BackupPhoto = { ...row };
    if (includePhotos) {
      try {
        const file = new File(row.uri);
        if (file.exists) {
          photo.file_name = row.uri.split('/').pop() ?? `foto-${row.id}.jpg`;
          photo.data_base64 = await file.base64();
        }
      } catch {
        // Ein fehlendes Foto darf das ganze Backup nicht verhindern.
      }
    }
    photos.push(photo);
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    places,
    ratings,
    tags,
    photos,
  };
}

export type ExportResult = {
  uri: string;
  fileName: string;
  sizeLabel: string;
};

/**
 * Schreibt das Backup in den Cache und öffnet den Teilen-Dialog, damit die
 * Datei z. B. in der Cloud oder per Mail gesichert werden kann.
 */
export async function exportBackup(includePhotos: boolean): Promise<ExportResult> {
  const backup = await buildBackup(includePhotos);
  const json = JSON.stringify(backup);

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `qek-reisetagebuch-${stamp}${includePhotos ? '-mit-fotos' : ''}.json`;

  const target = new File(Paths.cache, fileName);
  if (target.exists) target.delete();
  target.create();
  target.write(json);

  const sizeLabel = formatBytes(json.length);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(target.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Reisetagebuch sichern',
      UTI: 'public.json',
    });
  }

  return { uri: target.uri, fileName, sizeLabel };
}

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  | { status: 'ok'; places: number; photos: number; replaced: boolean };

/**
 * Liest eine Backup-Datei ein. `replace` löscht vorher alle vorhandenen
 * Einträge; sonst werden die Plätze zusätzlich angelegt.
 */
export async function importBackup(replace: boolean): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { status: 'cancelled' };

  let backup: BackupFile;
  try {
    const raw = await new File(picked.assets[0].uri).text();
    backup = JSON.parse(raw) as BackupFile;
  } catch {
    return { status: 'error', message: 'Die Datei konnte nicht gelesen werden.' };
  }

  if (backup?.format !== BACKUP_FORMAT || !Array.isArray(backup.places)) {
    return {
      status: 'error',
      message: 'Das ist keine Sicherung von "Qek to the Future".',
    };
  }
  if (backup.version > BACKUP_VERSION) {
    return {
      status: 'error',
      message: 'Die Sicherung stammt aus einer neueren App-Version. Bitte die App aktualisieren.',
    };
  }

  const db = await getDatabase();
  let importedPlaces = 0;
  let importedPhotos = 0;

  await db.withTransactionAsync(async () => {
    if (replace) {
      await db.execAsync(
        'DELETE FROM place_tags; DELETE FROM photos; DELETE FROM ratings; DELETE FROM places;',
      );
    }

    // Alte auf neue Platz-IDs abbilden, damit angehängte Importe keine
    // Schlüssel überschreiben.
    const idMap = new Map<number, number>();

    for (const raw of backup.places) {
      const place = raw as Record<string, unknown>;
      const result = await db.runAsync(
        `INSERT INTO places
           (name, address, lat, lon, source_id, country, visited_from, visited_to,
            nights, price_per_night, notes, favorite, would_return, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(place.name ?? 'Unbenannter Platz'),
          (place.address as string) ?? null,
          (place.lat as number) ?? null,
          (place.lon as number) ?? null,
          (place.source_id as string) ?? null,
          (place.country as string) ?? null,
          (place.visited_from as string) ?? null,
          (place.visited_to as string) ?? null,
          (place.nights as number) ?? null,
          (place.price_per_night as number) ?? null,
          (place.notes as string) ?? null,
          place.favorite ? 1 : 0,
          place.would_return === null || place.would_return === undefined
            ? null
            : place.would_return
              ? 1
              : 0,
          (place.created_at as string) ?? new Date().toISOString(),
          (place.updated_at as string) ?? new Date().toISOString(),
        ],
      );
      idMap.set(Number(place.id), result.lastInsertRowId);
      importedPlaces += 1;
    }

    for (const raw of backup.ratings ?? []) {
      const rating = raw as Record<string, unknown>;
      const newId = idMap.get(Number(rating.place_id));
      const stars = Number(rating.stars);
      if (!newId || !Number.isFinite(stars) || stars < 1 || stars > 5) continue;
      await db.runAsync(
        'INSERT OR REPLACE INTO ratings (place_id, category_key, stars) VALUES (?, ?, ?)',
        [newId, String(rating.category_key), stars],
      );
    }

    for (const raw of backup.tags ?? []) {
      const tag = raw as Record<string, unknown>;
      const newId = idMap.get(Number(tag.place_id));
      if (!newId) continue;
      await db.runAsync('INSERT OR IGNORE INTO place_tags (place_id, tag) VALUES (?, ?)', [
        newId,
        String(tag.tag),
      ]);
    }

    for (const photo of backup.photos ?? []) {
      const newId = idMap.get(Number(photo.place_id));
      if (!newId) continue;

      let uri = photo.uri;
      if (photo.data_base64) {
        try {
          const name =
            photo.file_name ?? `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
          const file = new File(photoDirectory(), name);
          if (file.exists) file.delete();
          file.create();
          file.write(photo.data_base64, { encoding: 'base64' });
          uri = file.uri;
        } catch {
          continue;
        }
      } else if (!new File(uri).exists) {
        // Backup ohne Bilddaten und die Originaldatei ist weg.
        continue;
      }

      await db.runAsync(
        'INSERT INTO photos (place_id, uri, caption, created_at, sort_order) VALUES (?, ?, ?, ?, ?)',
        [
          newId,
          uri,
          photo.caption ?? null,
          photo.created_at ?? new Date().toISOString(),
          photo.sort_order ?? 0,
        ],
      );
      importedPhotos += 1;
    }
  });

  return { status: 'ok', places: importedPlaces, photos: importedPhotos, replaced: replace };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
