/**
 * Design-System "Qek to the Future".
 *
 * Retro-Wohnwagen trifft moderne App: warmes Papier-Weiß, kräftiges
 * Signalrot, harte Offset-Schatten statt weicher Blur-Schatten und dicke
 * Konturen - so wie die Aufkleber und Emaille-Schilder der 70er/80er.
 */

export const colors = {
  /** Signalrot - Hauptfarbe der Marke. */
  red: '#C81E1E',
  redDark: '#8E1414',
  redLight: '#E63946',
  /** Sehr helles Rot für Flächen im Hintergrund. */
  redWash: '#FBE9E9',

  /** Warmes Papierweiß - Hintergrund der App. */
  cream: '#FFF7F0',
  /** Reines Weiß für Karten. */
  paper: '#FFFFFF',

  /** Fast-Schwarz mit Braunstich - angenehmer als reines Schwarz. */
  ink: '#231F20',
  inkSoft: '#6E625C',
  inkFaint: '#A2958D',

  /** Linien und Konturen. */
  line: '#E5D8CD',
  lineStrong: '#231F20',

  /** Sterne und Akzente. */
  gold: '#E8A33D',
  goldSoft: '#F6E2C0',
  mint: '#2A9D8F',
  sky: '#4A7C99',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const fonts = {
  /** Bungee - plakative Retro-Headline, nur für Titel und Logo. */
  display: 'Bungee_400Regular',
  /** Archivo - moderne, gut lesbare Grotesk für die Oberfläche. */
  body: 'Archivo_400Regular',
  bodyMedium: 'Archivo_500Medium',
  bodyBold: 'Archivo_700Bold',
  bodyBlack: 'Archivo_900Black',
  /** Space Mono - für Zahlen, Noten und Daten. */
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Größte Breite, die Inhalte einnehmen dürfen.
 *
 * Die App ist fürs Handy gebaut. Auf einem Tablet würde sich alles über die
 * volle Breite ziehen - Listen wirken dann leer und Textzeilen werden
 * unangenehm lang. Stattdessen bleibt der Inhalt in einer Spalte, zentriert.
 */
export const maxContentWidth = 640;

/** Auf Handys unverändert, auf breiten Bildschirmen mittig begrenzt. */
export const centeredContent = {
  width: '100%',
  maxWidth: maxContentWidth,
  alignSelf: 'center',
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/**
 * Harter Offset-Schatten ohne Weichzeichner - das zentrale Retro-Merkmal.
 * Auf Android braucht es zusätzlich eine Kontur, weil `elevation` immer
 * weich zeichnet; deshalb setzen wir hier bewusst keinen elevation-Wert.
 */
export function hardShadow(offset = 3, color: string = colors.ink) {
  return {
    shadowColor: color,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
  } as const;
}

export const border = {
  width: 2,
  color: colors.ink,
} as const;

export const type = {
  logo: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 0.5 },
  h1: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.3 },
  h2: { fontFamily: fonts.bodyBlack, fontSize: 20, letterSpacing: 0.2 },
  h3: { fontFamily: fonts.bodyBold, fontSize: 16 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.1 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  score: { fontFamily: fonts.monoBold, fontSize: 28 },
  mono: { fontFamily: fonts.mono, fontSize: 13 },
} as const;

export type ThemeColor = keyof typeof colors;
