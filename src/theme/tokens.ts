// Tokens de design do Leve. Valores e regras em docs/02-design.md.

export type ColorTokens = {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  text2: string;
  text3: string;
  onInk: string;
  med: string;
  medStrong: string;
  medSoft: string;
  onMed: string;
  body: string;
  bodyStrong: string;
  bodySoft: string;
  warn: string;
  warnStrong: string;
  warnSoft: string;
  danger: string;
  tabBar: string;
  /** Pontos de pesagem nos gráficos. */
  point: string;
  /** Trilho apagado: interruptor desligado, linha do zero. */
  track: string;
  /** Silhueta do mapa do corpo e as marcas apagadas dela. */
  figure: string;
  figureMark: string;
  /** Opção escolhida no controle segmentado (acima do trilho surface2). */
  segment: string;
  /** Balão dos gráficos e do aviso com Desfazer. */
  tipBg: string;
  tipText: string;
  tipText2: string;
};

export const light: ColorTokens = {
  bg: '#F4F3F8',
  surface: '#FFFFFF',
  surface2: '#EEEDF4',
  line: '#E4E2EC',
  ink: '#1C1A29',
  text2: '#4E4A60',
  text3: '#6B6780',
  onInk: '#FFFFFF',
  med: '#6A55D8',
  medStrong: '#4B37B8',
  medSoft: '#EFECFC',
  onMed: '#FFFFFF',
  body: '#00897B',
  bodyStrong: '#00695E',
  bodySoft: '#E2F3F0',
  warn: '#A0610A',
  warnStrong: '#8A5208',
  warnSoft: '#FAF0DE',
  danger: '#B3372F',
  tabBar: 'rgba(255,255,255,0.96)',
  point: '#8A86A0',
  track: '#C9C6D6',
  figure: '#E7E5EF',
  figureMark: '#B9B5C9',
  segment: '#FFFFFF',
  tipBg: '#1C1A29',
  tipText: '#FFFFFF',
  tipText2: '#C4C0D4',
};

export const dark: ColorTokens = {
  bg: '#121118',
  surface: '#1C1A25',
  surface2: '#262332',
  line: '#312D40',
  ink: '#F2F0F8',
  text2: '#C4C0D4',
  text3: '#9D98B0',
  onInk: '#121118',
  med: '#9180EC',
  medStrong: '#B6A8F6',
  medSoft: '#2A2547',
  onMed: '#121118',
  body: '#2AA88E',
  bodyStrong: '#2AA88E',
  bodySoft: '#15302C',
  warn: '#C7852F',
  warnStrong: '#C7852F',
  warnSoft: '#34281A',
  danger: '#E5736A',
  tabBar: 'rgba(28,26,37,0.96)',
  point: '#7D7894',
  track: '#4A4560',
  figure: '#2C2939',
  figureMark: '#5A5570',
  segment: '#3A3550',
  tipBg: '#F2F0F8',
  tipText: '#121118',
  tipText2: '#4E4A60',
};

/** Escala ordinal das etapas do plano de doses (validada para contraste e daltonismo). */
export const doseScale = {
  light: ['#B4A7F2', '#9886EA', '#7B67E0', '#5F49CF', '#4632B0'],
  dark: ['#56499E', '#6857C0', '#7C6ADB', '#9886EC', '#B6A8F6'],
} as const;

/**
 * Rodízio no mapa do corpo: o local sugerido usa `med`; os outros clareiam (no escuro, apagam)
 * conforme o uso é mais recente.
 */
export const siteShades = {
  light: ['#B4A7F2', '#C9C0F5', '#D9D2F8', '#E3DEFA', '#EAE6FB'],
  dark: ['#6857C0', '#56499E', '#473D85', '#3B336E', '#332C5E'],
} as const;

export type ShadowTokens = { card?: string; bar: string; plus: string; chip?: string; knob?: string };

export const shadows: { light: ShadowTokens; dark: ShadowTokens } = {
  light: {
    card: '0px 1px 2px rgba(28,26,41,0.04), 0px 8px 24px rgba(28,26,41,0.06)',
    bar: '0px 12px 32px rgba(28,26,41,0.16), 0px 2px 6px rgba(28,26,41,0.06)',
    plus: '0px 6px 16px rgba(28,26,41,0.28)',
    chip: '0px 1px 3px rgba(28,26,41,0.14)',
    knob: '0px 1px 3px rgba(28,26,41,0.25)',
  },
  dark: {
    bar: '0px 12px 32px rgba(0,0,0,0.45)',
    plus: '0px 6px 16px rgba(0,0,0,0.4)',
  },
};

/** Foto aberta em tela cheia: fundo preto nos dois temas, para a foto ficar fiel. */
export const viewer = { bg: '#000000', ink: '#FFFFFF' } as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { field: 14, key: 18, tile: 22, card: 24, sheet: 28, pill: 999 } as const;

export const fonts = {
  light: 'PlusJakartaSans_300Light',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

// No Android, cada peso é uma família própria: nunca usar fontWeight junto.
export const typeScale = {
  display: { fontFamily: fonts.light, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  number: { fontFamily: fonts.light, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  title1: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  title2: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} as const;
