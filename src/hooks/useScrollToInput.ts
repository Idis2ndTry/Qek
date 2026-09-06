import { useCallback, useRef } from 'react';
import { Platform, type LayoutChangeEvent, type ScrollView } from 'react-native';

/**
 * Sorgt dafür, dass ein Textfeld sichtbar bleibt, wenn die Tastatur aufgeht.
 *
 * Auf iOS schiebt `KeyboardAvoidingView` den Inhalt hoch, auf Android
 * verkleinert das System die Ansicht. Beides bringt das Feld aber nur dann
 * ins Bild, wenn die Liste auch dorthin scrollt.
 *
 * Die Position kommt aus `onLayout` statt aus einer Messung zur Laufzeit:
 * das ist plattformübergreifend zuverlässig und kommt ohne
 * `findNodeHandle` aus, das im Web gar nicht existiert.
 */
export function useScrollToInput(options?: { offset?: number; delayMs?: number }) {
  const scrollRef = useRef<ScrollView>(null);
  /** Abstand des Feldes vom oberen Rand des Listeninhalts. */
  const positionRef = useRef(0);

  /** Etwas Luft über dem Feld, damit die Beschriftung mit sichtbar bleibt. */
  const offset = options?.offset ?? 80;
  // Die Tastatur fährt animiert auf; erst danach steht die neue Höhe fest.
  const delay = options?.delayMs ?? (Platform.OS === 'android' ? 260 : 140);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    positionRef.current = event.nativeEvent.layout.y;
  }, []);

  const onFocus = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, positionRef.current - offset),
        animated: true,
      });
    }, delay);
  }, [delay, offset]);

  return { scrollRef, onLayout, onFocus };
}
