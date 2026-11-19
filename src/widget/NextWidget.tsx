// Widget "Leve" da tela inicial: próxima aplicação e caneta em uso. Sem peso, por privacidade.
// Desenhado com os componentes do react-native-android-widget (não são Views do React Native).

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { ColorTokens } from '@/theme/tokens';

export const WIDGET_NAME = 'Proxima';

export type WidgetData =
  | { kind: 'empty' }
  | {
      kind: 'ok';
      overline: string;
      title: string;
      sub: string;
      pen: string;
      /** Link do botão "Registrar" (leve://…); null = sem botão. */
      registerUri: string | null;
      warn: boolean;
    };

type Hex = `#${string}`;
const hex = (color: string) => color as Hex;

const FONT = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};

export function NextWidget({ data, c }: { data: WidgetData; c: ColorTokens }) {
  if (data.kind === 'empty') {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel="Leve. Abra o app para começar."
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: hex(c.surface), borderRadius: 24, padding: 16, justifyContent: 'center' }}
      >
        <TextWidget text="Leve" style={{ fontSize: 20, color: hex(c.ink), fontFamily: FONT.semibold }} />
        <TextWidget text="Abra o app para começar." style={{ fontSize: 13, color: hex(c.text2), fontFamily: FONT.regular, marginTop: 2 }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${data.overline}. ${data.title}. ${data.sub}. ${data.pen}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: hex(c.surface),
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <TextWidget
          text={data.overline.toUpperCase()}
          style={{ fontSize: 11, color: hex(data.warn ? c.warnStrong : c.text3), fontFamily: FONT.bold, letterSpacing: 0.06 }}
        />
        <TextWidget text={data.title} maxLines={1} truncate="END" style={{ fontSize: 22, color: hex(c.ink), fontFamily: FONT.semibold, marginTop: 2 }} />
        <TextWidget text={data.sub} maxLines={2} truncate="END" style={{ fontSize: 13, color: hex(c.text2), fontFamily: FONT.regular, marginTop: 2 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
        <FlexWidget style={{ backgroundColor: hex(c.medSoft), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <TextWidget text={data.pen} maxLines={1} style={{ fontSize: 12, color: hex(c.medStrong), fontFamily: FONT.semibold }} />
        </FlexWidget>
        {data.registerUri ? (
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: data.registerUri }}
            accessibilityLabel="Registrar aplicação"
            style={{ backgroundColor: hex(c.med), borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}
          >
            <TextWidget text="Registrar" style={{ fontSize: 13, color: hex(c.onMed), fontFamily: FONT.semibold }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
