import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Fotos werden aus der Galerie bzw. Kamera in den App-Ordner kopiert.
 * Nur so bleiben sie erhalten, wenn das Original gelöscht wird oder das
 * Betriebssystem den Cache aufräumt.
 */

const PHOTO_DIR_NAME = 'platz-fotos';

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionFor(uri: string): string {
  const match = /\.(jpe?g|png|heic|webp)(?:\?|$)/i.exec(uri);
  return match ? `.${match[1].toLowerCase()}` : '.jpg';
}

/** Kopiert ein ausgewähltes Bild dauerhaft in den App-Speicher. */
export function persistPhoto(sourceUri: string): string {
  const dir = photoDirectory();
  const name = `platz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensionFor(sourceUri)}`;
  const destination = new File(dir, name);
  new File(sourceUri).copy(destination);
  return destination.uri;
}

/** Entfernt eine Datei aus dem App-Speicher; Fehler werden geschluckt. */
export function removePhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Datei war schon weg - kein Grund, den Nutzer zu stören.
  }
}

export type PickResult = {
  uris: string[];
  /** Gesetzt, wenn die Berechtigung verweigert wurde. */
  permissionDenied?: boolean;
};

/** Bilder aus der Galerie wählen (Mehrfachauswahl möglich). */
export async function pickFromLibrary(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { uris: [], permissionDenied: true };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.8,
  });
  if (result.canceled) return { uris: [] };
  return { uris: result.assets.map((a) => persistPhoto(a.uri)) };
}

/** Direkt ein Foto aufnehmen. */
export async function takePhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { uris: [], permissionDenied: true };

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled) return { uris: [] };
  return { uris: result.assets.map((a) => persistPhoto(a.uri)) };
}

/** Verzeichnis für den Backup-Export. */
export function photoDirectoryUri(): string {
  return photoDirectory().uri;
}
