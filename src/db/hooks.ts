// Consultas usadas pelas telas. O volume é pequeno (centenas de linhas por ano), então elas trazem tudo.

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toDay } from '@/lib/dates';

import type { InjectionRow, JournalRow, MeasureRow, PenRow, PhotoRow, WeightRow } from './queries';
import { useQuery } from './useQuery';

export function useWeights(): WeightRow[] {
  return useQuery<WeightRow>('SELECT id, at, g FROM weights ORDER BY at, id', [], ['weights']);
}

export function useInjections(): InjectionRow[] {
  return useQuery<InjectionRow>('SELECT * FROM injections ORDER BY at, id', [], ['injections']);
}

export function usePens(): PenRow[] {
  return useQuery<PenRow>('SELECT * FROM pens ORDER BY id', [], ['pens']);
}

export function useJournal(): JournalRow[] {
  return useQuery<JournalRow>('SELECT * FROM journal ORDER BY at, id', [], ['journal']);
}

export function useMeasures(): MeasureRow[] {
  return useQuery<MeasureRow>('SELECT * FROM measures ORDER BY at, id', [], ['measures']);
}

export function usePhotos(): PhotoRow[] {
  return useQuery<PhotoRow>('SELECT * FROM photos ORDER BY at, id', [], ['photos']);
}

/** Hoje ('AAAA-MM-DD'), atualizado quando o app volta para a frente. */
export function useToday(): string {
  const [today, setToday] = useState(() => toDay(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toDay(new Date()));
    });
    return () => sub.remove();
  }, []);
  return today;
}
