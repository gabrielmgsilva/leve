// Peças pequenas e repetidas: etiqueta, nota informativa, link, número de resumo, contador e campo.

import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, typeScale, type ColorTokens } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type PillTone = 'neutral' | 'med' | 'outline' | 'warn' | 'body';

/** Etiqueta curta: "atual", "em uso", "concluída". */
export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const { c } = useTheme();
  const style = {
    neutral: { bg: c.surface2, fg: c.text2, border: 'transparent' },
    med: { bg: c.medSoft, fg: c.medStrong, border: 'transparent' },
    outline: { bg: 'transparent', fg: c.text3, border: c.line },
    warn: { bg: c.warnSoft, fg: c.warnStrong, border: 'transparent' },
    body: { bg: c.bodySoft, fg: c.bodyStrong, border: 'transparent' },
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: style.border,
        backgroundColor: style.bg,
        paddingHorizontal: 9,
        paddingVertical: 2,
      }}
    >
      <Text variant="caption" style={{ color: style.fg, fontFamily: fonts.bold }}>
        {label}
      </Text>
    </View>
  );
}

/** Etiqueta maior com ícone opcional: "↓ 6,7 kg desde 23/08", "IMC 29,3". */
export function Tag({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'body' | 'warn'; icon?: IconName }) {
  const { c } = useTheme();
  const style = {
    neutral: { bg: c.surface2, fg: c.text2 },
    body: { bg: c.bodySoft, fg: c.bodyStrong },
    warn: { bg: c.warnSoft, fg: c.warnStrong },
  }[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 5,
        paddingLeft: icon ? 8 : 10,
        paddingRight: 10,
        borderRadius: radius.pill,
        backgroundColor: style.bg,
      }}
    >
      {icon ? <Icon name={icon} size={14} color={style.fg} strokeWidth={2.25} /> : null}
      <Text variant="label" style={{ color: style.fg, fontFamily: fonts.semibold }}>
        {label}
      </Text>
    </View>
  );
}

type NoteTone = 'neutral' | 'warn' | 'med' | 'body';

/** Caixa de texto de apoio com ícone (explicações e avisos). */
export function InfoNote({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode;
  tone?: NoteTone;
  icon?: IconName | null;
}) {
  const { c } = useTheme();
  const style = {
    neutral: { bg: c.bg, fg: c.text2 as string, icon: 'info' as IconName },
    warn: { bg: c.warnSoft, fg: c.warnStrong, icon: 'alert' as IconName },
    med: { bg: c.medSoft, fg: c.medStrong, icon: 'info' as IconName },
    body: { bg: c.bodySoft, fg: c.bodyStrong, icon: 'check' as IconName },
  }[tone];
  const iconName = icon === null ? null : (icon ?? style.icon);
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
        paddingVertical: space.m,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: style.bg,
      }}
    >
      {iconName ? (
        <View style={{ marginTop: 1 }}>
          <Icon name={iconName} size={18} color={style.fg} />
        </View>
      ) : null}
      <Text variant="label" style={{ flex: 1, fontFamily: fonts.regular, lineHeight: 19, color: style.fg }}>
        {children}
      </Text>
    </View>
  );
}

/** Ação em texto (violeta), com alvo de 44 pt. */
export function LinkButton({
  label,
  onPress,
  icon,
  align = 'auto',
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  align?: 'auto' | 'center';
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: align === 'center' ? 'center' : 'auto',
        gap: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={16} color={c.medStrong} strokeWidth={2} /> : null}
      <Text variant="label" style={{ fontFamily: fonts.semibold, color: c.medStrong }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Número de resumo (Evolução): rótulo, valor e legenda. */
export function StatTile({
  label,
  value,
  sub,
  valueColor = 'ink',
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: keyof ColorTokens;
}) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}, ${sub}`}
      style={{ flex: 1, backgroundColor: c.surface, borderRadius: 20, paddingVertical: 14, paddingHorizontal: space.l, gap: 2 }}
    >
      <Text variant="caption" color="text3" style={{ fontFamily: fonts.semibold }}>
        {label}
      </Text>
      <Text
        color={valueColor}
        maxFontSizeMultiplier={1.2}
        style={{ fontFamily: fonts.medium, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 }}
      >
        {value}
      </Text>
      <Text variant="caption" color="text3" style={{ fontFamily: fonts.regular }}>
        {sub}
      </Text>
    </View>
  );
}

/** − valor + : números pequenos (semanas, quantidade). */
export function Stepper({
  value,
  onChange,
  min,
  max,
  format = String,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  format?: (v: number) => string;
  label: string;
}) {
  const { c } = useTheme();
  const btn = (icon: IconName, next: number, disabled: boolean, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={18} color={c.ink} strokeWidth={2} />
    </Pressable>
  );
  return (
    <View
      accessible={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}
    >
      {btn('minus', value - 1, value <= min, `Menos (${label})`)}
      <Text
        variant="headline"
        accessibilityLiveRegion="polite"
        style={{ minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}
      >
        {format(value)}
      </Text>
      {btn('plus', value + 1, value >= max, `Mais (${label})`)}
    </View>
  );
}

/** Campo de texto com rótulo, sufixo ("kg", "cm") e mensagem de ajuda ou erro. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  hint,
  error,
  keyboardType,
  multiline = false,
  maxLength,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  hint?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption" color="text3" style={{ fontFamily: fonts.semibold }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 120 : 52,
          borderRadius: radius.field,
          backgroundColor: c.surface2,
          borderWidth: 1.5,
          borderColor: error ? c.warn : focused ? c.med : 'transparent',
          paddingHorizontal: space.l,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.text3}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          cursorColor={c.med}
          selectionColor={c.medSoft}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxFontSizeMultiplier={1.4}
          style={[
            typeScale.body,
            { flex: 1, color: c.ink, paddingVertical: multiline ? space.m : 0, minHeight: multiline ? 112 : 48 },
          ]}
        />
        {suffix ? (
          <Text color="text2" style={{ marginLeft: space.s }}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="warnStrong">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="text3">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
