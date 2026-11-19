import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';
import { Toggle } from './Toggle';

/** Sobretítulo de um grupo de ajustes. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="overline" color="text3" accessibilityRole="header" style={{ marginHorizontal: 4 }}>
      {children}
    </Text>
  );
}

/** Bloco branco de linhas separadas por hairline. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ borderRadius: 20, backgroundColor: c.surface, overflow: 'hidden' }}>
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: c.line, marginLeft: space.l }} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  value?: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  accessibilityHint?: string;
};

export function ListRow({ title, value, sub, onPress, danger = false, accessibilityHint }: RowProps) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        paddingHorizontal: space.l,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: pressed ? c.surface2 : 'transparent',
      })}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: 15, lineHeight: 20, color: danger ? c.danger : c.ink }} variant="label">
          {title}
        </Text>
        {sub ? (
          <Text variant="caption" color="text3">
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text color="text2" style={{ fontSize: 14, lineHeight: 20, textAlign: 'right', flexShrink: 1 }}>
          {value}
        </Text>
      ) : null}
      {onPress && !danger ? <Icon name="chevronRight" size={16} color={c.text3} strokeWidth={2} /> : null}
    </Pressable>
  );
}

type SwitchRowProps = { title: string; sub?: string; value: boolean; onValueChange: (v: boolean) => void };

export function SwitchRow({ title, sub, value, onValueChange }: SwitchRowProps) {
  return (
    <View
      style={{
        minHeight: 64,
        paddingHorizontal: space.l,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.m,
      }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="label" style={{ fontSize: 15, lineHeight: 20 }}>
          {title}
        </Text>
        {sub ? (
          <Text variant="caption" color="text3">
            {sub}
          </Text>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onValueChange} label={title} />
    </View>
  );
}

/** Linha de lista dentro de um card (histórico): marcador, título, detalhe e seta. */
export function EntryRow({
  title,
  sub,
  marker,
  onPress,
  last = false,
  accessibilityLabel,
}: {
  title: string;
  sub?: string;
  marker?: string; // cor do ponto à esquerda
  onPress?: () => void;
  last?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.m,
        paddingVertical: space.m,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {marker ? <View style={{ width: 10, height: 10, borderRadius: radius.pill, backgroundColor: marker }} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="label" style={{ fontSize: 14, lineHeight: 20 }}>
          {title}
        </Text>
        {sub ? (
          <Text variant="caption" color="text2">
            {sub}
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevronRight" size={18} color={c.text3} strokeWidth={2} /> : null}
    </Pressable>
  );
}
