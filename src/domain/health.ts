// Balança pelo Health Connect (Futuro → implementado): quais pesagens importar.

import { parseStamp, toStamp } from '@/lib/dates';

import { MAX_WEIGHT_G, MIN_WEIGHT_G } from './weight';

/** Registro de peso lido do Health Connect: horário ISO (UTC) e quilos. */
export type HealthWeight = { time: string; kg: number };

// A mesma pesagem: até 30 min e 100 g de diferença (ela digitou e a balança mandou, ou a balança mandou duas vezes).
const SAME_MINUTES = 30;
const SAME_G = 100;

const minutes = (a: string, b: string) => Math.abs(parseStamp(a).getTime() - parseStamp(b).getTime()) / 60000;

/**
 * Pesagens novas: convertidas para a hora local ('AAAA-MM-DD HH:MM') e gramas, dentro da faixa de
 * 30 a 300 kg, sem repetir uma pesagem que já está no app (até 30 min e 100 g de diferença) nem entre si.
 */
export function importableWeights(
  records: readonly HealthWeight[],
  existing: readonly { at: string; g: number }[],
): { at: string; g: number }[] {
  const out: { at: string; g: number }[] = [];
  const seen = [...existing];
  for (const r of [...records].sort((a, b) => (a.time < b.time ? -1 : 1))) {
    const date = new Date(r.time);
    if (Number.isNaN(date.getTime())) continue;
    const g = Math.round(r.kg * 1000);
    if (g < MIN_WEIGHT_G || g > MAX_WEIGHT_G) continue;
    const at = toStamp(date);
    if (seen.some((w) => Math.abs(w.g - g) <= SAME_G && minutes(w.at, at) <= SAME_MINUTES)) continue;
    out.push({ at, g });
    seen.push({ at, g });
  }
  return out;
}
