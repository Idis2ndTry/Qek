/** Formatierung für Datum, Preis und Noten - überall auf Deutsch. */

const MONTHS = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sept.',
  'Okt.',
  'Nov.',
  'Dez.',
];

/** ISO-Datum (YYYY-MM-DD) zu "17. Juli 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${day}. ${MONTHS[month - 1]} ${year}`;
}

/** Kurzform "17.07.2026". */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${day}.${month}.${year}`;
}

/** Zeitraum als "12.–17. Juli 2026" bzw. nur ein Datum. */
export function formatDateRange(from: string | null, to: string | null): string {
  if (!from && !to) return '';
  if (from && !to) return formatDate(from);
  if (!from && to) return formatDate(to);

  const [fy, fm, fd] = (from as string).slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = (to as string).slice(0, 10).split('-').map(Number);

  if (fy === ty && fm === tm) {
    if (fd === td) return formatDate(from);
    return `${fd}.–${td}. ${MONTHS[fm - 1]} ${fy}`;
  }
  if (fy === ty) {
    return `${fd}. ${MONTHS[fm - 1]} – ${td}. ${MONTHS[tm - 1]} ${fy}`;
  }
  return `${formatDateShort(from)} – ${formatDateShort(to)}`;
}

/** Heutiges Datum als ISO-Tag, in lokaler Zeitzone. */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Nächte zwischen zwei ISO-Daten; null wenn eins fehlt oder unlogisch ist. */
export function nightsBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const nights = Math.round((end - start) / 86_400_000);
  return nights >= 0 ? nights : null;
}

/** Preis in Euro, deutsche Schreibweise. */
export function formatEuro(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${value.toFixed(decimals).replace('.', ',')} €`;
}

/** Note mit einer Nachkommastelle, deutsches Komma. */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return value.toFixed(1).replace('.', ',');
}

/** Prüft grob, ob ein String ein gültiges ISO-Datum ist. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isFinite(time);
}

/** Deutsche Eingabe "17.07.2026" oder "17.7.26" zu ISO. */
export function parseGermanDate(input: string): string | null {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(input.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidIsoDate(iso) ? iso : null;
}
