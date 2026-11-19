// Frases dos padrões percebidos no Diário e no relatório (src/domain/patterns.ts).

import type { SymptomPattern } from '@/domain/patterns';

import { SYMPTOM_LABEL } from './labels';

const name = (kind: string) => SYMPTOM_LABEL[kind] ?? kind;

function window(from: number, to: number): string {
  if (from === 0 && to === 0) return 'no dia da aplicação';
  if (from === 0) return `entre o dia da aplicação e ${to === 1 ? 'o dia seguinte' : `${to} dias depois`}`;
  if (from === to) return `${from === 1 ? '1 dia' : `${from} dias`} depois da aplicação`;
  return `${from} a ${to} dias depois da aplicação`;
}

/** "Náusea costuma aparecer 1 a 2 dias depois da aplicação (4 de 5 registros)." */
export function patternText(p: SymptomPattern): string {
  if (p.type === 'afterInjection') {
    return `${name(p.kind)} costuma aparecer ${window(p.fromDay, p.toDay)} (${p.hits} de ${p.total} registros).`;
  }
  return `${name(p.kind)} apareceu mais nas semanas em que a dose subiu (${p.hits} ${p.hits === 1 ? 'registro' : 'registros'} em ${
    p.increaseWeeks === 1 ? '1 semana de subida' : `${p.increaseWeeks} semanas de subida`
  }).`;
}
