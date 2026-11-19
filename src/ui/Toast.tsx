import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

import { Text } from './Text';

type ToastOptions = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastApi = { show: (options: ToastOptions) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

/** Aviso flutuante acima do menu, com ação opcional ("Desfazer", 5 s). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((options: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setToast({ ...options, id });
    timer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), options.duration ?? 5000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: space.l, right: space.l, bottom: insets.bottom + 8 + 68 + space.m }}
        >
          <View
            accessibilityLiveRegion="polite"
            style={{
              minHeight: 52,
              borderRadius: radius.pill,
              backgroundColor: t.c.tipBg,
              paddingLeft: space.xl,
              paddingRight: toast.actionLabel ? space.s : space.xl,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.m,
              boxShadow: t.shadow.bar,
            }}
          >
            <Text variant="label" style={{ flex: 1, color: t.c.tipText, fontSize: 14 }}>
              {toast.message}
            </Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (timer.current) clearTimeout(timer.current);
                  setToast(null);
                  toast.onAction?.();
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  paddingHorizontal: space.m,
                  justifyContent: 'center',
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text variant="label" style={{ color: t.c.tipText, fontFamily: fonts.bold, textDecorationLine: 'underline' }}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
