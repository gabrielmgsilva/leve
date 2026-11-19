import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, startOfDay, toDay } from '@/lib/dates';

import type { Site } from './queries';

// Dados de demonstração: as mesmas 12 semanas do protótipo, ancoradas no domingo mais recente.
// Pesagens: [dia desde a 1ª aplicação, kg].
const WEIGHTS: [number, number][] = [
  [0, 86.4], [2, 86.1], [4, 85.3], [6, 85.4], [7, 85.2], [9, 85.3], [11, 84.6], [13, 84.5],
  [16, 84.2], [20, 84.7], [21, 84], [23, 84.2], [25, 83.7], [27, 84], [28, 84.4], [30, 83.9],
  [32, 83.9], [34, 83.3], [35, 84], [37, 83.5], [39, 83.3], [41, 82.9], [42, 83.2], [44, 83],
  [46, 82.6], [48, 81.7], [49, 82.5], [51, 81.9], [53, 82], [55, 81.5], [56, 81.3], [58, 81.2],
  [60, 81.3], [62, 81.6], [63, 82], [65, 82], [67, 81.6], [69, 81.9], [70, 81.2], [72, 81.3],
  [74, 81], [76, 80.6], [77, 80.7], [79, 80.1], [81, 79.8], [83, 80], [84, 79.9], [86, 79.7],
];

const ROTATION: Site[] = ['AE', 'AD', 'CE', 'CD'];

// [dia, tipo, intensidade, texto, hora]
const JOURNAL: [number, string, number | null, string | null, string][] = [
  [29, 'nausea', 1, 'Um pouco enjoada à tarde.', '18:40'],
  [30, 'nausea', 1, null, '09:10'],
  [70, 'note', null, 'Primeira semana com 1 mg. Caneta nova.', '08:30'],
  [71, 'nausea', 1, null, '20:15'],
  [71, 'fatigue', 1, null, '20:15'],
  [72, 'nausea', 2, 'Melhorou depois do almoço.', '09:30'],
  [79, 'heartburn', 1, null, '21:40'],
  [82, 'well', null, null, '19:30'],
];

export async function seedDemo(db: SQLiteDatabase): Promise<void> {
  const today = startOfDay(new Date());
  const lastSunday = addDays(today, -today.getDay());
  const start = addDays(lastSunday, -84); // 13 domingos até o mais recente
  const at = (day: number, hhmm: string) => `${toDay(addDays(start, day))} ${hhmm}`;
  const isPast = (day: number) => addDays(start, day) <= today;

  await db.withTransactionAsync(async () => {
    const settings: [string, unknown][] = [
      ['profile', { name: '', heightCm: 165, goalG: 70000 }],
      ['schedule', { weekday: 0, time: '08:00' }],
      [
        'plan',
        [
          { mcg: 250, weeks: 4 },
          { mcg: 500, weeks: 4 },
          { mcg: 1000, weeks: 4 },
          { mcg: 1700, weeks: 4 },
          { mcg: 2400, weeks: null },
        ],
      ],
      ['sites', ['AE', 'AD', 'CE', 'CD']],
      ['onboarded', true],
    ];
    for (const [key, value] of settings) {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }

    // Canetas: Wegovy e Ozivy alternados; a última Ozivy está fechada no estoque. Preços de exemplo
    // (a primeira sem preço, para mostrar a conta parcial).
    const pens: [string, number, number | null, string | null, number, number | null][] = [
      ['Wegovy', 1000, 250, toDay(start), 1, null],
      ['Ozivy', 2000, null, toDay(addDays(start, 28)), 1, 59990],
      ['Wegovy', 2000, 500, toDay(addDays(start, 56)), 1, 89990],
      ['Wegovy', 4000, 1000, toDay(addDays(start, 70)), 0, 109990],
      ['Ozivy', 4000, 1000, null, 0, 79990],
    ];
    const penIds: number[] = [];
    for (const p of pens) {
      const r = await db.runAsync(
        'INSERT INTO pens (brand, total_mcg, dose_mcg, opened_on, done, price_cents) VALUES (?, ?, ?, ?, ?, ?)',
        p,
      );
      penIds.push(r.lastInsertRowId);
    }

    for (let w = 0; w < 13; w++) {
      const dose = w < 4 ? 250 : w < 10 ? 500 : 1000;
      const pen = w < 4 ? penIds[0] : w < 8 ? penIds[1] : w < 10 ? penIds[2] : penIds[3];
      await db.runAsync('INSERT INTO injections (at, dose_mcg, site, pen_id) VALUES (?, ?, ?, ?)', [
        at(w * 7, '08:10'),
        dose,
        ROTATION[w % ROTATION.length],
        pen,
      ]);
    }

    for (const [day, value] of WEIGHTS) {
      if (!isPast(day)) continue;
      await db.runAsync('INSERT INTO weights (at, g) VALUES (?, ?)', [at(day, '07:05'), Math.round(value * 1000)]);
    }

    // Medidas: cintura e quadril a cada 4 semanas.
    for (const [day, waist, hip] of [
      [1, 1012, 1158],
      [29, 985, 1141],
      [57, 962, 1127],
      [85, 941, 1112],
    ] as const) {
      if (!isPast(day)) continue;
      await db.runAsync('INSERT INTO measures (at, kind, mm) VALUES (?, ?, ?), (?, ?, ?)', [
        at(day, '07:20'),
        'waist',
        waist,
        at(day, '07:20'),
        'hip',
        hip,
      ]);
    }

    for (const [day, kind, level, text, hhmm] of JOURNAL) {
      await db.runAsync('INSERT INTO journal (at, kind, level, text) VALUES (?, ?, ?, ?)', [
        at(day, hhmm),
        kind,
        level,
        text,
      ]);
    }
  });
}
