import { Share } from 'react-native';

import type { PlaceWithDetails } from '@/db/types';
import {
  APP_NAME,
  buildShareMessage,
  buildSummaryMessage,
  type SummaryInput,
} from './shareMessage';

/**
 * Öffnet den Teilen-Dialog des Betriebssystems - für WhatsApp, Mail und
 * alles andere, was das Gerät anbietet. Der Wortlaut selbst kommt aus
 * `shareMessage.ts`.
 */
export async function sharePlace(place: PlaceWithDetails): Promise<void> {
  await Share.share(
    {
      message: buildShareMessage(place),
      title: `${place.name} – ${APP_NAME}`,
    },
    { subject: `${place.name} – mein Camping-Tipp`, dialogTitle: 'Eintrag teilen' },
  );
}

/** Teilt die Kurzfassung der ganzen Sammlung. */
export async function shareSummary(stats: SummaryInput): Promise<void> {
  await Share.share(
    { message: buildSummaryMessage(stats), title: APP_NAME },
    { subject: `Mein Camping-Reisetagebuch`, dialogTitle: 'Reisebilanz teilen' },
  );
}
