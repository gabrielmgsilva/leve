import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Conjunto próprio, o mesmo do protótipo (grade 24, traço arredondado).
type Shape = { p: string } | { c: [number, number, number] } | { r: [number, number, number, number, number] };

export type IconName =
  | 'sun'
  | 'chart'
  | 'pen'
  | 'book'
  | 'plus'
  | 'settings'
  | 'scale'
  | 'heart'
  | 'pencil'
  | 'close'
  | 'check'
  | 'chevronRight'
  | 'calendar'
  | 'flag'
  | 'arrowDown'
  | 'arrowUp'
  | 'box'
  | 'chevronLeft'
  | 'info'
  | 'user'
  | 'trash'
  | 'share'
  | 'download'
  | 'minus'
  | 'alert'
  | 'clock'
  | 'ruler'
  | 'camera'
  | 'image'
  | 'file'
  | 'wallet'
  | 'activity';

const ICONS: Record<IconName, Shape[]> = {
  sun: [
    { c: [12, 12, 4] },
    { p: 'M12 2v2' },
    { p: 'M12 20v2' },
    { p: 'm4.93 4.93 1.41 1.41' },
    { p: 'm17.66 17.66 1.41 1.41' },
    { p: 'M2 12h2' },
    { p: 'M20 12h2' },
    { p: 'm6.34 17.66-1.41 1.41' },
    { p: 'm19.07 4.93-1.41 1.41' },
  ],
  chart: [{ p: 'M3 3v16a2 2 0 0 0 2 2h16' }, { p: 'm7 14 4-4 3 3 5-6' }],
  // Caneta aplicadora: desenhada na horizontal e girada 45° no render.
  pen: [{ r: [6, 9, 11, 6, 2] }, { r: [17, 10.25, 3, 3.5, 1] }, { p: 'M2.5 12H6' }, { p: 'M10 9v6' }],
  book: [
    { p: 'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z' },
    { p: 'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z' },
  ],
  plus: [{ p: 'M12 5v14' }, { p: 'M5 12h14' }],
  settings: [{ p: 'M20 7h-9' }, { p: 'M14 17H5' }, { c: [17, 17, 3] }, { c: [7, 7, 3] }],
  scale: [{ r: [3, 3, 18, 18, 5] }, { p: 'M8 10a4.5 4.5 0 0 1 8 0' }, { p: 'm12 10 1.5-2.5' }],
  heart: [
    { p: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z' },
    { p: 'M3.5 12h5l1.5-3 2.5 6 2-4h6' },
  ],
  pencil: [{ p: 'M12 20h9' }, { p: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' }],
  close: [{ p: 'M18 6 6 18' }, { p: 'm6 6 12 12' }],
  check: [{ p: 'M20 6 9 17l-5-5' }],
  chevronRight: [{ p: 'm9 6 6 6-6 6' }],
  calendar: [{ r: [3, 4, 18, 18, 3] }, { p: 'M16 2v4' }, { p: 'M8 2v4' }, { p: 'M3 10h18' }],
  flag: [{ p: 'M4 22V4' }, { p: 'M4 4h12l-2 4 2 4H4' }],
  arrowDown: [{ p: 'M12 5v14' }, { p: 'm19 12-7 7-7-7' }],
  arrowUp: [{ p: 'M12 19V5' }, { p: 'm5 12 7-7 7 7' }],
  box: [{ p: 'M12 3 4 7.5v9L12 21l8-4.5v-9z' }, { p: 'M4 7.5 12 12l8-4.5' }, { p: 'M12 12v9' }],
  chevronLeft: [{ p: 'm15 6-6 6 6 6' }],
  info: [{ c: [12, 12, 9] }, { p: 'M12 16v-5' }, { p: 'M12 8h.01' }],
  user: [{ c: [12, 8, 4] }, { p: 'M4 21a8 8 0 0 1 16 0' }],
  trash: [{ p: 'M4 7h16' }, { p: 'M10 11v6' }, { p: 'M14 11v6' }, { p: 'm6 7 1 13h10l1-13' }, { p: 'M9 7V4h6v3' }],
  share: [{ p: 'M12 15V3' }, { p: 'm7 8 5-5 5 5' }, { p: 'M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5' }],
  download: [{ p: 'M12 3v12' }, { p: 'm7 10 5 5 5-5' }, { p: 'M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5' }],
  minus: [{ p: 'M5 12h14' }],
  // Fita métrica enrolada.
  ruler: [{ c: [10, 12, 7] }, { c: [10, 12, 2.5] }, { p: 'M10 19h11v-4' }, { p: 'M14 19v-2' }, { p: 'M18 19v-2' }],
  camera: [
    { p: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z' },
    { c: [12, 13.5, 3.5] },
  ],
  image: [{ r: [3, 4, 18, 16, 3] }, { c: [9, 9.5, 1.5] }, { p: 'm21 16-5-5-9 9' }],
  file: [{ p: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' }, { p: 'M14 3v5h5' }, { p: 'M9 13h6' }, { p: 'M9 17h4' }],
  wallet: [{ r: [3, 6, 18, 14, 3] }, { p: 'M3 10h18' }, { p: 'M16 15h2' }, { p: 'M6 6V5a2 2 0 0 1 2-2h8' }],
  activity: [{ p: 'M3 12h4l3-8 4 16 3-8h4' }],
  alert: [
    { p: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
    { p: 'M12 9v4' },
    { p: 'M12 17h.01' },
  ],
  clock: [{ c: [12, 12, 9] }, { p: 'M12 7v5l3 2' }],
};

type Props = {
  name: IconName;
  color: string;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, color, size = 24, strokeWidth = 1.75 }: Props) {
  const body = ICONS[name].map((s, i) => {
    if ('p' in s) return <Path key={i} d={s.p} />;
    if ('c' in s) return <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} />;
    return <Rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} />;
  });
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'pen' ? <G transform="rotate(-45 12 12)">{body}</G> : body}
    </Svg>
  );
}
