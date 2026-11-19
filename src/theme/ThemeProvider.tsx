import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { dark, doseScale, light, shadows, siteShades, type ColorTokens, type ShadowTokens } from './tokens';

export type Theme = {
  dark: boolean;
  c: ColorTokens;
  dose: readonly string[];
  sites: readonly string[];
  shadow: ShadowTokens;
};

const LIGHT: Theme = { dark: false, c: light, dose: doseScale.light, sites: siteShades.light, shadow: shadows.light };
const DARK: Theme = { dark: true, c: dark, dose: doseScale.dark, sites: siteShades.dark, shadow: shadows.dark };

export type ThemePref = 'auto' | 'light' | 'dark';

// A escolha dos Ajustes fica guardada aqui e decide o tema na hora. O evento nativo de troca de
// esquema (Appearance) nem sempre chega, por exemplo logo depois de voltar do seletor de arquivos.
let currentPref: ThemePref = 'auto';
const listeners = new Set<() => void>();

/** Aplica a escolha dos Ajustes ao app todo; os diálogos nativos seguem via Appearance. */
export function applyThemePref(pref: ThemePref): void {
  currentPref = pref;
  listeners.forEach((notify) => notify());
  Appearance.setColorScheme(pref);
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

const ThemeContext = createContext<Theme>(LIGHT);

/** Claro ou escuro: a escolha manual vale sozinha; no automático, segue o sistema. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const pref = useSyncExternalStore(subscribe, () => currentPref);
  const system = useColorScheme();
  const isDark = pref === 'auto' ? system === 'dark' : pref === 'dark';
  return <ThemeContext.Provider value={isDark ? DARK : LIGHT}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
